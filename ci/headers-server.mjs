// ============================================================
// headers-server.mjs — CDN local que APLICA el fichero `_headers`
//
// GitHub Pages ignora `_headers`, pero Netlify y Cloudflare Pages
// lo leen y sirven sus cabeceras como HTTP real. Este servidor
// reproduce ese comportamiento (sintaxis Netlify/Cloudflare):
// bloques de ruta seguidos de cabeceras indentadas, el primero que
// casa gana. Sirve para VERIFICAR que el `_headers` del repo se
// aplica de verdad en un host compatible — el equivalente local a
// desplegar a un CDN.
//
// Uso: node ci/headers-server.mjs [puerto]   (por defecto 8123)
// ============================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = parseInt(process.argv[2] || "8123", 10);
const RUTA_HEADERS = path.join(ROOT, "_headers");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---- Parser de _headers (sintaxis Netlify/Cloudflare Pages) ----
// Cada bloque: una línea con la ruta (ej. `/*`, `/assets/*`), seguida
// de una o más cabeceras con indentación (`  Nombre: valor`). El
// primer bloque cuya ruta case gana.
export function parsearHeaders(texto) {
  const bloques = [];
  let actual = null;
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || linea.trimStart().startsWith("#")) continue;
    if (/^\s/.test(linea)) {
      // Cabecera indentada pertenece al bloque actual
      if (!actual) continue;
      const m = linea.trim().match(/^([^:]+):\s*(.*)$/);
      if (m) actual.headers[m[1].trim().toLowerCase()] = m[2].trim();
    } else {
      actual = { ruta: linea.trim(), headers: {} };
      bloques.push(actual);
    }
  }
  return bloques;
}

// Coincidencia de ruta estilo glob simple: `*` casa cualquier cosa,
// incluyendo `/`. `/` exacto solo casa la raíz.
function casaRuta(patron, ruta) {
  if (patron === "*") return true;
  if (patron === "/") return ruta === "/";
  if (patron.endsWith("/*")) {
    const prefijo = patron.slice(0, -1); // sin el *
    return ruta.startsWith(prefijo);
  }
  return patron === ruta;
}

export function cabecerasPara(bloques, ruta) {
  const b = bloques.find((bl) => casaRuta(bl.ruta, ruta));
  return b ? b.headers : {};
}

const bloques = parsearHeaders(fs.readFileSync(RUTA_HEADERS, "utf8"));

// Crea el servidor HTTP que aplica _headers (no escucha todavía: el
// test lo arranca en el mismo proceso y lo cierra con server.close()).
export function crearServidorCDN() {
  return http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, cabecerasPara(bloques, urlPath));
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      ...cabecerasPara(bloques, urlPath),
    });
    res.end(data);
  });
  });
}

// Solo escucha cuando se ejecuta este script directamente (node
// ci/headers-server.mjs); el test lo importa y arranca en-proceso.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  crearServidorCDN().listen(PORT, "127.0.0.1", () => {
    console.log(`CDN local (aplica _headers) en http://127.0.0.1:${PORT}`);
  });
}
