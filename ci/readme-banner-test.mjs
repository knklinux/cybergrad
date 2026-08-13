// readme-banner-test.mjs — Coherencia del banner ASCII del README con el juego
// El README muestra el banner de CYBERGRAD en un bloque ```text (la misma
// ciudad que pinta la terminal al arrancar). Este test garantiza que esa
// copia NO se descuadre de js/main.js:
//   - Extrae el banner del bloque ```text del README (el que tiene 6 filas
//     de bloques ██).
//   - Lo compara EXACTO (fila a fila, byte a byte) contra el BANNER de
//     js/main.js (extraído con banner-core.mjs, la misma fuente que usa el
//     golden del juego).
//   - Además lo valida contra el canónico (diagnosticar): el README también
//     debe ser canónico, no solo idéntico al juego.
//   - Prueba de mutación: si alguien cambia un glifo en el README (o en
//     main.js), la comparación lo caza.
// Corre en Node puro, sin servidor.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraerBannerLocal, diagnosticar } from "./banner-core.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

// --- Extraer el banner del README (primer bloque ```text con 6 filas de ██) ---
function extraerBannerReadme(md) {
  const normalizado = md.replace(/\r\n/g, "\n");
  const bloques = [...normalizado.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const banner = bloques.find((b) => {
    // ≥6 filas y al menos una con bloques ██ (la última fila del banner
    // son remates ╚═╝ sin ██, así que no se puede exigir 6 con bloques).
    const filas = b.split("\n");
    return filas.length >= 6 && filas.some((f) => f.includes("██"));
  });
  if (!banner) throw new Error("No se encontró el banner ASCII en el README (bloque ```text con 6 filas)");
  return banner.split("\n").slice(0, 6);
}

let juego, readme;
try {
  juego = extraerBannerLocal();
  readme = extraerBannerReadme(fs.readFileSync(path.join(root, "README.md"), "utf8"));
} catch (e) {
  console.error(`\u2716 ${e.message}`);
  process.exit(1);
}

const igual = (a, b) => a.length === b.length && a.every((r, i) => r === b[i]);

// --- 1. Presencia y forma ---
check("el README tiene un bloque ```text de banner", readme.length > 0);
check("el banner del README tiene 6 filas", readme.length === 6);
check("el banner del README usa bloques ██ (ASCII real)", readme.some((r) => r.includes("██")));

// --- 2. Igualdad exacta con el BANNER de js/main.js ---
check("el banner del README coincide EXACTO con el de js/main.js", igual(readme, juego));
if (!igual(readme, juego)) {
  console.log("\n  Diff README vs js/main.js (fila a fila):");
  for (let i = 0; i < Math.max(readme.length, juego.length); i++) {
    if (readme[i] !== juego[i]) {
      console.log(`    fila ${i + 1}\n      README |${readme[i]}|${readme[i] === undefined ? " (falta)" : ""}\n      juego  |${juego[i]}|${juego[i] === undefined ? " (falta)" : ""}`);
    }
  }
}

// --- 3. El README también es canónico (misma disciplina golden que el juego) ---
const { checks } = diagnosticar(readme);
for (const c of checks) check(`README: ${c.nombre}`, c.ok, c.extra);

// --- 4. Prueba de mutación: si alguien toca un glifo, se caza ---
const mutado = readme.map((r, i) => (i === 0 ? r.replace("█", "░") : r));
check("mutación de un glifo rompe la comparación exacta (prueba de mutación)", !igual(mutado, juego));
const mutDiag = diagnosticar(mutado);
check("mutación de un glifo rompe el golden canónico (prueba de mutación)", mutDiag.checks.some((c) => !c.ok));

console.log(fail === 0 ? `\n\u2705 readme-banner: ${pass} checks, 0 fallos` : `\n\u274c readme-banner: ${pass} ok, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
