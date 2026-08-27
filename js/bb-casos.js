// ============================================================
// bb-casos.js — Catálogo de casos de la campaña bug bounty
// Añade un nuevo caso creando un archivo en js/bb-casos/ e
// importándolo aquí. El juego lo usará automáticamente.
// ============================================================

import bb01 from "./bb-casos/bb-01-idor.js";
import bb02 from "./bb-casos/bb-02-xss.js";
import bb03 from "./bb-casos/bb-03-cors.js";
import bb04 from "./bb-casos/bb-04-open-redirect.js";
import bb05 from "./bb-casos/bb-05-ssrf.js";
import bb06 from "./bb-casos/bb-06-sqli.js";

export const BB_CASOS = [bb01, bb02, bb03, bb04, bb05, bb06];

export function casoPorIdBB(id) {
  return BB_CASOS.find((c) => c.id === id) || null;
}

export function siguienteCasoBB(completados) {
  return BB_CASOS.find((c) => !completados.includes(c.id)) || null;
}

export function numCasoBB(id) {
  const i = BB_CASOS.findIndex((c) => c.id === id);
  return i >= 0 ? i + 1 : 0;
}
