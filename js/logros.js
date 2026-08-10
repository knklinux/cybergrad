// ============================================================
// logros.js — Sistema de logros e insignias
// Se desbloquean por rango y por hitos de juego. Se persisten en
// GAME.logros junto con el guardado (localStorage).
// ============================================================

import { GAME } from "./state.js";
import { CASOS } from "./casos.js";
import { RT_CASOS } from "./rt-casos.js";

export const LOGROS = [
  // ---- Rangos (blue team / SOC) ----
  { id: "rango-soc-1", icono: "🔍", nombre: "Analista en activo", desc: "Alcanza el rango de Analista SOC (450 XP)", condicion: (g) => g.xp >= 450 },
  { id: "rango-soc-2", icono: "🛡️", nombre: "Cazador de amenazas", desc: "Alcanza el rango de Analista Senior (1.100 XP)", condicion: (g) => g.xp >= 1100 },
  { id: "rango-soc-3", icono: "🎖️", nombre: "Mando en sala", desc: "Alcanza el rango de Líder de Equipo (1.600 XP)", condicion: (g) => g.xp >= 1600 },
  { id: "rango-soc-max", icono: "🏆", nombre: "Jefe de CSIRT", desc: "Corona la campaña SOC (2.400 XP)", condicion: (g) => g.xp >= 2400 },
  // ---- Rangos (red team) ----
  { id: "rango-rt-1", icono: "🕷️", nombre: "Primera brecha", desc: "Alcanza el rango de Pentester Junior (400 XP RT)", condicion: (g) => g.rtXp >= 400 },
  { id: "rango-rt-max", icono: "👑", nombre: "Estratega ofensivo", desc: "Alcanza el rango de Líder Red Team (2.100 XP RT)", condicion: (g) => g.rtXp >= 2100 },
  { id: "rango-rt-ciso", icono: "🏆", nombre: "CISO", desc: "Corona la campaña red team (2.600 XP RT)", condicion: (g) => g.rtXp >= 2600 },
  // ---- Hitos de juego ----
  { id: "primer-caso", icono: "📋", nombre: "Primer incidente", desc: "Resuelve tu primer caso de la campaña SOC", condicion: (g) => g.casosResueltos >= 1 },
  { id: "soc-completa", icono: "🎓", nombre: "Campaña SOC completada", desc: `Resuelve los ${CASOS.length} casos del blue team`, condicion: (g) => g.casosCompletados.length >= CASOS.length },
  { id: "primer-smas", icono: "🏅", nombre: "Excelencia", desc: "Consigue tu primera calificación S+", condicion: (g) => g.mejorRating === "S+" },
  { id: "sin-pistas", icono: "🧠", nombre: "Instinto de analista", desc: "Completa un caso sin usar ninguna pista", condicion: (g) => !!g.casoSinPistas },
  { id: "primer-pentest", icono: "🎯", nombre: "Primer pentest", desc: "Completa tu primer pentest red team", condicion: (g) => g.rtCasosResueltos >= 1 },
  { id: "rt-completa", icono: "🏴", nombre: "Campaña red team completada", desc: `Completa los ${RT_CASOS.length} pentests autorizados`, condicion: (g) => g.rtCasosCompletados.length >= RT_CASOS.length },
  { id: "becario", icono: "🎓", nombre: "Aprendiz aplicado", desc: "Supera tu primera práctica guiada de becario", condicion: (g) => g.becarioCompletadas.length >= 1 },
  { id: "becario-todas", icono: "📚", nombre: "Becario graduado", desc: "Supera todas las prácticas guiadas (blue team + red team)", condicion: (g) => g.becarioCompletadas.length >= 4 },
  { id: "puntos-1000", icono: "💰", nombre: "Banco de puntos", desc: "Acumula 1.000 puntos", condicion: (g) => g.puntos >= 1000 },
  // ---- Secreto (oculto: no aparece en PENDIENTES hasta encontrarse) ----
  { id: "huevo-jimmy", icono: "🥚", nombre: "Huevo de pascua", desc: "Encuentra el secreto escondido en el avatar de Jimmy", condicion: (g) => (g.secretos || []).includes("jimmy"), oculto: true },
];

export function totalLogros() {
  return LOGROS.length;
}

export function logrosDesbloqueados() {
  return LOGROS.filter((l) => GAME.logros.includes(l.id));
}

export function logrosPendientes() {
  // Los logros ocultos no se listan hasta desbloquearse: el secreto sigue siendo secreto
  return LOGROS.filter((l) => !l.oculto && !GAME.logros.includes(l.id));
}

// Comprueba los logros aún bloqueados y devuelve los recién desbloqueados
export function evaluarLogros() {
  const nuevos = [];
  for (const l of LOGROS) {
    if (GAME.logros.includes(l.id)) continue;
    try {
      if (l.condicion(GAME)) {
        GAME.logros.push(l.id);
        nuevos.push(l);
      }
    } catch {
      /* una condición que falle no debe romper el juego */
    }
  }
  return nuevos;
}

// Recalcula el conjunto completo de logros desde las condiciones actuales.
// Se usa al reiniciar una campaña: retira los logros que ya no se cumplen
// (p. ej. los de rango SOC) y conserva los que sigan vigentes (p. ej. los RT).
export function recalcularLogros() {
  GAME.logros = LOGROS.filter((l) => {
    try {
      return l.condicion(GAME);
    } catch {
      return false;
    }
  }).map((l) => l.id);
}
