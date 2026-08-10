// ============================================================
// serve.js — Servidor estático de desarrollo
// Uso: node serve.js [puerto]   (por defecto 8000)
// Envía Cache-Control: no-store para que los cambios se vean
// al recargar sin tener que vaciar la caché del navegador.
// ============================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || "8000", 10);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);

  // Evita salir del directorio del proyecto
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
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`CYBERGRAD en http://127.0.0.1:${PORT}`);
});
