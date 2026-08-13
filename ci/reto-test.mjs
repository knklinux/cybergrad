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
import { variarCaso, variarCasoVerificado, retoDelDia, desvariarCaso, invertirMapas, registrarMarcaReto, esMejorMarca, filasRankingReto, resumenIndicadores } from "../js/reto.js";

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
check("las URLs se varían solo en el dominio (http://.../payment.exe)", !json1.includes("http://acme-facturas.info") && json1.includes("/payment.exe"));
check("powershell.exe suelto (sin ruta) sigue intacto", json1.includes("powershell.exe"));
check("la ruta /var/log/proxy.log varía como ruta (no como dominio)", !json1.includes("/var/log/proxy.log") && !!a1b.mapas.ruta.get("/var/log/proxy.log"));

// ---------- Usuarios con punto ----------
const uVar = a1b.mapas.usuario.get("m.garcia");
check("el usuario m.garcia varía", !!uVar && uVar !== "m.garcia");
check("la variante de usuario está en el caso (deshabilitar m.garcia incluido)", !!uVar && json1.includes(uVar));
check("la variante de usuario NO re-casa con el patrón (tiene dígito)", !!uVar && /\d/.test(uVar));
check("la variante de usuario conserva la longitud", !!uVar && uVar.length === "m.garcia".length);
const uVarCorreo = a1b.mapas.correo.get("m.garcia@acme.com");
check("el correo comparte el usuario variado", !!uVarCorreo && uVarCorreo.startsWith(uVar + "@"));
// El dominio de un correo comparte variante con el dominio suelto
const mapaDom = a1b.mapas.dominio;
check("el correo y el dominio suelto comparten variante", a1b.mapas.correo.get("facturacion@acme-facturas.info") === "facturacion@" + mapaDom.get("acme-facturas.info"));
// update.exe (archivo de varias letras) sigue intacto; los usuarios con
// punto de otros casos (r.gutierrez en caso-07, l.fuentes en caso-08) varían.
const j7 = JSON.stringify(variarCaso(CASOS[6], "2026-08-13").caso);
const j8 = JSON.stringify(variarCaso(CASOS[7], "2026-08-13").caso);
check("update.exe sigue protegido y r.gutierrez varía (caso-07)", j7.includes("update.exe") && !j7.includes("r.gutierrez"));
check("l.fuentes varía (caso-08)", !j8.includes("l.fuentes"));

// ---------- Rutas de archivo ----------
const rutaVar = a1b.mapas.ruta.get("/opt/siem/alerts.json");
check("la ruta /opt/siem/alerts.json varía", !!rutaVar && rutaVar !== "/opt/siem/alerts.json" && json1.includes(rutaVar));
check("la ruta conserva extensión y longitud", !!rutaVar && rutaVar.endsWith(".json") && rutaVar.length === "/opt/siem/alerts.json".length);
// Consistencia de segmentos DENTRO del mismo caso (rt-02: wordlists + su dir)
const rt2 = variarCaso(RT_CASOS[1], "2026-08-13");
const wlVar = rt2.mapas.ruta.get("/opt/wordlists/top1000.txt");
const wlDir = rt2.mapas.ruta.get("/opt/wordlists/");
const segOpt = rt2.mapas.segmento.get("opt");
check("rt-02: /opt/wordlists/top1000.txt varía conservando .txt", !!wlVar && wlVar.endsWith(".txt") && wlVar !== "/opt/wordlists/top1000.txt");
check("rt-02: el directorio /opt/wordlists/ comparte el segmento opt", !!wlDir && !!segOpt && wlDir.startsWith("/" + segOpt + "/") && wlVar.startsWith("/" + segOpt + "/"));
check("la ruta fija del motor no se varía (searchsploit)", JSON.stringify(variarCaso(RT_CASOS[3], "2026-08-13").caso).includes("/opt/exploitdb/searchsploit.txt"));
check("los directorios systemd con puntos quedan intactos (bruteforce-01)", JSON.stringify(variarCaso(CASOS[4], "2026-08-13").caso).includes("/etc/systemd/system/multi-user.target.wants/svc_scan.timer"));
check("las rutas variantes NO re-casan (dígito en todos los segmentos)", [...a1b.mapas.ruta.values()].every((v) => v.replace(/\/$/, "").split("/").filter(Boolean).every((s) => /\d/.test(s))));

// ---------- Reversibilidad ----------
// Biyección: ninguna variante se repite dentro de cada mapa
const biyectivo = (m) => new Set([...m.values()]).size === m.size && m.size > 0;
check("los mapas son biyectivos (sin variantes repetidas)", biyectivo(a1b.mapas.dominio) && biyectivo(a1b.mapas.correo) && biyectivo(a1b.mapas.ip) && biyectivo(a1b.mapas.host) && biyectivo(a1b.mapas.ruta) && biyectivo(a1b.mapas.usuario));

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

// Ficha «indicadores de hoy» (resumenIndicadores)
const inds = resumenIndicadores(r1.mapas);
check("resumenIndicadores devuelve filas solo para tokens cambiados", inds.length > 0 && inds.every((f) => f.original !== f.variante));
check("cada fila lleva tipo, original y variante", inds.every((f) => f.tipo && f.original && f.variante));
check("los tipos son IP/Host/Dominio/Correo/Ruta/Usuario", inds.every((f) => ["IP", "Host", "Dominio", "Correo", "Ruta", "Usuario"].includes(f.tipo)));
check("la ficha incluye rutas y usuarios variados", inds.some((f) => f.tipo === "Ruta") && inds.some((f) => f.tipo === "Usuario"));
const corr = inds.find((f) => f.tipo === "Correo");
if (corr) check("el usuario del correo se conserva en la ficha", corr.original.split("@")[0] === corr.variante.split("@")[0]);
const totalCambiados = [...r1.mapas.ip.entries(), ...r1.mapas.host.entries(), ...r1.mapas.dominio.entries(), ...r1.mapas.correo.entries(), ...r1.mapas.ruta.entries(), ...r1.mapas.usuario.entries()].filter(([o, v]) => o !== v).length;
check("la ficha cubre TODOS los tokens cambiados", inds.length === totalCambiados);
check("resumenIndicadores con mapas vacíos → []", resumenIndicadores({}).length === 0 && resumenIndicadores(null).length === 0);
check("la ficha es determinista (misma semilla → misma lista)", JSON.stringify(inds) === JSON.stringify(resumenIndicadores(retoDelDia(new Date("2026-08-13T12:00:00Z")).mapas)));

// ---------- Ranking local ----------
let hist = [];
hist = registrarMarcaReto({ fecha: "2026-08-13", casoId: "rt-05-mimikatz", titulo: "Mimikatz", rating: "A", segundos: 400 }, hist);
hist = registrarMarcaReto({ fecha: "2026-08-12", casoId: "caso-01-phishing", titulo: "Phishing", rating: "S", segundos: 300 }, hist);
check("el ranking registra marcas de días distintos", hist.length === 2);
check("el ranking ordena de más reciente a más antigua", hist[0].fecha === "2026-08-13" && hist[1].fecha === "2026-08-12");

hist = registrarMarcaReto({ fecha: "2026-08-13", casoId: "rt-05-mimikatz", titulo: "Mimikatz", rating: "S+", segundos: 380 }, hist);
check("repetir el día con mejor rating mejora la marca", hist.length === 2 && hist[0].rating === "S+");

hist = registrarMarcaReto({ fecha: "2026-08-13", casoId: "rt-05-mimikatz", titulo: "Mimikatz", rating: "S+", segundos: 200 }, hist);
check("mismo rating → gana el mejor tiempo", hist[0].segundos === 200);

hist = registrarMarcaReto({ fecha: "2026-08-12", casoId: "caso-01-phishing", titulo: "Phishing", rating: "B", segundos: 700 }, hist);
check("una marca peor no pisa la mejor del día", hist[1].rating === "S" && hist[1].segundos === 300);

check("esMejorMarca: S+ gana a S", esMejorMarca({ rating: "S+", segundos: 999 }, { rating: "S", segundos: 10 }));
check("esMejorMarca: mismo rating gana el menor tiempo", esMejorMarca({ rating: "A", segundos: 100 }, { rating: "A", segundos: 200 }));
check("esMejorMarca: sin marca previa siempre gana", esMejorMarca({ rating: "C", segundos: 999 }, null));

let h30 = [];
for (let d = 1; d <= 40; d++) {
  h30 = registrarMarcaReto({ fecha: `2026-10-${String(d).padStart(2, "0")}`, casoId: "caso-01-phishing", titulo: "Phishing", rating: "A", segundos: 500 }, h30);
}
check("el ranking guarda como máximo 30 marcas", h30.length === 30);
check("el ranking conserva los 30 días más recientes", h30[0].fecha === "2026-10-40" && h30[29].fecha === "2026-10-11");

const filas = filasRankingReto(hist);
check("filasRankingReto formatea el tiempo mm:ss", filas[0].tiempo === "3:20" && filas[1].tiempo === "5:00");

const rec = registrarMarcaReto({ fecha: "2026-08-11", casoId: "caso-02-bec", titulo: "BEC", rating: "S", segundos: 100 }, JSON.parse(JSON.stringify(hist)));
check("el historial sobrevive un round-trip de guardado", rec.length === 3 && rec[0].fecha === "2026-08-13");

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
const panelReto = await page.locator("#modal-content").innerText();
check("el panel del reto muestra el ranking local", panelReto.includes("RANKING LOCAL") && panelReto.includes("30 MARCAS"));
check("sin marcas el ranking muestra el estado vacío", panelReto.includes("Aún no hay marcas"));

// Ficha «indicadores de hoy» en el panel
const indsHoy = resumenIndicadores(retoDelDia().mapas);
check("el panel muestra la ficha INDICADORES DE HOY", panelReto.includes("INDICADORES DE HOY"));
if (indsHoy.length > 0) {
  check("la ficha pinta variantes con flecha original → variante", panelReto.includes("→"));
  check("la ficha pinta el primer original y su variante", panelReto.includes(indsHoy[0].original) && panelReto.includes(indsHoy[0].variante));
} else {
  check("sin indicadores variables el panel lo dice", panelReto.includes("nada cambia"));
}
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

// El comando ranking funciona desde la terminal (sin marcas → estado vacío)
salida = await ejecutar("ranking");
check("`ranking` muestra el estado vacío sin marcas", salida.includes("Sin marcas todavía"));

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

console.log(fail === 0 ? `✔ reto-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
