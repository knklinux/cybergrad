// ============================================================
// habilidades.js — Árbol de habilidades MITRE ATT&CK
// Cada técnica de las lecciones de los casos (SOC y Red Team)
// se desbloquea al completar un caso que la enseñe. El árbol
// muestra por táctica qué dominas y qué te falta, y qué caso
// te desbloquea cada técnica pendiente.
// ============================================================

import { GAME } from "./state.js";
import { CASOS } from "./casos.js";
import { RT_CASOS } from "./rt-casos.js";
import { TECNICAS, tacticasConTecnicas } from "./mitre.js";

// Normaliza un código de técnica (quita notas tipo "(contexto)")
export function limpiarCodigo(code) {
  return String(code || "").trim().split(/\s+/)[0];
}

// técnica → [{casoId, titulo, modo}] (qué casos la enseñan)
export function tecnicasPorCaso() {
  const mapa = new Map();
  const registrar = (caso) => {
    const codes = (caso.leccion && caso.leccion.mitre) || [];
    for (const raw of codes) {
      const code = limpiarCodigo(raw);
      if (!mapa.has(code)) mapa.set(code, []);
      mapa.get(code).push({ casoId: caso.id, titulo: caso.titulo, modo: caso.modo === "rt" ? "rt" : "soc" });
    }
  };
  for (const c of CASOS) registrar(c);
  for (const c of RT_CASOS) registrar(c);
  return mapa;
}

// Técnicas dominadas por el jugador (casos completados)
export function tecnicasDominadas() {
  const dominadas = new Set();
  const porCaso = tecnicasPorCaso();
  const socHechas = new Set(GAME.lecciones || []);
  const rtHechas = new Set(GAME.rtLecciones || []);
  for (const [code, casos] of porCaso) {
    const algunaHecha = casos.some((c) => (c.modo === "rt" ? rtHechas : socHechas).has(c.casoId));
    if (algunaHecha) dominadas.add(code);
  }
  return dominadas;
}

// Estado completo para el panel: por táctica, técnicas con su estado
export function estadoHabilidades() {
  const dominadas = tecnicasDominadas();
  const porCaso = tecnicasPorCaso();
  const tacticas = tacticasConTecnicas().map((t) => {
    // Solo se muestran las técnicas que ALGÚN caso enseña (las demás de la
    // KB quedan fuera del árbol: no hay caso que las desbloquee).
    const tecnicas = t.tecnicas
      .filter(({ code }) => porCaso.has(code))
      .map(({ code, nombre, desc }) => {
        const casos = porCaso.get(code) || [];
        const hecha = dominadas.has(code);
        return {
          code,
          nombre,
          desc,
          hecha,
          casos: casos.map((c) => ({ ...c })),
        };
      });
    const nHechas = tecnicas.filter((x) => x.hecha).length;
    return { ...t, tecnicas, nHechas };
  });
  // Técnicas presentes en los casos pero sin entrada en la KB (integridad de datos)
  const sinKb = [...porCaso.keys()].filter((c) => !TECNICAS[c]);
  return { tacticas, dominadas: dominadas.size, total: porCaso.size, sinKb };
}
