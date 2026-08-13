// headers-test.mjs — Verifica que el fichero `_headers` SE APLICA como
// cabecera HTTP real en un host compatible (Netlify / Cloudflare Pages).
//
// GitHub Pages ignora `_headers` (lo confirma prod-test.mjs con HTTP
// real), pero Netlify y Cloudflare Pages lo leen y sirven sus cabeceras.
// Este test reproduce ese host con ci/headers-server.mjs (CDN local que
// aplica `_headers`) y comprueba que la CSP completa — con
// frame-ancestors, que por <meta> el navegador ignoraría — llega como
// cabecera HTTP real.
import net from "node:net";
import { parsearHeaders, cabecerasPara, crearServidorCDN } from "./headers-server.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let pass = 0;
let fail = 0;
const check = (nombre, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2714 ${nombre}`); }
  else { fail++; console.log(`  \u2718 ${nombre}  ${extra}`); }
};

function puertoLibre() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function esperarListo(port) {
  return new Promise((resolve, reject) => {
    let intentos = 0;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/`);
        if (r.status === 200) { clearInterval(t); resolve(); return; }
      } catch { /* arrancando */ }
      if (++intentos > 40) { clearInterval(t); reject(new Error("el servidor no arrancó")); }
    }, 250);
  });
}

// ---------- Unidad: el parser entiende la sintaxis Netlify/Cloudflare ----------
const texto = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
const bloques = parsearHeaders(texto);
check("_headers: el parser encuentra bloques de ruta", bloques.length >= 1, `(${bloques.length})`);
const raiz = bloques.find((b) => b.ruta === "/*");
check("_headers: hay un bloque /* con cabeceras", !!raiz && Object.keys(raiz.headers).length >= 3);
check("_headers: el bloque /* declara Content-Security-Policy", !!raiz && !!raiz.headers["content-security-policy"]);
check("_headers: el bloque /* declara frame-ancestors 'none'", !!raiz && (raiz.headers["content-security-policy"] || "").includes("frame-ancestors 'none'"));
check("_headers: el bloque /* declara X-Frame-Options DENY", !!raiz && raiz.headers["x-frame-options"] === "DENY");
check("_headers: el bloque /* declara X-Content-Type-Options nosniff", !!raiz && raiz.headers["x-content-type-options"] === "nosniff");
check("_headers: el bloque /* declara Referrer-Policy", !!raiz && !!raiz.headers["referrer-policy"]);

// El matcher aplica el bloque /* a la raíz y a subrutas
const hRaiz = cabecerasPara(bloques, "/");
const hAsset = cabecerasPara(bloques, "/assets/cover.jpg");
check("matcher: la raíz recibe las cabeceras de /*", hRaiz["content-security-policy"] === raiz.headers["content-security-policy"]);
check("matcher: /assets/* también recibe las cabeceras de /*", hAsset["content-security-policy"] === raiz.headers["content-security-policy"]);

// ---------- E2E: el CDN local SIRVE las cabeceras como HTTP real ----------
// El servidor corre EN EL MISMO PROCESO (importado) y se cierra con
// server.close(): evita el assert de libuv de Windows al matar un child
// con process.exit(), y el test es determinista.
let server = null;
try {
  const port = await puertoLibre();
  server = crearServidorCDN();
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  await esperarListo(port);

  const resp = await fetch(`http://127.0.0.1:${port}/`);
  const csp = resp.headers.get("content-security-policy") || "";
  check("E2E: la página sirve Content-Security-Policy como cabecera HTTP", csp.length > 0, `(sin cabecera CSP)`);
  check("E2E: la cabecera CSP incluye default-src 'none'", csp.includes("default-src 'none'"), `(${csp.slice(0, 60)}…)`);
  check("E2E: la cabecera CSP incluye frame-ancestors 'none' (válido por HTTP, no por meta)", csp.includes("frame-ancestors 'none'"), `(${csp.slice(0, 60)}…)`);
  check("E2E: X-Frame-Options: DENY como cabecera", resp.headers.get("x-frame-options") === "DENY", `(${resp.headers.get("x-frame-options")})`);
  check("E2E: X-Content-Type-Options: nosniff como cabecera", resp.headers.get("x-content-type-options") === "nosniff", `(${resp.headers.get("x-content-type-options")})`);
  check("E2E: Referrer-Policy: strict-origin-when-cross-origin", resp.headers.get("referrer-policy") === "strict-origin-when-cross-origin", `(${resp.headers.get("referrer-policy")})`);
  check("E2E: la página sigue siendo el index.html de CYBERGRAD", (await resp.text()).includes("CYBERGRAD"));

  // Las cabeceras también llegan en subrutas (assets, sw.js)
  const sw = await fetch(`http://127.0.0.1:${port}/sw.js`);
  const cspSw = sw.headers.get("content-security-policy") || "";
  check("E2E: /sw.js también recibe la CSP de /*", cspSw.includes("frame-ancestors 'none'"), `(${cspSw.slice(0, 40)}…)`);

  // Cierre con closeAllConnections: sin ello, los fetch keep-alive dejan
  // sockets vivos y process.exit() dispara un assert de libuv en Windows
  // (handle UV_HANDLE_CLOSING). Se cierran todas las conexiones antes.
  server.closeAllConnections?.();
  await new Promise((r) => server.close(r));
  server = null;
} catch (err) {
  fail++;
  console.error(`  \u2718 flujo E2E del CDN local: ${err.message}`);
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}

console.log(fail === 0 ? `\n\u2705 headers: ${pass} checks, 0 fallos` : `\n\u274c headers: ${pass} ok, ${fail} fallos`);
// Sin process.exit(): al no quedar handles vivos, Node termina solo con el
// código de salida correcto (0 si no hubo fallos).
if (fail > 0) process.exitCode = 1;
