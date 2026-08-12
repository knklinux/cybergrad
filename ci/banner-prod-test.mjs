// banner-prod-test.mjs — Check de integración del banner en producción
// Carga la versión desplegada de GitHub Pages con Playwright, lee el banner
// renderizado en la terminal (#terminal .t-banner) y lo verifica contra el
// canónico (el mismo de banner-test.mjs, vía banner-core.mjs).
//
// Nota sobre el DOM: main.js une el array BANNER con "\n" y lo imprime en
// UN solo span.t-banner, así que hay que leer su innerText y partir por
// líneas (no usar allInnerTexts esperando 6 elementos).
//
// Si el deploy de Pages aún está en curso, reintenta hasta
// CYBERGRAD_PROD_TIMEOUT ms (por defecto 5 min), así puede correr justo
// después de un push a main sin depender de la API de deployments.
//
// NO está en la cadena `npm test`: solo lo lanza el job `integracion` del
// CI en push a main (y manual vía workflow_dispatch). En un PR la URL de
// producción no refleja el código del PR, así que verificaría un deploy
// ajeno y daría falsos fallos.
import { chromium } from "playwright";
import { diagnosticar, imprimirDiff } from "./banner-core.mjs";

const PROD = process.env.CYBERGRAD_PROD_URL || "https://knklinux.github.io/cybergrad/";
const TIMEOUT_MS = parseInt(process.env.CYBERGRAD_PROD_TIMEOUT || "300000", 10);

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage();
const errores = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errores.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errores.push(`[pageerror] ${err.message}`));

const terminar = async (codigo) => {
  await browser.close().catch(() => {});
  process.exit(codigo);
};

// --- Esperar a que el deploy sirva el banner (retry si sigue en curso) ---
let filas = null;
const inicio = Date.now();
while (Date.now() - inicio < TIMEOUT_MS) {
  try {
    await page.goto(PROD, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#terminal .t-banner", { timeout: 15000 });
    const texto = await page.locator("#terminal .t-banner").first().innerText();
    const lineas = texto.split("\n").map((l) => l.trimEnd());
    if (lineas.length >= 6) { filas = lineas.slice(0, 6); break; }
  } catch {
    // Deploy en curso o página aún no lista: se reintenta.
  }
  await new Promise((r) => setTimeout(r, 10000));
}

if (!filas) {
  console.error(`\u2716 No se encontró el banner en ${PROD} tras ${Math.round(TIMEOUT_MS / 1000)}s`);
  console.error("   (¿deploy de Pages en curso, página caída o el banner ya no se imprime al arrancar?)");
  if (errores.length) {
    console.error("   Errores capturados:");
    for (const e of errores) console.error("     " + e);
  }
  await terminar(1);
}

// --- Golden + diagnóstico letra a letra contra el canónico ---
const { realNorm, checks } = diagnosticar(filas);
for (const c of checks) check(c.nombre, c.ok, c.extra);
if (fail > 0) imprimirDiff(realNorm);

// --- Sin errores de consola al cargar la versión desplegada ---
if (errores.length) {
  fail++;
  console.error("\u2718 errores de consola al cargar la versión desplegada:");
  for (const e of errores) console.error("   " + e);
} else {
  pass++;
  console.log("  \u2714 sin errores de consola al cargar");
}

console.log(
  fail === 0
    ? `\n\u2705 banner-prod (${PROD}): ${pass} checks, 0 fallos`
    : `\n\u274c banner-prod (${PROD}): ${pass} ok, ${fail} fallos`
);
await terminar(fail === 0 ? 0 : 1);
