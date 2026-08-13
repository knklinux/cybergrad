// visual-core.mjs — Núcleo compartido de los tests de artefactos visuales.
// Define los canónicos del SUBTÍTULO del banner y del SEPARADOR ASCII de la
// terminal, junto con la extracción local (desde el código fuente) y la
// verificación runtime (desde texto renderizado). Lo usan:
//   - visual-test.mjs → contra js/main.js y js/terminal.js (local, Node puro)
//   - prod-test.mjs   → contra la versión desplegada en GitHub Pages
//                        (check de integración, E2E con Playwright)
//
// Igual que banner-core.mjs: un único canónico para las dos capas, para que
// el test local y el de producción verifiquen exactamente lo mismo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const EM = "\u2014"; // —

// ============================================================
// 1. SUBTÍTULO DEL BANNER (js/main.js)
// ============================================================
export const SUBTITULO_CANON =
  "Simulador de carrera SOC + Red Team " + EM + " defiende como analista y ataca como pentester.";

// Extrae el subtítulo del código fuente (la fuente de verdad local).
export function extraerSubtituloLocal() {
  const src = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
  const m = src.match(/term\.print\("([^"]*Simulador de carrera[^"]*)"\s*,\s*"t-out-info"\)/);
  if (!m) throw new Error("No se encontró el subtítulo en js/main.js");
  return m[1];
}

// Verifica un subtítulo (local o renderizado) contra el canónico.
// Devuelve [{ nombre, ok, extra }].
export function verificarSubtitulo(sub) {
  const checks = [];
  checks.push({ nombre: "subtítulo: presente", ok: typeof sub === "string" && sub.length > 0 });
  if (typeof sub === "string" && sub.length > 0) {
    checks.push({
      nombre: "subtítulo: coincide con el canónico",
      ok: sub === SUBTITULO_CANON,
      extra: `(esperado |${SUBTITULO_CANON}| real |${sub}|)`,
    });
    checks.push({
      nombre: "subtítulo: menciona las dos campañas y el enfoque",
      ok: sub.includes("SOC + Red Team") && sub.includes("pentester"),
      extra: "(debe incluir 'SOC + Red Team' y 'pentester')",
    });
  }
  return checks;
}

// ============================================================
// 2. PIE DE ARRANQUE (js/main.js)
// ============================================================
export const FOOTER_CANON =
  "\u00A9 CYBERGRAD \u00B7 Uso educativo \u00B7 Personajes y empresas ficticios";

// Extrae el pie del código fuente (la fuente de verdad local).
export function extraerFooterLocal() {
  const src = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
  const m = src.match(/term\.print\("([^"]*CYBERGRAD[^"]*Uso educativo[^"]*)"\s*,\s*"t-out-dim"\)/);
  if (!m) throw new Error("No se encontró el pie de arranque en js/main.js");
  return m[1];
}

// Verifica un pie (local o renderizado) contra el canónico.
export function verificarFooter(footer) {
  const checks = [];
  checks.push({ nombre: "pie: presente", ok: typeof footer === "string" && footer.length > 0 });
  if (typeof footer === "string" && footer.length > 0) {
    checks.push({
      nombre: "pie: coincide con el canónico",
      ok: footer === FOOTER_CANON,
      extra: `(esperado |${FOOTER_CANON}| real |${footer}|)`,
    });
    checks.push({
      nombre: "pie: menciona la marca y el uso educativo",
      ok: footer.includes("CYBERGRAD") && footer.includes("Uso educativo"),
      extra: "(debe incluir 'CYBERGRAD' y 'Uso educativo')",
    });
  }
  return checks;
}

// ============================================================
// 3. SEPARADOR ASCII DE LA TERMINAL (js/terminal.js)
// ============================================================
export const SEPARADOR_CHAR = "\u2500"; // ─
export const SEPARADOR_N = 52;

// Extrae carácter, cantidad y el formato línea/título/línea del código fuente.
export function extraerSeparadorLocal() {
  const src = fs.readFileSync(path.join(root, "js", "terminal.js"), "utf8");
  const m = src.match(/const linea = "([^"]*)"\.repeat\((\d+)\);/);
  if (!m) throw new Error("No se encontró el separador en js/terminal.js");
  const formatoOK =
    /this\.print\(titulo \? `\$\{linea\}\\n\$\{titulo\}\\n\$\{linea\}` : linea, "t-out-dim"\)/.test(src);
  return { char: m[1], n: parseInt(m[2], 10), formatoOK };
}

// Verifica un separador renderizado (una sola línea de guiones o el formato
// completo "línea\ntítulo\nlínea"). Devuelve [{ nombre, ok, extra }].
export function verificarSeparador(texto) {
  const checks = [];
  const presente = typeof texto === "string" && texto.length > 0;
  checks.push({ nombre: "separador: presente", ok: presente });
  if (!presente) return checks;
  const lineas = texto.split("\n");
  const linea = lineas[0].trimEnd();
  checks.push({
    nombre: "separador: carácter de línea es ─ (U+2500)",
    ok: linea.length > 0 && [...linea].every((ch) => ch === SEPARADOR_CHAR),
    extra: `(real: ${JSON.stringify(linea.slice(0, 4))}…)`,
  });
  checks.push({
    nombre: `separador: ${SEPARADOR_N} guiones exactos`,
    ok: linea.length === SEPARADOR_N,
    extra: `(real: ${linea.length})`,
  });
  if (lineas.length >= 3) {
    checks.push({
      nombre: "separador: formato línea/título/línea",
      ok: lineas[0].trimEnd() === linea && lineas[2].trimEnd() === linea && lineas[1].trim().length > 0,
      extra: `(título: ${lineas[1].trim()})`,
    });
  }
  return checks;
}
