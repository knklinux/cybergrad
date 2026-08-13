// visual-test.mjs — Regresión golden de artefactos visuales de CYBERGRAD
// Misma técnica que banner-test.mjs, aplicada a tres artefactos que se
// rompen fácilmente sin que nadie lo note (textos de marca y decoración):
//
//   1. SUBTÍTULO del banner (js/main.js) — el tagline bajo el ASCII.
//   2. SEPARADOR ASCII de la terminal (js/terminal.js) — la línea "────"
//      de 52 guiones (U+2500) con el formato línea/título/línea.
//   3. ESCALAS DE RANGO del tutorial (js/tutorial.js) — la slide PROGRESIÓN:
//      emoji + nombre de cada rango, SOC y Red Team, en su orden exacto.
//
// Estrategia (igual que el banner): canónico fijo + comparación golden +
// diagnóstico por pieza para localizar qué artefacto y qué parte está rota.
// El subtítulo y el separador comparten canónico con el test de producción
// (visual-core.mjs); las escalas del tutorial son solo locales porque no se
// renderizan al arrancar. Corre en Node puro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extraerSubtituloLocal,
  verificarSubtitulo,
  extraerSeparadorLocal,
  verificarSeparador,
} from "./visual-core.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leer = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};
const correr = (checks) => { for (const c of checks) check(c.nombre, c.ok, c.extra); };

const ARROW = "\u2192"; // →

// ============================================================
// 1. SUBTÍTULO DEL BANNER (js/main.js)
// ============================================================
try {
  correr(verificarSubtitulo(extraerSubtituloLocal()));
} catch (e) {
  check("subtítulo: presente en main.js", false, `(${e.message})`);
}

// ============================================================
// 2. SEPARADOR ASCII DE LA TERMINAL (js/terminal.js)
// ============================================================
try {
  const sep = extraerSeparadorLocal();
  // Verifica el separador renderizado reconstruyendo su salida exacta:
  // "─".repeat(52) (sin título) y con el formato línea/título/línea.
  correr(verificarSeparador(sep.char.repeat(sep.n)));
  check(
    "separador: formato línea/título/línea",
    sep.formatoOK,
    "(debe ser `linea\\ntitulo\\nlinea`)"
  );
} catch (e) {
  check("separador: presente en terminal.js", false, `(${e.message})`);
}

// ============================================================
// 3. ESCALAS DE RANGO DEL TUTORIAL (js/tutorial.js)
// ============================================================
// Pares [emoji, nombre] en el orden exacto que debe mostrar la slide.
const ESCALA_SOC = [
  ["\u{1F331}", "Analista Junior"], // 🌱
  ["\u{1F50D}", "Analista SOC"], // 🔍
  ["\u{1F6E1}\u{FE0F}", "Analista Senior"], // 🛡️
  ["\u{1F396}\u{FE0F}", "Líder de Equipo"], // 🎖️
  ["\u{1F3C6}", "Jefe de CSIRT"], // 🏆
];
const ESCALA_RT = [
  ["\u{1F331}", "Aprendiz de Pentester"], // 🌱
  ["\u{1F577}\u{FE0F}", "Pentester Junior"], // 🕷️
  ["\u{1F977}", "Pentester"], // 🥷
  ["\u{1F525}", "Pentester Senior"], // 🔥
  ["\u{1F451}", "Líder Red Team"], // 👑
  ["\u{1F3C6}", "CISO"], // 🏆
];

const tutSrc = leer("js/tutorial.js");
const extraerEscala = (primerRango, re) => {
  const m = tutSrc.match(re);
  return m ? m[0] : null;
};
const socTexto = extraerEscala("Analista Junior", new RegExp("\u{1F331} Analista Junior " + ARROW + "[^<]*"));
const rtTexto = extraerEscala("Aprendiz de Pentester", new RegExp("\u{1F331} Aprendiz de Pentester " + ARROW + "[^<]*"));

const verificarEscala = (nombre, texto, canonicos) => {
  const canon = canonicos.map(([e, n]) => e + " " + n).join(" " + ARROW + " ");
  check(
    `escala ${nombre}: texto completo correcto`,
    !!texto && texto === canon,
    texto ? `(esperado |${canon}| real |${texto}|)` : "(no encontrada en tutorial.js)"
  );
  for (const [e, n] of canonicos) {
    check(
      `escala ${nombre}: "${n}" con su emoji`,
      !!texto && texto.includes(e + " " + n),
      `(falta o cambió el par emoji+nombre de ${n})`
    );
  }
};
verificarEscala("SOC", socTexto, ESCALA_SOC);
verificarEscala("Red Team", rtTexto, ESCALA_RT);

console.log(
  fail === 0
    ? `\n\u2705 visual: ${pass} checks, 0 fallos`
    : `\n\u274c visual: ${pass} ok, ${fail} fallos`
);
process.exit(fail === 0 ? 0 : 1);
