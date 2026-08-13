// ============================================================
// reto.js — Reto diario de CYBERGRAD
// Cada día, el mismo incidente con indicadores distintos:
// se clona un caso base y se varían de forma DETERMINISTA a
// partir de la fecha: IPs, hosts, DOMINIOS, CORREOS, RUTAS de
// archivo (/data/..., /home/admin/...) y USUARIOS con punto
// (m.garcia, l.fuentes).
//
// Invariante de seguridad: las sustituciones conservan la
// LONGITUD exacta de cada cadena, para que cualquier contenido
// codificado (p. ej. base64 de PowerShell -enc) siga siendo
// válido y el caso siga siendo resoluble con `decode`.
//
// Reversibilidad: la variación es una BIYECCIÓN determinista.
//   - Las variantes se generan con etiquetas que NUNCA terminan
//     en un TLD del whitelist (dominios) o que incluyen un dígito
//     en cada segmento (rutas) / en el apellido (usuarios): volver
//     a variar un caso ya variado no cambia nada (idempotencia).
//   - `mapas` registra original → variante (IP, host, dominio,
//     correo, ruta, usuario) y `desvariarCaso` reconstruye el caso
//     original exacto a partir del variado (inversa).
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

// Rutas de archivo: /seg/seg/archivo.ext o /seg/ (directorio). El segmento
// de directorio NO admite puntos (las rutas reales del juego no los tienen);
// el último segmento (archivo) sí. Se exige que el carácter anterior NO sea
// alfanumérico NI '/': así las URLs (http://host/ruta, cuyo /ruta va
// precedido de otro / o del host) quedan fuera y solo se varían rutas reales.
const RE_RUTA = /(?<![A-Za-z0-9/])\/((?:[a-z0-9_-]+\/)*)([a-z0-9._-]+)\/?/gi;

// Usuarios con punto: inicial + apellido (m.garcia, l.fuentes). NO casan con
// archivos tipo payment.exe/alerts.json (primera etiqueta multiletra) ni con
// código JS (ath.random, lineas.push) ni con versiones (v2.0, nginx 1.24.0).
const RE_USUARIO = /\b[a-z]\.[a-z]{2,}\b/g;

// Rutas fijas que el MOTOR consulta con el literal original (p. ej.
// searchsploit lee /opt/exploitdb/searchsploit.txt): no se varían para no
// romper esos comandos en el reto. Todo lo demás del caso sí se varía.
const RUTAS_FIJAS = new Set(["/opt/exploitdb/", "/opt/exploitdb/searchsploit.txt"]);

// Extensiones de archivo reconocidas: un último segmento con punto SOLO se
// varía si lo que sigue al último punto es una de estas. Todo lo demás con
// punto (directorios tipo multi-user.target.wants, unidades systemd como
// svc_scan.timer, nombres de archivo con punto interno) se deja intacto.
const EXTENSIONES = new Set([
  "txt", "log", "json", "db", "sqlite", "dat", "exe", "dll", "sys", "bat", "ps1", "sh", "py",
  "js", "conf", "cfg", "ini", "env", "xml", "yml", "yaml", "html", "htm", "css", "md", "csv",
  "doc", "docm", "docx", "xls", "xlsx", "pdf", "zip", "tar", "gz", "7z", "rar", "png",
  "jpg", "jpeg", "gif", "pcap", "evtx", "pem", "key", "crt", "cer", "sql", "bak", "tmp",
]);

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

// Token aleatorio determinista de la MISMA longitud que `palabra`. Con
// `conDigito` garantiza al menos un dígito: así las variantes de ruta y de
// usuario no vuelven a casar con sus patrones (idempotencia → reversibilidad).
function variarToken(palabra, rand, conDigito) {
  let out = "";
  let tieneDigito = false;
  for (let j = 0; j < palabra.length; j++) {
    const c = CHARS[Math.floor(rand() * CHARS.length)];
    if (/\d/.test(c)) tieneDigito = true;
    out += c;
  }
  if (conDigito && !tieneDigito) {
    const pos = Math.floor(rand() * out.length);
    out = out.slice(0, pos) + CHARS[26 + Math.floor(rand() * 10)] + out.slice(pos + 1);
  }
  return out;
}

// Variante de una palabra con Mapa de coherencia (misma palabra → misma
// variante) y sin colisiones. Siempre con dígito (idempotencia).
function variarPalabra(palabra, rand, mapa) {
  if (mapa.has(palabra)) return mapa.get(palabra);
  let variante = palabra;
  for (let i = 0; i < 60; i++) {
    const cand = variarToken(palabra, rand, true);
    if (cand !== palabra && ![...mapa.values()].includes(cand)) { variante = cand; break; }
  }
  mapa.set(palabra, variante);
  return variante;
}

// ¿La ruta YA es una variante nuestra? Formato: TODOS sus segmentos llevan
// un dígito. Las rutas originales del juego no lo tienen (salvo stems como
// top1000, que no cuentan: se mira el segmento entero pero la comprobación
// exige dígito en TODOS los segmentos, y las originales no lo cumplen).
function pareceVarianteRuta(ruta) {
  const segs = ruta.replace(/\/$/, "").split("/").filter(Boolean);
  return segs.length > 0 && segs.every((s) => /\d/.test(s));
}

// ¿El último segmento es candidato a variarse? Sin punto → sí (directorio o
// archivo sin extensión). Con punto → solo si es `nombre.ext` con EXTENSIÓN
// conocida (se conserva la extensión). Así quedan intactos los directorios
// con punto (multi-user.target.wants), las unidades systemd (svc_scan.timer)
// y los archivos con puntos internos (doble extensión).
function ultimoSegmentoViable(seg) {
  if (!seg.includes(".")) return true;
  const m = /^(.+)\.([a-z0-9]{1,6})$/i.exec(seg);
  return !!m && EXTENSIONES.has(m[2].toLowerCase());
}

// Sustituye una RUTA por una variante determinista de la MISMA longitud:
// cada segmento de directorio y el stem del archivo se varían con un MAPA
// COMPARTIDO de segmentos (así `/data/` y `/data/crown.db` casan), la
// extensión se conserva y la ruta entera se registra en `mapas.ruta` para la
// inversa. Reglas de seguridad: las rutas fijas del motor (RUTAS_FIJAS), las
// que ya son variantes y las que contienen puntos en segmentos no finales
// (directorios tipo multi-user.target.wants) o un último segmento sin
// extensión reconocida se dejan intactas.
function variarRuta(ruta, rand, mapas) {
  if (RUTAS_FIJAS.has(ruta)) return ruta;
  if (mapas.ruta.has(ruta)) return mapas.ruta.get(ruta);
  if (pareceVarianteRuta(ruta)) return ruta;
  const conSlash = ruta.endsWith("/");
  const cuerpo = conSlash ? ruta.slice(0, -1) : ruta;
  const segmentos = cuerpo.split("/"); // ["", "data", "crown.db"]
  // Directorio con punto en mitad de la ruta → intacta (no fiarnos de la
  // tokenización: el regex de rutas solo admite puntos en el último segmento).
  for (let i = 1; i < segmentos.length - 1; i++) {
    if (segmentos[i].includes(".")) return ruta;
  }
  const ultimo = segmentos[segmentos.length - 1];
  if (!ultimoSegmentoViable(ultimo)) return ruta;
  const variado = segmentos.map((seg, idx) => {
    if (idx === 0) return seg; // segmento vacío inicial
    const m = /^(.+)\.([a-z0-9]{1,6})$/i.exec(seg);
    if (m) return variarPalabra(m[1], rand, mapas.segmento) + "." + m[2];
    return variarPalabra(seg, rand, mapas.segmento);
  }).join("/");
  const resultado = variado + (conSlash ? "/" : "");
  mapas.ruta.set(ruta, resultado);
  return resultado;
}

// Sustituye un USUARIO con punto (m.garcia → q.riv3ra): misma longitud, se
// conserva la posición del punto y se inyecta un dígito en el apellido (la
// variante no vuelve a casar con el patrón de usuario). Mapa compartido con
// los correos (variarCorreo usa el mismo mapa.usuario).
function variarUsuario(usuario, rand, mapa) {
  if (mapa.has(usuario)) return mapa.get(usuario);
  if (!/^[a-z]\.[a-z]{2,}$/.test(usuario)) return usuario;
  const idx = usuario.indexOf(".");
  const apellido = usuario.slice(idx + 1);
  let variante = usuario;
  for (let i = 0; i < 60; i++) {
    const cand = CHARS[Math.floor(rand() * 26)] + "." + variarToken(apellido, rand, true);
    if (cand !== usuario && ![...mapa.values()].includes(cand)) { variante = cand; break; }
  }
  mapa.set(usuario, variante);
  return variante;
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

// Varía un correo: el dominio cambia (a través del MISMO mapa de dominios,
// para que `m.garcia@acme.com` y el `acme.com` suelto compartan variante) y
// el USUARIO con punto también (a través del mismo mapa.usuario, para que
// `m.garcia@acme.com` y `deshabilitar m.garcia` compartan variante). Si el
// dominio ya no es un TLD reconocido (es una variante), el correo se deja
// intacto (idempotente).
function variarCorreo(correo, rand, mapas) {
  const idx = correo.lastIndexOf("@");
  let usuario = correo.slice(0, idx);
  const dominio = correo.slice(idx + 1);
  if (!esTLDReconocido(dominio)) return correo;
  const uVar = variarUsuario(usuario, rand, mapas.usuario);
  if (uVar !== usuario) usuario = uVar;
  return usuario + "@" + variarDominio(dominio, rand, mapas.dominio);
}

// Clona en profundidad un caso y le aplica las variaciones
// deterministas del día. Devuelve { caso, mapas }: el caso variado y
// el registro de sustituciones (original → variante) por tipo.
export function variarCaso(casoBase, semilla = fechaReto()) {
  const rand = rng("cybergrad-reto:" + semilla);
  const mapas = {
    ip: new Map(), host: new Map(), dominio: new Map(), correo: new Map(),
    ruta: new Map(), usuario: new Map(), segmento: new Map(),
  };

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
    // Rutas de archivo: /seg/archivo.ext → variante (longitud y extensión
    // conservadas; las URLs y las rutas fijas del motor quedan intactas)
    s = s.replace(RE_RUTA, (tok) => variarRuta(tok, rand, mapas));
    // Dominios y correos: una sola pasada (el correo gana a su dominio
    // interno, y las variantes con TLD no reconocido se dejan intactas)
    s = s.replace(RE_DOMINIO_O_CORREO, (tok) => {
      if (tok.includes("@")) {
        const variado = variarCorreo(tok, rand, mapas);
        if (variado !== tok && !mapas.correo.has(tok)) mapas.correo.set(tok, variado);
        return variado;
      }
      // Un dominio cuyo último label no es un TLD reconocido (ya es una
      // variante, o es un falso positivo tipo `payment.exe`) se deja intacto.
      if (!esTLDReconocido(tok)) return tok;
      return variarDominio(tok, rand, mapas.dominio);
    });
    // Usuarios con punto (m.garcia, l.fuentes): después de los correos, para
    // no pisar el usuario ya variado dentro de un email (los sueltos sí se
    // varían, con el MISMO mapa que los de dentro de los correos).
    s = s.replace(RE_USUARIO, (u) => {
      if (!mapas.usuario.has(u)) variarUsuario(u, rand, mapas.usuario);
      return mapas.usuario.get(u) || u;
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

// Invierte los mapas de variación: variante → original. El mapa interno de
// segmentos no se invierte (solo sirve para generar); los públicos (incluidos
// ruta y usuario) sí.
export function invertirMapas(mapas) {
  const inv = { ip: new Map(), host: new Map(), dominio: new Map(), correo: new Map(), ruta: new Map(), usuario: new Map() };
  for (const tipo of Object.keys(inv)) {
    const m = mapas[tipo];
    if (!(m instanceof Map)) continue;
    for (const [orig, variante] of m) inv[tipo].set(variante, orig);
  }
  return inv;
}

// Reconstruye el caso ORIGINAL a partir de uno variado usando los mapas
// (sustitución inversa, tokens más largos primero para no pisar
// subdominios). Devuelve el caso base exacto (sin las marcas del reto).
export function desvariarCaso(casoVariado, mapas) {
  const inv = invertirMapas(mapas);
  const tokens = [...inv.correo.keys(), ...inv.ruta.keys(), ...inv.dominio.keys(), ...inv.usuario.keys(), ...inv.host.keys(), ...inv.ip.keys()]
    .sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sustituir = (s) => {
    if (typeof s !== "string") return s;
    let out = s;
    for (const t of tokens) {
      out = out.replace(new RegExp(`(?<![A-Za-z0-9])${esc(t)}(?![A-Za-z0-9])`, "g"), inv.correo.get(t) || inv.ruta.get(t) || inv.dominio.get(t) || inv.usuario.get(t) || inv.host.get(t) || inv.ip.get(t));
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
  const TIPOS = [["ip", "IP"], ["host", "Host"], ["dominio", "Dominio"], ["correo", "Correo"], ["ruta", "Ruta"], ["usuario", "Usuario"]];
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
