// ============================================================
// save.js — Persistencia de progreso con localStorage
// Guarda la carrera (XP, puntos, casos, lecciones, nombre) entre
// sesiones. El estado de ejecución (caso en curso, reloj, acciones)
// NO se guarda: al recargar se retoma la campaña desde el siguiente
// caso pendiente.
//
// Hay DOS ranuras de partida (v1 y v2): el arranque ofrece continuar
// cualquiera de ellas o empezar de cero SIN borrar la otra.
// ============================================================

import { GAME } from "./state.js";
import { recalcularLogros } from "./logros.js";

export const CLAVE_GUARDADO = "cybergrad_save_v1";
export const CLAVE_GUARDADO_2 = "cybergrad_save_v2";

// Ranura activa (1 o 2): dónde escribe guardar()
let slotActivo = 1;

export function slotActual() {
  return slotActivo;
}

function slotClave(slot) {
  return slot === 2 ? CLAVE_GUARDADO_2 : CLAVE_GUARDADO;
}

// Campos de carrera que se persisten (todo lo demás es estado de ejecución)
const CAMPOS = [
  "nombre",
  "xp",
  "puntos",
  "casosResueltos",
  "casosCompletados",
  "lecciones",
  "rtXp",
  "rtCasosResueltos",
  "rtCasosCompletados",
  "rtLecciones",
  "modo",
  "becarioCompletadas",
  "logros",
  "mejorRating",
  "mejorExamen",
  "casoSinPistas",
  "secretos",
  "estadisticas",
];

export function hayGuardado(slot = 1) {
  try {
    return localStorage.getItem(slotClave(slot)) !== null;
  } catch {
    return false;
  }
}

// Partidas existentes (para el selector del arranque)
export function listarGuardados() {
  const lista = [];
  for (const slot of [1, 2]) {
    try {
      const raw = localStorage.getItem(slotClave(slot));
      if (!raw) continue;
      const datos = JSON.parse(raw);
      lista.push({ slot, datos });
    } catch {
      /* guardado corrupto: se ignora */
    }
  }
  return lista;
}

export function guardar() {
  // Modo presentador: el estado demo vive solo en memoria; jamás se escribe
  // sobre el progreso real del jugador.
  if (GAME.demo) return;
  try {
    const datos = {};
    for (const c of CAMPOS) datos[c] = GAME[c];
    datos.guardadoEn = Date.now();
    localStorage.setItem(slotClave(slotActivo), JSON.stringify(datos));
  } catch (e) {
    console.warn("CYBERGRAD: no se pudo guardar el progreso.", e);
  }
}

export function cargar(slot = 1) {
  try {
    const raw = localStorage.getItem(slotClave(slot));
    if (!raw) return false;
    const datos = JSON.parse(raw);
    slotActivo = slot;
    for (const c of CAMPOS) {
      if (datos[c] !== undefined) GAME[c] = datos[c];
    }
    // Garantías: arrays válidos y estado de ejecución siempre limpio
    for (const arr of ["casosCompletados", "lecciones", "rtCasosCompletados", "rtLecciones", "becarioCompletadas", "logros", "secretos"]) {
      if (!Array.isArray(GAME[arr])) GAME[arr] = [];
    }
    // Estadísticas: objeto con sub-array ratings y campos de modos especiales
    if (!GAME.estadisticas || typeof GAME.estadisticas !== "object") {
      GAME.estadisticas = { tiempoJugado: 0, accionesOk: 0, accionesErr: 0, pistasUsadas: 0, ratings: [] };
    }
    if (!Array.isArray(GAME.estadisticas.ratings)) GAME.estadisticas.ratings = [];
    if (GAME.estadisticas.reto === undefined) GAME.estadisticas.reto = null;
    if (!Array.isArray(GAME.estadisticas.retoHistorial)) GAME.estadisticas.retoHistorial = [];
    if (!Array.isArray(GAME.estadisticas.examenes)) GAME.estadisticas.examenes = [];
    GAME.demo = false;
    GAME.casoActual = null;
    GAME.casoIniciadoEn = 0;
    GAME.reloj = 0;
    GAME.acciones = [];
    GAME.pausado = false;
    return true;
  } catch (e) {
    console.warn("CYBERGRAD: guardado corrupto, se ignora.", e);
    return false;
  }
}

// Empieza una partida nueva de cero. NO borra ninguna ranura en el momento:
// elige un hueco libre (o el menos reciente si ambos están llenos) y deja
// que el primer guardar() de la nueva partida la ocupe. Así, si cierras la
// pestaña antes de hacer progreso, tus partidas anteriores siguen intactas.
export function nuevaPartida() {
  const existentes = listarGuardados();
  const ocupados = new Set(existentes.map((g) => g.slot));
  let slot = ocupados.has(1) ? 2 : 1;
  if (ocupados.has(slot)) {
    // Ambas ranuras llenas: se sustituirá la menos reciente.
    // En empate de timestamps se prefiere sustituir la ranura 2 (protege la 1).
    const ordenados = [...existentes].sort(
      (a, b) => (a.datos.guardadoEn || 0) - (b.datos.guardadoEn || 0) || b.slot - a.slot
    );
    slot = ordenados[0].slot;
  }
  slotActivo = slot;
  // Estado de carrera a cero (valores por defecto)
  GAME.nombre = "Analista";
  GAME.xp = 0;
  GAME.puntos = 0;
  GAME.casosResueltos = 0;
  GAME.casosCompletados = [];
  GAME.lecciones = [];
  GAME.modo = "soc";
  GAME.rtXp = 0;
  GAME.rtCasosResueltos = 0;
  GAME.rtCasosCompletados = [];
  GAME.rtLecciones = [];
  GAME.becarioCompletadas = [];
  GAME.logros = [];
  GAME.mejorRating = null;
  GAME.mejorExamen = null;
  GAME.casoSinPistas = false;
  GAME.secretos = [];
  GAME.demo = false;
  GAME.estadisticas = {
    tiempoJugado: 0, accionesOk: 0, accionesErr: 0, pistasUsadas: 0, ratings: [],
    reto: null, retoHistorial: [], examenes: [],
  };
  GAME.casoActual = null;
  GAME.casoIniciadoEn = 0;
  GAME.reloj = 0;
  GAME.acciones = [];
  GAME.pausado = false;
  return slot;
}

export function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE_GUARDADO);
    localStorage.removeItem(CLAVE_GUARDADO_2);
  } catch {
    /* sin soporte de almacenamiento */
  }
}

// Reinicia UNA campaña y conserva la otra intacta.
// "soc" limpia XP, casos y lecciones del blue team; "rt" lo mismo para el red team.
// Los campos compartidos (nombre, puntos, becario, logros) se recalculan:
// los logros que dependían de la campaña reiniciada se retiran, los demás quedan.
export function reiniciarCampania(modo) {
  if (modo === "soc") {
    GAME.xp = 0;
    GAME.casosResueltos = 0;
    GAME.casosCompletados = [];
    GAME.lecciones = [];
  } else if (modo === "rt") {
    GAME.rtXp = 0;
    GAME.rtCasosResueltos = 0;
    GAME.rtCasosCompletados = [];
    GAME.rtLecciones = [];
  } else {
    return;
  }
  // Estado de ejecución siempre limpio (el caso en curso se abandona)
  GAME.casoActual = null;
  GAME.casoIniciadoEn = 0;
  GAME.reloj = 0;
  GAME.acciones = [];
  GAME.pausado = false;
  recalcularLogros();
  guardar();
}
