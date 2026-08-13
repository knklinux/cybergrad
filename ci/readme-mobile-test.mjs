// readme-mobile-test.mjs — Vista MÓVIL del README renderizado por GitHub
// En pantallas estrechas, un bloque de código que ENVUELVE las líneas
// descuadraría el ASCII del banner. Este E2E carga el README renderizado
// por GitHub (API con application/vnd.github.html) con el CSS oficial de
// GitHub (github-markdown-css, dark) en un viewport de 375x812 (iPhone) y
// verifica que el banner se CONSERVA:
//   - white-space: pre → las líneas nunca se parten en dos.
//   - overflow-x: auto y scrollWidth > clientWidth → se desplaza en
//     horizontal (lo mismo que cualquier código en el GitHub de verdad).
//   - las 6 filas siguen siendo las canónicas (mismo banner-core.mjs).
// Corre en el job de integración (usa la API viva + Chromium).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { extraerBannerLocal, diagnosticar } from "./banner-core.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const VIEWPORT = { width: 375, height: 812 };

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

// --- Fetch del README renderizado por GitHub (igual que readme-prod-test) ---
async function fetchRenderedReadme() {
  const cabeceras = { Accept: "application/vnd.github.html" };
  if (TOKEN) cabeceras.Authorization = `Bearer ${TOKEN}`;
  let ultimo = "";
  for (let intento = 1; intento <= 5; intento++) {
    const res = await fetch("https://api.github.com/repos/knklinux/cybergrad/readme", { headers: cabeceras });
    if (res.ok) return await res.text();
    ultimo = `HTTP ${res.status}`;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * intento));
      continue;
    }
    break;
  }
  throw new Error(`GitHub API no devolvió el README (${ultimo})`);
}

let html, canon;
try {
  html = await fetchRenderedReadme();
  canon = extraerBannerLocal();
} catch (e) {
  console.error(`\u2716 ${e.message}`);
  process.exit(1);
}

// --- Página local con el render de GitHub + CSS oficial, vista móvil ---
const pagina = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-dark.min.css" />
<style>body{margin:0;background:#0d1117;padding:16px}.markdown-body{max-width:1012px;margin:0 auto;background:transparent;padding:16px;background-color:#0d1117}</style>
</head><body>${html}</body></html>`;
const tmp = path.join(root, "ci", "tmp-mobile-readme.html");
fs.writeFileSync(tmp, pagina, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("file://" + tmp.replace(/\\/g, "/"), { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(1500); // CSS + badges

const m = await page.evaluate(() => {
  const pres = [...document.querySelectorAll(".markdown-body pre")];
  const banner = pres.find((p) => p.innerText.includes("██"));
  if (!banner) return { encontrado: false };
  const code = banner.querySelector("code") || banner;
  const filas = code.innerText.split("\n").filter((l) => l.trim() !== "");
  const cs = getComputedStyle(code);
  return {
    encontrado: true,
    filas,
    whiteSpace: cs.whiteSpace,
    overflowX: getComputedStyle(banner).overflowX,
    scrollW: banner.scrollWidth,
    clientW: banner.clientWidth,
  };
});
fs.rmSync(tmp, { force: true });
await browser.close();

if (!m.encontrado) {
  console.error("✖ No se encontró el banner en el README renderizado (vista móvil)");
  process.exit(1);
}

// 1) El banner está presente y tiene sus 6 filas
check("el banner está en la vista móvil (375px)", m.encontrado && m.filas.length === 6, `(filas: ${m.filas.length})`);
check("las 6 filas siguen siendo las canónicas del juego", m.filas.every((r, i) => r === canon[i]));

// 2) El ASCII NO se descuadra: pre nunca envuelve líneas
check("white-space: pre (las líneas no se parten)", m.whiteSpace === "pre", `(real: ${m.whiteSpace})`);
check("overflow-x: auto (se desplaza en horizontal)", m.overflowX === "auto", `(real: ${m.overflowX})`);
check("el contenido desborda en horizontal (scroll en vez de wrap)", m.scrollW > m.clientW, `(${m.scrollW} > ${m.clientW})`);

// 3) Además, el banner es canónico (glifos figlet Standard)
const { checks } = diagnosticar(m.filas);
for (const c of checks) check(`móvil: ${c.nombre}`, c.ok, c.extra);

// 4) Sin errores de página
check("sin errores de página en la vista móvil", errs.length === 0, errs.slice(0, 3).join(" ; "));

console.log(fail === 0 ? `\n\u2705 readme-mobile: ${pass} checks, 0 fallos (banner intacto en móvil)` : `\n\u274c readme-mobile: ${pass} ok, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
