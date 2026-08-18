// piper-test.mjs — Test de la VOZ LOCAL de Jimmy (Piper TTS)
// Parte 1 (Node puro): funciones puras de js/piper.js —
//   limpiarParaTTS, separarChunks, urlSintesis y leerPing.
// Parte 2 (E2E Playwright): sin servidor, `piper` avisa sin romper y
//   el toggle del botón persiste en localStorage; con un servidor
//   Piper simulado en el puerto 8766 (o el real de Aion Sincro si ya
//   está corriendo) la voz se activa, `piper estado` lo reporta y
//   hablar() pide /synthesize. Los fallos de red esperados (sin
//   servidor) se filtran del chequeo de errores de consola.
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { chromium } from "playwright";
import {
  limpiarParaTTS, separarChunks, urlSintesis, leerPing,
} from "../js/piper.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};
const falla = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

// ---------- Parte 1: funciones puras (Node) ----------
console.log("── Parte 1 · funciones puras ──");

check(
  "limpiarParaTTS: quita negrita y código inline",
  limpiarParaTTS("Hola **Jimmy** `analista`") === "Hola Jimmy analista"
);
check(
  "limpiarParaTTS: decodifica entidades HTML",
  limpiarParaTTS("A &amp; B &lt;C&gt;") === "A & B <C>"
);
check(
  "limpiarParaTTS: colapsa saltos y espacios",
  limpiarParaTTS("  Con   saltos\n\n\tde línea  ") === "Con saltos de línea"
);
check(
  "limpiarParaTTS: quita enlaces markdown y conserva el texto",
  limpiarParaTTS("Mira [este log](http://x) ahora") === "Mira este log ahora"
);
check(
  "limpiarParaTTS: texto vacío o nulo → cadena vacía",
  limpiarParaTTS("") === "" && limpiarParaTTS(null) === ""
);

check(
  "separarChunks: texto corto → un solo fragmento",
  separarChunks("Hola Jimmy.").length === 1
);
check(
  "separarChunks: divide por oraciones sin cortar palabras",
  separarChunks("Primera frase. Segunda frase. Tercera frase.", 16).join("|") ===
    "Primera frase.|Segunda frase.|Tercera frase."
);
check(
  "separarChunks: texto vacío → lista vacía",
  separarChunks("   ").length === 0
);

const u1 = urlSintesis("Hola", {});
check(
  "urlSintesis: incluye /synthesize con text, voice y length_scale",
  u1.includes("/synthesize?") && u1.includes("text=Hola") &&
    u1.includes("voice=es_ES-sharvard-medium") && u1.includes("length_scale=1.05")
);
check(
  "urlSintesis: añade el token solo si existe",
  urlSintesis("Hola", { token: "abc" }).includes("token=abc") &&
    !urlSintesis("Hola", {}).includes("token=")
);
check(
  "urlSintesis: recorta la barra final de la URL base",
  urlSintesis("Hola", { url: "http://127.0.0.1:8766/" }).startsWith("http://127.0.0.1:8766/synthesize")
);

check(
  "leerPing: servidor ok con voces",
  (() => { const r = leerPing({ ok: true, piper: true, voices: ["es_ES-sharvard-medium"] }); return r.ok && r.voces.length === 1; })()
);
check(
  "leerPing: responde sin piper → no ok",
  leerPing({ ok: true, piper: false, voices: [] }).ok === false
);
check(
  "leerPing: null o basura → no ok y sin voces",
  leerPing(null).ok === false && leerPing(undefined).voces.length === 0 && leerPing({}).ok === false
);

// ---------- Parte 2: E2E ----------
console.log("── Parte 2 · E2E ──");

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

// --- Servidor Piper simulado en 127.0.0.1:8766 (el puerto que permite la CSP) ---
function wavSilencio(ms = 300, sampleRate = 22050) {
  const n = Math.floor((sampleRate * ms) / 1000);
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

const peticionesPiper = [];
let piperFake = null;
let piperReal = false; // si el puerto ya lo ocupa el servidor real de Aion

function crearPiperFake() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    peticionesPiper.push(u.pathname);
    const origin = req.headers.origin || "";
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    if (u.pathname === "/ping") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: "aion-sincro-piper", version: "1.0", piper: true, voices: ["es_ES-sharvard-medium", "es_ES-davefx-medium"] }));
      return;
    }
    if (u.pathname === "/synthesize") {
      res.writeHead(200, { "Content-Type": "audio/wav" });
      res.end(wavSilencio());
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

function puertoOcupado(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(true));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(false)));
  });
}

// Intentamos montar el fake en 8766. Si el puerto está ocupado, comprobamos
// si ya responde un Piper real (el de Aion Sincro): si es así, las
// comprobaciones de estado sirven igual; si es otra cosa, saltamos la
// parte online (en CI el puerto está libre y se cubre entera).
let onlineE2E = true;
if (await puertoOcupado(8766)) {
  try {
    const r = await fetch("http://127.0.0.1:8766/ping");
    const j = await r.json();
    piperReal = !!(j && j.ok && j.piper);
  } catch { piperReal = false; }
  if (!piperReal) {
    onlineE2E = false;
    console.log("  (aviso: 127.0.0.1:8766 está ocupado por un servidor que no es Piper — parte online omitida)");
  } else {
    console.log("  (aviso: se usa el servidor Piper real de Aion Sincro en 8766)");
  }
} else {
  piperFake = crearPiperFake();
  await new Promise((r) => piperFake.listen(8766, "127.0.0.1", r));
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });
const salir = async (codigo) => {
  await browser.close();
  if (piperFake) await new Promise((r) => piperFake.close(r));
  if (proc) proc.kill();
  process.exit(codigo);
};

const ejecutar = async (cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(400);
  return page.locator("#terminal").innerText();
};

// Onboarding (igual que el resto de tests E2E)
await page.goto(BASE + "?piper=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Piper");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));
await page.waitForTimeout(300);

// La voz está DESACTIVADA por defecto (sin peticiones de red espontáneas)
const vozGuardada = () => page.evaluate(() => localStorage.getItem("cybergrad_voz"));
check("la voz está desactivada por defecto", (await vozGuardada()) !== "on");

// Toggle por botón
await page.click("#btn-voz");
check("el botón activa la voz y persiste", (await vozGuardada()) === "on");
const btnVoz = await page.locator("#btn-voz").innerText();
check("el botón muestra el icono de voz activada", btnVoz.includes("🗣️"));

// Sin servidor (o con servidor): el comando responde sin romper
let salida = await ejecutar("piper estado");
check("`piper estado` responde con la cabecera de voz", salida.includes("Voz de Jimmy"));

if (onlineE2E) {
  check("`piper estado` detecta el servidor Piper", salida.includes("✅ responde"));
  check("`piper estado` lista las voces instaladas", salida.includes("es_ES-sharvard-medium"));

  // hablar() pide /synthesize con el texto limpio (solo con el fake: el real
  // de Aion no deja observar sus peticiones desde aquí)
  if (piperFake) {
    const hablo = await page.evaluate(async () => {
      const m = await import("/js/piper.js");
      await m.comprobarPiper();
      return m.hablar("Hola Jimmy");
    });
    check("hablar() devuelve true con el servidor simulado", hablo === true);
    const synth = peticionesPiper.filter((p) => p === "/synthesize");
    check("hablar() pidió /synthesize al servidor", synth.length >= 1, `(${peticionesPiper.join(", ")})`);
    const texto = await page.evaluate(async () => {
      const m = await import("/js/piper.js");
      return m.urlSintesis("Hola Jimmy", { url: m.urlPiper(), voz: m.vozPiper(), token: m.tokenPiper() });
    });
    check("la URL de síntesis lleva el texto", texto.includes("text=Hola+Jimmy"));
  }

  // Volver a silenciar por comando
  salida = await ejecutar("piper off");
  check("`piper off` silencia la voz", salida.includes("Voz de Jimmy silenciada"));
  check("el estado se persiste (off)", (await vozGuardada()) !== "on");
} else {
  check("`piper estado` indica que el servidor no responde", salida.includes("❌ no responde"));
}

// Sin errores de consola (se filtran los fallos de red esperados de la parte
// sin servidor: el navegador los loguea aunque el JS los capture)
const erroresReales = errs.filter((e) =>
  // Ruido esperado de la parte sin servidor (o con puerto ocupado por un
  // servidor ajeno): el navegador loguea el fallo de red / CORS aunque el
  // JS lo capture y degrade en silencio. Con el fake activo no aparecen.
  !e.includes("ERR_CONNECTION_REFUSED") &&
  !e.includes("Failed to load resource") &&
  !e.includes("net::ERR_") &&
  !e.includes("blocked by CORS policy")
);
if (erroresReales.length) {
  console.error("✖ Errores de consola inesperados:");
  for (const e of erroresReales) console.error("   " + e);
  await salir(1);
}

console.log(fail === 0 ? `✔ piper-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
await salir(fail === 0 ? 0 : 1);
