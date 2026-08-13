// ============================================================
// examen.js — Modo examen de CYBERGRAD
// Un caso al azar (SOC o Red Team) sin pistas, sin ayuda, con el
// SLA real. Al entregar el informe, el motor califica como siempre
// (S+/S/A/B/C) y, si apruebas (A o mejor), obtienes un certificado
// descargable (ver certificado.js). El examen NO toca la carrera:
// ni XP ni casos completados — es una certificación independiente.
// ============================================================

import { TODOS_LOS_CASOS } from "./reto.js";

// Umbral mínimo para aprobar el examen (A o mejor)
export const APROBADO_MIN = "A";
export const ORDEN_RATING = ["C", "B", "A", "S", "S+"];

export function apruebaExamen(rating) {
  return ORDEN_RATING.indexOf(rating) >= ORDEN_RATING.indexOf(APROBADO_MIN);
}

// Elige el caso del examen al azar (SOC o Red Team)
export function elegirCasoExamen() {
  const idx = Math.floor(Math.random() * TODOS_LOS_CASOS.length);
  return TODOS_LOS_CASOS[idx];
}

// Texto del resultado del examen
export function textoVeredicto(rating) {
  return apruebaExamen(rating)
    ? `APROBADO — ${rating} · Has demostrado criterio y técnica. Certificado disponible.`
    : `NO APROBADO — ${rating} · Para certificarte necesitas un ${APROBADO_MIN} o mejor. Repite el examen cuando estés listo.`;
}
