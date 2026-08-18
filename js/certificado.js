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
//
// Código de verificación: cada certificado lleva un código
// auto-contenido `CG-<payload>-<checksum>` que codifica los datos
// (nombre|fecha|rating|modo) en base64url y firma el payload con un
// SHA-256 truncado. Jimmy lo valida con `verificar_certificado` sin
// necesidad de historial: cualquiera con el certificado (PDF/PNG) puede
// comprobar que nombre, fecha y calificación no han sido alterados.
// ============================================================

import { sha256 } from "./hash.js";

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

// Sal del checksum del certificado (constante del juego, no secreta:
// el objetivo es detectar alteraciones accidentales o ediciones del
// PDF, no resistir a un falsificador con acceso al código fuente).
const CERT_SAL = "cybergrad-cert-v1";

// ---- Código de verificación ----

// Serializa los datos del certificado en el payload del código.
// El separador es "\x1f" (unidad de separación), que no puede
// aparecer en texto normal ni pegarse en el nombre de un usuario.
const SEP = "\x1f";

// base64url (sin padding) en JS puro, como el resto del módulo:
// funciona igual en navegador y Node (TextEncoder, sin btoa/atob).
const _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const _B64_ENC = new TextEncoder();
function b64url(s) {
  const bytes = _B64_ENC.encode(s);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += _B64[a >> 2];
    out += _B64[((a & 3) << 4) | (b === undefined ? 0 : b >> 4)];
    if (b !== undefined) out += _B64[((b & 15) << 2) | (c === undefined ? 0 : c >> 6)];
    if (c !== undefined) out += _B64[c & 63];
  }
  return out;
}
function unb64url(s) {
  const dec = new TextDecoder();
  const bytes = [];
  let buf = 0, bits = 0;
  for (const ch of s) {
    const v = _B64.indexOf(ch);
    if (v < 0) continue; // tolera padding / caracteres sueltos
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  return dec.decode(new Uint8Array(bytes));
}

// Código de verificación de un certificado: `CG-<payload>-<checksum>`.
// Función pura y determinista: mismos datos → mismo código.
export function codigoVerificacion(datos) {
  const d = datos || {};
  const payload = [String(d.nombre || ""), String(d.fecha || ""), String(d.rating || ""), String(d.modo || "soc")].join(SEP);
  const checksum = sha256(CERT_SAL + payload).slice(0, 10);
  return `CG-${b64url(payload)}-${checksum}`;
}

// Valida un código de verificación. Devuelve { ok, datos } si el
// checksum coincide, o { ok: false, error } si el formato o la firma
// fallan. También pura y determinista: misma entrada → mismo resultado.
export function validarCertificado(codigo) {
  const c = String(codigo || "").trim();
  const m = /^CG-([A-Za-z0-9_-]+)-([a-f0-9]{10})$/.exec(c);
  if (!m) return { ok: false, error: "formato inválido (esperado CG-<datos>-<checksum>)" };
  const payload = unb64url(m[1]);
  const checksum = sha256(CERT_SAL + payload).slice(0, 10);
  if (checksum !== m[2]) return { ok: false, error: "checksum no coincide: el certificado fue alterado o el código está mal copiado" };
  const [nombre, fecha, rating, modo] = payload.split(SEP);
  return { ok: true, datos: { nombre, fecha, rating, modo } };
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
  ctx.fillText("Jimmy — Director del SOC de CiberCorp (sintético)", ANCHO / 2, 760);
  ctx.fillStyle = "#123a21";
  ctx.fillText("─────────────", ANCHO / 2, 790);

  // Código de verificación
  ctx.fillStyle = "#5f8a6a";
  ctx.font = "20px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText("código de verificación:", ANCHO / 2, 838);
  ctx.fillStyle = "#35e0ff";
  ctx.font = "bold 26px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillText(codigoVerificacion(d), ANCHO / 2, 872);
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
      <div class="cert-firma">Jimmy — Director del SOC de CiberCorp (sintético)</div>
      <div class="cert-guion">─────────────</div>
      <div class="cert-codigo">código de verificación: <span class="cert-codigo-valor">${escHTML(codigoVerificacion(d))}</span></div>
      <div class="cert-codigo-ayuda">Válidalo en el juego con: verificar_certificado &lt;código&gt;</div>
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
