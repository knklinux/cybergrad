// ============================================================
// reto.js — Reto diario de CYBERGRAD
// Cada día, el mismo incidente con indicadores distintos:
// se clona un caso base y se varían de forma DETERMINISTA a
// partir de la fecha: IPs, hosts, DOMINIOS y CORREOS.
//
// Invariante de seguridad: las sustituciones conservan la
// LONGITUD exacta de cada cadena, para que cualquier contenido
// codificado (p. ej. base64 de PowerShell -enc) siga siendo
// válido y el caso siga siendo resoluble con `decode`.
//
// Reversibilidad: la variación es una BIYECCIÓN determinista.
//   - Las variantes se generan con etiquetas que NUNCA terminan
//     en un TLD del whitelist, así que volver a variar un caso
//     ya variado no cambia nada (idempotencia).
//   - `mapas` registra original → variante (IP, host, dominio,
//     correo) y `desvariarCaso` reconstruye el caso original
//     exacto a partir del variado (inversa).
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

// TLDs reconocidos por el juego (whitelist): SOLO los dominios/correos
// cuyo último label está en esta lista se varían. Así no se tocan los
// falsos positivos típicos: `payment.exe`, `alerts.json`, `proxy.log`,
// los usuarios con punto (`m.garcia`, `l.fuentes`), el código JS
// (`ath.random`, `lineas.push`) ni las IPs (su último label es un número).
const TLDS = ["com", "co", "info", "top", "net", "xyz", "es", "onion", "local"];
const esTLDReconocido = (dominio) => TLDS.includes(String(dominio).split(".").pop().toLowerCase());

// Un token es un CORREO (con @) o un DOMINIO de varias etiquetas. El
// callback decide con el whitelist si variar o devolverlo intacto. Una
// sola pasada con alternancia evita re-variar lo ya variado o los
// subdominios dentro de un correo.
const RE_DOMINIO_O_CORREO = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z0-9-]+|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/gi;

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

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

// Genera la variante de un dominio: misma longitud y misma posición de
// guiones, con etiquetas aleatorias deterministas. El último label se
// genera hasta que NO sea un TLD del whitelist: así la variante nunca
// vuelve a ser candidata a variación (idempotencia → reversibilidad).
function variarDominio(dominio, rand, mapa) {
  if (mapa.has(dominio)) return mapa.get(dominio);
  const etiquetas = dominio.split(".");
  let variante = dominio;
  for (let intentos = 0; intentos < 50; intentos++) {
    variante = etiquetas.map((et) => {
      let salida = "";
      for (let i = 0; i < et.length; i++) {
        salida += et[i] === "-" ? "-" : CHARS[Math.floor(rand() * CHARS.length)];
      }
      return salida;
    }).join(".");
    const ultima = variante.split(".").pop();
    const esNueva = variante !== dominio;
    const libre = ![...mapa.values()].includes(variante);
    if (esNueva && libre && !TLDS.includes(ultima)) break;
  }
  mapa.set(dominio, variante);
  return variante;
}

// Varía un correo conservando el usuario: solo cambia el dominio (a
// través del MISMO mapa de dominios, para que `m.garcia@acme.com` y el
// `acme.com` suelto compartan variante). Si el dominio ya no es un TLD
// reconocido (es una variante), el correo se deja intacto (idempotente).
function variarCorreo(correo, rand, mapa) {
  const idx = correo.lastIndexOf("@");
  const usuario = correo.slice(0, idx);
  const dominio = correo.slice(idx + 1);
  if (!esTLDReconocido(dominio)) return correo;
  return usuario + "@" + variarDominio(dominio, rand, mapa);
}

// Clona en profundidad un caso y le aplica las variaciones
// deterministas del día. Devuelve { caso, mapas }: el caso variado y
// el registro de sustituciones (original → variante) por tipo.
export function variarCaso(casoBase, semilla = fechaReto()) {
  const rand = rng("cybergrad-reto:" + semilla);
  const mapas = { ip: new Map(), host: new Map(), dominio: new Map(), correo: new Map() };

  const transformar = (s) => {
    if (typeof s !== "string") return s;
    // IPs: misma IP → misma variante dentro del mismo caso
    s = s.replace(RE_IP, (ip) => {
      if (!mapas.ip.has(ip)) mapas.ip.set(ip, variarIp(ip, rand));
      return mapas.ip.get(ip);
    });
    // Hosts: HOST-XXX → HOST-YYY (misma longitud)
    s = s.replace(RE_HOST, (h) => {
      if (!mapas.host.has(h)) mapas.host.set(h, variarHost(h, rand));
      return mapas.host.get(h);
    });
    // Dominios y correos: una sola pasada (el correo gana a su dominio
    // interno, y las variantes con TLD no reconocido se dejan intactas)
    s = s.replace(RE_DOMINIO_O_CORREO, (tok) => {
      if (tok.includes("@")) {
        const variado = variarCorreo(tok, rand, mapas.dominio);
        if (variado !== tok && !mapas.correo.has(tok)) mapas.correo.set(tok, variado);
        return variado;
      }
      // Un dominio cuyo último label no es un TLD reconocido (ya es una
      // variante, o es un falso positivo tipo `payment.exe`) se deja intacto.
      if (!esTLDReconocido(tok)) return tok;
      return variarDominio(tok, rand, mapas.dominio);
    });
    return s;
  };

  const clonar = (v) => {
    if (Array.isArray(v)) return v.map(clonar);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v)) {
        // Las claves también se varían (p. ej. `ips` y `dominios` usan la IP/dominio
        // como clave): así la consulta `whois <variado>` sigue encontrando su ficha.
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
  return { caso: clon, mapas };
}

// Variación con comprobación de invariantes: todas las cadenas del
// caso variado tienen la misma longitud que en el original (nada de
// romper base64 ni longitudes). Devuelve { caso, ok, errores, mapas }.
export function variarCasoVerificado(casoBase, semilla = fechaReto()) {
  const original = casoBase;
  const { caso: variado, mapas } = variarCaso(casoBase, semilla);
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
  return { caso: variado, ok: errores.length === 0, errores, mapas };
}

// Invierte los mapas de variación: variante → original.
export function invertirMapas(mapas) {
  const inv = { ip: new Map(), host: new Map(), dominio: new Map(), correo: new Map() };
  for (const tipo of Object.keys(mapas)) {
    for (const [orig, variante] of mapas[tipo]) inv[tipo].set(variante, orig);
  }
  return inv;
}

// Reconstruye el caso ORIGINAL a partir de uno variado usando los mapas
// (sustitución inversa, tokens más largos primero para no pisar
// subdominios). Devuelve el caso base exacto (sin las marcas del reto).
export function desvariarCaso(casoVariado, mapas) {
  const inv = invertirMapas(mapas);
  const tokens = [...inv.correo.keys(), ...inv.dominio.keys(), ...inv.host.keys(), ...inv.ip.keys()]
    .sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sustituir = (s) => {
    if (typeof s !== "string") return s;
    let out = s;
    for (const t of tokens) {
      out = out.replace(new RegExp(`(?<![A-Za-z0-9])${esc(t)}(?![A-Za-z0-9])`, "g"), inv.correo.get(t) || inv.dominio.get(t) || inv.host.get(t) || inv.ip.get(t));
    }
    return out;
  };
  const clonar = (v) => {
    if (Array.isArray(v)) return v.map(clonar);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v)) out[sustituir(k)] = clonar(v[k]);
      return out;
    }
    return sustituir(v);
  };
  const original = clonar(casoVariado);
  delete original.retoSemilla;
  delete original.retoBaseId;
  return original;
}

// ---------- Ranking local de retos diarios ----------
// Orden de calificaciones (de peor a mejor)
export const ORDEN_RATING_RETO = ["C", "B", "A", "S", "S+"];

// ¿La marca nueva es mejor que la registrada? Mismo rating → gana el tiempo.
export function esMejorMarca(nueva, actual) {
  if (!actual) return true;
  const n = ORDEN_RATING_RETO.indexOf(nueva.rating);
  const a = ORDEN_RATING_RETO.indexOf(actual.rating);
  if (n !== a) return n > a;
  return (nueva.segundos ?? Infinity) < (actual.segundos ?? Infinity);
}

// Registra una marca en el historial: UNA entrada por día (la mejor),
// ordenada de más reciente a más antigua, máximo 30 marcas.
// Devuelve el historial nuevo (no muta el recibido).
export function registrarMarcaReto(marca, historial = []) {
  const copia = (Array.isArray(historial) ? historial : []).map((m) => ({ ...m }));
  const idx = copia.findIndex((m) => m.fecha === marca.fecha);
  if (idx !== -1) {
    if (esMejorMarca(marca, copia[idx])) copia[idx] = { ...marca };
  } else {
    copia.push({ ...marca });
  }
  copia.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return copia.slice(0, 30);
}

// Líneas legibles del historial para la terminal y el panel (máx 30,
// más reciente primero), con el tiempo formateado mm:ss.
export function filasRankingReto(historial = []) {
  const seg = (s) => {
    const total = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
  return (Array.isArray(historial) ? historial : [])
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    .slice(0, 30)
    .map((m) => ({ ...m, tiempo: seg(m.segundos) }));
}

// Resumen legible de los indicadores variados de un reto: lista de
// { tipo: "IP"|"Host"|"Dominio"|"Correo", original, variante } con los
// tokens que DE VERDAD cambiaron (original !== variante), ordenada por
// tipo y por original. Es la ficha «indicadores de hoy» del panel: el
// jugador ve ANTES de jugar qué variantes ha generado la semilla del día.
// Función pura (los Mapas se leen sin mutarlos) y testeable en Node.
export function resumenIndicadores(mapas) {
  const m0 = mapas || {}; // tolera null/undefined (sin mapas → sin indicadores)
  const TIPOS = [["ip", "IP"], ["host", "Host"], ["dominio", "Dominio"], ["correo", "Correo"]];
  const filas = [];
  for (const [clave, etiqueta] of TIPOS) {
    const m = m0[clave];
    if (!(m instanceof Map)) continue;
    const pares = [...m.entries()]
      .filter(([orig, variante]) => orig !== variante)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (const [orig, variante] of pares) filas.push({ tipo: etiqueta, original: orig, variante });
  }
  return filas;
}

// Estructura completa del reto de hoy (para el panel y la terminal)
export function retoDelDia(fecha = new Date()) {
  const fechaStr = fechaReto(fecha);
  const base = casoBaseDelDia(fechaStr);
  const { caso, ok, mapas } = variarCasoVerificado(base, fechaStr);
  return {
    fecha: fechaStr,
    baseId: base.id,
    titulo: caso.titulo,
    caso,
    ok,
    esRT: caso.modo === "rt",
    mapas,
  };
}
