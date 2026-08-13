// ============================================================
// certificado.js — Certificado de examen de CYBERGRAD
// Dibuja un certificado en un <canvas> (1400×900) y lo descarga
// como PNG. Se genera al aprobar el modo examen (rating A o
// mejor). Módulo sin dependencias: funciona en el navegador y
// es testeable con Playwright (page.evaluate).
// ============================================================

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
