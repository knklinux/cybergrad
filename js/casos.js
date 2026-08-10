// ============================================================
// casos.js — Catálogo de casos de la campaña
// Añade un nuevo caso creando un archivo en js/casos/ e
// importándolo aquí. El juego lo usará automáticamente.
// ============================================================

import caso1 from "./casos/caso-01-phishing.js";
import caso2 from "./casos/caso-02-bec.js";
import caso3 from "./casos/caso-03-falso-positivo.js";
import caso4 from "./casos/caso-04-ransomware.js";
import caso5 from "./casos/caso-05-fuerza-bruta.js";
import caso6 from "./casos/caso-06-dns-exfil.js";

export const CASOS = [caso1, caso2, caso3, caso4, caso5, caso6];

export function casoPorId(id) {
  return CASOS.find((c) => c.id === id) || null;
}

export function siguienteCaso(completados) {
  return CASOS.find((c) => !completados.includes(c.id)) || null;
}

export function numCaso(id) {
  const i = CASOS.findIndex((c) => c.id === id);
  return i >= 0 ? i + 1 : 0;
}
