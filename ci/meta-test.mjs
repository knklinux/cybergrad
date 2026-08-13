// meta-test.mjs — Regresión golden de los METADATOS de CYBERGRAD
// Misma técnica que banner-test.mjs / visual-test.mjs aplicada a la
// "cabecera" del documento que se renderiza al arrancar (y que decide
// cómo se ve CYBERGRAD al compartirlo en LinkedIn/redes):
//
//   1. TÍTULO de pestaña (<title>) — el que sufrió el "sigue estando mal".
//   2. Open Graph (og:title, og:description, og:url, og:image ×2) — la
//      tarjeta que se comparte.
//   3. Twitter Card (twitter:card, twitter:image) + description + canonical
//      + lang + meta CSP.
//
// Estrategia (igual que el banner): canónico fijo (meta-core.mjs) +
// comparación golden + diagnóstico por pieza, y PRUEBA DE MUTACIÓN en
// memoria: se muta una copia de index.html y se confirma que el test
// caza cada cambio (título, descripción, og:image rota). El canónico se
// comparte con el check de producción (prod-test.mjs), que además
// comprueba que las og:image responden HTTP 200 en el sitio desplegado.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraerMetadatosLocal, extraerMetadatosDe, verificarMetadatos, extraerJsonLdDe, extraerJsonLdLocal, verificarJsonLd, META_CANON } from "./meta-core.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leer = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const src = leer("index.html");

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};
const correr = (checks) => { for (const c of checks) check(c.nombre, c.ok, c.extra); };

// ============================================================
// 1. Metadatos extraídos de index.html contra el canónico
// ============================================================
correr(verificarMetadatos(extraerMetadatosLocal()));

// 2. Las og:image apuntan a archivos que existen en assets/ (local)
for (const url of META_CANON.ogImagenes) {
  const nombre = url.split("/").pop();
  const ruta = path.join(root, "assets", nombre);
  check(
    `og:image ${nombre}: existe en assets/`,
    fs.existsSync(ruta),
    `(falta ${ruta})`
  );
}
// El favicon y el apple-touch-icon también existen (pulido en la pestaña)
for (const nombre of ["favicon.png", "apple-touch-icon.png", "jimmy-avatar.jpg"]) {
  check(
    `icono ${nombre}: existe en assets/`,
    fs.existsSync(path.join(root, "assets", nombre)),
    `(falta assets/${nombre})`
  );
}

// ============================================================
// 2b. _headers — la cabecera CSP declarada para hosts que SÍ la sirven.
// GitHub Pages ignora `_headers` (lo confirma prod-test con HTTP real),
// pero Netlify, Cloudflare Pages o un servidor propio SÍ lo aplican, y
// allí la política llega como cabecera. Verificamos que el fichero existe,
// que su CSP es la MISMA que la meta del documento (una sola política, no
// dos que divergen) y que incluye las directivas clave (frame-ancestors
// incluido). Con su mutación al final de la sección 3.
// ============================================================
const headersTxt = fs.existsSync(path.join(root, "_headers")) ? leer("_headers") : "";
check("_headers: el fichero existe", headersTxt.length > 0, "(falta _headers en la raíz)");

if (headersTxt) {
  const metaLocal = extraerMetadatosLocal();
  const cspHeaders = (headersTxt.match(/Content-Security-Policy:\s*([^\n]+)/) || [])[1] || "";
  check(
    "_headers: declara Content-Security-Policy",
    cspHeaders.length > 0,
    "(no hay directiva Content-Security-Policy en _headers)"
  );
  // frame-ancestors solo es válida por cabecera HTTP (por <meta> el
  // navegador la ignora), así que vive ÚNICAMENTE en _headers: la política
  // base (todo lo demás) debe coincidir con la meta, y frame-ancestors se
  // exige en la cabecera como capa para hosts que sí la sirvan.
  const baseHeaders = cspHeaders.replace(/;?\s*frame-ancestors 'none'\s*/g, "").trim();
  const baseMeta = (metaLocal.cspContent || "").trim();
  check(
    "_headers: la CSP base coincide con la meta del documento (una sola política)",
    !!metaLocal.cspContent && baseHeaders === baseMeta,
    `(headers base |${baseHeaders}| vs meta |${baseMeta}|)`
  );
  check(
    "_headers: la CSP incluye frame-ancestors 'none' (clickjacking, solo válida por cabecera)",
    cspHeaders.includes("frame-ancestors 'none'"),
    "(sin frame-ancestors en la cabecera)"
  );
  check(
    "_headers: incluye X-Frame-Options DENY y X-Content-Type-Options nosniff",
    headersTxt.includes("X-Frame-Options: DENY") &&
      headersTxt.includes("X-Content-Type-Options: nosniff"),
    "(faltan cabeceras de seguridad secundarias)"
  );
}

// ============================================================
// 2c. JSON-LD — datos estructurados (SoftwareApplication) en index.html.
// El snippet rico de Google: debe ser JSON válido y coherente con el
// resto de metadatos (mismo nombre, descripción y URL). Verificamos el
// contenido contra el canónico y dejamos las mutaciones para la sección 3.
// ============================================================
correr(verificarJsonLd(extraerJsonLdLocal()));
// Coherencia entre capas: el JSON-LD y el resto de metadatos cuentan lo
// mismo (nombre del juego y URL).
{
  const ld = extraerJsonLdLocal().json;
  const meta = extraerMetadatosLocal();
  check(
    "JSON-LD: name coherente con el título de la pestaña",
    !!ld && meta.titulo.startsWith(ld.name),
    `(ld.name |${ld?.name}| vs título |${meta.titulo}|)`
  );
  check(
    "JSON-LD: url coherente con canonical",
    !!ld && ld.url === META_CANON.canonical && meta.canonical === META_CANON.canonical,
    `(ld.url |${ld?.url}| vs canonical |${meta.canonical}|)`
  );
}

// ============================================================
// 3. PRUEBA DE MUTACIÓN (en memoria: se muta una copia del HTML)
//    El golden debe cazar cada cambio no deseado. Se usa la MISMA
//    extracción del core (extraerMetadatosDe) sobre el HTML mutado.
// ============================================================
const muta = (nuevo) => verificarMetadatos(extraerMetadatosDe(nuevo));
const mutaLd = (nuevo) => verificarJsonLd(extraerJsonLdDe(nuevo));

const caza = (nombre, checks, indice, mutacion) => {
  const c = checks[indice];
  check(
    `mutación: ${nombre} se caza`,
    c && c.ok === false,
    c ? `(no falló: |${c.nombre}| ok=${c.ok})` : `(falta el check ${indice}) ${mutacion}`
  );
};

// Mutación 1: título de pestaña roto (el caso real: "sigue estando mal")
let checks = muta(src.replace(
  "<title>CYBERGRAD \u2014 Simulador de Carrera SOC + Red Team</title>",
  "<title>GYBERGRAD \u2014 Simulador de Carrera SOC</title>"
));
caza("título roto (GYBERGRAD)", checks, 0);

// Mutación 2: description mutada (se le quita el arranque del texto)
checks = muta(src.replace(
  '<meta name="description" content="Aprende ciberseguridad jugando:',
  '<meta name="description" content="'
));
caza("description mutada", checks, 3);

// Mutación 3: og:image apuntando a un archivo inexistente
checks = muta(src.replace(
  "assets/cover.jpg",
  "assets/cover-rotto.jpg"
));
caza("og:image rota (cover-rotto.jpg)", checks, 9);

// Mutación 4: twitter:card degradada a summary (sin imagen grande)
checks = muta(src.replace(
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:card" content="summary" />'
));
caza("twitter:card degradada", checks, 8);

// Mutación 5: lang cambiado a en
checks = muta(src.replace('<html lang="es">', '<html lang="en">'));
caza("lang cambiado a en", checks, 7);

// Mutación 6: se quita el meta CSP
checks = muta(src.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>/, ""));
caza("meta CSP eliminado", checks, 11);

// Mutación 7: og:title roto SOLO (el <title> queda intacto) — el check
// relacional (og:title === título de pestaña) debe cazar el descuadre
// aunque ambos checks contra el canónico también lo harían.
checks = muta(src.replace(
  '<meta property="og:title" content="CYBERGRAD \u2014 Simulador de Carrera SOC + Red Team" />',
  '<meta property="og:title" content="GYBERGRAD \u2014 Simulador de Carrera SOC" />'
));
caza("og:title roto (GYBERGRAD)", checks, 2);

// Mutación 8: la meta CSP gana frame-ancestors "a mano" — el navegador la
// IGNORA por <meta> (solo es válida por cabecera HTTP) y además emite un
// warning de consola que rompe la regla de "sin errores de consola". El
// check que documenta la decisión debe cazarla.
checks = muta(src.replace(
  "object-src 'none'",
  "object-src 'none'; frame-ancestors 'none'"
));
caza("CSP con frame-ancestors en la meta (ignorada por <meta>)", checks, 13);

// Mutación 9: JSON-LD con JSON roto (falta una llave) — debe detectarse
// como "JSON inválido" sin parses parciales.
let ldChecks = mutaLd(src.replace(
  '"applicationCategory": "EducationalApplication"',
  '"applicationCategory": "EducationalApplication"'
  // se rompe el JSON cerrando la llave del objeto antes de tiempo
).replace(
  '  }\n  </script>',
  '  }\n  }\n  </script>'
));
check(
  "mutación: JSON-LD con JSON roto se caza",
  ldChecks.length > 0 && ldChecks[0].ok === false && /JSON roto|JSON válido/.test(ldChecks[0].nombre),
  `(primer check: ${ldChecks[0]?.nombre} ok=${ldChecks[0]?.ok})`
);

// Mutación 10: JSON-LD con nombre roto (GYBERGRAD) — el golden debe cazarlo.
ldChecks = mutaLd(src.replace(
  '"name": "CYBERGRAD",',
  '"name": "GYBERGRAD",'
));
{
  const c = ldChecks.find((x) => x.nombre.includes("JSON-LD: name"));
  check("mutación: JSON-LD name roto (GYBERGRAD) se caza", !!c && c.ok === false, c ? `(no falló: ${c.nombre})` : "(falta el check de name)");
}

// Mutación 11: JSON-LD que deja de ser SoftwareApplication (p. ej. se
// convierte en WebSite) — el snippet rico de Google se perdería.
ldChecks = mutaLd(src.replace(
  '"@type": "SoftwareApplication"',
  '"@type": "WebSite"'
));
{
  const c = ldChecks.find((x) => x.nombre.includes("@type SoftwareApplication"));
  check("mutación: JSON-LD deja de ser SoftwareApplication se caza", !!c && c.ok === false, c ? `(no falló: ${c.nombre})` : "(falta el check de @type)");
}

// Restaurar el archivo real NO es necesario: las mutaciones se aplicaron
// solo a copias en memoria de index.html.

console.log(
  fail === 0
    ? `\n\u2705 meta: ${pass} checks, 0 fallos`
    : `\n\u274c meta: ${pass} ok, ${fail} fallos`
);
process.exit(fail === 0 ? 0 : 1);
