// smoke.mjs — Smoke test E2E con Playwright
// Verifica que el juego carga sin errores de consola, que el onboarding
// funciona y que un caso real arranca en la terminal.
//
// Si no hay un servidor ya levantado en CYBERGRAD_URL (por defecto
// 127.0.0.1:8000), levanta uno propio (node serve.js) y lo cierra al final.
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.CYBERGRAD_URL || "http://127.0.0.1:8000/";
const PORT = parseInt(new URL(BASE).port || "8000", 10);

async function servidorDisponible() {
  try {
    const r = await fetch(BASE, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
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

const browser = await chromium.launch();
const page = await browser.newPage();

const errores = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errores.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errores.push(`[pageerror] ${err.message}`));
page.on("requestfailed", (req) => {
  const f = req.failure();
  errores.push(`[request] ${req.url()} → ${f ? f.errorText : "fallo"}`);
});

const salir = (codigo) => {
  browser.close().finally(() => {
    if (proc) proc.kill();
    process.exit(codigo);
  });
};
const falla = (msg) => {
  console.error(`✖ ${msg}`);
  console.error("Errores capturados:", errores.length ? errores : "ninguno");
  salir(1);
};

// 1) Cargar la página
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });

// 2) Sin guardado (contexto limpio) → debe aparecer el onboarding
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => {
  falla("No apareció el onboarding (input-nombre) al arrancar");
});
const tituloOnboarding = await page.locator("#modal-content .modal-title").innerText();
if (!tituloOnboarding.includes("BIENVENIDO")) falla("El onboarding no muestra la bienvenida: " + tituloOnboarding);

// 3) Poner nombre y arrancar el turno
await page.fill("#input-nombre", "CI-Tester");
await page.click("#btn-empezar");

// 4) El briefing del caso 1 debe aparecer (tras el splash)
await page.waitForSelector("#modal-content .modal-title", { timeout: 15000 }).catch(() => {
  falla("No apareció el briefing del caso tras EMPEZAR TURNO");
});
const briefing = await page.locator("#modal-content").innerText();
if (!briefing.includes("BRIEFING")) falla("El briefing no muestra el texto BRIEFING");

// 5) Aceptar el caso y esperar a que arranque la terminal
const aceptar = page.locator("#modal-content button", { hasText: "ACEPTAR" });
if (await aceptar.count()) await aceptar.click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => {
  falla("La terminal no arrancó (sin input tras aceptar el caso)");
});
const terminal = await page.locator("#terminal").innerText();
if (!terminal.includes("C A S O")) falla("La terminal no muestra el encabezado del caso");

// 6) Ejercitar la terminal: ayuda debe listar los comandos
await page.fill("#terminal input", "ayuda");
await page.press("#terminal input", "Enter");
await page.waitForTimeout(400);
const terminalAyuda = await page.locator("#terminal").innerText();
if (!terminalAyuda.includes("COMANDOS DEL TERMINAL")) falla("El comando ayuda no listó los comandos");

// 7) Sin errores de consola en todo el flujo
if (errores.length) {
  console.error("✖ Errores de consola/red durante la carga:");
  for (const e of errores) console.error("   " + e);
  salir(1);
}

console.log("✔ Smoke test OK: carga, onboarding, caso 1 y terminal sin errores de consola.");
salir(0);
