// ============================================================
// certificado.js — Certificado de examen de CYBERGRAD
// Dos formatos, mismo diseño y mismos datos:
//   1. PNG  — se dibuja en un <canvas> (1400×900) y se descarga
//             como imagen raster (para compartir / pegar).
//   2. PDF  — se renderiza como HTML real (texto seleccionable y
//             editable, apto para carreras oficiales) y se abre
//             el diálogo de impresión del navegador (window.print).
// Se genera al aprobar el modo examen (rating A o mejor). Módulo
// sin dependencias: funciona en el navegador y es testeable con
// Playwright (page.evaluate).
// ============================================================

// Escapa texto de usuario antes de interpolar en el HTML del
// certificado (mismo criterio que esc() en ui.js: sin XSS en el
// nombre del analista). Función pura, testeable en Node.
const escHTML = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

// Convierte un nombre en un slug seguro para nombre de archivo
// (sin espacios, sin caracteres raros, sin rutas, sin extensión).
export function slugNombre(nombre) {
  return String(nombre ?? "analista")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "analista";
}

const ANCHO = 1400;
const ALTO = 900;

export function dibujarCertificado(ctx, datos) {
  const d = datos || {};
  const nombre = String(d.nombre || "Analista");
  const rating = String(d.rating || "A");
  const caso = String(d.caso || "");
  const fecha = String(d.fecha || "");
  const modo = String(d.modo || "SOC");

  // Fondo
  ctx.fillStyle = "#050d0a";
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Marco interior
  ctx.strokeStyle = "#1f5c33";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, ANCHO - 60, ALTO - 60);
  ctx.strokeStyle = "#123a21";
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, ANCHO - 92, ALTO - 92);

  // Cabecera
  ctx.textAlign = "center";
  ctx.fillStyle = "#33ff66";
  ctx.font = "bold 64px 'Orbitron', 'Segoe UI', sans-serif";
  ctx.fillText("CYBERGRAD", ANCHO / 2, 150);

  ctx.fillStyle = "#8fd39e";
  ctx.font = "22px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("SIMULADOR DE CARRERA SOC + RED TEAM", ANCHO / 2, 196);

  ctx.fillStyle = "#eafff0";
  ctx.font = "bold 40px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("CERTIFICADO DE EXAMEN", ANCHO / 2, 262);

  // Cuerpo
  ctx.fillStyle = "#8fd39e";
  ctx.font = "24px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("se certifica que", ANCHO / 2, 330);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px 'Orbitron', 'Segoe UI', sans-serif";
  ctx.fillText(nombre, ANCHO / 2, 396);

  ctx.fillStyle = "#8fd39e";
  ctx.font = "24px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("ha superado el examen de la campaña", ANCHO / 2, 446);

  ctx.fillStyle = "#35e0ff";
  ctx.font = "bold 32px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText(modo === "rt" ? "RED TEAM (PENTEST OFENSIVO)" : "BLUE TEAM (SOC)", ANCHO / 2, 492);

  ctx.fillStyle = "#eafff0";
  ctx.font = "26px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("resolviendo el caso: " + caso, ANCHO / 2, 544);

  // Calificación
  ctx.fillStyle = "#33ff66";
  ctx.font = "bold 96px 'Orbitron', 'Segoe UI', sans-serif";
  ctx.fillText("CALIFICACIÓN " + rating, ANCHO / 2, 640);

  ctx.fillStyle = "#5f8a6a";
  ctx.font = "20px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("fecha: " + (fecha || "—"), ANCHO / 2, 700);

  // Firma
  ctx.fillStyle = "#8fd39e";
  ctx.font = "22px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("Jimmy — Director del SOC de ACME Corp (sintético)", ANCHO / 2, 800);
  ctx.fillStyle = "#123a21";
  ctx.fillText("─────────────", ANCHO / 2, 830);
}

// Genera el PNG del certificado y devuelve la URL de datos
export function generarCertificadoPNG(datos) {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  dibujarCertificado(ctx, datos);
  return canvas.toDataURL("image/png");
}

// Descarga el certificado como archivo PNG con nombre saneado
export function descargarCertificado(datos) {
  const dataUrl = generarCertificadoPNG(datos);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `certificado-cybergrad-${slugNombre(datos.nombre)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// HTML del certificado como documento real (texto seleccionable).
// El CSS de impresión (@media print en style.css) oculta el resto
// del juego y deja solo esta zona: el resultado es un PDF con texto
// editable, no una imagen, apto para carreras oficiales.
export function htmlCertificado(datos) {
  const d = datos || {};
  const nombre = String(d.nombre || "Analista");
  const rating = String(d.rating || "A");
  const caso = String(d.caso || "");
  const fecha = String(d.fecha || "—");
  const modo = String(d.modo || "soc");
  const campana = modo === "rt" ? "RED TEAM (PENTEST OFENSIVO)" : "BLUE TEAM (SOC)";
  return `
  <div class="cert-print">
    <div class="cert-marco">
      <div class="cert-header">CYBERGRAD</div>
      <div class="cert-sub">SIMULADOR DE CARRERA SOC + RED TEAM</div>
      <div class="cert-titulo">CERTIFICADO DE EXAMEN</div>
      <div class="cert-line">se certifica que</div>
      <div class="cert-nombre">${escHTML(nombre)}</div>
      <div class="cert-line">ha superado el examen de la campaña</div>
      <div class="cert-campana">${campana}</div>
      <div class="cert-line">resolviendo el caso: ${escHTML(caso)}</div>
      <div class="cert-rating">CALIFICACIÓN ${escHTML(rating)}</div>
      <div class="cert-fecha">fecha: ${escHTML(fecha)}</div>
      <div class="cert-firma">Jimmy — Director del SOC de ACME Corp (sintético)</div>
      <div class="cert-guion">─────────────</div>
    </div>
  </div>`;
}

// Abre el diálogo de impresión del navegador con el certificado en
// HTML (PDF editable). El contenedor se crea una vez y se rellena con
// los datos; la siguiente llamada lo sustituye. No se vacía al imprimir
// a propósito: en algunos motores (p. ej. Chromium headless) window.print()
// dispara afterprint de forma SÍNCRONA, y vaciar ahí dejaría el PDF en
// blanco. La zona queda oculta en pantalla (display:none) y solo pesa
// unos cientos de bytes, así que es inofensiva.
export function imprimirCertificado(datos) {
  let zona = document.getElementById("cert-print-zone");
  if (!zona) {
    zona = document.createElement("div");
    zona.id = "cert-print-zone";
    document.body.appendChild(zona);
  }
  zona.innerHTML = htmlCertificado(datos);
  window.print();
}
