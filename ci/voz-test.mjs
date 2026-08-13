// voz-test.mjs — Test del RECONOCIMIENTO DE VOZ de Jimmy-IA
// Parte 1 (Node puro): `soportaVoz()` es false sin navegador (degradación
//   segura) y el módulo se importa sin romper.
// Parte 2 (E2E con mock): `preguntar` sin texto arranca la escucha; un
//   resultado reconocido se encadena a Jimmy; `preguntar off` cancela;
//   sin API de voz el juego avisa y no rompe. Sin errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { soportaVoz } from "../js/voz.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad (Node, sin navegador) ----------
check("soportaVoz() es false sin ventana del navegador", soportaVoz() === false);

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

await page.goto(BASE + "?voz=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Voz");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));

// 1) Sin API de voz (desactivada a propósito; Chromium headless la expone
// nativamente) → aviso claro, sin romper
await page.evaluate(() => {
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
});
let salida = await ejecutar("preguntar");
check("sin API de voz, `preguntar` avisa y no rompe", salida.includes("no soporta reconocimiento de voz"));

// 2) Inyectar un mock de reconocimiento (sobreescribe AMBAS: headless
// Chromium expone webkitSpeechRecognition nativamente y se preferiría).
await page.evaluate(() => {
  window.__vozLog = [];
  window.__rec = null;
  class MockSR {
    constructor() {
      window.__vozLog.push("new");
      this.lang = "";
      this.interimResults = true;
      this.maxAlternatives = 0;
      this.onresult = null; this.onerror = null; this.onend = null;
      window.__rec = this;
    }
    start() { window.__vozLog.push("start"); }
    stop() { window.__vozLog.push("stop"); }
  }
  window.SpeechRecognition = MockSR;
  window.webkitSpeechRecognition = MockSR;
});

salida = await ejecutar("preguntar");
const logTrasPreguntar = await page.evaluate(() => window.__vozLog.join(","));
check("`preguntar` sin texto arranca la sesión de voz", logTrasPreguntar.includes("new") && logTrasPreguntar.includes("start"));
check("la terminal muestra el indicador de escucha", salida.includes("PREGUNTA POR VOZ") && salida.includes("Habla ahora"));
const cfg = await page.evaluate(() => ({ lang: window.__rec.lang, interim: window.__rec.interimResults, alt: window.__rec.maxAlternatives }));
check("la sesión se configura en español, resultado final y 1 alternativa", cfg.lang === "es-ES" && cfg.interim === false && cfg.alt === 1);

// 3) Simular un resultado reconocido → Jimmy responde (la sesión sigue
// activa hasta onend, como en el navegador real entre resultado y cierre)
await page.evaluate(() => {
  window.__rec.onresult({ results: [[{ transcript: "¿qué hago ahora?" }]] });
});
await page.waitForTimeout(300);
salida = await page.locator("#terminal").innerText();
check("el texto reconocido se muestra como pregunta", salida.includes("TU PREGUNTA") && salida.includes("¿qué hago ahora?"));
check("Jimmy responde a la pregunta reconocida (pendientes)", salida.includes("Te faltan") && salida.includes("bloquear"));

// 4) Sesión activa: un segundo `preguntar` avisa
salida = await ejecutar("preguntar");
check("con sesión activa avisa de que ya escucha", salida.includes("Ya estoy escuchando"));

// 5) `preguntar off` cancela (y llama a stop del reconocedor)
salida = await ejecutar("preguntar off");
const logTrasOff = await page.evaluate(() => window.__vozLog.join(","));
check("`preguntar off` cancela la sesión", salida.includes("cancelado") && logTrasOff.includes("stop"));

// 6) Segundo `preguntar off` sin sesión activa
salida = await ejecutar("preguntar off");
check("`preguntar off` sin sesión informa", salida.includes("No hay sesión de voz activa"));

// 6b) Error 'no-speech' → mensaje mapeado y SIN el genérico duplicado
await ejecutar("voz");
await page.evaluate(() => { window.__rec.onerror({ error: "no-speech" }); window.__rec.onend(); });
await page.waitForTimeout(200);
salida = await page.locator("#terminal").innerText();
check("error no-speech → mensaje mapeado sin duplicado genérico", salida.includes("No he captado voz") && !salida.includes("No he captado nada"));

// 6c) Error 'network' → mensaje mapeado de red
await ejecutar("voz");
await page.evaluate(() => { window.__rec.onerror({ error: "network" }); window.__rec.onend(); });
await page.waitForTimeout(200);
salida = await page.locator("#terminal").innerText();
check("error network → mensaje de red", salida.includes("Error de red del servicio de voz"));

// 6d) Cancelar y luego onerror('aborted') → sin ruido tras el aviso
await ejecutar("voz");
await ejecutar("preguntar off");
const salidaAntesAbort = await page.locator("#terminal").innerText();
await page.evaluate(() => { window.__rec.onerror({ error: "aborted" }); window.__rec.onend(); });
await page.waitForTimeout(200);
salida = await page.locator("#terminal").innerText();
check("tras cancelar, onerror('aborted') no añade ruido", salida === salidaAntesAbort);

// 6e) Cancelar y luego onresult tardío → no imprime la pregunta
await ejecutar("voz");
await ejecutar("preguntar off");
const salidaAntesResult = await page.locator("#terminal").innerText();
await page.evaluate(() => { window.__rec.onresult({ results: [[{ transcript: "pregunta tardía" }]] }); });
await page.waitForTimeout(200);
salida = await page.locator("#terminal").innerText();
check("tras cancelar, un resultado tardío no se imprime", salida === salidaAntesResult);

// 6f) rec.start() que lanza → mensaje de no-iniciar sin romper
await page.evaluate(() => {
  class ThrowingSR {
    constructor() { this.lang = ""; this.interimResults = true; this.maxAlternatives = 0; this.onresult = null; this.onerror = null; this.onend = null; }
    start() { throw new Error("InvalidStateError"); }
    stop() {}
  }
  window.SpeechRecognition = ThrowingSR;
  window.webkitSpeechRecognition = ThrowingSR;
});
salida = await ejecutar("preguntar");
check("si start() lanza, avisa y no rompe", salida.includes("No se pudo iniciar el micrófono"));
// Restaurar el mock funcional (sin resetear __vozLog: el conteo de starts se acumula)
await page.evaluate(() => {
  window.__rec = null;
  class MockSR {
    constructor() { window.__vozLog.push("new"); this.lang = ""; this.interimResults = true; this.maxAlternatives = 0; this.onresult = null; this.onerror = null; this.onend = null; window.__rec = this; }
    start() { window.__vozLog.push("start"); }
    stop() { window.__vozLog.push("stop"); }
  }
  window.SpeechRecognition = MockSR;
  window.webkitSpeechRecognition = MockSR;
});

// 7) Alias `voz`, cierre normal y comando escrito
salida = await ejecutar("voz");
const logTrasVoz = await page.evaluate(() => window.__vozLog.join(","));
check("el alias `voz` arranca la escucha", logTrasVoz.split(",").filter((x) => x === "start").length >= 2);
await page.evaluate(() => { window.__rec.onend(); });
await page.waitForTimeout(200);
salida = await ejecutar("preguntar ¿qué es T1566?");
check("`preguntar <texto>` sigue respondiendo por escrito", salida.includes("Phishing") && salida.includes("MITRE"));

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ voz-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
