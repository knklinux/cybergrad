// pivot-test.mjs — Test del ATAQUE ADAPTATIVO (pivote del atacante)
// Parte 1 (Node puro): estructura de los pivots declarados en los casos y
//   la DECISIÓN pura de `prepararPivot` (sin efectos): contenido a tiempo →
//   no pivota; sin contener → pivota con los objetivos nuevos; ya pivotado
//   → no repite; sin pivot → no hace nada.
// Parte 2 (E2E Playwright): con el hook `?pivotEn=N` (comprime el tiempo):
//   - escenario A: si NO contienes, el pivote salta (terminal + checklist
//     con el host nuevo) sin errores de consola.
//   - escenario B: si contienes el objetivo origen a tiempo, el pivote NO
//     salta y el checklist no gana objetivos.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { CASOS } from "../js/casos.js";
import { prepararPivot, validarPivot } from "../js/pivot.js";
import { variarCaso } from "../js/reto.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad: estructura de los pivots ----------
const conPivot = CASOS.filter((c) => c.pivot);
check("hay casos con pivote (>= 3)", conPivot.length >= 3, `(solo ${conPivot.length})`);

let estructuraOK = true;
let estructuraErr = [];
for (const c of conPivot) {
  const errs = validarPivot(c);
  if (errs.length) { estructuraOK = false; estructuraErr.push(c.id + ": " + errs.join(" | ")); }
}
check("los pivots de todos los casos son estructuralmente válidos", estructuraOK, estructuraErr.slice(0, 3).join(" ; "));

// ---------- Unidad: decisión pura de prepararPivot ----------
const c1 = CASOS[0]; // phishing: pivot siNo = "aislar:host:HOST-104"
const hechoContenido = new Set(["aislar:host:HOST-104"]);
const hechoVacio = new Set();

let r = prepararPivot(c1, hechoContenido);
check("contenido a tiempo → NO pivota", r.aplicar === false && r.motivo === "contenido-a-tiempo");

r = prepararPivot(c1, hechoVacio);
check("sin contener → pivota", r.aplicar === true);
check("el pivote trae los objetivos nuevos", Array.isArray(r.nuevas.aislar) && r.nuevas.aislar.includes("host:HOST-108"));
check("el pivote trae alerta y penalización", !!r.alerta && r.alerta.titulo && r.penalizacion > 0);

r = prepararPivot({ ...c1, pivoteado: true }, hechoVacio);
check("ya pivotado → no repite", r.aplicar === false && r.motivo === "ya-pivoteado");

r = prepararPivot({ ...CASOS[1] }, hechoVacio); // caso sin pivot
check("sin pivot → no hace nada", r.aplicar === false && r.motivo === "sin-pivot");

// Simulación de la aplicación (lo que hace el motor): los objetivos nuevos
// se fusionan en correctas y las claves de checklist que exigirán el informe
const sim = JSON.parse(JSON.stringify(c1));
const res = prepararPivot(sim, hechoVacio);
for (const [tipo, valores] of Object.entries(res.nuevas)) {
  if (!sim.correctas[tipo]) sim.correctas[tipo] = [];
  for (const v of valores) sim.correctas[tipo].push(v);
}
check("los objetivos nuevos se fusionan en correctas", sim.correctas.aislar.includes("host:HOST-108"));
check("el informe ahora exige el objetivo nuevo (clave aislar:host:HOST-108)", sim.correctas.aislar.some((x) => "aislar:" + x === "aislar:host:HOST-108"));
// El pivote respeta el reto diario: al variar el caso, el host nuevo se varía igual
const variado = variarCaso(c1, "2026-08-13").caso;
check("el pivote sobrevive a la variación del reto (host nuevo presente)", variado.pivot && Array.isArray(variado.pivot.correctas.aislar));

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
const errs = [];
const onErr = (page) => {
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });
};
const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });

const iniciarPartida = async (url) => {
  const page = await browser.newPage();
  onErr(page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
  await page.fill("#input-nombre", "CI-Pivot");
  await page.click("#btn-empezar");
  const aceptar = page.locator('[data-action="aceptar-briefing"]');
  await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
  if (await aceptar.count()) await aceptar.first().click();
  await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));
  return page;
};
const ejecutar = async (page, cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(400);
  return page.locator("#terminal").innerText();
};

// ---------- Escenario A: NO contienes → el pivote salta ----------
{
  const page = await iniciarPartida(BASE + "?pivotEn=6&pv=" + Date.now());
  await page.waitForFunction(
    () => document.querySelector("#terminal")?.innerText.includes("ATAQUE ADAPTATIVO"),
    null,
    { timeout: 15000 }
  ).catch(() => {});
  const salida = await page.locator("#terminal").innerText();
  check("A · no contienes → el pivote salta en la terminal", salida.includes("ATAQUE ADAPTATIVO") && salida.includes("HOST-108"));
  const checklist = await page.locator("#checklist").innerText();
  check("A · el checklist gana el host nuevo (HOST-108)", checklist.includes("HOST-108"));
  await page.close();
}

// ---------- Escenario B: contienes a tiempo → NO hay pivote ----------
{
  const page = await iniciarPartida(BASE + "?pivotEn=8&pv=" + Date.now());
  await ejecutar(page, "aislar HOST-104");
  await page.waitForTimeout(11000);
  const salida = await page.locator("#terminal").innerText();
  check("B · contienes a tiempo → NO hay ataque adaptativo", !salida.includes("ATAQUE ADAPTATIVO"));
  const checklist = await page.locator("#checklist").innerText();
  check("B · el checklist NO gana el host nuevo", !checklist.includes("HOST-108"));
  check("B · la contención se registró", salida.includes("aislado"));
  await page.close();
}

// Sin errores de consola en ningún escenario
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs.slice(0, 8)) console.error("   " + e);
  salir(1);
}
check("sin errores de consola", true);

console.log(fail === 0 ? `✔ pivot-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
