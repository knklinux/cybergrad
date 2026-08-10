// serve-test.mjs — Test de robustez del servidor estático (serve.js)
// Verifica que una URL malformada (/%zz) devuelve 400 SIN tumbar el servidor
// y que después sigue sirviendo contenido normal. Misma técnica que smoke.mjs:
// levanta el servidor, lo prueba y lo cierra al final.
//
// Peticiones con http.request crudo (path sin parseo de URL): garantiza que
// /%zz llega al servidor tal cual, sin que el cliente HTTP lo "corrija".
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

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

function peticion(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path }, (res) => {
      let cuerpo = "";
      res.on("data", (c) => (cuerpo += c));
      res.on("end", () => resolve({ status: res.statusCode, cuerpo }));
    });
    req.on("error", reject);
    req.end();
  });
}

let proc = null;
try {
  const port = await puertoLibre();
  proc = spawn(process.execPath, ["serve.js", String(port)], { stdio: "ignore" });

  // Esperar a que el servidor responda
  let listo = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await peticion(port, "/")).status === 200) {
        listo = true;
        break;
      }
    } catch {
      // todavía arrancando
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!listo) throw new Error("El servidor estático no arrancó");

  // 1) URL malformada → 400 (antes: URIError tumbaba el servidor)
  const mal = await peticion(port, "/%zz");
  if (mal.status !== 400) throw new Error(`/%zz devolvió ${mal.status}, esperado 400`);

  // 2) El servidor sigue vivo tras el 400: GET / → 200 con el index.html
  const ok = await peticion(port, "/");
  if (ok.status !== 200) throw new Error(`GET / tras el 400 devolvió ${ok.status}, esperado 200`);
  if (!ok.cuerpo.includes("<!DOCTYPE html")) throw new Error("GET / no devolvió el index.html");

  // 3) (extra) Path traversal bloqueado → 403
  const trav = await peticion(port, "/..%2fpackage.json");
  if (trav.status !== 403) throw new Error(`Traversal devolvió ${trav.status}, esperado 403`);

  console.log("✔ Test serve.js OK: /%zz → 400, servidor vivo (200), traversal → 403.");
  proc.kill();
  process.exit(0);
} catch (err) {
  console.error(`✖ ${err.message}`);
  if (proc) proc.kill();
  process.exit(1);
}
