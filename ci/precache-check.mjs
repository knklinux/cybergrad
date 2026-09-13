// precache-check.mjs — Guardián de pre-commit del PRECACHE de sw.js
//
// Origen: incidente del modo Bug Bounty (2026-08-27) — 8 ficheros nuevos en
// js/ sin regenerar sw.js → CI rojo en "precache TODOS los .js de js/" y
// modo offline roto para esas pantallas. Este check aplica la misma regla
// que ci/pwa-test.mjs (Parte 1), pero en Node puro, sin dependencias y en
// milisegundos, para correr ANTES de crear el commit (ver .githooks/).
//
// Uso:
//   node ci/precache-check.mjs          → valida el árbol de trabajo
//   node ci/precache-check.mjs --staged → valida SOLO lo indexado
//                                         (modo del hook pre-commit)
//
// Sale 0 si todo está cubierto; 1 (con diagnóstico y remedio) si falta algo.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STAGED = process.argv.includes("--staged");

const die = (msg) => {
  console.error(`✘ ${msg}`);
  console.error("\n  Remedio: npm run build:sw   (regenera sw.js con el árbol actual)\n");
  process.exit(1);
};

// ---------- Qué declara cubrir sw.js ----------
if (!existsSync(path.join(ROOT, "sw.js"))) die("no encuentro sw.js");
const sw = readFileSync(path.join(ROOT, "sw.js"), "utf8");
const precacheMatch = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
if (!precacheMatch) die("sw.js: no encuentro el array PRECACHE");
const precache = [...precacheMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

// ---------- Helpers ----------
const gitignored = (f) => {
  try { execFileSync("git", ["-C", ROOT, "check-ignore", "--quiet", f], { stdio: "ignore" }); return true; }
  catch { return false; }
};
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// En modo --staged solo exigimos cobertura de lo INDEXADO (ACMR: añadidos,
// copiados, modificados y renombrados; los borrados no pueden quedar fuera
// del precache). Así el hook no se queja de ficheros experimentales del
// árbol que aún no vas a commitear.
const stagedPaths = () => {
  const out = execFileSync(
    "git", ["-C", ROOT, "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" },
  );
  return new Set(out.split(/\r?\n/).filter(Boolean));
};
const staged = STAGED ? stagedPaths() : null;
const stagedIn = (prefix, suffix) =>
  [...staged].filter((f) => f.startsWith(prefix) && f.endsWith(suffix));

// pwa-test.mjs no filtra js/ por gitignore porque CI parte de un checkout
// limpio; aquí sí filtramos para no bloquear por ficheros locales que jamás
// llegarán a CI (equivalente a un checkout limpio).
let jsFiles;
let assetFiles;
if (STAGED) {
  jsFiles = stagedIn("js/", ".js").filter((f) => !gitignored(f));
  assetFiles = stagedIn("assets/", "").filter((f) => !gitignored(f));
} else {
  jsFiles = walk(path.join(ROOT, "js")).map(rel).filter((f) => !gitignored(f));
  assetFiles = walk(path.join(ROOT, "assets")).map(rel).filter((f) => !gitignored(f));
}

// ---------- Reglas (las mismas que pwa-test.mjs) ----------
const missingJs = jsFiles.filter((f) => !precache.includes(f));
if (missingJs.length) {
  die(`el PRECACHE de sw.js no cubre ${missingJs.length} .js de js/: ${missingJs.join(", ")}`);
}

const missingAssets = assetFiles.filter((f) => !precache.includes(f));
if (missingAssets.length) {
  die(`el PRECACHE de sw.js no cubre ${missingAssets.length} assets: ${missingAssets.join(", ")}`);
}

// build-sw.mjs excluye los gitignored (p. ej. jimmy.jpg): si aparecen en el
// PRECACHE, alguien los añadió a mano y el install los pediría en vano.
const extraGitignored = precache.filter((f) => (f.startsWith("assets/") || f.startsWith("js/")) && gitignored(f));
if (extraGitignored.length) {
  die(`el PRECACHE incluye ficheros gitignored (no existen en un checkout limpio): ${extraGitignored.join(", ")}`);
}

console.log(
  `✔ PRECACHE al día: ${jsFiles.length} .js de js/ + ${assetFiles.length} assets` +
  (STAGED ? " (indexados)" : " (árbol de trabajo)"),
);
