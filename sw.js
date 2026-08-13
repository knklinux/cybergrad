// ============================================================
// sw.js — Service worker de CYBERGRAD (generado)
// No editar a mano: lo genera `npm run build:sw` (ci/build-sw.mjs)
// escaneando los archivos reales del juego. Si cambias contenido,
// ejecuta `npm run build:pwa` para regenerarlo.
// Estrategia: network-first con fallback a caché → online siempre
// fresco, offline con todo el juego precacheado.
// ============================================================
const VERSION = "cybergrad-949b12881744";
const PRECACHE = [
  "assets/apple-touch-icon.png",
  "assets/cover-square.jpg",
  "assets/cover.jpg",
  "assets/cybergrad.ico",
  "assets/favicon.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/jimmy-avatar.jpg",
  "css/style.css",
  "index.html",
  "js/becario.js",
  "js/casos.js",
  "js/casos/caso-01-phishing.js",
  "js/casos/caso-02-bec.js",
  "js/casos/caso-03-falso-positivo.js",
  "js/casos/caso-04-ransomware.js",
  "js/casos/caso-05-fuerza-bruta.js",
  "js/casos/caso-06-dns-exfil.js",
  "js/casos/caso-07-apt.js",
  "js/casos/caso-08-insider.js",
  "js/casos/caso-09-phishing-avanzado.js",
  "js/casos/helpers.js",
  "js/certificado.js",
  "js/commands.js",
  "js/duelo.js",
  "js/engine.js",
  "js/examen.js",
  "js/filesystem.js",
  "js/fx.js",
  "js/glosario.js",
  "js/habilidades.js",
  "js/hash.js",
  "js/jimmy-ia.js",
  "js/jimmy.js",
  "js/logros.js",
  "js/main.js",
  "js/main.js?v=27",
  "js/mitre.js",
  "js/pivot.js",
  "js/presentador.js",
  "js/pwa.js",
  "js/quiz.js",
  "js/reto.js",
  "js/rt-casos.js",
  "js/rt-casos/rt-01-recon.js",
  "js/rt-casos/rt-02-hydra.js",
  "js/rt-casos/rt-03-sqli.js",
  "js/rt-casos/rt-04-msf.js",
  "js/rt-casos/rt-05-mimikatz.js",
  "js/rt-casos/rt-06-exfil.js",
  "js/save.js",
  "js/sonido.js",
  "js/state.js",
  "js/terminal.js",
  "js/tutor.js",
  "js/tutorial.js",
  "js/ui.js",
  "js/voz.js",
  "manifest.webmanifest"
];
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
