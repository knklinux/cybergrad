// ============================================================
// presentador.js — Modo presentador (demo)
// Aplica en MEMORIA un estado avanzado (rangos máximos, casos
// completados, logros) para enseñar CYBERGRAD en entrevistas,
// demos o para curiosear sin grindear. NUNCA se guarda: el
// flag GAME.demo hace que guardar() sea un no-op, así que tu
// progreso real queda intacto.
// ============================================================

import { GAME } from "./state.js";
import { CASOS } from "./casos.js";
import { RT_CASOS } from "./rt-casos.js";
import { LOGROS } from "./logros.js";
import { BECARIO_CASOS, BECARIO_RT_CASOS } from "./becario.js";

export const DEMO = {
  nombre: "Analista Demo",
  xp: 2400,                              // Jefe de CSIRT (SOC)
  rtXp: 2600,                            // CISO (Red Team)
  puntos: 5240,
  casosResueltos: CASOS.length,
  casosCompletados: CASOS.map((c) => c.id),
  lecciones: CASOS.map((c) => c.id),
  rtCasosResueltos: RT_CASOS.length,
  rtCasosCompletados: RT_CASOS.map((c) => c.id),
  rtLecciones: RT_CASOS.map((c) => c.id),
  becarioCompletadas: [...BECARIO_CASOS, ...BECARIO_RT_CASOS].map((c) => c.id),
  logros: LOGROS.map((l) => l.id),
  mejorRating: "S+",
  casoSinPistas: true,
  estadisticas: {
    tiempoJugado: 6 * 3600,
    accionesOk: 148,
    accionesErr: 6,
    pistasUsadas: 3,
    ratings: [
      { casoId: "phishing-01", rating: "S+", modo: "soc" },
      { casoId: "rt-03-sqli", rating: "S", modo: "rt" },
      { casoId: "ransomware-01", rating: "S+", modo: "soc" },
    ],
  },
};

// Aplica el estado demo en memoria (no persiste nada)
export function aplicarModoPresentador() {
  Object.assign(GAME, DEMO, {
    demo: true,
    modo: "soc",
    casoActual: null,
    casoIniciadoEn: 0,
    reloj: 0,
    acciones: [],
    pausado: false,
  });
  return DEMO;
}

// Sale del modo demo: recarga la página (el guardado real vuelve)
export function salirModoPresentador() {
  location.reload();
}
