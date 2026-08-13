// reto-test.mjs — Test del RETO DIARIO
// Parte 1 (Node puro): determinismo y seguridad de la variación por semilla
//   - misma semilla → mismo caso variado (determinismo)
//   - semilla distinta → indicadores (IPs) distintos
//   - invariante: TODAS las cadenas conservan su longitud (no rompe base64)
// Parte 2 (E2E Playwright): el comando `reto` arranca el modo con la
// cabecera correcta, bloquea `pista` y no produce errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { CASOS } from "../js/casos.js";
import { variarCaso, variarCasoVerificado, retoDelDia } from "../js/reto.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad: variación por semilla ----------
const base = CASOS[0]; // phishing-01: tiene IPs, hosts y base64 de PowerShell
const a1 = variarCaso(base, "2026-08-13");
const a2 = variarCaso(base, "2026-08-13");
const b1 = variarCaso(base, "2026-08-14");

check("misma semilla → mismo caso variado (JSON idéntico)", JSON.stringify(a1) === JSON.stringify(a2));
check("semilla distinta → caso distinto", JSON.stringify(a1) !== JSON.stringify(b1));
check("la IP del caso original cambia (185.220.101.34)", !JSON.stringify(a1).includes("185.220.101.34"));
check("los hosts cambian (HOST-104)", !JSON.stringify(a1).includes("HOST-104"));
check("el caso variado conserva el id de origen", a1.retoBaseId === base.id);
check("el modo se conserva (soc)", a1.modo !== "rt");

// Invariante de longitud: verificación oficial sobre TODAS las cadenas
const { ok, errores } = variarCasoVerificado(base, "2026-08-13");
check("invariante de longitud en todo el caso", ok, errores.join("; "));

// La variación es estable entre llamadas con la misma semilla
const r1 = retoDelDia(new Date("2026-08-13T12:00:00Z"));
const r2 = retoDelDia(new Date("2026-08-13T23:59:59Z"));
check("el reto es estable durante todo el día", r1.fecha === r2.fecha && r1.baseId === r2.baseId);
check("retoDelDia devuelve caso variado", !!r1.caso && !!r1.caso.retoSemilla);

// ---------- E2E ----------
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

await page.goto(BASE + "?reto=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Reto");
await page.click("#btn-empezar");

const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));

// Arrancar el reto diario por comando
await ejecutar("reto");
await page.locator("#modal-content .modal-title", { hasText: "RETO DIARIO" }).waitFor({ timeout: 10000 }).catch(() => falla("No se abrió el panel del reto diario"));
await page.locator('[data-action="jugar-reto"]').first().click();

// Splash → briefing → terminal con la cabecera del reto
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó (reto)"));
await page.waitForTimeout(500);

let salida = await page.locator("#terminal").innerText();
check("la terminal muestra la cabecera RETO DIARIO", salida.includes("RETO DIARIO"));

// En el reto NO hay pistas
salida = await ejecutar("pista");
check("`pista` está bloqueado en el reto", salida.includes("No hay pistas en el reto diario"));

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ reto-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
