// ============================================================
// build-ico.mjs — Genera assets/cybergrad.ico (el icono del
// acceso directo del escritorio) desde assets/apple-touch-icon.png.
//
// El formato ICO con entradas PNG embebidas (Vista+) admite todos
// los tamaños con transparencia real, así que se emiten 16/32/48/
// 64/128/256 px sin duplicar lógica: se reutiliza el decodificador,
// el resample bilineal y el codificador PNG de build-icons.mjs.
// Determinista: mismos bytes de entrada → mismos bytes de salida.
//
// Uso: node ci/build-ico.mjs   (escribe assets/cybergrad.ico)
// ============================================================
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodificarPng, redimensionar, codificarPng } from "./build-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ORIGEN = path.join(ROOT, "assets", "apple-touch-icon.png");
const SALIDA = path.join(ROOT, "assets", "cybergrad.ico");

const TAMANOS = [16, 32, 48, 64, 128, 256];

const origen = decodificarPng(ORIGEN);
const pngs = TAMANOS.map((tam) => codificarPng(tam, tam, redimensionar(origen, tam, tam)));

// Cabecera ICO: reservado(2) + tipo 1=icono(2) + nº de imágenes(2)
const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(TAMANOS.length, 4);

// Directorio: 16 bytes por imagen
let offset = 6 + 16 * TAMANOS.length;
const dir = [];
for (let i = 0; i < TAMANOS.length; i++) {
  const tam = TAMANOS[i];
  const e = Buffer.alloc(16);
  e[0] = tam >= 256 ? 0 : tam;       // ancho (0 = 256)
  e[1] = tam >= 256 ? 0 : tam;       // alto (0 = 256)
  e[2] = 0;                          // paleta: ninguna
  e[3] = 0;                          // reservado
  e.writeUInt16LE(1, 4);             // planos
  e.writeUInt16LE(32, 6);            // bits por píxel
  e.writeUInt32LE(pngs[i].length, 8); // bytes de la imagen
  e.writeUInt32LE(offset, 12);        // offset en el archivo
  dir.push(e);
  offset += pngs[i].length;
}

writeFileSync(SALIDA, Buffer.concat([cabecera, ...dir, ...pngs]));
console.log(`✔ assets/cybergrad.ico (${TAMANOS.join("/")} px, ${offset} bytes)`);
