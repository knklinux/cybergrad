// readme-prod-test.mjs — Integración: el README DESPLEGADO en GitHub muestra el banner
// Verifica la página del repo (github.com/knklinux/cybergrad) a través del MISMO
// pipeline de render de GitHub: GET /repos/knklinux/cybergrad/readme con
// Accept: application/vnd.github.html devuelve el README ya renderizado.
// Checks:
//   - el banner ASCII aparece en el HTML renderizado (bloque <pre lang="text">)
//   - coincide EXACTO con el BANNER de js/main.js (extraído con banner-core.mjs)
//   - además es canónico (glifos figlet Standard, diagnóstico letra a letra)
//   - el blockquote de la etimología (grad = «ciudad») está presente
//   - prueba de mutación: un glifo alterado en el render se caza
// Usa GITHUB_TOKEN (disponible en Actions) para no chocar con el rate limit
// anónimo de la API; en local cae a sin token.
import { extraerBannerLocal, diagnosticar } from "./banner-core.mjs";

const REPO_API = "https://api.github.com/repos/knklinux/cybergrad/readme";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

// --- Fetch del README renderizado por GitHub (con reintentos en 429/5xx) ---
async function fetchRenderedReadme() {
  const cabeceras = { Accept: "application/vnd.github.html" };
  if (TOKEN) cabeceras.Authorization = `Bearer ${TOKEN}`;
  let ultimo = "";
  for (let intento = 1; intento <= 5; intento++) {
    const res = await fetch(REPO_API, { headers: cabeceras });
    if (res.ok) return await res.text();
    ultimo = `HTTP ${res.status}`;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * intento));
      continue;
    }
    break;
  }
  throw new Error(`GitHub API no devolvió el README (${ultimo}). ${TOKEN ? "Con token" : "Sin token — prueba con GITHUB_TOKEN si es rate limit."}`);
}

// --- Extraer el banner del HTML renderizado (bloque ```text de GitHub) ---
function extraerBannerRenderizado(html) {
  const bloques = [...html.matchAll(/<pre lang="text" class="notranslate"><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => m[1]);
  const banner = bloques.find((b) => {
    const filas = b.split("\n");
    // ≥6 filas y al menos una con bloques ██ (la última fila del banner son
    // remates ╚═╝ sin ██, igual que en el test local del README).
    return filas.length >= 6 && filas.some((f) => f.includes("██"));
  });
  if (!banner) throw new Error("No se encontró el banner en el README renderizado por GitHub");
  return banner.split("\n").slice(0, 6);
}

const igual = (a, b) => a.length === b.length && a.every((r, i) => r === b[i]);

// --- Ejecución ---
let html, render, juego;
try {
  html = await fetchRenderedReadme();
  render = extraerBannerRenderizado(html);
  juego = extraerBannerLocal();
} catch (e) {
  console.error(`\u2716 ${e.message}`);
  process.exit(1);
}

// 1) El banner está en el render de GitHub
check("el README renderizado por GitHub contiene el banner (bloque pre lang=text)", render.length > 0);
check("el banner renderizado tiene 6 filas", render.length === 6);
check("el banner renderizado usa bloques ██", render.some((r) => r.includes("██")));

// 2) Igualdad exacta con el BANNER de js/main.js
check("el banner renderizado coincide EXACTO con el de js/main.js", igual(render, juego));
if (!igual(render, juego)) {
  console.log("\n  Diff render de GitHub vs js/main.js:");
  for (let i = 0; i < Math.max(render.length, juego.length); i++) {
    if (render[i] !== juego[i]) {
      console.log(`    fila ${i + 1}\n      github |${render[i]}|${render[i] === undefined ? " (falta)" : ""}\n      juego  |${juego[i]}|${juego[i] === undefined ? " (falta)" : ""}`);
    }
  }
}

// 3) El banner renderizado también es canónico (glifos figlet Standard)
const { checks } = diagnosticar(render);
for (const c of checks) check(`render GitHub: ${c.nombre}`, c.ok, c.extra);

// 4) El blockquote de la etimología está presente en la página del repo
check("la página del repo explica el origen del nombre (grad = ciudad)", html.includes("¿Por qué «CYBERGRAD»?") && html.includes("grad") && html.includes("ciudad") && html.includes("eslav"));

// 5) Prueba de mutación: un glifo alterado en el render se caza
const mutado = render.map((r, i) => (i === 0 ? r.replace("█", "░") : r));
check("mutación de un glifo rompe la comparación (prueba de mutación)", !igual(mutado, juego));

console.log(fail === 0 ? `\n\u2705 readme-prod: ${pass} checks, 0 fallos (README desplegado en GitHub OK)` : `\n\u274c readme-prod: ${pass} ok, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
