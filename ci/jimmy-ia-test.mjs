// jimmy-ia-test.mjs — Test de JIMMY CON IA (comando `preguntar`)
// Parte 1 (Node puro): respuestas deterministas sobre el caso actual
//   - «¿qué hago?» → lista los objetivos pendientes con su comando
//   - «¿qué es T1566?» → describe la técnica MITRE
//   - pregunta con un término de evidencia → cita la línea del archivo
//   - con todos los objetivos hechos → recomienda el informe
// Parte 2 (E2E): el comando `preguntar` responde en la terminal sin
// errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { preguntarJimmy, pendientesDelCaso } from "../js/jimmy-ia.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// Caso sintético de prueba (misma forma que los casos reales)
const caso = {
  id: "test-01",
  modo: "soc",
  titulo: "Phishing con macro",
  severidad: "ALTA",
  briefing: "Analiza el correo sospechoso y responde.",
  fs: {
    "/var/log/mail.log": "SPF: FAIL (no SPF record for acme-facturas.info)\nDKIM: NONE",
  },
  correos: [],
  alertas: [],
  leccion: { mitre: ["T1566.001", "T1204.002"] },
  correctas: {
    bloquear: ["dominio:acme-facturas.info"],
    aislar: ["host:HOST-104"],
    escalar: true,
  },
};

const ctxVacio = { caso, hecho: new Set(), modoRT: false };
const ctxCompleto = { caso, hecho: new Set(["bloquear:dominio:acme-facturas.info", "aislar:host:HOST-104", "escalar"]), modoRT: false };

// 1) Objetivos pendientes
const pend = pendientesDelCaso(caso, new Set());
check("pendientesDelCaso detecta 3 pendientes", pend.length === 3);
check("pendientes incluye el bloqueo del dominio", pend.some((p) => p.etiqueta === "dominio:acme-facturas.info" && p.comando.includes("bloquear")));
check("pendientes incluye escalar", pend.some((p) => p.tipo === "escalar"));
check("con todo hecho no hay pendientes", pendientesDelCaso(caso, ctxCompleto.hecho).length === 0);

// 2) ¿Qué hago?
let r = preguntarJimmy("¿qué hago ahora?", ctxVacio);
check("«qué hago» lista objetivos pendientes", r.includes("acme-facturas.info") && r.includes("bloquear"));
check("«qué hago» menciona el comando exacto", r.includes("`bloquear dominio:acme-facturas.info`"));
r = preguntarJimmy("¿qué hago?", ctxCompleto);
check("con todo hecho recomienda el informe", r.includes("informe"));

// 3) Técnicas MITRE
r = preguntarJimmy("¿qué es la técnica T1566?", ctxVacio);
check("describe T1566 (Phishing)", r.includes("Phishing"));
check("indica que es técnica del caso", r.includes("técnicas de este caso"));
r = preguntarJimmy("¿qué es T1490?", ctxVacio);
check("describe una técnica ajena al caso (T1490)", r.includes("Inhibit System Recovery"));

// 4) Búsqueda en evidencias
r = preguntarJimmy("¿dónde aparece acme-facturas.info?", ctxVacio);
check("busca en las evidencias y cita el archivo", r.includes("/var/log/mail.log") && r.includes("SPF: FAIL"));

// 5) Sin caso
r = preguntarJimmy("¿qué hago?", { caso: null, hecho: new Set(), modoRT: false });
check("sin caso da orientación inicial", r.includes("ver_caso") || r.includes("Empieza por"));

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

await page.goto(BASE + "?jimmy=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Jimmy");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));

await page.fill("#terminal input", "preguntar ¿qué hago?");
await page.press("#terminal input", "Enter");
await page.waitForTimeout(500);
const salida = await page.locator("#terminal").innerText();
check("E2E: `preguntar ¿qué hago?` responde en la terminal", salida.includes("JIMMY") && salida.includes("Te faltan"));

if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ jimmy-ia-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
