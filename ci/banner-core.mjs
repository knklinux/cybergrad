// banner-core.mjs — Núcleo compartido de los tests del banner de CYBERGRAD.
// Define el banner canónico (glifos figlet Standard) y la verificación
// golden + diagnóstico letra a letra. Lo usan:
//   - banner-test.mjs      → contra js/main.js (local, Node puro, cada push/PR)
//   - banner-prod-test.mjs → contra la versión desplegada en GitHub Pages
//                             (check de integración, E2E con Playwright)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const PALABRA = ["C", "Y", "B", "E", "R", "G", "R", "A", "D"];

// --- Banner canónico (glifos figlet Standard, sin espacios finales) ---
export const CANONICO = [
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  " \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u255a\u2588\u2588\u2557 \u2588\u2588\u2554\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557",
  " \u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u255a\u2588\u2588\u2588\u2588\u2554\u255d \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551",
  " \u2588\u2588\u2551   \u2588\u2588\u2551 \u255a\u2588\u2588\u2554\u255d  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255d  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551",
  " \u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d  \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d",
  "  \u255a\u2550\u2550\u2550\u2550\u2550\u255d   \u255a\u2550\u255d   \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u255d  \u255a\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u255d",
];

export const GLIFOS = {
  C: [" \u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d ", "\u2588\u2588\u2551  \u2588\u2588\u2588\u2557", "\u2588\u2588\u2551   \u2588\u2588\u2551", "\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", " \u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  Y: ["\u2588\u2588\u2557   \u2588\u2588\u2557", "\u255a\u2588\u2588\u2557 \u2588\u2588\u2554\u255d", " \u255a\u2588\u2588\u2588\u2588\u2554\u255d ", "  \u255a\u2588\u2588\u2554\u255d  ", "   \u2588\u2588\u2551   ", "   \u255a\u2550\u255d   "],
  B: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  E: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d", "\u2588\u2588\u2588\u2588\u2588\u2557  ", "\u2588\u2588\u2554\u2550\u2550\u255d  ", "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557", "\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d"],
  R: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u255a\u2550\u255d  \u255a\u2550\u255d"],
  G: [" \u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d ", "\u2588\u2588\u2551  \u2588\u2588\u2588\u2557", "\u2588\u2588\u2551   \u2588\u2588\u2551", "\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", " \u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
  A: [" \u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u255a\u2550\u255d  \u255a\u2550\u255d"],
  D: ["\u2588\u2588\u2588\u2588\u2588\u2588\u2557 ", "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u2588\u2588\u2551  \u2588\u2588\u2551", "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d", "\u255a\u2550\u2550\u2550\u2550\u2550\u255d "],
};

// Extrae las 6 filas del BANNER de js/main.js (la fuente de verdad local).
export function extraerBannerLocal() {
  const src = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
  const m = src.match(/const BANNER = \[([\s\S]*?)\]\s*\.join/);
  if (!m) throw new Error("No se encontró el BANNER en js/main.js");
  return m[1].match(/"([^"]*)"/g).map((s) => s.slice(1, -1));
}

// Verifica unas filas contra el canónico. Devuelve { realNorm, checks }.
// checks: [{ nombre, ok, extra }] — comparación golden (6 filas exactas)
// más un check por letra de PALABRA (glifos completos).
export function diagnosticar(filas) {
  const checks = [];
  const realNorm = filas.map((r) => r.trimEnd());
  checks.push({
    nombre: "el banner tiene 6 filas",
    ok: realNorm.length === 6,
    extra: `(encontradas: ${realNorm.length})`,
  });
  if (realNorm.length === 6) {
    checks.push({
      nombre: "las 6 filas coinciden con el banner canónico",
      ok: CANONICO.every((c, i) => c === realNorm[i]),
    });
    PALABRA.forEach((letra) => {
      const faltan = [];
      for (let f = 0; f < 6; f++) {
        if (!realNorm[f].includes(GLIFOS[letra][f].trim())) faltan.push(f + 1);
      }
      checks.push({
        nombre: `letra ${letra}: glifos completos`,
        ok: faltan.length === 0,
        extra: faltan.length ? `(filas sin el trazo correcto: ${faltan.join(", ")})` : "",
      });
    });
  }
  return { realNorm, checks };
}

// Imprime el diff fila a fila contra el canónico (para el diagnóstico).
export function imprimirDiff(realNorm) {
  for (let i = 0; i < 6; i++) {
    if (CANONICO[i] !== realNorm[i]) {
      console.log(`\n  fila ${i + 1} difiere:`);
      console.log("    esperado    |" + CANONICO[i] + "|");
      console.log("    real        |" + realNorm[i] + "|");
    }
  }
}
