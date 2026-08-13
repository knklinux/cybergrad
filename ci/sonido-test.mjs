// sonido-test.mjs — Test de SONIDO y feedback
// Verifica el toggle del botón (persistido en localStorage), el
// comando `sonido on|off|estado` y que activar el audio (Web Audio
// en Chromium headless) no produce errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.CYBERGRAD_URL || "http://127.0.0.1:8000/";
const PORT = parseInt(new URL(BASE).port || "8000", 10);
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
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};
const falla = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });
const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });

const ejecutar = async (cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(400);
  return page.locator("#terminal").innerText();
};
const estadoGuardado = () => page.evaluate(() => localStorage.getItem("cybergrad_sonido"));

// Onboarding
await page.goto(BASE + "?sonido=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Sonido");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));
await page.waitForTimeout(300);

// Por defecto el sonido está activado
check("el sonido está activado por defecto", (await estadoGuardado()) !== "off");

// Comando sonido estado
let salida = await ejecutar("sonido estado");
check("`sonido estado` indica el estado", salida.includes("Sonido: activado"));

// Silenciar por comando
salida = await ejecutar("sonido off");
check("`sonido off` confirma el silencio", salida.includes("Sonido silenciado"));
check("el estado se persiste (off)", (await estadoGuardado()) === "off");

// Activar por comando
salida = await ejecutar("sonido on");
check("`sonido on` confirma la activación", salida.includes("Sonido activado"));
check("el estado se persiste (on)", (await estadoGuardado()) === "on");

// Toggle por botón: silencia
await page.click("#btn-sonido");
check("el botón silencia y persiste", (await estadoGuardado()) === "off");
const btnTxt = await page.locator("#btn-sonido").innerText();
check("el botón muestra el icono de silenciado", btnTxt.includes("🔇"));

// Toggle por botón: vuelve a activar
await page.click("#btn-sonido");
check("el botón reactiva y persiste", (await estadoGuardado()) === "on");

// Sin errores de consola (Web Audio activado en headless no debe romper nada)
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ sonido-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
