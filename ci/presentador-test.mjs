// presentador-test.mjs — Test del MODO PRESENTADOR (demo)
// Verifica que el botón demo carga el estado avanzado en memoria
// (rangos máximos, casos completados) y que NUNCA se guarda:
// el localStorage sigue conteniendo la partida real del onboarding,
// no el estado demo.
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

// Onboarding (crea una partida real con este nombre)
await page.goto(BASE + "?demo=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Demo-Real");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));
await page.waitForTimeout(300);

// Entrar en el modo presentador
await page.click("#btn-demo");
await page.locator("#modal-content .modal-title", { hasText: "MODO PRESENTADOR" }).waitFor({ timeout: 10000 }).catch(() => falla("No se abrió el panel del presentador"));
await page.locator('[data-action="entrar-demo"]').first().click();

// El panel de carrera debe mostrar el estado demo
await page.locator("#modal-content .modal-title", { hasText: "TU CARRERA" }).waitFor({ timeout: 10000 }).catch(() => falla("No se abrió el panel de carrera tras el demo"));
const carrera = await page.locator("#modal-content").innerText();
check("el demo muestra rango máximo SOC (Jefe de CSIRT)", carrera.includes("Jefe de CSIRT"));
check("el demo muestra el nombre Demo", carrera.includes("Analista Demo"));
check("el demo muestra 2.400 XP", carrera.includes("2400 XP"));
check("el demo muestra 9/9 casos", carrera.includes("9/9"));

// El guardado real NO debe haberse tocado: sigue siendo la partida del onboarding
const save = await page.evaluate(() => localStorage.getItem("cybergrad_save_v1"));
check("el estado demo NO se ha guardado en localStorage", !!save);
if (save) {
  const datos = JSON.parse(save);
  check("la partida guardada conserva el nombre real", datos.nombre === "CI-Demo-Real");
  check("la partida guardada NO tiene el estado demo", datos.xp !== 2400);
}

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ presentador-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
