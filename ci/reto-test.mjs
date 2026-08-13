// reto-test.mjs — Test del RETO DIARIO
// Parte 1 (Node puro): determinismo, seguridad y REVERSIBILIDAD de la
// variación por semilla
//   - misma semilla → mismo caso variado (determinismo)
//   - semilla distinta → indicadores distintos (IPs, hosts, DOMINIOS, CORREOS)
//   - invariante: TODAS las cadenas conservan su longitud (no rompe base64)
//   - idempotencia: variar dos veces = variar una vez
//   - reversibilidad: desvariarCaso(variado, mapas) reconstruye el original
// Parte 2 (E2E Playwright): el comando `reto` arranca el modo con la
// cabecera correcta, bloquea `pista` y no produce errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { CASOS } from "../js/casos.js";
import { RT_CASOS } from "../js/rt-casos.js";
import { variarCaso, variarCasoVerificado, retoDelDia, desvariarCaso, invertirMapas } from "../js/reto.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad: variación por semilla ----------
const base = CASOS[0]; // phishing-01: tiene IPs, hosts, dominios, correos y base64
const a1 = variarCaso(base, "2026-08-13").caso;
const a1b = variarCaso(base, "2026-08-13");
const a2 = variarCaso(base, "2026-08-13").caso;
const b1 = variarCaso(base, "2026-08-14").caso;
const json1 = JSON.stringify(a1);

check("misma semilla → mismo caso variado (JSON idéntico)", JSON.stringify(a1) === JSON.stringify(a2));
check("misma semilla → mismos mapas de variación", JSON.stringify([...a1b.mapas.dominio]) === JSON.stringify([...variarCaso(base, "2026-08-13").mapas.dominio]));
check("semilla distinta → caso distinto", json1 !== JSON.stringify(b1));
check("la IP del caso original cambia (185.220.101.34)", !json1.includes("185.220.101.34"));
check("los hosts cambian (HOST-104)", !json1.includes("HOST-104"));
check("el caso variado conserva el id de origen", a1.retoBaseId === base.id);
check("el modo se conserva (soc)", a1.modo !== "rt");

// ---------- Dominios y correos ----------
check("el dominio original cambia (acme-facturas.info)", !json1.includes("acme-facturas.info"));
check("el subdominio cambia (mail.acme-facturas.info)", !json1.includes("mail.acme-facturas.info"));
check("los correos cambian (m.garcia@acme.com)", !json1.includes("m.garcia@acme.com"));
check("el usuario del correo se conserva (m.garcia)", json1.includes("m.garcia"));
check("las URLs se varían solo en el dominio (http://.../payment.exe)", !json1.includes("http://acme-facturas.info") && json1.includes("/payment.exe"));
check("el whitelist protege archivos (alerts.json, proxy.log, powershell.exe)", json1.includes("alerts.json") && json1.includes("proxy.log") && json1.includes("powershell.exe"));
check("el whitelist protege el usuario m.garcia", json1.includes("m.garcia"));
// Los falsos positivos que no viven en el phishing se comprueban en los
// casos que sí los contienen: update.exe y r.gutierrez (caso-07 APT),
// l.fuentes (caso-08 insider).
const j7 = JSON.stringify(variarCaso(CASOS[6], "2026-08-13").caso);
const j8 = JSON.stringify(variarCaso(CASOS[7], "2026-08-13").caso);
check("el whitelist protege update.exe y r.gutierrez (caso-07)", j7.includes("update.exe") && j7.includes("r.gutierrez"));
check("el whitelist protege l.fuentes (caso-08)", j8.includes("l.fuentes"));

// El dominio de un correo comparte variante con el dominio suelto
const mapaDom = a1b.mapas.dominio;
check("el correo y el dominio suelto comparten variante", a1b.mapas.correo.get("facturacion@acme-facturas.info") === "facturacion@" + mapaDom.get("acme-facturas.info"));

// ---------- Reversibilidad ----------
// Biyección: ninguna variante se repite dentro de cada mapa
const biyectivo = (m) => new Set([...m.values()]).size === m.size && m.size > 0;
check("los mapas son biyectivos (sin variantes repetidas)", biyectivo(a1b.mapas.dominio) && biyectivo(a1b.mapas.correo) && biyectivo(a1b.mapas.ip) && biyectivo(a1b.mapas.host));

// Idempotencia estructural de dominios: las variantes nunca terminan en
// un TLD del whitelist, así que una segunda pasada no las re-variaría.
const TLDS_TEST = ["com", "co", "info", "top", "net", "xyz", "es", "onion", "local"];
const variantesDom = [...a1b.mapas.dominio.values()];
check("las variantes de dominio no son re-variables (TLD fuera del whitelist)", variantesDom.length > 0 && variantesDom.every((v) => !TLDS_TEST.includes(v.split(".").pop())));

// Inversa exacta: desvariarCaso reconstruye el caso original byte a byte
const reconstruido = desvariarCaso(a1, a1b.mapas);
check("desvariarCaso reconstruye el caso original exacto", JSON.stringify(reconstruido) === JSON.stringify(base));

// La inversa también funciona al revés (variante → original en el mapa)
const inv = invertirMapas(a1b.mapas);
check("invertirMapas devuelve variante → original", inv.dominio.get(mapaDom.get("acme-facturas.info")) === "acme-facturas.info" && inv.correo.get(a1b.mapas.correo.get("m.garcia@acme.com")) === "m.garcia@acme.com");

// Invariante de longitud + reversibilidad en TODOS los casos (SOC + RT)
let longOk = true;
let longErrs = [];
let revOk = true;
let revErr = "";
for (const c of [...CASOS, ...RT_CASOS]) {
  const { ok: lo, errores, mapas, caso } = variarCasoVerificado(c, "2026-08-13");
  if (!lo) { longOk = false; longErrs.push(c.id + ": " + errores.join("; ")); }
  try {
    const rec = desvariarCaso(caso, mapas);
    if (JSON.stringify(rec) !== JSON.stringify(c)) { revOk = false; revErr = c.id; }
  } catch (e) { revOk = false; revErr = c.id + " (" + e.message + ")"; }
}
check("invariante de longitud en TODOS los casos (SOC + RT)", longOk, longErrs.slice(0, 2).join(" | "));
check("reversibilidad exacta en TODOS los casos (SOC + RT)", revOk, revErr);

// La variación es estable entre llamadas con la misma semilla
const r1 = retoDelDia(new Date("2026-08-13T12:00:00Z"));
const r2 = retoDelDia(new Date("2026-08-13T23:59:59Z"));
check("el reto es estable durante todo el día", r1.fecha === r2.fecha && r1.baseId === r2.baseId);
check("retoDelDia devuelve caso variado", !!r1.caso && !!r1.caso.retoSemilla);
check("retoDelDia expone los mapas de variación", !!r1.mapas && r1.mapas.dominio instanceof Map);

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
