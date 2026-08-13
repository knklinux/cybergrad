// meta-test.mjs — Regresión golden de los METADATOS de CYBERGRAD
// Misma técnica que banner-test.mjs / visual-test.mjs aplicada a la
// "cabecera" del documento que se renderiza al arrancar (y que decide
// cómo se ve CYBERGRAD al compartirlo en LinkedIn/redes):
//
//   1. TÍTULO de pestaña (<title>) — el que sufrió el "sigue estando mal".
//   2. Open Graph (og:title, og:description, og:url, og:image ×2) — la
//      tarjeta que se comparte.
//   3. Twitter Card (twitter:card, twitter:image) + description + canonical
//      + lang + meta CSP.
//
// Estrategia (igual que el banner): canónico fijo (meta-core.mjs) +
// comparación golden + diagnóstico por pieza, y PRUEBA DE MUTACIÓN en
// memoria: se muta una copia de index.html y se confirma que el test
// caza cada cambio (título, descripción, og:image rota). El canónico se
// comparte con el check de producción (prod-test.mjs), que además
// comprueba que las og:image responden HTTP 200 en el sitio desplegado.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraerMetadatosLocal, extraerMetadatosDe, verificarMetadatos, META_CANON } from "./meta-core.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leer = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const src = leer("index.html");

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};
const correr = (checks) => { for (const c of checks) check(c.nombre, c.ok, c.extra); };

// ============================================================
// 1. Metadatos extraídos de index.html contra el canónico
// ============================================================
correr(verificarMetadatos(extraerMetadatosLocal()));

// 2. Las og:image apuntan a archivos que existen en assets/ (local)
for (const url of META_CANON.ogImagenes) {
  const nombre = url.split("/").pop();
  const ruta = path.join(root, "assets", nombre);
  check(
    `og:image ${nombre}: existe en assets/`,
    fs.existsSync(ruta),
    `(falta ${ruta})`
  );
}
// El favicon y el apple-touch-icon también existen (pulido en la pestaña)
for (const nombre of ["favicon.png", "apple-touch-icon.png", "jimmy-avatar.jpg"]) {
  check(
    `icono ${nombre}: existe en assets/`,
    fs.existsSync(path.join(root, "assets", nombre)),
    `(falta assets/${nombre})`
  );
}

// ============================================================
// 3. PRUEBA DE MUTACIÓN (en memoria: se muta una copia del HTML)
//    El golden debe cazar cada cambio no deseado. Se usa la MISMA
//    extracción del core (extraerMetadatosDe) sobre el HTML mutado.
// ============================================================
const muta = (nuevo) => verificarMetadatos(extraerMetadatosDe(nuevo));

const caza = (nombre, checks, indice, mutacion) => {
  const c = checks[indice];
  check(
    `mutación: ${nombre} se caza`,
    c && c.ok === false,
    c ? `(no falló: |${c.nombre}| ok=${c.ok})` : `(falta el check ${indice}) ${mutacion}`
  );
};

// Mutación 1: título de pestaña roto (el caso real: "sigue estando mal")
let checks = muta(src.replace(
  "<title>CYBERGRAD \u2014 Simulador de Carrera SOC + Red Team</title>",
  "<title>GYBERGRAD \u2014 Simulador de Carrera SOC</title>"
));
caza("título roto (GYBERGRAD)", checks, 0);

// Mutación 2: description mutada (se le quita el arranque del texto)
checks = muta(src.replace(
  '<meta name="description" content="Aprende ciberseguridad jugando:',
  '<meta name="description" content="'
));
caza("description mutada", checks, 2);

// Mutación 3: og:image apuntando a un archivo inexistente
checks = muta(src.replace(
  "assets/cover.jpg",
  "assets/cover-rotto.jpg"
));
caza("og:image rota (cover-rotto.jpg)", checks, 8);

// Mutación 4: twitter:card degradada a summary (sin imagen grande)
checks = muta(src.replace(
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:card" content="summary" />'
));
caza("twitter:card degradada", checks, 7);

// Mutación 5: lang cambiado a en
checks = muta(src.replace('<html lang="es">', '<html lang="en">'));
caza("lang cambiado a en", checks, 6);

// Mutación 6: se quita el meta CSP
checks = muta(src.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>/, ""));
caza("meta CSP eliminado", checks, 10);

// Restaurar el archivo real NO es necesario: las mutaciones se aplicaron
// solo a copias en memoria de index.html.

console.log(
  fail === 0
    ? `\n\u2705 meta: ${pass} checks, 0 fallos`
    : `\n\u274c meta: ${pass} ok, ${fail} fallos`
);
process.exit(fail === 0 ? 0 : 1);
