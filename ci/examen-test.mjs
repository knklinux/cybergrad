// examen-test.mjs — Test del MODO EXAMEN + CERTIFICADO
// Parte 1 (E2E): el comando `examen` arranca el modo con cabecera EXAMEN,
// bloquea `pista` y no produce errores de consola.
// Parte 2 (canvas en el navegador): el generador de certificados produce
// un PNG válido y el nombre de archivo se sanea (slug).
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

// Onboarding
await page.goto(BASE + "?examen=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Examen");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));

// Arrancar el examen
await ejecutar("examen");
await page.locator("#modal-content .modal-title", { hasText: "MODO EXAMEN" }).waitFor({ timeout: 10000 }).catch(() => falla("No se abrió el panel del examen"));
await page.locator('[data-action="empezar-examen"]').first().click();

await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó (examen)"));
await page.waitForTimeout(500);

let salida = await page.locator("#terminal").innerText();
check("la terminal muestra la cabecera EXAMEN", salida.includes("E X A M E N"));

// En el examen NO hay pistas
salida = await ejecutar("pista");
check("`pista` está bloqueado en el examen", salida.includes("No hay pistas en el examen"));

// Certificado: generación de PNG real en el navegador (canvas)
const cert = await page.evaluate(async () => {
  const m = await import("./js/certificado.js");
  const dataUrl = m.generarCertificadoPNG({
    nombre: "Ana García",
    rating: "S+",
    caso: "Phishing con macro",
    fecha: "2026-08-13",
    modo: "soc",
  });
  return { dataUrl, slug: m.slugNombre("Ana García <script>") };
});
check("el certificado genera un dataURL PNG", typeof cert.dataUrl === "string" && cert.dataUrl.startsWith("data:image/png;base64,"));
check("el PNG no está vacío (>10 KB en base64)", cert.dataUrl.length > 10000);
check("el nombre de archivo se sanea (slug sin espacios ni HTML)", cert.slug === "Ana-García-script" || /^[A-Za-z0-9_-]+$/.test(cert.slug));

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ examen-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
