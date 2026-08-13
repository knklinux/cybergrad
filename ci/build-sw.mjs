// ============================================================
// build-sw.mjs — Genera sw.js (service worker de CYBERGRAD) a
// partir de los archivos reales del juego, sin dependencias.
//
// El precache se construye escaneando index.html (css, iconos,
// scripts) y los directorios js/, css/ y assets/. La versión es
// un hash del contenido de los archivos + la plantilla del SW,
// así que cualquier cambio (contenido o lógica) produce un sw.js
// distinto → los navegadores detectan la actualización, renuevan
// la caché y vuelven a precachear.
//
// Determinista: mismo contenido → mismo sw.js byte a byte
// (se puede comprobar con `git diff --exit-code` en el CI).
//
// Uso: node ci/build-sw.mjs   (escribe sw.js en la raíz)
// ============================================================
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// ---------- Recursos referenciados desde index.html ----------
const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
const refs = [];
for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const url = m[1];
  if (/^(https?:|data:|#|\/\/)/.test(url) || url.startsWith("assets/cover")) continue;
  refs.push(url.replace(/^\.\//, ""));
}
// El manifest y el propio HTML van en el precache aunque no se
// referencien como recurso de estilo/script
for (const f of ["index.html", "manifest.webmanifest"]) if (!refs.includes(f)) refs.push(f);

// ---------- Todos los archivos de los directorios del juego ----------
const dirs = ["js", "css", "assets"].map((d) => walk(path.join(ROOT, d)).map(rel)).flat();

// ---------- Lista de precache final (sin duplicados, ordenada) ----------
const precache = [...new Set([...refs, ...dirs])].sort();

// ---------- Plantilla del service worker ----------
// __VERSION__ y __PRECACHE__ se sustituyen al final. La plantilla forma
// parte del hash: cambiar la lógica del SW renueva la caché también.
const PLANTILLA = `// ============================================================
// sw.js — Service worker de CYBERGRAD (generado)
// No editar a mano: lo genera \`npm run build:sw\` (ci/build-sw.mjs)
// escaneando los archivos reales del juego. Si cambias contenido,
// ejecuta \`npm run build:pwa\` para regenerarlo.
// Estrategia: network-first con fallback a caché → online siempre
// fresco, offline con todo el juego precacheado.
// ============================================================
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const CACHE = VERSION;

self.addEventListener("install", (e) => {
  // allSettled en vez de addAll: un único recurso que falle (p. ej. un 404
  // transitorio durante un deploy) NO debe bloquear la activación ni dejar
  // el SW en estado "installing" para siempre. Lo que sí cachea, cachea.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navegación (el shell de la app): network-first, fallback a caché
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("index.html"))
        )
    );
    return;
  }

  const url = new URL(req.url);

  // Fuentes de Google: stale-while-revalidate (rápidas y offline tras la 1ª visita)
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then((cached) => {
        const red = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
          .catch(() => cached);
        return cached || red;
      })
    );
    return;
  }

  // Mismo origen: network-first con fallback a caché (offline)
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
`;

// ---------- Versión: hash de la plantilla + contenido de los archivos ----------
const h = createHash("sha256");
h.update(PLANTILLA);
for (const f of precache) {
  h.update(f);
  try {
    h.update(readFileSync(path.join(ROOT, f)));
  } catch {
    // el archivo no existe (p. ej. un favicon opcional): se ignora
  }
}
const VERSION = "cybergrad-" + h.digest("hex").slice(0, 12);

// ---------- sw.js final ----------
const sw = PLANTILLA
  .replace("__VERSION__", VERSION)
  .replace("__PRECACHE__", JSON.stringify(precache, null, 2));

writeFileSync(path.join(ROOT, "sw.js"), sw);
console.log(`✔ sw.js generado (${VERSION}, ${precache.length} recursos en precache)`);
