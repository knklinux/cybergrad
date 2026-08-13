// pwa-test.mjs — Test PWA de CYBERGRAD
// Parte 1 (Node puro): el manifest.webmanifest es válido e instalable
//   (campos obligatorios, iconos 192/512 reales y PNG válidos, purpose
//   maskable) y sw.js es un service worker clásico correcto: versión con
//   hash, precache completo (index.html, manifest, TODOS los .js de js/,
//   el css y los assets), sin rutas absolutas ni sintaxis de módulos.
// Parte 2 (E2E Playwright): carga el juego, instala el service worker
//   (registro + activación + controller), verifica que la caché tiene el
//   shell completo, pone la red OFFLINE de verdad y comprueba que el
//   juego sigue cargando entero sin un solo error de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad: manifest ----------
const manifest = JSON.parse(readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
check("manifest: name presente", typeof manifest.name === "string" && manifest.name.length > 5);
check("manifest: short_name presente", typeof manifest.short_name === "string" && manifest.short_name.length > 0);
check("manifest: description presente", typeof manifest.description === "string" && manifest.description.length > 20);
check("manifest: lang es", manifest.lang === "es");
check("manifest: start_url ./ (sirve bajo /cybergrad/ en Pages)", manifest.start_url === "./");
check("manifest: scope ./", manifest.scope === "./");
check("manifest: display standalone (instalable)", manifest.display === "standalone");
check("manifest: theme y background coherentes", /^#[0-9a-f]{6}$/i.test(manifest.theme_color) && /^#[0-9a-f]{6}$/i.test(manifest.background_color));

const sizes = (manifest.icons || []).map((i) => i.sizes);
check("manifest: iconos 192 y 512", sizes.includes("192x192") && sizes.includes("512x512"));
check("manifest: icono maskable", (manifest.icons || []).some((i) => (i.purpose || "").includes("maskable")));
let iconosOK = true;
let iconErr = [];
for (const ic of manifest.icons || []) {
  const ruta = path.join(ROOT, ic.src);
  try {
    const buf = readFileSync(ruta);
    if (ic.type === "image/png" && buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      iconosOK = false; iconErr.push(ic.src + ": no es PNG");
    }
  } catch { iconosOK = false; iconErr.push(ic.src + ": no existe"); }
}
check("manifest: todos los iconos existen y son PNG válidos", iconosOK, iconErr.join(" ; "));

// ---------- Unidad: sw.js ----------
const sw = readFileSync(path.join(ROOT, "sw.js"), "utf8");
check("sw.js: es un script clásico (sin import/export de módulos)", !/^\s*(import|export)\s/m.test(sw));
check("sw.js: versión con hash cybergrad-xxxx", /const VERSION = "cybergrad-[0-9a-f]{12}";/.test(sw));
check("sw.js: estrategia network-first (online fresco, offline con caché)", sw.includes('req.mode === "navigate"') && sw.includes("caches.match(req)") && sw.includes("self.clients.claim()"));

const mArr = sw.match(/const PRECACHE = (\[.*?\]);/s);
const precache = mArr ? JSON.parse(mArr[1]) : [];
check("sw.js: lista de precache presente", Array.isArray(precache) && precache.length > 50, `(${precache.length})`);
check("sw.js: precache sin rutas absolutas ni Windows", precache.every((x) => !x.includes(":") && !x.startsWith("/") && !x.includes("\\")));
check("sw.js: precache incluye index.html y manifest", precache.includes("index.html") && precache.includes("manifest.webmanifest"));

const walk = (dir) => {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const jsFiles = walk(path.join(ROOT, "js")).map(rel);
const assetFiles = walk(path.join(ROOT, "assets")).map(rel);
check("sw.js: precache TODOS los .js de js/ (incluido pwa.js)", jsFiles.every((f) => precache.includes(f)), jsFiles.filter((f) => !precache.includes(f)).join(", "));
check("sw.js: precache TODOS los assets (iconos incluidos)", assetFiles.every((f) => precache.includes(f)), assetFiles.filter((f) => !precache.includes(f)).join(", "));
check("sw.js: precache el css del juego", precache.includes("css/style.css"));
check("sw.js: precache main.js con su query string del HTML", precache.includes("js/main.js?v=27"));

// ---------- E2E ----------
const BASE = process.env.CYBERGRAD_URL || "http://127.0.0.1:8000/";
const PORT = parseInt(new URL(BASE).port || "8000", 10);
async function servidorDisponible() {
  try { return (await fetch(BASE, { method: "HEAD" })).ok; } catch { return false; }
}
let proc = null;
if (!(await servidorDisponible())) {
  proc = spawn(process.execPath, ["serve.js", String(PORT)], { stdio: "ignore" });
  let intentos = 0;
  while (!(await servidorDisponible()) && intentos < 40) {
    await new Promise((r) => setTimeout(r, 250));
    intentos++;
  }
  if (!(await servidorDisponible())) {
    console.error(`✖ No se pudo levantar el servidor estático en ${BASE}`);
    process.exit(1);
  }
}

const falla = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(`[console] ${m.text()} @ ${m.location()?.url || ""}`);
});
page.on("requestfailed", (r) => {
  const f = r.failure();
  errs.push(`[request] ${r.url()} → ${f ? f.errorText : "fallo"}`);
});
const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });

// 1) El manifest y el sw se sirven con su Content-Type
const resMan = await fetch(BASE + "manifest.webmanifest");
check("HTTP: manifest.webmanifest → 200 con manifest+json", resMan.status === 200 && (resMan.headers.get("content-type") || "").includes("manifest+json"));
const resSw = await fetch(BASE + "sw.js");
check("HTTP: sw.js → 200 como javascript", resSw.status === 200 && (resSw.headers.get("content-type") || "").includes("javascript"));

// 2) Cargar el juego → el HTML enlaza el manifest y registra el SW
await page.goto(BASE + "?pwa=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
const hrefManifest = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute("href"));
check("HTML: <link rel=manifest> apunta al manifest", hrefManifest === "manifest.webmanifest");
const regOK = await page.waitForFunction(
  () => navigator.serviceWorker.getRegistration().then((r) => !!r),
  null,
  { timeout: 15000 }
).then(() => true).catch(() => false);
check("HTML: el service worker se registra", regOK);

// 3) Esperar a que el SW esté activo y recargar: ahora la página queda
// CONTROLADA por el SW y esa carga online enfría la caché de runtime
// (incluidas las fuentes de Google, vía stale-while-revalidate). Es el
// mismo flujo de la segunda visita de un usuario real: sin esta carga,
// el CSS y los .woff2 de las fuentes no estarían en caché al cortar la red.
await page.evaluate(() => navigator.serviceWorker.ready).catch(() => {});
await page.waitForTimeout(1200); // deja que install (precache) + activate terminen
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes("sw.js"), null, { timeout: 15000 }).catch(() => {});
check("SW: activo y controlando la página", await page.evaluate(() => !!navigator.serviceWorker.controller));
// Deja que las fuentes terminen de cachearse en segundo plano
await page.evaluate(() => document.fonts?.ready).catch(() => {});
await page.waitForTimeout(1500);

// 4) La caché del SW tiene el shell completo
const cacheInfo = await page.evaluate(async () => {
  const keys = await caches.keys();
  const key = keys.find((k) => k.startsWith("cybergrad-"));
  if (!key) return { key: null, n: 0, tieneShell: false };
  const c = await caches.open(key);
  const n = (await c.keys()).length;
  const tieneShell = !!(await c.match("index.html")) && !!(await c.match("js/main.js?v=27")) && !!(await c.match("manifest.webmanifest"));
  return { key, n, tieneShell };
});
check("SW: caché con la versión cybergrad-*", !!cacheInfo.key);
check("SW: shell completo en caché (index + main.js + manifest)", cacheInfo.tieneShell);
check("SW: caché poblada (>= 50 recursos)", cacheInfo.n >= 50, `(${cacheInfo.n})`);

// 5) MODO OFFLINE REAL: cortar la red y recargar → el juego carga entero
await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
await page.waitForSelector("#terminal", { timeout: 20000 }).catch(() => falla("Offline: no apareció la terminal"));
await page.waitForTimeout(1200);
const bannerOffline = await page.locator("#terminal").innerText();
check("offline: el banner ASCII de CYBERGRAD carga", bannerOffline.includes("CYBERGRAD") || bannerOffline.includes("██"));
const onboarding = await page.locator("#modal-content").innerText().catch(() => "");
check("offline: la UI del juego carga (onboarding o selector)", onboarding.includes("BIENVENIDO") || onboarding.includes("PARTIDA") || onboarding.length > 0);
check("offline: sin pageerrors (JS sano)", !errs.some((e) => e.startsWith("[pageerror]")));

await context.setOffline(false);

// 6) Sin errores de consola en todo el flujo (online + offline)
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs.slice(0, 8)) console.error("   " + e);
  salir(1);
}
check("sin errores de consola en online y offline", true);

console.log(fail === 0 ? `✔ pwa-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
