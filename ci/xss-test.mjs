// xss-test.mjs — Regresión XSS (E2E con Playwright)
// Verifica que un nombre de analista con HTML malicioso NUNCA se ejecute:
//   - Panel Carrera: se renderiza como texto, sin elementos inyectados.
//   - Informe: el <textarea> no se rompe (breakout de </textarea>).
//   - Selector de partida tras recargar: el nombre guardado sale como texto.
// Si no hay servidor en CYBERGRAD_URL (por defecto 127.0.0.1:8000), levanta
// uno propio (node serve.js) y lo cierra al final, igual que smoke.mjs.
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.CYBERGRAD_URL || "http://127.0.0.1:8000/";
const PORT = parseInt(new URL(BASE).port || "8000", 10);
// Payload que cubre los dos vectores: breakout de <textarea> e <img onerror>.
const MAL = "</textarea><img src=x onerror=window.__pwned=1>";

async function servidorDisponible() {
  try { return (await fetch(BASE, { method: "HEAD" })).ok; } catch { return false; }
}

let proc = null;
if (!(await servidorDisponible())) {
  proc = spawn(process.execPath, ["serve.js", String(PORT)], { stdio: "ignore" });
  let intentos = 0;
  while (!(await servidorDisponible()) && intentos < 40) {
    await new Promise((r) => setTimeout(r, 250));
    intentos++;
  }
  if (!(await servidorDisponible())) {
    console.error(`✖ No se pudo levantar el servidor estático en ${BASE}`);
    process.exit(1);
  }
}

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}`); }
};
const falla = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });

const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });

// 1) Onboarding con el nombre malicioso
await page.goto(BASE + "?xss=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", MAL);
await page.click("#btn-empezar");

// 2) Aceptar el briefing del caso 1 y esperar a que el splash se oculte
const aceptar = page.locator('[data-action="aceptar-briefing"], [data-action="aceptar-caso"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForFunction(() => document.getElementById("splash")?.classList.contains("hidden"), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(400);

// 3) Panel Carrera: el nombre sale como TEXTO, sin elementos inyectados
await page.click("#btn-carrera");
await page.waitForTimeout(500);
const modal = page.locator("#modal-content");
check("Carrera muestra el nombre como texto", (await modal.innerText()).includes(MAL));
check("Carrera sin <img> inyectado", (await modal.locator("img[src=x]").count()) === 0);
check("Carrera sin ejecución (window.__pwned)", await page.evaluate(() => window.__pwned === undefined));
await page.locator("#modal-content button", { hasText: "CERRAR" }).first().click().catch(() => {});
await page.waitForTimeout(300);

// 4) Informe: el <textarea> no se rompe con </textarea>
await page.fill("#terminal input", "informe");
await page.press("#terminal input", "Enter");
await page.waitForTimeout(500);
const txtarea = page.locator("#informe-texto");
if (await txtarea.count()) {
  check("Informe: textarea intacto, nombre como texto", (await txtarea.inputValue()).includes(MAL));
  check("Informe: sin <img> inyectado", (await page.locator("img[src=x]").count()) === 0);
  check("Informe: sin ejecución", await page.evaluate(() => window.__pwned === undefined));
} else {
  falla("El comando informe no abrió el textarea");
}
await page.locator("#modal-content button", { hasText: "Cancelar" }).first().click().catch(() => {});

// 5) Selector de partida tras recargar: el nombre guardado sale como texto
await page.reload();
await page.waitForTimeout(1200);
const pNombre = page.locator("#modal-content .p-nombre");
if (await pNombre.count()) {
  check("Selector de partida: nombre como texto", (await pNombre.first().innerText()) === MAL);
  check("Selector sin ejecución", await page.evaluate(() => window.__pwned === undefined));
} else {
  falla("No apareció el selector de partida tras recargar (¿no se guardó el nombre?)");
}

// 6) Sin errores de consola en todo el flujo
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ XSS test OK: ${pass} checks, 0 fallos, sin ejecución.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
