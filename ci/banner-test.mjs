// banner-test.mjs — Regresión del banner ASCII de CYBERGRAD (local)
// Verifica que las 9 letras (CYBERGRAD) de js/main.js están completas y que
// ninguna ha sido sustituida por el glifo de otra letra o ha perdido trazos.
// Ejemplos reales cazados por este test:
//   - La G era una O (filas "██╔═══██╗" / "██║   ██║" en vez de la G).
//   - La C había perdido su barra interior y su remate inferior.
//   - La segunda R había perdido la pata derecha.
// Estrategia: compara el banner real de js/main.js contra el banner
// canónico (glifos figlet Standard, sin espacios finales) y, si algo
// difiere, diagnostica qué letra está rota. Corre en Node puro.
// El canónico y el diagnóstico viven en banner-core.mjs, compartido con
// prod-test.mjs (check de integración contra GitHub Pages).
import { extraerBannerLocal, diagnosticar, imprimirDiff } from "./banner-core.mjs";

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

// --- Extraer el banner real de js/main.js ---
let filas;
try {
  filas = extraerBannerLocal();
} catch (e) {
  console.error(`\u2716 ${e.message}`);
  process.exit(1);
}

// --- 1. Comparación golden + 2. Diagnóstico letra a letra ---
const { realNorm, checks } = diagnosticar(filas);
for (const c of checks) check(c.nombre, c.ok, c.extra);
if (fail > 0) imprimirDiff(realNorm);

console.log(fail === 0 ? `\n\u2705 banner: ${pass} checks, 0 fallos` : `\n\u274c banner: ${pass} ok, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
