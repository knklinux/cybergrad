// habilidades-test.mjs — Test del ÁRBOL DE HABILIDADES MITRE
// Parte 1 (Node puro): integridad de datos
//   - TODAS las técnicas citadas en las lecciones de los casos
//     (SOC y Red Team) existen en la KB de mitre.js
//   - el estado del árbol con todas las lecciones vistas domina
//     todas las técnicas
// Parte 2 (E2E): el botón abre el panel con las tácticas.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { CASOS } from "../js/casos.js";
import { RT_CASOS } from "../js/rt-casos.js";
import { TECNICAS } from "../js/mitre.js";
import { GAME } from "../js/state.js";
import { estadoHabilidades, limpiarCodigo } from "../js/habilidades.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// 1) Integridad de datos: cada código MITRE de los casos está en la KB
const faltan = [];
for (const c of [...CASOS, ...RT_CASOS]) {
  for (const raw of (c.leccion?.mitre) || []) {
    const code = limpiarCodigo(raw);
    if (!TECNICAS[code]) faltan.push(`${c.id} → ${raw}`);
  }
}
check("todas las técnicas de los casos existen en mitre.js", faltan.length === 0, faltan.join("; "));

// 2) Estado del árbol: sin lecciones vistas → 0 dominadas; con todas → todo dominado
GAME.lecciones = [];
GAME.rtLecciones = [];
let est = estadoHabilidades();
check("sin lecciones → 0 técnicas dominadas", est.dominadas === 0);
check("sin técnicas desconocidas (sinKb vacío)", est.sinKb.length === 0, est.sinKb.join(", "));

GAME.lecciones = CASOS.map((c) => c.id);
GAME.rtLecciones = RT_CASOS.map((c) => c.id);
est = estadoHabilidades();
check("con todas las lecciones → todo dominado", est.dominadas === est.total && est.total > 0);
const tacticasConChips = est.tacticas.filter((t) => t.tecnicas.length).length;
check("el árbol agrupa por tácticas", tacticasConChips >= 5);
const todasHechas = est.tacticas.every((t) => t.tecnicas.every((x) => x.hecha));
check("cada chip del árbol está marcado como dominado", todasHechas);

// Restaurar el estado (los tests comparten el proceso solo en su ejecución)
GAME.lecciones = [];
GAME.rtLecciones = [];

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

await page.goto(BASE + "?hab=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Habilidades");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));
await page.waitForTimeout(300);

// Abrir el árbol por botón
await page.click("#btn-habilidades");
await page.locator("#modal-content .modal-title", { hasText: "ÁRBOL DE HABILIDADES" }).waitFor({ timeout: 10000 }).catch(() => falla("No se abrió el panel de habilidades"));
const panel = await page.locator("#modal-content").innerText();
check("el panel muestra el progreso de técnicas", /técnicas dominadas/.test(panel));
check("el panel muestra tácticas MITRE", panel.includes("Reconocimiento") && panel.includes("Exfiltración"));
check("el panel muestra códigos de técnica", panel.includes("T1566") || panel.includes("T1110") || panel.includes("T1595"));

// Abrir el árbol por comando
await page.locator('[data-action="cerrar-habilidades"]').first().click().catch(() => {});
await page.click("#modal-overlay").catch(() => {});
await page.evaluate(() => { document.querySelector('[data-action="cerrar-habilidades"]')?.click(); });
await page.waitForTimeout(200);
await page.fill("#terminal input", "habilidades");
await page.press("#terminal input", "Enter");
await page.waitForTimeout(400);
await page.locator("#modal-content .modal-title", { hasText: "ÁRBOL DE HABILIDADES" }).waitFor({ timeout: 10000 }).catch(() => falla("El comando habilidades no abrió el panel"));

if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ habilidades-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
