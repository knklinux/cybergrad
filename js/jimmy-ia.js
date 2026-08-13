// ============================================================
// jimmy-ia.js — Jimmy responde preguntas libres
// Comando: preguntar <texto>  (alias: jimmy <texto>)
//
// Jimmy analiza la pregunta y responde usando el CONTEXTO del
// caso actual: qué te falta por hacer (con el comando exacto),
// las técnicas MITRE del caso, el glosario y las evidencias
// (busca en el filesystem, correos y alertas las líneas que
// contengan las palabras clave de tu pregunta).
//
// Es 100 % local y determinista: sin backend, sin red y
// testeable en CI. La integración con un LLM externo (Aion
// Sincro) sería un paso posterior opcional.
// ============================================================

import { GLOSARIO } from "./glosario.js";
import { TECNICAS, describirTecnica } from "./mitre.js";

export const PREGUNTAR_AYUDA =
  "preguntar [texto] — Jimmy responde preguntas libres sobre el caso actual (qué hacer, técnicas MITRE, glosario, evidencias). Sin texto: escucha tu voz con el reconocimiento del navegador (🎙; `preguntar off` cancela)";

const RE_TECNICA = /\bT\d{4}(?:\.\d{3})?\b/g;

// Comando recomendado para cada tipo de objetivo (según el motor)
function comandoPara(tipo, valor) {
  switch (tipo) {
    case "bloquear": return `bloquear ${valor}`;
    case "aislar": return `aislar ${valor}`;
    case "deshabilitar": return `deshabilitar ${valor}`;
    case "recon": return valor.startsWith("http") ? `gobuster ${valor}` : `nmap ${valor}`;
    case "acceso": return "hydra / ssh / sqlmap / msf (según el objetivo)";
    case "escalada": return `escalar_priv ${valor}`;
    case "exfiltracion": return `exfiltrar ${valor}`;
    default: return `${tipo} ${valor}`;
  }
}

// Objetivos pendientes del caso actual (lo que todavía no has hecho)
export function pendientesDelCaso(caso, hecho) {
  if (!caso) return [];
  const c = caso.correctas || {};
  const pendientes = [];
  const hechoSet = hecho instanceof Set ? hecho : new Set();
  for (const [tipo, lista] of Object.entries(c)) {
    if (tipo === "escalar" || tipo === "cerrar") {
      if (lista && !hechoSet.has(tipo)) {
        pendientes.push({
          tipo,
          etiqueta: tipo === "escalar" ? "escalar el incidente a CSIRT" : "cerrar el caso (falso positivo)",
          comando: tipo === "escalar" ? "escalar" : "cerrar_caso",
        });
      }
      continue;
    }
    if (!lista) continue;
    for (const target of lista) {
      const clave = tipo === "bloquear" || tipo === "aislar" || tipo === "deshabilitar"
        ? `${tipo}:${target}`
        : `objetivo:${tipo}:${target}`;
      if (hechoSet.has(clave)) continue;
      pendientes.push({ tipo, etiqueta: target, comando: comandoPara(tipo, target) });
    }
  }
  return pendientes;
}

// Busca líneas de evidencia que contengan alguna palabra clave de la pregunta
function buscarEvidencias(caso, palabras) {
  const lineas = [];
  const fuentes = [];
  const fs = caso.fs || {};
  for (const ruta of Object.keys(fs)) {
    fuentes.push({ ruta, texto: String(fs[ruta]) });
  }
  for (const m of caso.correos || []) {
    fuentes.push({ ruta: "correo: " + m.asunto, texto: `${m.de} ${m.para} ${m.asunto} ${m.cuerpo || ""} ${m.adjunto || ""}` });
  }
  for (const a of caso.alertas || []) {
    fuentes.push({ ruta: "alerta: " + (a.id || "") + " " + a.titulo, texto: `${a.titulo} ${a.detalle || ""}` });
  }
  for (const f of fuentes) {
    const trozos = f.texto.split("\n");
    for (const t of trozos) {
      const baja = t.toLowerCase();
      if (palabras.some((p) => baja.includes(p))) {
        lineas.push({ ruta: f.ruta, texto: t.trim().slice(0, 180) });
      }
    }
  }
  return lineas.slice(0, 4);
}

// Intenta resolver la pregunta contra el glosario
function buscarGlosario(texto) {
  const baja = texto.toLowerCase();
  for (const [termino, { def }] of Object.entries(GLOSARIO)) {
    const clave = termino.toLowerCase();
    if (baja.includes(clave) || clave.includes(baja.replace(/[^a-z0-9áéíóúñ ]/g, "").trim())) {
      if (baja.includes(clave)) return `📖 ${termino}: ${def}`;
    }
  }
  return null;
}

// Pregunta principal: ¿qué hago / cómo sigo / siguiente paso?
function esPreguntaDeSiguientePaso(texto) {
  return /(qué hago|que hago|qu[eé] hacer|qu[eé] sigue|siguiente|ahora|c[oó]mo sigo|sigo atascado|no s[eé] qu[eé] hacer|dame una pista|ay[uú]dame)/.test(texto);
}

// Pregunta sobre el propio caso
function esPreguntaDelCaso(texto) {
  return /(caso|incidente|contexto|qu[eé] est[aá] pasando|resumen|de qu[eé] va|qu[eé] es esto)/.test(texto);
}

export function preguntarJimmy(pregunta, ctx) {
  const caso = ctx && ctx.caso;
  const hecho = ctx && ctx.hecho;
  const modoRT = !!(ctx && ctx.modoRT);
  const texto = String(pregunta || "").trim();

  const lineas = [];
  lineas.push("🧠 Jimmy — " + (caso ? `sobre tu caso: «${caso.titulo}»` : "aún no tienes caso activo."));

  if (!caso) {
    lineas.push("");
    lineas.push(modoRT
      ? "Abre la campaña Red Team (botón 🎯) o el Reto diario y empieza por el reconocimiento: `nmap` para mapear."
      : "Empieza por `ver_caso` para leer tu briefing, o abre el Tutorial (botón 🧑‍🎓) si es tu primera vez.");
    return lineas.join("\n");
  }

  // 1) Técnicas MITRE mencionadas en la pregunta
  const tecnicas = texto.match(RE_TECNICA) || [];
  if (tecnicas.length) {
    lineas.push("");
    lineas.push("🧭 MITRE ATT&CK:");
    for (const t of tecnicas) lineas.push("   • " + describirTecnica(t));
    // Si la técnica es del caso, añade el contexto
    const delCaso = (caso.leccion && caso.leccion.mitre) || [];
    const coinciden = tecnicas.filter((t) => delCaso.some((m) => m.startsWith(t) || t.startsWith(m)));
    if (coinciden.length) {
      lineas.push("");
      lineas.push(`   ➜ Es una de las técnicas de este caso (${coinciden.join(", ")}): la lección al terminar te la explica en profundidad.`);
    }
    return lineas.join("\n");
  }

  // 2) Glosario
  const glos = buscarGlosario(texto);
  if (glos) {
    lineas.push("");
    lineas.push(glos);
    return lineas.join("\n");
  }

  // 3) ¿Qué hacer ahora?
  if (esPreguntaDeSiguientePaso(texto)) {
    const pendientes = pendientesDelCaso(caso, hecho);
    lineas.push("");
    if (pendientes.length === 0) {
      lineas.push("Ya has cubierto todos los objetivos del caso.");
      lineas.push("Redacta el informe con `informe` para cerrarlo y ver tu calificación.");
      return lineas.join("\n");
    }
    lineas.push(`Te faltan ${pendientes.length} objetivo(s):`);
    for (const p of pendientes) {
      lineas.push(`   • ${p.etiqueta}  →  \`${p.comando}\``);
    }
    lineas.push("");
    lineas.push(modoRT
      ? "Flujo ofensivo: `nmap` para enumerar → `gobuster`/`nikto` para la web → `hydra`/`sqlmap`/`msf` para entrar → `exfiltrar` los datos → `informe`."
      : "Flujo defensivo: `mail`/`alertas` para ver fuentes → `ls`/`cat`/`grep` en los logs → `whois`/`dig`/`vt` para validar IOCs → `bloquear`/`aislar`/`deshabilitar`/`escalar` → `informe`.");
    return lineas.join("\n");
  }

  // 4) Resumen del caso
  if (esPreguntaDelCaso(texto)) {
    lineas.push("");
    lineas.push(caso.briefing || "");
    if (caso.leccion && caso.leccion.mitre && caso.leccion.mitre.length) {
      lineas.push("");
      lineas.push(`🧭 Técnicas del caso: ${caso.leccion.mitre.join(", ")}`);
    }
    return lineas.join("\n");
  }

  // 5) Búsqueda en evidencias por palabras clave
  const palabras = (texto.toLowerCase().match(/[a-z0-9áéíóúñü.-]{4,}/g) || [])
    .filter((w) => !["para", "como", "cómo", "que", "qué", "con", "del", "una", "este", "esta", "tiene", "por", "puedo", "debería", "sobre", "cual", "cuál", "porque", "porqué"].includes(w))
    .slice(0, 3);
  if (palabras.length) {
    const hits = buscarEvidencias(caso, palabras);
    if (hits.length) {
      lineas.push("");
      lineas.push("🔎 Esto es lo que encuentro en las evidencias:");
      for (const h of hits) lineas.push(`   [${h.ruta}] ${h.texto}`);
      return lineas.join("\n");
    }
  }

  // 6) Fallback: estado + pendientes
  lineas.push("");
  const pendientes = pendientesDelCaso(caso, hecho);
  if (pendientes.length) {
    lineas.push(`Estás en el caso «${caso.titulo}» (${caso.severidad}). Te faltan ${pendientes.length} objetivo(s):`);
    for (const p of pendientes) lineas.push(`   • ${p.etiqueta}  →  \`${p.comando}\``);
  } else {
    lineas.push("Objetivos cubiertos. Si ya has entregado el informe, este caso está cerrado.");
  }
  lineas.push("");
  lineas.push("Pregúntame por una técnica (ej: «¿qué es T1566?»), un término del glosario, un archivo del caso, o simplemente «¿qué hago?».");
  return lineas.join("\n");
}

// Técnicas conocidas (para tests y para el árbol)
export function tecnicasConocidas() {
  return Object.keys(TECNICAS);
}
