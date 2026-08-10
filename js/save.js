// ============================================================
// save.js — Persistencia de progreso con localStorage
// Guarda la carrera (XP, puntos, casos, lecciones, nombre) entre
// sesiones. El estado de ejecución (caso en curso, reloj, acciones)
// NO se guarda: al recargar se retoma la campaña desde el siguiente
// caso pendiente.
// ============================================================

import { GAME } from "./state.js";

export const CLAVE_GUARDADO = "cybergrad_save_v1";

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
];

export function hayGuardado() {
  try {
    return localStorage.getItem(CLAVE_GUARDADO) !== null;
  } catch {
    return false;
  }
}

export function guardar() {
  try {
    const datos = {};
    for (const c of CAMPOS) datos[c] = GAME[c];
    datos.guardadoEn = Date.now();
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos));
  } catch (e) {
    console.warn("CYBERGRAD: no se pudo guardar el progreso.", e);
  }
}

export function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADO);
    if (!raw) return false;
    const datos = JSON.parse(raw);
    for (const c of CAMPOS) {
      if (datos[c] !== undefined) GAME[c] = datos[c];
    }
    // Garantías: arrays válidos y estado de ejecución siempre limpio
    for (const arr of ["casosCompletados", "lecciones", "rtCasosCompletados", "rtLecciones", "becarioCompletadas"]) {
      if (!Array.isArray(GAME[arr])) GAME[arr] = [];
    }
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

export function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE_GUARDADO);
  } catch {
    /* sin soporte de almacenamiento */
  }
}
