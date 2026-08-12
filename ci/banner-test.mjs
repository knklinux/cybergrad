// banner-test.mjs — Regresión del banner ASCII de CYBERGRAD
// Verifica que las 9 letras (CYBERGRAD) están completas y que ninguna ha
// sido sustituida por el glifo de otra letra o ha perdido trazos.
// Ejemplos reales cazados por este test:
//   - La G era una O (filas "██╔═══██╗" / "██║   ██║" en vez de la G).
//   - La C había perdido su barra interior y su remate inferior.
//   - La segunda R había perdido la pata derecha.
// Estrategia: compara el banner real de js/main.js contra el banner
// canónico (glifos figlet Standard, sin espacios finales) y, si algo
// difiere, diagnostica qué letra está rota. Corre en Node puro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${name}`); }
  else { fail++; console.log(`  \u2718 ${name}  ${extra}`); }
};

// --- Extraer las 6 filas del BANNER de js/main.js ---
const src = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
const m = src.match(/const BANNER = \[([\s\S]*?)\]\s*\.join/);
if (!m) {
  console.error("\u2716 No se encontró el BANNER en js/main.js");
  process.exit(1);
}
const filas = m[1].match(/"([^"]*)"/g).map((s) => s.slice(1, -1));
check("el banner tiene 6 filas", filas.length === 6, `(encontradas: ${filas.length})`);
if (filas.length !== 6) process.exit(1);

// --- Banner canónico (glifos figlet Standard, C Y B E R G R A D) ---
const CANONICO = [
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  " \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u255a\u2588\u2588\u2557 \u2588\u2588\u2554\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557",
  " \u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u255a\u2588\u2588\u2588\u2588\u2554\u255d \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551",
  " \u2588\u2588\u2551   \u2588\u2588\u2551 \u255a\u2588\u2588\u2554\u255d  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255d  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551",
  " \u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d  \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d",
  "  \u255a\u2550\u2550\u2550\u2550\u2550\u255d   \u255a\u2550\u255d   \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u255d  \u255a\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u255d",
];

// --- 1. Comparación golden: el banner real debe ser EXACTAMENTE el canónico ---
const realNorm = filas.map((r) => r.trimEnd());
check("las 6 filas coinciden con el banner canónico", CANONICO.every((c, i) => c === realNorm[i]));
if (fail > 0) {
  for (let i = 0; i < 6; i++) {
    if (CANONICO[i] !== realNorm[i]) {
      console.log(`\n  fila ${i + 1} difiere:`);
      console.log("    esperado |" + CANONICO[i] + "|");
      console.log("    real     |" + realNorm[i] + "|");
    }
  }
}

// --- 2. Diagnóstico letra a letra (glifos figlet Standard) ---
const GLIFOS = {
  C: [" \u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d ", "\u2588\u2588\u2551  \u2588\u2588\u2588\u2557", "\u2588\u2588\u2551   \u2588\u2588\u2551", "\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", " \u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  Y: ["\u2588\u2588\u2557   \u2588\u2588\u2557", "\u255a\u2588\u2588\u2557 \u2588\u2588\u2554\u255d", " \u255a\u2588\u2588\u2588\u2588\u2554\u255d ", "  \u255a\u2588\u2588\u2554\u255d  ", "   \u2588\u2588\u2551   ", "   \u255a\u2550\u255d   "],
  B: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  E: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d", "\u2588\u2588\u2588\u2588\u2588\u2557  ", "\u2588\u2588\u2554\u2550\u2550\u255d  ", "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557", "\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d"],
  R: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u255a\u2550\u255d  \u255a\u2550\u255d"],
  G: [" \u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d ", "\u2588\u2588\u2551  \u2588\u2588\u2588\u2557", "\u2588\u2588\u2551   \u2588\u2588\u2551", "\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", " \u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  A: [" \u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u255a\u2550\u255d  \u255a\u2550\u255d"],
  D: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
};
const PALABRA = ["C", "Y", "B", "E", "R", "G", "R", "A", "D"];
PALABRA.forEach((letra) => {
  const faltan = [];
  for (let f = 0; f < 6; f++) {
    if (!realNorm[f].includes(GLIFOS[letra][f].trim())) faltan.push(f + 1);
  }
  check(`letra ${letra}: glifos completos`, faltan.length === 0,
    faltan.length ? `(filas sin el trazo correcto: ${faltan.join(", ")})` : "");
});

console.log(fail === 0 ? `\n\u2705 banner: ${pass} checks, 0 fallos` : `\n\u274c banner: ${pass} ok, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
