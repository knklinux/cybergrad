// ============================================================
// sonido.js — Sonido y feedback háptico de CYBERGRAD
// Sintetiza efectos con Web Audio (sin archivos de audio):
//   - ok()      acción correcta (sube)
//   - err()     acción incorrecta (baja)
//   - alerta()  nueva alerta crítica (alarma)
//   - exito()   caso resuelto (arpegio)
//   - click()   navegación de botones
// Además vibra en dispositivos móviles (navigator.vibrate) en
// errores y alertas. El AudioContext se crea de forma perezosa
// en el primer gesto del usuario (requisito de los navegadores)
// y todo va envuelto en try/catch: si no hay audio, el juego
// nunca se rompe.
// ============================================================

const CLAVE = "cybergrad_sonido";

// Activado por defecto; se persiste en localStorage (on/off)
export function sonidoActivado() {
  try {
    return localStorage.getItem(CLAVE) !== "off";
  } catch {
    return true;
  }
}

export function fijarSonido(on) {
  try {
    localStorage.setItem(CLAVE, on ? "on" : "off");
  } catch { /* sin almacenamiento */ }
}

class Sonido {
  constructor() {
    this._ctx = null;
    this._habilitado = sonidoActivado();
  }

  // Activa/desactiva en caliente (toggle del botón o comando)
  setActivado(on) {
    this._habilitado = !!on;
    if (this._habilitado) this.iniciar();
  }

  // Crea el AudioContext en el primer gesto (llamada manual)
  iniciar() {
    if (this._ctx || !this._habilitado) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this._ctx = new AC();
    } catch { this._ctx = null; }
  }

  _tono(frec, dur, tipo, cuando = 0, vol = 0.07) {
    if (!this._ctx || !this._habilitado) return;
    try {
      const t0 = this._ctx.currentTime + cuando;
      const osc = this._ctx.createOscillator();
      const gan = this._ctx.createGain();
      osc.type = tipo || "sine";
      osc.frequency.setValueAtTime(frec, t0);
      gan.gain.setValueAtTime(0.0001, t0);
      gan.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gan);
      gan.connect(this._ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* sin audio disponible */ }
  }

  click() { this._tono(620, 0.06, "triangle"); }

  ok() { this._tono(440, 0.09, "sine"); this._tono(660, 0.12, "sine", 0.08); }

  err() {
    this._tono(220, 0.18, "sawtooth", 0, 0.05);
    this._tono(180, 0.22, "sawtooth", 0.12, 0.05);
    this._vibrar(120);
  }

  alerta() {
    this._tono(880, 0.14, "square", 0, 0.05);
    this._tono(880, 0.14, "square", 0.2, 0.05);
    this._vibrar(300);
  }

  exito() {
    const notas = [523, 659, 784, 1047]; // Do-Mi-Sol-Do
    notas.forEach((f, i) => this._tono(f, 0.16, "triangle", i * 0.11));
    this._vibrar(200);
  }

  _vibrar(ms) {
    try {
      if (this._habilitado && navigator.vibrate) navigator.vibrate(ms);
    } catch { /* sin soporte */ }
  }
}

export const sonido = new Sonido();
