// ============================================================
// pwa.js — Registro del service worker (CYBERGRAD como PWA)
// Habilita la instalación (manifest) y el modo offline (sw.js).
// Es un módulo propio (no inline) para respetar la CSP del juego
// (script-src 'self'): el registro se hace desde un archivo, no
// desde un bloque <script> en el HTML.
// ============================================================
if ("serviceWorker" in navigator) {
  // Solo en contexto seguro: HTTPS o localhost (GitHub Pages lo es).
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then(() => {
        // Silencioso a propósito: la instalación/actualización del
        // service worker no debe interrumpir una partida en curso.
      })
      .catch(() => {
        // Sin service worker (navegador raro o contexto no seguro):
        // el juego sigue funcionando igual, solo sin modo offline.
      });
  });
}
