// meta-core.mjs — Núcleo compartido del check de METADATOS de CYBERGRAD.
// Define los canónicos del TÍTULO de pestaña, Open Graph y Twitter Card,
// junto con la extracción local (desde index.html) y la verificación
// runtime (desde el DOM renderizado). Lo usan:
//   - meta-test.mjs   → contra index.html (local, Node puro, con mutaciones)
//   - prod-test.mjs   → contra la versión desplegada en GitHub Pages
//                        (check de integración, E2E con Playwright)
//
// Igual que banner-core.mjs y visual-core.mjs: un único canónico para las
// dos capas, para que local y producción verifiquen exactamente lo mismo.
// La tarjeta de LinkedIn se rompe si cualquiera de estos valores cambia
// (o si una og:image deja de existir), así que se trata como un artefacto
// de arranque más: título de pestaña, descripción, og:title, og:description,
// og:url, canonical, idioma, twitter:card, og:image (ambas) y twitter:image.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const EM = "\u2014"; // —

export const META_CANON = {
  titulo: "CYBERGRAD " + EM + " Simulador de Carrera SOC + Red Team",
  desc: "Aprende ciberseguridad jugando: defiende incidentes como analista SOC y ejecuta pentests como red team desde una terminal realista. Asciende de analista junior a CISO con Jimmy, tu director sintético.",
  ogUrl: "https://knklinux.github.io/cybergrad/",
  ogImagenes: [
    "https://knklinux.github.io/cybergrad/assets/cover.jpg",
    "https://knklinux.github.io/cybergrad/assets/cover-square.jpg",
  ],
  twitterCard: "summary_large_image",
  twitterImagen: "https://knklinux.github.io/cybergrad/assets/cover.jpg",
  canonical: "https://knklinux.github.io/cybergrad/",
  lang: "es",
};

// Extrae los metadatos de un HTML dado (index.html o una copia mutada en
// memoria). La presencia de la CSP se comprueba por el meta tag REAL y no
// por el substring: el comentario explicativo de index.html también
// contiene "Content-Security-Policy" y daría un falso positivo.
export function extraerMetadatosDe(html) {
  const get = (re) => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  return {
    titulo: get(/<title>([^<]*)<\/title>/),
    desc: get(/<meta name="description" content="([^"]*)"\s*\/?>/),
    ogTitle: get(/<meta property="og:title" content="([^"]*)"\s*\/?>/),
    ogDesc: get(/<meta property="og:description" content="([^"]*)"\s*\/?>/),
    ogUrl: get(/<meta property="og:url" content="([^"]*)"\s*\/?>/),
    ogImages: [...html.matchAll(/<meta property="og:image" content="([^"]*)"\s*\/?>/g)].map((m) => m[1]),
    twitterCard: get(/<meta name="twitter:card" content="([^"]*)"\s*\/?>/),
    twitterImage: get(/<meta name="twitter:image" content="([^"]*)"\s*\/?>/),
    canonical: get(/<link rel="canonical" href="([^"]*)"\s*\/?>/),
    lang: get(/<html lang="([^"]*)"/),
    // Contenido del meta CSP REAL (no basta con que el substring exista:
    // el comentario explicativo de index.html también contiene la palabra).
    cspContent: (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"\s*\/?>/) || [])[1] || "",
  };
}

// Extrae los metadatos del código fuente (index.html), la fuente local.
export function extraerMetadatosLocal() {
  return extraerMetadatosDe(fs.readFileSync(path.join(root, "index.html"), "utf8"));
}

const base = (url) => (url || "").split("/").pop() || "?";

// Verifica los metadatos (extraídos de index.html o del DOM desplegado).
// Devuelve [{ nombre, ok, extra }].
export function verificarMetadatos(m) {
  const checks = [];
  const eq = (nombre, real, esperado) => {
    checks.push({
      nombre,
      ok: real === esperado,
      extra: `(esperado |${esperado}| real |${real}|)`,
    });
  };
  eq("título de pestaña: coincide con el canónico", m.titulo, META_CANON.titulo);
  eq("og:title: coincide con el título", m.ogTitle, META_CANON.titulo);
  // Cierra el ciclo de metadatos: el og:title del DOM debe ser EXACTAMENTE
  // el título de pestaña servido (no solo ambos iguales al canónico). Si
  // producción sirviera un título y un og:title coherentes entre sí pero
  // distintos del canónico, los dos checks anteriores fallarían; este
  // invariante relacional garantiza además que nunca se descuadren entre
  // ellos en la versión desplegada.
  eq("og:title y título de pestaña: coherentes entre sí", m.ogTitle, m.titulo);
  eq("description: coincide con el canónico", m.desc, META_CANON.desc);
  eq("og:description: coincide con description", m.ogDesc, META_CANON.desc);
  eq("og:url: coincide con la URL del juego", m.ogUrl, META_CANON.ogUrl);
  eq("canonical: coincide con la URL del juego", m.canonical, META_CANON.canonical);
  eq("lang: es", m.lang, META_CANON.lang);
  checks.push({
    nombre: "twitter:card: summary_large_image",
    ok: m.twitterCard === META_CANON.twitterCard,
    extra: `(real |${m.twitterCard}|)`,
  });
  checks.push({
    nombre: "og:image: cubre las dos imágenes de la tarjeta",
    ok: Array.isArray(m.ogImages) && META_CANON.ogImagenes.every((u) => m.ogImages.includes(u)),
    extra: `(reales |${(m.ogImages || []).join(", ")}|)`,
  });
  checks.push({
    nombre: "twitter:image: apunta a la portada",
    ok: m.twitterImage === META_CANON.twitterImagen,
    extra: `(real |${m.twitterImage}|)`,
  });
  if (m.cspContent !== undefined) {
    checks.push({
      nombre: "CSP: meta presente en el documento",
      ok: typeof m.cspContent === "string" && m.cspContent.length > 0,
      extra: "(debe existir el meta Content-Security-Policy)",
    });
    if (typeof m.cspContent === "string" && m.cspContent.length > 0) {
      // En GitHub Pages la CSP NO llega como cabecera HTTP (Pages ignora
      // _headers): la meta CSP es la capa realmente aplicada. Se verifican
      // las directivas clave de la política efectiva.
      checks.push({
        nombre: "CSP: directivas clave de la política efectiva",
        ok: m.cspContent.includes("default-src 'none'") &&
          m.cspContent.includes("script-src 'self'") &&
          m.cspContent.includes("connect-src 'self'"),
        extra: `(política: ${m.cspContent.slice(0, 90)}…)`,
      });
    }
  }
  return checks;
}

// Verifica que una og:image responde HTTP 200 con content-type de imagen
// (comprobación que solo tiene sentido en producción: un archivo roto o
// desaparecido rompe la tarjeta de LinkedIn aunque el HTML diga lo correcto).
export function verificarImagen(url, status, contentType) {
  return [
    {
      nombre: `og:image ${base(url)}: responde HTTP 200`,
      ok: status === 200,
      extra: `(HTTP ${status})`,
    },
    {
      nombre: `og:image ${base(url)}: content-type de imagen`,
      ok: typeof contentType === "string" && contentType.startsWith("image/"),
      extra: `(${contentType || "sin content-type"})`,
    },
  ];
}
