// ============================================================
// piper.js — Voz neuronal local de Jimmy (Piper TTS)
// Conecta con el servidor local de Piper de Aion Sincro
// (piper_server.py, 127.0.0.1:8766): comprueba que responde,
// sintetiza el texto de los briefings y lecciones de Jimmy y
// lo reproduce con Web Audio. 100 % local, gratis y sin
// internet — si el servidor no está activo o la voz está
// desactivada, el juego funciona exactamente igual (sin voz).
//
// El estado (activada, URL del servidor, token y voz) se
// persiste en localStorage. Las funciones puras (limpiarParaTTS,
// separarChunks, urlSintesis, leerPing) se exportan para los
// tests de Node (ci/piper-test.mjs).
// ============================================================

const CLAVE = "cybergrad_voz";               // on/off de la voz
const CLAVE_URL = "cybergrad_piper_url";     // URL del servidor Piper
const CLAVE_TOKEN = "cybergrad_piper_token"; // token opcional del servidor
const CLAVE_VOZ = "cybergrad_piper_voz";     // slug de la voz
const URL_DEFECTO = "http://127.0.0.1:8766";
const VOZ_DEFECTO = "es_ES-sharvard-medium";
const MAX_TEXT = 1400;   // caracteres por petición (el servidor admite 5000)
const TIMEOUT = 1500;    // ms de espera para el /ping

// Estado en memoria (no se persiste): null = sin comprobar todavía
let _online = null;      // ¿el servidor responde?
let _voces = null;       // voces instaladas según el /ping
let _audioCtx = null;    // AudioContext (perezoso, primer gesto)
let _sesion = 0;         // token de reproducción: callar() lo invalida
let _fuentes = [];       // fuentes de audio activas

// ---------- Persistencia (localStorage, siempre con fallback) ----------
// Por defecto la voz está DESACTIVADA: no se hace ninguna petición de red
// sin que el jugador la active explícitamente (botón 🗣️ o `piper on`).
export function vozActivada() {
  try { return localStorage.getItem(CLAVE) === "on"; } catch { return false; }
}
export function fijarVoz(on) {
  try { localStorage.setItem(CLAVE, on ? "on" : "off"); } catch { /* sin almacenamiento */ }
}

export function urlPiper() {
  try { return (localStorage.getItem(CLAVE_URL) || URL_DEFECTO).replace(/\/+$/, ""); }
  catch { return URL_DEFECTO; }
}
export function fijarUrlPiper(u) {
  try { localStorage.setItem(CLAVE_URL, String(u || URL_DEFECTO)); } catch { /* sin almacenamiento */ }
}

export function tokenPiper() {
  try { return (localStorage.getItem(CLAVE_TOKEN) || "").trim(); } catch { return ""; }
}
export function fijarTokenPiper(t) {
  try { localStorage.setItem(CLAVE_TOKEN, String(t || "").trim()); } catch { /* sin almacenamiento */ }
}

export function vozPiper() {
  try { return localStorage.getItem(CLAVE_VOZ) || VOZ_DEFECTO; } catch { return VOZ_DEFECTO; }
}
export function fijarVozPiper(v) {
  try { localStorage.setItem(CLAVE_VOZ, String(v || VOZ_DEFECTO)); } catch { /* sin almacenamiento */ }
}

// ---------- Funciones puras (testeables en Node) ----------

// Limpia un texto antes de sintetizarlo: quita markdown, entidades HTML,
// saltos y espacios repetidos, y convierte los bullets en pausas.
export function limpiarParaTTS(texto) {
  return String(texto ?? "")
    .replace(/`([^`]*)`/g, "$1")              // código inline
    .replace(/\*\*([^*]*)\*\*/g, "$1")        // negrita
    .replace(/\*([^*]*)\*/g, "$1")            // cursiva
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")  // enlaces markdown
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[•·▪◦]/g, ",")                  // bullets → coma (pausa corta)
    .replace(/\s+/g, " ")
    // Se recortan solo espacios y signos de pausa iniciales/finales (coma,
    // punto y coma, dos puntos), NUNCA el punto final de una oración: la
    // entonación de cierre la marca el servidor con ese carácter.
    .replace(/^[\s,;:]+|[\s,;:]+$/g, "")
    .trim();
}

// Divide un texto largo en fragmentos por oraciones, sin cortar palabras.
export function separarChunks(texto, max = MAX_TEXT) {
  const limpio = limpiarParaTTS(texto);
  if (!limpio) return [];
  if (limpio.length <= max) return [limpio];
  const trozos = [];
  let actual = "";
  for (const parte of limpio.split(/(?<=[.!?])\s+/)) {
    const candidato = (actual + " " + parte).trim();
    if (candidato.length > max && actual) {
      trozos.push(actual.trim());
      actual = parte;
    } else {
      actual = candidato;
    }
  }
  if (actual.trim()) trozos.push(actual.trim());
  return trozos;
}

// Construye la URL de /synthesize del servidor Piper.
export function urlSintesis(texto, { url = URL_DEFECTO, voz = VOZ_DEFECTO, token = "" } = {}) {
  const p = new URLSearchParams({ text: texto, voice: voz, length_scale: "1.05" });
  if (token) p.set("token", token);
  return `${String(url).replace(/\/+$/, "")}/synthesize?${p.toString()}`;
}

// Interpreta la respuesta del /ping del servidor Piper.
export function leerPing(datos) {
  return {
    ok: !!(datos && datos.ok && datos.piper),
    voces: datos && Array.isArray(datos.voices) ? datos.voices : [],
  };
}

// ---------- Runtime (navegador) ----------

async function _comprobar() {
  const params = new URLSearchParams();
  const t = tokenPiper();
  if (t) params.set("token", t);
  const q = params.toString();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    const r = await fetch(`${urlPiper()}/ping${q ? "?" + q : ""}`, { signal: ctrl.signal });
    clearTimeout(timer);
    const { ok, voces } = leerPing(r.ok ? await r.json() : null);
    _online = ok;
    _voces = ok ? voces : null;
  } catch {
    _online = false;
    _voces = null;
  }
  return _online;
}

// Sonda el servidor y devuelve si está operativo (true/false).
export async function comprobarPiper() {
  return _comprobar();
}

// Estado actual: lo que ve el jugador en `piper estado`.
export function estadoPiper() {
  return {
    activada: vozActivada(),
    online: _online,
    voces: Array.isArray(_voces) ? _voces : null,
    url: urlPiper(),
    voz: vozPiper(),
  };
}

// Crea/reanuda el AudioContext en el primer gesto del usuario
// (requisito de los navegadores, igual que en sonido.js).
export function iniciarAudio() {
  if (typeof window === "undefined") return;
  if (!_audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch { _audioCtx = null; }
  }
  if (_audioCtx && _audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
}

// Detiene la reproducción en curso (cambiar de modal, silenciar...).
export function callar() {
  _sesion++;
  for (const f of _fuentes) { try { f.stop(); } catch { /* ya parada */ } }
  _fuentes = [];
}

// Sintetiza y reproduce un texto con la voz de Jimmy. Devuelve true si
// se habló de verdad; nunca lanza (todo fallo degrada en silencio).
export async function hablar(texto) {
  if (!vozActivada()) return false;
  if (_online === null) await _comprobar(); // primera vez: sonda rápida
  if (!_online) return false;
  const chunks = separarChunks(texto);
  if (!chunks.length) return false;
  iniciarAudio();
  if (!_audioCtx) return false;
  // Hablar de nuevo cancela lo que estuviera sonando (p. ej. al pasar de un
  // briefing a otro): la sesión anterior se invalida y sus fuentes se paran.
  callar();
  const sesion = _sesion;
  for (const chunk of chunks) {
    if (sesion !== _sesion) return false; // nos callaron a mitad
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(urlSintesis(chunk, {
        url: urlPiper(), voz: vozPiper(), token: tokenPiper(),
      }), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) { _online = false; return false; }
      const buf = await r.arrayBuffer();
      if (sesion !== _sesion || !_audioCtx) return false;
      const audio = await _audioCtx.decodeAudioData(buf);
      if (sesion !== _sesion) return false;
      await new Promise((res) => {
        const src = _audioCtx.createBufferSource();
        src.buffer = audio;
        src.connect(_audioCtx.destination);
        _fuentes.push(src);
        src.onended = () => {
          _fuentes = _fuentes.filter((f) => f !== src);
          res();
        };
        try { src.start(); } catch { res(); }
      });
    } catch {
      // Sin red / servidor caído a mitad: deja de hablar, no rompe nada.
      return false;
    }
  }
  return true;
}
