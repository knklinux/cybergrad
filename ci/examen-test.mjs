// examen-test.mjs — Test del MODO EXAMEN + CERTIFICADO
// Parte 1 (E2E): el comando `examen` arranca el modo con cabecera EXAMEN,
// bloquea `pista` y no produce errores de consola.
// Parte 2 (canvas en el navegador): el generador de certificados produce
// un PNG válido y el nombre de archivo se sanea (slug).
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { codigoVerificacion, validarCertificado } from "../js/certificado.js";

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

// Certificado PDF: imprimirCertificado rellena la zona de impresión con HTML
// real (texto seleccionable) y llama a window.print. La zona NO se vacía al
// imprimir (en headless window.print() dispara afterprint síncronamente y
// vaciar ahí dejaría el PDF en blanco): se sustituye en la siguiente llamada.
const pdf = await page.evaluate(async () => {
  const m = await import("./js/certificado.js");
  const llamadas = { n: 0 };
  const original = window.print;
  window.print = () => { llamadas.n++; };
  m.imprimirCertificado({
    nombre: "Ana García <script>alert(1)</script>",
    rating: "S+",
    caso: "Phishing con macro",
    fecha: "2026-08-13",
    modo: "soc",
  });
  const zonas = document.querySelectorAll("#cert-print-zone");
  const zona = zonas[0];
  const html = zona ? zona.innerHTML : "";
  const txt = zona ? zona.textContent : "";
  // Segunda llamada: sustituye el contenido, no duplica la zona.
  m.imprimirCertificado({ nombre: "Otro", rating: "A", caso: "y", fecha: "2026", modo: "rt" });
  const zonas2 = document.querySelectorAll("#cert-print-zone");
  const txt2 = zonas2[0] ? zonas2[0].textContent : "";
  window.print = original;
  return { llamadas: llamadas.n, html, txt, zonas: zonas.length, zonas2: zonas2.length, txt2 };
});
check("imprimirCertificado llama a window.print", pdf.llamadas === 2);
check("el certificado PDF es HTML con texto real (seleccionable)", pdf.html.includes("<div class=\"cert-nombre\">") && pdf.txt.includes("Ana García"));
check("el certificado PDF escapa HTML del nombre (XSS)", !pdf.html.includes("<script>") && pdf.html.includes("&lt;script&gt;"));
check("el certificado PDF incluye campaña y calificación", pdf.txt.includes("BLUE TEAM (SOC)") && pdf.txt.includes("S+"));
check("una segunda llamada sustituye el contenido sin duplicar la zona", pdf.zonas === 1 && pdf.zonas2 === 1 && pdf.txt2.includes("RED TEAM"));

// Verificación real de impresión: page.pdf() (Chromium headless) renderiza
// la zona de impresión (el CSS @media print oculta el resto del juego) y
// produce un PDF válido con contenido. Se puebla la zona directamente con
// htmlCertificado para no depender de la semántica de window.print() (que en
// headless es un no-op): el diálogo real lo abre el navegador del usuario.
await page.evaluate(async () => {
  const m = await import("./js/certificado.js");
  document.getElementById("cert-print-zone").innerHTML = m.htmlCertificado({
    nombre: "Ana García",
    rating: "S+",
    caso: "Phishing con macro",
    fecha: "2026-08-13",
    modo: "soc",
  });
});
const pdfBuf = await page.pdf({ format: "A4", landscape: true, printBackground: true });
const cabecera = pdfBuf.subarray(0, 8).toString();
check("page.pdf() genera un PDF válido (%PDF-1.4)", cabecera.startsWith("%PDF-"));
check("el PDF del certificado tiene contenido real (>8 KB)", pdfBuf.length > 8000);

// Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs) console.error("   " + e);
  salir(1);
}

// ---------- Unidad (Node): código de verificación del certificado ----------
// El módulo es puro (sin DOM), así que se importa directo en Node. El
// código debe ser determinista (mismos datos → mismo código) y la
// validación debe rechazar cualquier alteración del payload.
const cv1 = codigoVerificacion({ nombre: "Ana García", fecha: "2026-08-13", rating: "S+", modo: "soc" });
check("el código de verificación tiene formato CG-<payload>-<checksum>", /^CG-[A-Za-z0-9_-]+-[a-f0-9]{10}$/.test(cv1));
check("el código es determinista (mismos datos → mismo código)", cv1 === codigoVerificacion({ nombre: "Ana García", fecha: "2026-08-13", rating: "S+", modo: "soc" }));
check("el código cambia si cambia el rating", cv1 !== codigoVerificacion({ nombre: "Ana García", fecha: "2026-08-13", rating: "A", modo: "soc" }));
check("el código cambia si cambia el nombre", cv1 !== codigoVerificacion({ nombre: "Ana", fecha: "2026-08-13", rating: "S+", modo: "soc" }));
check("el código cambia si cambia la fecha", cv1 !== codigoVerificacion({ nombre: "Ana García", fecha: "2026-08-14", rating: "S+", modo: "soc" }));
const vOk = validarCertificado(cv1);
check("validarCertificado acepta un código íntegro", vOk.ok === true && vOk.datos.nombre === "Ana García" && vOk.datos.rating === "S+" && vOk.datos.modo === "soc");

// Alterar un carácter del payload (nombre) rompe la firma
const partes = cv1.split("-");
const payloadTocado = partes[1].slice(0, -1) + (partes[1].endsWith("A") ? "B" : "A");
const vAlterado = validarCertificado(`CG-${payloadTocado}-${partes[2]}`);
check("validarCertificado rechaza un payload alterado (firma no coincide)", vAlterado.ok === false && /checksum/.test(vAlterado.error));
check("validarCertificado rechaza formato inválido", validarCertificado("hola").ok === false);
check("validarCertificado rechaza código vacío", validarCertificado("").ok === false);

// ---------- Parte 3 (E2E): completar un examen REAL y verificar que el
// botón de certificado PDF se renderiza en el modal de resultado ----------
// `elegirCasoExamen()` usa Math.random(); lo forzamos a 0 para que elija
// TODOS_LOS_CASOS[0] = phishing-01 (caso plano, sin variar), que se resuelve
// con la secuencia conocida. Así se prueba la ruta completa: examen → caso →
// informe → modal con los botones 📜 PNG / 🖨️ PDF → imprimirCertificado.
const page2 = await browser.newPage();
const errs2 = [];
page2.on("pageerror", (e) => errs2.push(`[pageerror] ${e.message}`));
page2.on("console", (m) => { if (m.type() === "error") errs2.push(`[console] ${m.text()}`); });
await page2.addInitScript(() => {
  // Fuerza el índice 0 del examen (phishing-01). El resto del juego tolera
  // el 0 (p. ej. FX) sin romper el flujo.
  Math.random = () => 0;
});
await page2.goto(BASE + "?examen-real=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page2.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("Parte 3: no apareció el onboarding"));
await page2.fill("#input-nombre", "CI-ExamenReal");
await page2.click("#btn-empezar");
const aceptar2 = page2.locator('[data-action="aceptar-briefing"]');
await aceptar2.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar2.count()) await aceptar2.first().click();
await page2.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("Parte 3: la terminal no arrancó"));

await page2.fill("#terminal input", "examen");
await page2.press("#terminal input", "Enter");
await page2.locator("#modal-content .modal-title", { hasText: "MODO EXAMEN" }).waitFor({ timeout: 10000 }).catch(() => falla("Parte 3: no se abrió el panel del examen"));
await page2.locator('[data-action="empezar-examen"]').first().click();
await aceptar2.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar2.count()) await aceptar2.first().click();
await page2.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("Parte 3: la terminal no arrancó (examen)"));

// El caso forzado debe ser el phishing-01
const tituloCaso = await page2.locator("#terminal").innerText();
check("Parte 3: el examen elige el phishing-01 (stub Math.random)", tituloCaso.includes("Phishing"));

// Resolver el phishing-01 (misma secuencia que quiz-test)
const accionesExamen = [
  "bloquear dominio:acme-facturas.info",
  "bloquear ip:185.220.101.34",
  "bloquear url:http://acme-facturas.info/payment.exe",
  "bloquear dominio:paypal-verifica.top",
  "aislar HOST-104",
  "deshabilitar m.garcia",
  "escalar",
];
for (const a of accionesExamen) {
  await page2.fill("#terminal input", a);
  await page2.press("#terminal input", "Enter");
  await page2.waitForTimeout(300);
}

// Informe con cobertura completa → ENTREGAR
await page2.fill("#terminal input", "informe");
await page2.press("#terminal input", "Enter");
const txtarea2 = page2.locator("#informe-texto");
if (!(await txtarea2.count())) falla("Parte 3: el comando informe no abrió el textarea");
await txtarea2.fill([
  "Incidente de phishing confirmado con macro.",
  "IOCs: acme-facturas.info, 185.220.101.34,",
  "http://acme-facturas.info/payment.exe, paypal-verifica.top.",
  "Host HOST-104 aislado, cuenta m.garcia deshabilitada.",
  "Escalar a CSIRT.",
].join("\n"));
await page2.locator('[data-action="enviar-informe"]').click();
await page2.locator("#modal-content .modal-title", { hasText: "EXAMEN" }).waitFor({ timeout: 15000 }).catch(() => falla("Parte 3: no apareció el resultado del examen"));

const modal = await page2.locator("#modal-content").innerText();
check("Parte 3: el examen se aprueba (A o mejor)", /CALIFICACIÓN (S\+|S|A)/.test(modal));
const btnPng = page2.locator('[data-action="descargar-certificado"]');
const btnPdf = page2.locator('[data-action="imprimir-certificado"]');
check("Parte 3: el botón 📜 PNG se renderiza en el modal", (await btnPng.count()) === 1);
check("Parte 3: el botón 🖨️ PDF se renderiza en el modal", (await btnPdf.count()) === 1);

// Clic en el botón PDF: llama a imprimirCertificado → window.print + zona de impresión
const pdfClick = await page2.evaluate(async () => {
  const llamadas = { n: 0 };
  const original = window.print;
  window.print = () => { llamadas.n++; };
  document.querySelector('[data-action="imprimir-certificado"]').click();
  await new Promise((r) => setTimeout(r, 100));
  const zona = document.getElementById("cert-print-zone");
  const txt = zona ? zona.textContent : "";
  window.print = original;
  return { n: llamadas.n, txt };
});
check("Parte 3: el botón PDF llama a imprimirCertificado (window.print)", pdfClick.n >= 1);
check("Parte 3: la zona de impresión se puebla con el certificado", pdfClick.txt.includes("CERTIFICADO DE EXAMEN") && pdfClick.txt.includes("CI-ExamenReal"));
check("Parte 3: el certificado PDF escapa el HTML del nombre (XSS)", !pdfClick.txt.includes("<script>"));

// El certificado lleva su código de verificación (CG-…) en el pie
const codigoEnPdf = (pdfClick.txt.match(/CG-[A-Za-z0-9_-]+-[a-f0-9]{10}/) || [])[0] || "";
check("Parte 3: el PDF muestra el código de verificación CG-…", /^CG-[A-Za-z0-9_-]+-[a-f0-9]{10}$/.test(codigoEnPdf));

// Jimmy valida el código con el comando real del juego (ruta E2E completa)
await page2.fill("#terminal input", `verificar_certificado ${codigoEnPdf}`);
await page2.press("#terminal input", "Enter");
await page2.waitForTimeout(400);
let salidaCert = await page2.locator("#terminal").innerText();
check("Parte 3: Jimmy valida el certificado como auténtico", salidaCert.includes("Certificado auténtico"));
check("Parte 3: la validación muestra el titular", salidaCert.includes("CI-ExamenReal"));
check("Parte 3: la validación muestra la nota y la campaña", /Nota:\s+[SAB][+]?\s*\(BLUE TEAM/.test(salidaCert));

// Un código con la firma rota debe ser rechazado por el comando
const codigoRoto = codigoEnPdf.slice(0, -1) + (codigoEnPdf.endsWith("0") ? "1" : "0");
await page2.fill("#terminal input", `verificar_certificado ${codigoRoto}`);
await page2.press("#terminal input", "Enter");
await page2.waitForTimeout(400);
salidaCert = await page2.locator("#terminal").innerText();
check("Parte 3: Jimmy rechaza un certificado con la firma alterada", salidaCert.includes("NO válido") && /checksum|alterado/.test(salidaCert));

// Sin errores de consola en la parte 3
if (errs2.length) {
  console.error("✖ Errores de consola (Parte 3):");
  for (const e of errs2.slice(0, 8)) console.error("   " + e);
  salir(1);
}
check("Parte 3: sin errores de consola", true);
await page2.close();

console.log(fail === 0 ? `✔ examen-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
