// ============================================================
// state.js — Estado global del juego, rangos, XP y puntuación
// ============================================================

export const RANKS = [
  {
    id: 0, nombre: "Analista Junior", icono: "🌱",
    xpRequerida: 0,
    desc: "Primera línea del SOC. Filtra alertas, lee correos y tria incidentes básicos.",
  },
  {
    id: 1, nombre: "Analista SOC", icono: "🔍",
    xpRequerida: 450,
    desc: "Investiga incidentes reales, contiene amenazas y redacta informes.",
  },
  {
    id: 2, nombre: "Analista Senior", icono: "🛡️",
    xpRequerida: 1100,
    desc: "Caza amenazas avanzadas, responde a intrusiones y coordina la contención.",
  },
  {
    id: 3, nombre: "Líder de Equipo", icono: "🎖️",
    xpRequerida: 1600,
    desc: "Dirige el CSIRT, prioriza la respuesta y toma decisiones en crisis.",
  },
  {
    id: 4, nombre: "Jefe de CSIRT", icono: "🏆",
    xpRequerida: 2400,
    desc: "Responsable de la ciberseguridad de la organización. Fin de la campaña.",
  },
];

// ---- Carrera red team (pentest ofensivo) ----
export const RT_RANKS = [
  {
    id: 0, nombre: "Aprendiz de Pentester", icono: "🌱",
    xpRequerida: 0,
    desc: "Primera campaña ofensiva. Aprendes a enumerar y mapear la superficie de ataque.",
  },
  {
    id: 1, nombre: "Pentester Junior", icono: "🕷️",
    xpRequerida: 400,
    desc: "Consigues accesos iniciales: fuerza bruta, credenciales y webs vulnerables.",
  },
  {
    id: 2, nombre: "Pentester", icono: "🥷",
    xpRequerida: 900,
    desc: "Explota aplicaciones, extrae datos y documenta hallazgos como un profesional.",
  },
  {
    id: 3, nombre: "Pentester Senior", icono: "🔥",
    xpRequerida: 1500,
    desc: "Post-explotación, movimiento lateral y escalada de privilegios sin dejar cabos sueltos.",
  },
  {
    id: 4, nombre: "Líder Red Team", icono: "👑",
    xpRequerida: 2100,
    desc: "Dirige engagements completos: planificación, ejecución y reporte ejecutivo.",
  },
  {
    id: 5, nombre: "CISO", icono: "🏆",
    xpRequerida: 2600,
    desc: "Responsable de la estrategia de seguridad. Fin de la campaña red team.",
  },
];

export const RANK_MAX = RANKS.length - 1;
export const RT_RANK_MAX = RT_RANKS.length - 1;

export function rangoActualRT(xp) {
  let r = 0;
  for (let i = 0; i < RT_RANKS.length; i++) {
    if (xp >= RT_RANKS[i].xpRequerida) r = i;
  }
  return r;
}

export function estadoRangoRT() {
  const idx = rangoActualRT(GAME.rtXp);
  return { indice: idx, ...RT_RANKS[idx] };
}

// Devuelve el rango de la carrera activa (SOC o Red Team)
export function estadoRangoActivo() {
  return GAME.modo === "rt" ? estadoRangoRT() : estadoRango();
}

export function rangoActual(xp) {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xpRequerida) r = i;
  }
  return r;
}

export function xpNecesariaParaSiguiente(xp) {
  const r = rangoActual(xp);
  if (r >= RANK_MAX) return 0;
  return RANKS[r + 1].xpRequerida - xp;
}

export const GAME = {
  nombre: "Analista",
  xp: 0,
  puntos: 0,
  casosResueltos: 0,
  casosCompletados: [],       // ids de casos completados (SOC)
  lecciones: [],              // ids de lecciones desbloqueadas
  casoActual: null,           // id del caso en curso
  casoIniciadoEn: 0,          // timestamp real de inicio
  reloj: 0,                   // segundos de reloj del juego (avanza en tiempo real)
  acciones: [],               // registro de acciones del caso actual
  pausado: false,
  // ---- Carrera red team ----
  modo: "soc",                // "soc" | "rt"
  rtXp: 0,
  rtCasosResueltos: 0,
  rtCasosCompletados: [],
  rtLecciones: [],
  // ---- Prácticas guiadas de becario superadas (blue team y red team) ----
  becarioCompletadas: [],
  // ---- Logros e insignias ----
  logros: [],                 // ids de logros desbloqueados
  mejorRating: null,          // mejor calificación conseguida ("C" → "S+")
  mejorExamen: null,          // mejor calificación en el modo examen ("C" → "S+")
  casoSinPistas: false,       // último caso completado sin usar pistas
  secretos: [],               // secretos/huevos de pascua encontrados (ids)
  demo: false,                // modo presentador: estado demo en memoria (nunca se guarda)
  // ---- Estadísticas globales (acumuladas de todos los casos) ----
  estadisticas: {
    tiempoJugado: 0,          // segundos de reloj acumulados
    accionesOk: 0,            // acciones correctas (total acumulado)
    accionesErr: 0,           // acciones incorrectas mal ejecutadas (total)
    pistasUsadas: 0,          // pistas pedidas (total acumulado)
    ratings: [],              // [{casoId, rating, modo}] por cada caso completado
  },
};

export function estadoRango() {
  const idx = rangoActual(GAME.xp);
  return { indice: idx, ...RANKS[idx] };
}

export function addXP(n) {
  const antes = estadoRango();
  GAME.xp = Math.max(0, GAME.xp + n);
  const despues = estadoRango();
  if (despues.indice > antes.indice) {
    return { ascendido: true, desde: antes, hasta: despues };
  }
  return { ascendido: false };
}

export function addPuntos(n) {
  GAME.puntos = Math.max(0, GAME.puntos + n);
}

export function addRTXP(n) {
  const antes = estadoRangoRT();
  GAME.rtXp = Math.max(0, GAME.rtXp + n);
  const despues = estadoRangoRT();
  if (despues.indice > antes.indice) {
    return { ascendido: true, desde: antes, hasta: despues };
  }
  return { ascendido: false };
}

// Registro de acciones del caso actual (para el informe y la puntuación)
export function registrarAccion(tipo, detalle, ok, puntos) {
  GAME.acciones.push({
    t: tipo,
    detalle,
    ok,
    puntos,
    tiempo: GAME.reloj,
  });
  if (puntos) addPuntos(puntos);
}

export function resetAccionesCaso() {
  GAME.acciones = [];
}
