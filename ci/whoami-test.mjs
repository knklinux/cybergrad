// whoami-test.mjs — Regresión del comando whoami (E2E con Playwright)
// Verifica que el comando `whoami` refleja la campaña activa:
//   - En un caso blue team (SOC)  → "... del SOC de CiberCorp" (sin "Red Team").
//   - En un pentest red team      → "... de la Unidad Red Team de CiberCorp"
//                                    (sin "del SOC").
// Si no hay servidor en CYBERGRAD_URL (por defecto 127.0.0.1:8000), levanta
// uno propio (node serve.js) y lo cierra al final, igual que smoke.mjs.
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

// Helper: escribe un comando en la terminal y devuelve el texto completo
const ejecutar = async (cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(400);
  return page.locator("#terminal").innerText();
};

// 1) Onboarding con contexto limpio (sin guardado)
await page.goto(BASE + "?whoami=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Whoami");
await page.click("#btn-empezar");

// 2) Aceptar el briefing del caso 1 (blue team) y esperar la terminal
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó (SOC)"));
await page.waitForTimeout(400);

// 3) whoami en campaña SOC → debe hablar del SOC, nunca de Red Team
let salida = await ejecutar("whoami");
check("whoami (SOC) menciona el SOC", salida.includes("del SOC de CiberCorp"));
check("whoami (SOC) NO menciona Red Team", !salida.includes("Unidad Red Team"));

// 4) Abrir la campaña Red Team y aceptar el primer contrato (RT-01)
await page.click("#btn-rt");
await page.waitForSelector("#lab-lista .lab-card[data-rt]", { timeout: 10000 }).catch(() => falla("No se abrió el panel Red Team"));
await page.locator("#lab-lista .lab-card[data-rt]").first().click();
await page.locator("#modal-content .modal-title", { hasText: "CONTRATO PENTEST" }).waitFor({ timeout: 15000 }).catch(() => falla("No apareció el contrato del pentest"));
await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó (Red Team)"));
await page.waitForTimeout(400);

// 5) whoami en pentest → debe hablar de la Unidad Red Team, nunca del SOC
salida = await ejecutar("whoami");
check("whoami (Red Team) menciona la Unidad Red Team", salida.includes("de la Unidad Red Team de CiberCorp"));
check("whoami (Red Team) NO menciona el SOC", !salida.includes("del SOC de CiberCorp"));

// 6) Sin errores de consola en todo el flujo
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ whoami test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
