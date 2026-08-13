// prod-test.mjs — Check de integración de los artefactos de arranque en producción
// Carga la versión desplegada de GitHub Pages con Playwright y verifica:
//   1. BANNER     (#terminal .t-banner)  → golden + glifos (banner-core.mjs)
//   2. SUBTÍTULO  (#terminal .t-out-info) → canónico (visual-core.mjs)
//   3. PIE        (#terminal .t-out-dim)  → canónico (visual-core.mjs)
//   4. SEPARADOR  (#terminal .t-out-dim)  → canónico (visual-core.mjs), tras
//      completar el onboarding y ejecutar `ayuda` (que imprime un separador)
//   5. METADATOS  (document.title + Open Graph + Twitter Card) → canónico
//      (meta-core.mjs), con las og:image comprobadas con HTTP real y la CSP
//      como cabecera HTTP (vía _headers)
//   6. PWA         (manifest.webmanifest instalable + iconos 192/512 con HTTP
//      real + sw.js con precache y estrategia offline)
//
// Notas sobre el DOM: main.js une el array BANNER con "\n" y lo imprime en
// UN solo span.t-banner, así que hay que leer su innerText y partir por
// líneas (no usar allInnerTexts esperando 6 elementos). Lo mismo aplica al
// separador: un solo span.t-out-dim con "línea\ntítulo\nlínea".
//
// Si el deploy de Pages aún está en curso, reintenta hasta
// CYBERGRAD_PROD_TIMEOUT ms (por defecto 5 min), así puede correr justo
// después de un push a main sin depender de la API de deployments.
//
// NO está en la cadena `npm test`: solo lo lanza el job `integracion` del
// CI en push a main (y manual vía workflow_dispatch). En un PR la URL de
// producción no refleja el código del PR, así que verificaría un deploy
// ajeno y daría falsos fallos.
import { chromium } from "playwright";
import { diagnosticar, imprimirDiff } from "./banner-core.mjs";
import { verificarSubtitulo, verificarFooter, verificarSeparador } from "./visual-core.mjs";
import { verificarMetadatos, verificarImagen, META_CANON } from "./meta-core.mjs";

const PROD = process.env.CYBERGRAD_PROD_URL || "https://knklinux.github.io/cybergrad/";
const TIMEOUT_MS = parseInt(process.env.CYBERGRAD_PROD_TIMEOUT || "300000", 10);

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};
const correr = (checks) => { for (const c of checks) check(c.nombre, c.ok, c.extra); };

const browser = await chromium.launch();
const page = await browser.newPage();
const errores = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errores.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errores.push(`[pageerror] ${err.message}`));

const terminar = async (codigo) => {
  await browser.close().catch(() => {});
  process.exit(codigo);
};

// --- Esperar a que el deploy sirva banner + subtítulo (retry si sigue en curso) ---
let filas = null;
let sub = null;
const inicio = Date.now();
while (Date.now() - inicio < TIMEOUT_MS) {
  // Cada intento arranca con el log limpio: GitHub Pages va sustituyendo
  // archivos durante el deploy, así que un intento previo a mitad del
  // swap puede capturar un 404 transitorio de un módulo (p. ej. js/voz.js)
  // que NO existe en el estado final. Solo cuentan los errores del intento
  // que realmente sirve la página.
  errores.length = 0;
  try {
    await page.goto(PROD, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#terminal .t-banner", { timeout: 15000 });
    const texto = await page.locator("#terminal .t-banner").first().innerText();
    const lineas = texto.split("\n").map((l) => l.trimEnd());
    if (lineas.length >= 6) {
      // Gate adicional: la versión desplegada debe incluir YA la PWA.
      // Banner y subtítulo son idénticos entre versiones, así que sin este
      // gate el test podría correr contra el deploy ANTERIOR (a mitad del
      // swap de Pages) y fallar al verificar el manifest. Con el gate, se
      // reintenta hasta que la versión nueva (con <link rel=manifest> y
      // manifest.webmanifest servido) esté realmente en línea.
      const linkManifest = await page.evaluate(() =>
        document.querySelector('link[rel="manifest"]')?.getAttribute("href")
      ).catch(() => null);
      let manifestOK = false;
      if (linkManifest === "manifest.webmanifest") {
        try {
          const resp = await fetch(PROD + "manifest.webmanifest");
          manifestOK = resp.status === 200 && (resp.headers.get("content-type") || "").includes("manifest+json");
        } catch { /* deploy en curso */ }
      }
      if (manifestOK) { filas = lineas.slice(0, 6); break; }
    }
  } catch {
    // Deploy en curso o página aún no lista: se reintenta.
  }
  await new Promise((r) => setTimeout(r, 10000));
}

if (!filas) {
  console.error(`\u2716 No se encontró el banner en ${PROD} tras ${Math.round(TIMEOUT_MS / 1000)}s`);
  console.error("   (¿deploy de Pages en curso, página caída o el banner ya no se imprime al arrancar?)");
  if (errores.length) {
    console.error("   Errores capturados:");
    for (const e of errores) console.error("     " + e);
  }
  await terminar(1);
}

// --- Golden + diagnóstico letra a letra del banner contra el canónico ---
const { realNorm, checks } = diagnosticar(filas);
for (const c of checks) check(c.nombre, c.ok, c.extra);
if (fail > 0) imprimirDiff(realNorm);

// --- Subtítulo (impreso al arrancar, primer span .t-out-info de la terminal) ---
try {
  sub = await page.locator("#terminal .t-out-info").first().innerText();
  correr(verificarSubtitulo(sub));
} catch {
  correr(verificarSubtitulo(null));
}

// --- Pie de arranque (impreso al arrancar, primer span .t-out-dim de la terminal) ---
try {
  const footer = await page.locator("#terminal .t-out-dim").first().innerText();
  correr(verificarFooter(footer));
} catch {
  correr(verificarFooter(null));
}

// --- Metadatos de arranque (título de pestaña + Open Graph + Twitter) ---
// Se leen del DOM de la versión desplegada y se verifican con el MISMO
// canónico que el test local (meta-core.mjs). Además se comprueba que las
// og:image responden HTTP 200 con content-type de imagen en el sitio real
// (una imagen rota o desaparecida rompe la tarjeta de LinkedIn aunque el
// HTML diga lo correcto) y que la CSP llega como cabecera HTTP real.
try {
  const meta = await page.evaluate(() => ({
    titulo: document.title,
    lang: document.documentElement.lang || "",
    desc: document.querySelector('meta[name="description"]')?.content || "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || "",
    ogDesc: document.querySelector('meta[property="og:description"]')?.content || "",
    ogUrl: document.querySelector('meta[property="og:url"]')?.content || "",
    ogImages: [...document.querySelectorAll('meta[property="og:image"]')].map((m) => m.content),
    twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || "",
    twitterImage: document.querySelector('meta[name="twitter:image"]')?.content || "",
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    cspContent: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "",
  }));
  correr(verificarMetadatos(meta));
  // Las imágenes de la tarjeta deben existir en el sitio desplegado
  for (const url of META_CANON.ogImagenes) {
    try {
      const resp = await fetch(url, { method: "HEAD" });
      correr(verificarImagen(url, resp.status, resp.headers.get("content-type") || ""));
    } catch {
      correr(verificarImagen(url, 0, ""));
    }
  }
  // NOTA: la CSP se comprueba como meta en el documento (no como cabecera
  // HTTP): GitHub Pages ignora el fichero `_headers`, así que la meta CSP
  // es la política realmente aplicada en producción. `_headers` queda como
  // capa documentada para otros hosts que sí la sirvan.
} catch (e) {
  correr(verificarMetadatos({ titulo: "", lang: "", desc: "", ogTitle: "", ogDesc: "", ogUrl: "", ogImages: [], twitterCard: "", twitterImage: "", canonical: "", cspContent: "" }));
  check("metadatos: flujo de lectura completado", false, `(${e.message})`);
}

// --- PWA en producción: manifest instalable + service worker (offline) ---
try {
  const hrefManifest = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute("href"));
  check("pwa: el HTML enlaza el manifest", hrefManifest === "manifest.webmanifest");

  const resManifest = await fetch(PROD + "manifest.webmanifest");
  const ctypeMan = resManifest.headers.get("content-type") || "";
  check("pwa: manifest.webmanifest → 200", resManifest.status === 200);
  check("pwa: content-type manifest+json", ctypeMan.includes("manifest+json"), ctypeMan);
  const manifest = JSON.parse(await resManifest.text());
  check("pwa: manifest válido e instalable (start_url ./ + standalone)", manifest.start_url === "./" && manifest.display === "standalone");
  const sizes = (manifest.icons || []).map((i) => i.sizes);
  check("pwa: iconos 192 y 512 declarados", sizes.includes("192x192") && sizes.includes("512x512"));

  for (const ic of manifest.icons || []) {
    const resIcon = await fetch(PROD + ic.src, { method: "HEAD" });
    check(`pwa: icono ${ic.src} → 200 como imagen`, resIcon.status === 200 && (resIcon.headers.get("content-type") || "").startsWith("image/"), `${resIcon.status} ${resIcon.headers.get("content-type")}`);
  }

  const resSw = await fetch(PROD + "sw.js");
  const swTexto = await resSw.text();
  check("pwa: sw.js → 200 como javascript", resSw.status === 200 && (resSw.headers.get("content-type") || "").includes("javascript"));
  check("pwa: sw.js con versión hash cybergrad-*", /const VERSION = "cybergrad-[0-9a-f]{12}";/.test(swTexto));
  check("pwa: sw.js precachea el shell (index.html + manifest)", swTexto.includes('"index.html"') && swTexto.includes('"manifest.webmanifest"'));
  check("pwa: sw.js con estrategia offline (network-first + claim)", swTexto.includes('req.mode === "navigate"') && swTexto.includes("self.clients.claim()"));
} catch (e) {
  check("pwa: bloque de comprobación completado", false, `(${e.message})`);
}

// --- Separador: completar el onboarding y ejecutar `ayuda`, que imprime ---
// --- term.separator("COMANDOS DEL TERMINAL") (formato línea/título/línea) ---
try {
  await page.waitForSelector("#input-nombre", { timeout: 15000 });
  await page.fill("#input-nombre", "CI-Prod");
  await page.click("#btn-empezar");

  const aceptar = page.locator('[data-action="aceptar-briefing"]');
  await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
  if (await aceptar.count()) await aceptar.first().click();
  await page.waitForSelector("#terminal input", { timeout: 15000 });

  await page.fill("#terminal input", "ayuda");
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(500);

  const dims = await page.locator("#terminal .t-out-dim").allInnerTexts();
  const separadores = dims.filter((t) => t.includes("\u2500"));
  check(
    "separador: presente tras ejecutar ayuda",
    separadores.length > 0,
    "(no se encontró ningún span .t-out-dim con el carácter ─)"
  );
  if (separadores.length > 0) {
    // El separador de `ayuda` lleva el título "COMANDOS DEL TERMINAL".
    const deAyuda = separadores.find((t) => t.includes("COMANDOS DEL TERMINAL"));
    correr(verificarSeparador(deAyuda || separadores[0]));
    check(
      "separador: el de ayuda lleva su título",
      !!deAyuda,
      "(se verificó otro separador de la terminal)"
    );
  }
} catch (e) {
  correr(verificarSeparador(null));
  check("separador: flujo de onboarding/ayuda completado", false, `(${e.message})`);
}

// --- Sin errores de consola al cargar la versión desplegada ---
if (errores.length) {
  fail++;
  console.error("\u2718 errores de consola al cargar la versión desplegada:");
  for (const e of errores) console.error("   " + e);
} else {
  pass++;
  console.log("  \u2714 sin errores de consola al cargar");
}

console.log(
  fail === 0
    ? `\n\u2705 prod (${PROD}): ${pass} checks, 0 fallos`
    : `\n\u274c prod (${PROD}): ${pass} ok, ${fail} fallos`
);
await terminar(fail === 0 ? 0 : 1);
