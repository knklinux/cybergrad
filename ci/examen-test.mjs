// examen-test.mjs — Test del MODO EXAMEN + CERTIFICADO
// Parte 1 (E2E): el comando `examen` arranca el modo con cabecera EXAMEN,
// bloquea `pista` y no produce errores de consola.
// Parte 2 (canvas en el navegador): el generador de certificados produce
// un PNG válido y el nombre de archivo se sanea (slug).
import { spawn } from "node:child_process";
import { chromium } from "playwright";

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

console.log(fail === 0 ? `✔ examen-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
