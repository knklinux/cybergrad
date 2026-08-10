// ============================================================
// rt-casos.js — Catálogo de casos de la campaña red team
// Añade un caso creando un archivo en js/rt-casos/ e
// importándolo aquí.
// ============================================================

import rt01 from "./rt-casos/rt-01-recon.js";
import rt02 from "./rt-casos/rt-02-hydra.js";
import rt03 from "./rt-casos/rt-03-sqli.js";
import rt04 from "./rt-casos/rt-04-msf.js";
import rt05 from "./rt-casos/rt-05-mimikatz.js";
import rt06 from "./rt-casos/rt-06-exfil.js";

export const RT_CASOS = [rt01, rt02, rt03, rt04, rt05, rt06];

export function numCasoRT(id) {
  const i = RT_CASOS.findIndex((c) => c.id === id);
  return i >= 0 ? i + 1 : 0;
}

export function siguienteCasoRT(completados) {
  return RT_CASOS.find((c) => !completados.includes(c.id)) || null;
}
