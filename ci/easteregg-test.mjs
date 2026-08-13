// easteregg-test.mjs — Test del easter egg del nombre de CYBERGRAD
// Parte 1 (Node puro): `preguntarJimmy` responde la etimología del nombre
//   («grad» = ciudad en eslavo) por lenguaje natural, y solo cuando se
//   pregunta por el nombre (sin falsos positivos en otras preguntas).
// Parte 2 (E2E): el comando oculto `porque_cybergrad` funciona en la
//   terminal pero NO aparece en `ayuda` (easter egg de verdad), y
//   preguntarle a Jimmy por el nombre también responde.
// Sin errores de consola en todo el flujo.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { preguntarJimmy } from "../js/jimmy-ia.js";
import { PASOS_TUTORIAL } from "../js/tutorial.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Parte 1: Jimmy por lenguaje natural (Node puro) ----------
const ctxVacio = { caso: null, hecho: new Set(), modoRT: false };
const ctxConCaso = {
  caso: {
    id: "test-01", modo: "soc", titulo: "Phishing con macro", severidad: "ALTA",
    briefing: "Analiza el correo sospechoso y responde.",
    fs: {}, correos: [], alertas: [], leccion: { mitre: [] }, correctas: { escalar: true },
  },
  hecho: new Set(), modoRT: false,
};

let r = preguntarJimmy("¿por qué se llama cybergrad?", ctxVacio);
check("«por qué se llama cybergrad» explica la etimología", r.includes("ciudad") && r.includes("eslav") && r.includes("grad"));
check("la respuesta cita ejemplos de ciudades eslavas", r.includes("Leningrado") || r.includes("Volgogrado"));

r = preguntarJimmy("¿qué significa grad?", ctxConCaso);
check("«qué significa grad» también responde (con caso activo)", r.includes("ciudad") && r.includes("eslav"));

r = preguntarJimmy("¿cuál es el origen del nombre?", ctxVacio);
check("«origen del nombre» responde", r.includes("ciudad") && r.includes("CYBERGRAD"));

// Sin falsos positivos: preguntas normales NO deben hablar del origen
r = preguntarJimmy("¿qué hago ahora?", ctxConCaso);
check("«qué hago» NO dispara la etimología", !r.includes("eslav"));
r = preguntarJimmy("¿qué es T1566?", ctxConCaso);
check("una técnica MITRE NO dispara la etimología", !r.includes("eslav"));

// El tutorial (primera slide) también cuenta el origen del nombre
const slide1 = PASOS_TUTORIAL[0];
check("el tutorial abre con «¿QUÉ ES ESTO?»", slide1.titulo === "¿QUÉ ES ESTO?");
check("la primera slide explica grad = ciudad en eslavo", slide1.texto.includes("grad") && slide1.texto.includes("ciudad") && slide1.texto.includes("eslav"));
check("la primera slide revela el comando porque_cybergrad", slide1.texto.includes("porque_cybergrad"));

// ---------- Parte 2: E2E en la terminal ----------
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

await page.goto(BASE + "?easter=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => salir(1) || console.error("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-EasterEgg");
await page.click("#btn-empezar");

const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => salir(1) || console.error("La terminal no arrancó"));
await page.waitForTimeout(400);

// 1) El comando oculto funciona
let salida = await ejecutar("porque_cybergrad");
check("`porque_cybergrad` explica el origen", salida.includes("ciudad") && salida.includes("eslav") && salida.includes("grad"));
check("`porque_cybergrad` cita Leningrado/Volgogrado", salida.includes("Leningrado") || salida.includes("Volgogrado"));

// 2) Es un easter egg de verdad: NO aparece en `ayuda` (limpia antes para
//    que el eco del comando anterior no contamine la lectura)
await ejecutar("clear");
salida = await ejecutar("ayuda");
check("`ayuda` NO lista porque_cybergrad (oculto)", !salida.includes("porque_cybergrad"));

// 3) Jimmy también lo explica por lenguaje natural
salida = await ejecutar("preguntar porque se llama cybergrad");
check("Jimmy explica el nombre en la terminal", salida.includes("ciudad") && salida.includes("eslav"));

// 4) Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ easter egg test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
