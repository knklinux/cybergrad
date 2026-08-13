// ============================================================
// reto.js — Reto diario de CYBERGRAD
// Cada día, el mismo incidente con indicadores distintos:
// se clona un caso base y se varían las IPs y los nombres de
// host de forma DETERMINISTA a partir de la fecha. Así, el
// reto cambia cada día sin generar contenido nuevo, y repetirlo
// no es memorizar respuestas.
//
// Invariante de seguridad: las sustituciones conservan la
// LONGITUD de cada cadena, para que cualquier contenido
// codificado (p. ej. base64 de PowerShell -enc) siga siendo
// válido y el caso siga siendo resoluble con `decode`.
// ============================================================

import { CASOS } from "./casos.js";
import { RT_CASOS } from "./rt-casos.js";

export const TODOS_LOS_CASOS = [...CASOS, ...RT_CASOS];

// PRNG determinista (mulberry32): misma semilla → misma secuencia
export function rng(semilla) {
  let a = 0;
  const str = String(semilla);
  for (let i = 0; i < str.length; i++) {
    a = (a * 31 + str.charCodeAt(i)) >>> 0;
  }
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fecha de hoy en formato YYYY-MM-DD (UTC, para que el reto sea
// el mismo para todo el mundo en el mismo día)
export function fechaReto(fecha = new Date()) {
  return fecha.toISOString().slice(0, 10);
}

// Índice del caso base del día: rota por TODOS los casos (SOC + RT)
export function casoBaseDelDia(fechaStr = fechaReto()) {
  const dia = parseInt(fechaStr.replace(/-/g, ""), 10);
  return TODOS_LOS_CASOS[dia % TODOS_LOS_CASOS.length];
}

const RE_IP = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
const RE_HOST = /\bHOST-\d{3}\b/g;

// Sustituye una IP por una variante determinista: se conserva la
// red (primeros 3 octetos) y el último octeto cambia por un valor
// con EL MISMO NÚMERO DE DÍGITOS (longitud invariante).
function variarIp(ip, rand) {
  const partes = ip.split(".");
  const ultimo = partes[3];
  const n = Math.floor(rand() * 253) + 1; // 1..253
  let nuevo = String(n);
  // Ajustar a la misma longitud que el octeto original
  while (nuevo.length < ultimo.length) nuevo = "0" + nuevo;
  nuevo = nuevo.slice(-ultimo.length) || "1";
  partes[3] = nuevo;
  return partes.join(".");
}

// Sustituye un hostname HOST-XXX por otra variante del mismo ancho
function variarHost(host, rand) {
  const n = Math.floor(rand() * 900) + 100; // 100..999
  return "HOST-" + String(n);
}

// Clona en profundidad un caso y le aplica las variaciones
// deterministas del día. Devuelve un objeto nuevo: el caso base
// original nunca se toca (los catálogos son compartidos).
export function variarCaso(casoBase, semilla = fechaReto()) {
  const rand = rng("cybergrad-reto:" + semilla);
  const mapaIp = new Map();
  const mapaHost = new Map();

  const transformar = (s) => {
    if (typeof s !== "string") return s;
    // IPs: misma IP → misma variante dentro del mismo caso
    s = s.replace(RE_IP, (ip) => {
      if (!mapaIp.has(ip)) mapaIp.set(ip, variarIp(ip, rand));
      return mapaIp.get(ip);
    });
    // Hosts: HOST-XXX → HOST-YYY (misma longitud)
    s = s.replace(RE_HOST, (h) => {
      if (!mapaHost.has(h)) mapaHost.set(h, variarHost(h, rand));
      return mapaHost.get(h);
    });
    return s;
  };

  const clonar = (v) => {
    if (Array.isArray(v)) return v.map(clonar);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v)) {
        // Las claves también se varían (p. ej. `ips` y `dominios` usan la IP/dominio
        // como clave): así la consulta `whois <ip-variada>` sigue encontrando su ficha.
        out[transformar(k)] = clonar(v[k]);
      }
      return out;
    }
    return transformar(v);
  };

  const clon = clonar(casoBase);
  // Marcas del reto: etiqueta visible en la terminal y semilla del día
  clon.retoSemilla = semilla;
  clon.retoBaseId = casoBase.id;
  return clon;
}

// Variación con comprobación de invariantes: todas las cadenas del
// caso variado tienen la misma longitud que en el original (nada de
// romper base64 ni longitudes). Devuelve { caso, ok, errores }.
export function variarCasoVerificado(casoBase, semilla = fechaReto()) {
  const original = casoBase;
  const variado = variarCaso(casoBase, semilla);
  const errores = [];
  const recorrer = (a, b, ruta) => {
    if (Array.isArray(a)) {
      for (let i = 0; i < a.length; i++) recorrer(a[i], b[i], ruta + "[" + i + "]");
      return;
    }
    if (a && typeof a === "object") {
      const ksA = Object.keys(a);
      const ksB = Object.keys(b);
      for (let i = 0; i < ksA.length; i++) {
        if (typeof ksA[i] === "string" && ksA[i].length !== ksB[i].length) {
          errores.push(`${ruta}.[clave]: longitud ${ksA[i].length} → ${ksB[i].length}`);
        }
        recorrer(a[ksA[i]], b[ksB[i]], ruta + "." + ksA[i]);
      }
      return;
    }
    if (typeof a === "string" && a.length !== b.length) {
      errores.push(`${ruta}: longitud ${a.length} → ${b.length}`);
    }
  };
  recorrer(original, variado, "$");
  return { caso: variado, ok: errores.length === 0, errores };
}

// Estructura completa del reto de hoy (para el panel y la terminal)
export function retoDelDia(fecha = new Date()) {
  const fechaStr = fechaReto(fecha);
  const base = casoBaseDelDia(fechaStr);
  const { caso, ok } = variarCasoVerificado(base, fechaStr);
  return {
    fecha: fechaStr,
    baseId: base.id,
    titulo: caso.titulo,
    caso,
    ok,
    esRT: caso.modo === "rt",
  };
}
