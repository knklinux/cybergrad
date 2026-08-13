// ============================================================
// build-icons.mjs — Genera los iconos PWA (192 y 512) desde
// assets/apple-touch-icon.png sin dependencias externas.
//
// Implementa lo mínimo de PNG para leer una imagen RGBA de 8 bits
// (IHDR + IDAT inflado + los 5 filtros de scanline), la reduce con
// resample bilineal y escribe un PNG nuevo con zlib. Determinista:
// mismos bytes de entrada → mismos bytes de salida.
//
// Uso: node ci/build-icons.mjs   (escribe assets/icon-192.png y
// assets/icon-512.png; salida estable para poder commitear)
// ============================================================
import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ORIGEN = path.join(ROOT, "assets", "apple-touch-icon.png");

// ---------- Decodificar PNG (RGBA, 8 bits, sin interlace) ----------
export function decodificarPng(ruta) {
  const buf = readFileSync(ruta);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error("No es un PNG");
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len; // 8 de cabecera + len + 4 de CRC
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`PNG no soportado: bitDepth=${bitDepth} colorType=${colorType} (se espera 8/RGBA)`);
  }
  if (interlace !== 0) throw new Error("PNG interlazado no soportado");
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4; // RGBA
  const stride = width * bpp;
  const pixeles = Buffer.alloc(width * height * bpp);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filtro = raw[p++];
    const fila = raw.subarray(p, p + stride);
    p += stride;
    const salida = pixeles.subarray(y * stride, (y + 1) * stride);
    const anterior = y > 0 ? pixeles.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? salida[x - bpp] : 0;
      const b = anterior ? anterior[x] : 0;
      const c = x >= bpp && anterior ? anterior[x - bpp] : 0;
      let v = fila[x];
      switch (filtro) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (v + pred) & 0xff;
          break;
        }
        default: throw new Error(`Filtro PNG desconocido: ${filtro}`);
      }
      salida[x] = v;
    }
  }
  return { width, height, pixeles };
}

// ---------- Resample bilineal (RGBA) ----------
export function redimensionar(orig, nw, nh) {
  const { width: ow, height: oh, pixeles } = orig;
  const out = Buffer.alloc(nw * nh * 4);
  const sx = ow / nw;
  const sy = oh / nh;
  for (let y = 0; y < nh; y++) {
    const sy0 = (y + 0.5) * sy - 0.5;
    const y1 = Math.max(0, Math.floor(sy0));
    const y2 = Math.min(oh - 1, y1 + 1);
    const fy = sy0 - y1;
    for (let x = 0; x < nw; x++) {
      const sx0 = (x + 0.5) * sx - 0.5;
      const x1 = Math.max(0, Math.floor(sx0));
      const x2 = Math.min(ow - 1, x1 + 1);
      const fx = sx0 - x1;
      const o = (y * nw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p11 = pixeles[(y1 * ow + x1) * 4 + c];
        const p21 = pixeles[(y1 * ow + x2) * 4 + c];
        const p12 = pixeles[(y2 * ow + x1) * 4 + c];
        const p22 = pixeles[(y2 * ow + x2) * 4 + c];
        const top = p11 + (p21 - p11) * fx;
        const bot = p12 + (p22 - p12) * fx;
        out[o + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

// ---------- Codificar PNG (RGBA, 8 bits) ----------
export function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function chunk(tipo, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(tipo, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
export function codificarPng(width, height, pixeles) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // no interlace
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    pixeles.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- Generar los iconos (solo al ejecutar este script directo) ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const origen = decodificarPng(ORIGEN);
  for (const tam of [192, 512]) {
    const salida = path.join(ROOT, "assets", `icon-${tam}.png`);
    const pixeles = redimensionar(origen, tam, tam);
    writeFileSync(salida, codificarPng(tam, tam, pixeles));
    console.log(`✔ assets/icon-${tam}.png (${tam}x${tam}, ${pixeles.length / 4} px)`);
  }
}
