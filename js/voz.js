// ============================================================
// voz.js — Reconocimiento de voz del navegador (Jimmy-IA)
// Envuelve la API webkitSpeechRecognition/SpeechRecognition de
// forma segura: detección de soporte, idioma español, un único
// resultado por sesión y control de cancelación. 100 % local:
// el audio se procesa en el navegador (Chrome/Edge); si el
// navegador no la soporta, todo degrada con mensajes claros.
// Módulo sin dependencias y testeable con un mock en CI.
// ============================================================

// ¿El navegador expone reconocimiento de voz?
export function soportaVoz() {
  return typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Arranca una sesión de reconocimiento. Devuelve un controlador
// { cancelar } o null si no se pudo iniciar (el error se entrega
// por onError). Callbacks: onResult(texto), onError(codigo),
// onEnd() (siempre al terminar la sesión, haya resultado o no).
export function escucharVoz({ lang = "es-ES", onResult, onError, onEnd } = {}) {
  if (!soportaVoz()) {
    if (onError) onError("no-soporte");
    return null;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  try {
    rec = new SR();
  } catch {
    if (onError) onError("no-iniciar");
    return null;
  }
  rec.lang = lang;
  rec.interimResults = false;   // solo el resultado final (más limpio)
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let texto = "";
    try {
      texto = Array.from(e.results || [])
        .map((r) => (r && r[0] && r[0].transcript) || "")
        .join(" ")
        .trim();
    } catch { /* resultado malformado */ }
    if (texto && onResult) onResult(texto);
  };
  rec.onerror = (e) => { if (onError) onError((e && e.error) || "desconocido"); };
  rec.onend = () => { if (onEnd) onEnd(); };
  try {
    rec.start();
  } catch {
    if (onError) onError("no-iniciar");
    return null;
  }
  return {
    cancelar() {
      try { if (rec) rec.stop(); } catch { /* ya terminó */ }
    },
  };
}
