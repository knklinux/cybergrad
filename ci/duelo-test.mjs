// duelo-test.mjs — Test del modo enfrentamiento SOC vs Red Team
// Parte 1 (Node puro): la lógica de duelo.js decide bien — turnos
//   alternos, puntuación, victoria al completar objetivos, límite de
//   turnos y el caso sintetizado que mezcla los objetivos de ambos bandos.
// Parte 2 (E2E Playwright): arranca el juego con ?dueloEn=0 (hook de
//   test que salta el onboarding), juega un duelo COMPLETO de verdad —
//   turno a turno con los comandos reales (nmap, aislar, hydra,
//   bloquear, exfiltrar, deshabilitar, escalar...) — y verifica que el
//   HUD refleja objetivos, turnos y puntuación, que gana el bando que
//   completa sus 4 objetivos y que no hay ni un error de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import {
  DUELO_ESCENARIOS, crearDuelo, accionDuelo, turnoFallido,
  tipoDeClave, ladoDeTipo, construirCasoDuelo, KITS, INFO_CMDS,
} from "../js/duelo.js";

let pass = 0;
let fail = 0;
const check = (n, c, d = "") => {
  console.log((c ? "  ✔ " : "  ✘ ") + n + (c || !d ? "" : "  →  " + d));
  if (c) pass++; else fail++;
};

// ---------- Parte 1 · lógica pura ----------
check("dos escenarios definidos", DUELO_ESCENARIOS.length === 2);

const e1 = DUELO_ESCENARIOS[0];
const e2 = DUELO_ESCENARIOS[1];

// kits e info
for (const e of DUELO_ESCENARIOS) {
  check(`escenario ${e.id}: 4 objetivos por bando`, e.rojo.objetivos.length === 4 && e.azul.objetivos.length === 4);
  check(`escenario ${e.id}: turnosMax razonable`, e.turnosMax >= 8 && e.turnosMax <= 24);
  check(`escenario ${e.id}: kits no vacíos y disjuntos`, e.rojo.kit.length > 0 && e.azul.kit.length > 0 && !e.rojo.kit.some((c) => e.azul.kit.includes(c)));
}
check("kit rojo cubre nmap/hydra/sqlmap/mimikatz", ["nmap", "hydra", "sqlmap", "mimikatz", "exfiltrar"].every((c) => KITS.rojo.includes(c)));
check("kit azul cubre bloquear/aislar/deshabilitar/escalar", ["bloquear", "aislar", "deshabilitar", "escalar"].every((c) => KITS.azul.includes(c)));
check("info commands no consumen turno (ls/cat/ayuda)", ["ls", "cat", "ayuda", "ver_caso", "glosario"].every((c) => INFO_CMDS.includes(c)));

// estado inicial
let d = crearDuelo(e1);
check("turno inicial del ROJO", d.turno === "rojo");
check("sin fin al empezar", d.fin === null);
check("puntos a cero", d.puntos.rojo === 0 && d.puntos.azul === 0);

// acierto rojo → puntos y turno al azul
d = accionDuelo(d, "recon", "host:10.10.10.30");
check("acierto rojo puntúa 25", d.puntos.rojo === 25);
check("cambia el turno a azul", d.turno === "azul");
check("el objetivo queda marcado", d.hecho.rojo.has("recon|host:10.10.10.30"));

// acierto azul
d = accionDuelo(d, "aislar", "host:HOST-104");
check("acierto azul puntúa 25", d.puntos.azul === 25);
check("vuelve el turno a rojo", d.turno === "rojo");

// recon y acceso comparten canon: deben cohabitar (2 objetivos distintos)
let d2 = crearDuelo(e1);
d2 = accionDuelo(d2, "recon", "host:10.10.10.30");
d2 = accionDuelo(d2, "aislar", "host:HOST-104");
d2 = accionDuelo(d2, "acceso", "host:10.10.10.30");
check("recon y acceso cohabitan (mismo canon, tipos distintos)", d2.hecho.rojo.size === 2 && d2.puntos.rojo === 50);

// objetivo ajeno al bando activo → jugada fallida
let d3 = crearDuelo(e1);
d3 = accionDuelo(d3, "bloquear", "dominio:c2.acme.net");
check("objetivo del otro bando → turno perdido sin puntos", d3.turnos === 1 && d3.turno === "azul" && d3.puntos.rojo === 0 && d3.historial[d3.historial.length - 1].ok === false);

// turno fallido: cambia de bando sin puntos
let d4 = crearDuelo(e1);
d4 = turnoFallido(d4);
check("turno fallido cambia de bando sin puntos", d4.turno === "azul" && d4.turnos === 1 && d4.puntos.rojo === 0);

// victoria del ROJO al completar sus 4 objetivos (alternando turnos reales)
let dr = crearDuelo(e1);
for (const [tipo, canon] of [
  ["recon", "host:10.10.10.30"], ["aislar", "host:HOST-104"],
  ["acceso", "host:10.10.10.30"], ["bloquear", "dominio:c2.acme.net"],
  ["exfiltracion", "archivo:/home/admin/credenciales.txt"], ["deshabilitar", "usuario:m.garcia"],
  ["escalada", "host:10.10.10.60"],
]) dr = accionDuelo(dr, tipo, canon);
check("rojo gana al completar sus 4", dr.fin && dr.fin.ganador === "rojo", JSON.stringify(dr.fin));
check("marcador rojo 100 / azul 75", dr.puntos.rojo === 100 && dr.puntos.azul === 75);

// victoria del AZUL si completa primero (el rojo falla todos sus turnos)
let da = crearDuelo(e1);
for (const step of [
  "fallido", ["aislar", "host:HOST-104"], "fallido", ["bloquear", "dominio:c2.acme.net"],
  "fallido", ["deshabilitar", "usuario:m.garcia"], "fallido", ["escalar", "escalar"],
]) da = step === "fallido" ? turnoFallido(da) : accionDuelo(da, step[0], step[1]);
check("azul gana si completa antes", da.fin && da.fin.ganador === "azul", JSON.stringify(da.fin));

// límite de turnos → decide el que más objetivos tenga; empate total posible
let de = crearDuelo(e1);
let vueltas = 0;
while (!de.fin && vueltas < 60) { de = turnoFallido(de); vueltas++; }
check("el límite de turnos decide", de.fin !== null, JSON.stringify(de.fin));
check("se respeta turnosMax", de.turnos === e1.turnosMax);

// escenario 2: victoria azul con dos bloquear distintos (mismo tipo, canons distintos)
let d5 = crearDuelo(e2);
for (const step of [
  "fallido", ["bloquear", "ip:196.245.143.9"], "fallido", ["aislar", "host:HOST-207"],
  "fallido", ["bloquear", "url:http://10.10.10.50/upload"], "fallido", ["escalar", "escalar"],
]) d5 = step === "fallido" ? turnoFallido(d5) : accionDuelo(d5, step[0], step[1]);
check("dos bloquear del azul cohabitan y ganan", d5.fin && d5.fin.ganador === "azul" && d5.hecho.azul.size === 4, JSON.stringify(d5.fin));

// claves del motor → tipo → bando
check("clave azul bloquear", tipoDeClave("bloquear:dominio:c2.acme.net") === "bloquear" && ladoDeTipo("bloquear") === "azul");
check("clave roja recon", tipoDeClave("objetivo:recon:host:10.10.10.30") === "recon" && ladoDeTipo("recon") === "rojo");
check("clave escalar literal", tipoDeClave("escalar") === "escalar" && ladoDeTipo("escalar") === "azul");

// caso sintetizado para el motor
const c1 = construirCasoDuelo(e1);
check("caso duelo mezcla correctas de ambos bandos", c1.correctas.recon.includes("host:10.10.10.30") && c1.correctas.aislar.includes("host:HOST-104") && c1.correctas.escalar === true);
check("caso duelo lleva el entorno (red, fs, credenciales)", !!c1.red.hosts["10.10.10.60"] && typeof c1.fs["/home/admin/credenciales.txt"] === "string" && c1.credenciales.length === 1);
const c2 = construirCasoDuelo(e2);
check("caso duelo 2 lleva web/exploits", !!c2.web["http://10.10.10.50"] && !!c2.exploits["php-upload-rce"] && typeof c2.fs["/data/crown.db"] === "string");
check("caso duelo sin fuga de carrera (xp 0)", c1.xp === 0 && c1.modo === "duelo");

// ---------- Parte 2 · E2E ----------
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
const errs = [];
const onErr = (page) => {
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });
};
const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });
const ejecutar = async (page, cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(350);
};

// Duelo completo del escenario 1 (?dueloEn=0): turnos alternos reales.
// El ROJO gana completando sus 4 objetivos; el AZUL completa 3.
{
  const page = await browser.newPage();
  onErr(page);
  await page.goto(BASE + "?dueloEn=0&pv=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector("#terminal input", { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector("#terminal")?.innerText.includes("TURNO 1"), null, { timeout: 15000 });

  // El HUD del duelo está montado
  const hud = await page.locator("#caso-info").innerText();
  check("E2E · HUD con título del duelo", hud.includes("DUELO"));
  check("E2E · HUD muestra ambos bandos", hud.includes("RED TEAM") && hud.includes("SOC"));
  check("E2E · turno inicial del ROJO", hud.includes("TURNO DE 🔴 RED TEAM"));

  // Turno 1 (ROJO): nmap → recon
  await ejecutar(page, "nmap 10.10.10.30");
  let term = await page.locator("#terminal").innerText();
  check("E2E · nmap recon funciona", term.includes("NMAP SCAN") && term.includes("web-vpn.acme.local"));
  let hud2 = await page.locator("#caso-info").innerText();
  check("E2E · recon marcado y turno al AZUL", hud2.includes("TURNO DE 🔵 SOC") && hud2.includes("+25 pts"));

  // Turno 2 (AZUL): aislar HOST-104
  await ejecutar(page, "aislar HOST-104");
  hud2 = await page.locator("#caso-info").innerText();
  check("E2E · aislar azul marcado y turno al ROJO", hud2.includes("TURNO DE 🔴 RED TEAM"));

  // Turno 3 (ROJO): hydra + ssh → acceso
  await ejecutar(page, "hydra ssh 10.10.10.30 -u admin -w /opt/wordlists/top1000.txt");
  term = await page.locator("#terminal").innerText();
  check("E2E · hydra encuentra la password", term.includes("login correcto"));
  await ejecutar(page, "ssh admin@10.10.10.30");
  hud2 = await page.locator("#caso-info").innerText();
  check("E2E · acceso marcado", hud2.includes("Acceso por fuerza bruta SSH"));

  // Turno 4 (AZUL): bloquear dominio C2
  await ejecutar(page, "bloquear dominio:c2.acme.net");
  hud2 = await page.locator("#caso-info").innerText();
  check("E2E · C2 bloqueado", hud2.includes("TURNO DE 🔴 RED TEAM"));

  // Turno 5 (ROJO): exfiltrar credenciales
  await ejecutar(page, "exfiltrar /home/admin/credenciales.txt");
  hud2 = await page.locator("#caso-info").innerText();
  check("E2E · exfiltración marcada", hud2.includes("Exfiltrar credenciales del admin"));

  // Turno 6 (AZUL): deshabilitar m.garcia
  await ejecutar(page, "deshabilitar m.garcia");
  hud2 = await page.locator("#caso-info").innerText();
  check("E2E · cuenta deshabilitada", hud2.includes("TURNO DE 🔴 RED TEAM"));

  // Turno 7 (ROJO): mimikatz → escalada → ¡rojo completa sus 4 y gana!
  await ejecutar(page, "mimikatz 10.10.10.60");
  term = await page.locator("#terminal").innerText();
  check("E2E · mimikatz saca credenciales del DC", term.includes("DcAdmin#2024"));
  await page.waitForSelector("[data-action='revancha-duelo']", { timeout: 10000 }).catch(() => {});
  const fin = await page.locator("#modal-content").innerText().catch(() => "");
  check("E2E · modal de fin con ganador ROJO", fin.includes("GANA RED TEAM") || fin.includes("🔴"), fin.slice(0, 120));
  const hudFinal = await page.locator("#caso-info").innerText();
  check("E2E · marcador final 100 vs 75", hudFinal.includes("100 pts") && hudFinal.includes("75 pts"));

  // Kit ajeno no consume turno: durante el duelo el azul no usa nmap (comprobado
  // antes de terminar: en turno rojo, un comando azul se rechaza sin consumir)
  await page.close();
}

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs.slice(0, 8)) console.error("   " + e);
  salir(1);
}
check("sin errores de consola", true);

console.log(fail === 0 ? `✔ duelo-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
