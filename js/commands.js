// ============================================================
// commands.js — Comandos del terminal del analista
// Cada comando recibe (args, ctx) y escribe en el terminal.
// ============================================================

import { normalizar, listar, leer, buscar } from "./filesystem.js";
import { GAME, estadoRango } from "./state.js";
import { numCaso } from "./casos.js";

const AYUDA = {
  "ayuda": "ayuda [comando] — lista los comandos disponibles o explica uno",
  "ver_caso": "ver_caso — muestra el briefing y el objetivo del caso actual",
  "mail": "mail [id] — lista los correos del buzón o muestra uno en detalle",
  "alertas": "alertas — lista las alertas del SIEM del caso",
  "siem": "siem — alias de alertas",
  "ls": "ls [ruta] — lista archivos y directorios",
  "cat": "cat <archivo> — muestra el contenido de un archivo",
  "head": "head [-n N] <archivo> — primeras líneas (10 por defecto)",
  "tail": "tail [-n N] <archivo> — últimas líneas (10 por defecto)",
  "grep": "grep <patrón> <archivo> — busca líneas que contengan un patrón",
  "wc": "wc <archivo> — cuenta líneas y caracteres",
  "less": "less <archivo> — visualiza un archivo (paginado)",
  "find": "find <nombre> — busca archivos por nombre",
  "strings": "strings <archivo> — extrae las cadenas legibles de un binario",
  "file": "file <archivo> — identifica el tipo de archivo",
  "md5sum": "md5sum <archivo> — calcula el hash MD5",
  "sha256sum": "sha256sum <archivo> — calcula el hash SHA-256",
  "decode": "decode <base64> — decodifica una cadena (PowerShell -enc, base64...)",
  "base64": "base64 -d <cadena> — decodifica base64",
  "whois": "whois <dominio|ip> — consulta el registro del dominio/IP",
  "dig": "dig <dominio> — resuelve el dominio a IP",
  "host": "host <dominio> — alias de dig",
  "nslookup": "nslookup <dominio> — alias de dig",
  "curl": "curl <url> — obtiene la respuesta de una URL",
  "vt": "vt <hash> — consulta VirusTotal por hash",
  "pista": "pista — pide una pista al supervisor (cuesta puntos)",
  "bloquear": "bloquear <dominio|ip|url>:<valor> — bloquea un indicador en firewall/pasarela",
  "aislar": "aislar <host> — aísla un host de la red",
  "deshabilitar": "deshabilitar <usuario> — deshabilita una cuenta comprometida",
  "escalar": "escalar — escala el incidente a CSIRT / Nivel 2",
  "cerrar_caso": "cerrar_caso [razón] — cierra el caso (solo si es falso positivo)",
  "informe": "informe — redacta el informe del incidente y lo entrega",
  "tutorial": "tutorial — mini tutorial para ponerte en contexto",
  "estado": "estado — muestra tu progreso y estadísticas",
  "carrera": "carrera — abre el panel de tu carrera profesional",
  "glosario": "glosario — abre el diccionario del analista",
  "whoami": "whoami — quién eres",
  "date": "date — fecha y hora",
  "echo": "echo <texto> — imprime texto",
  "pwd": "pwd — directorio actual",
  "history": "history — historial de comandos",
  "clear": "clear — limpia la pantalla",
  "salir": "salir — (no puedes. El SOC no duerme.)",
};

export function crearComandos(ctx) {
  const { engine, term, ui } = ctx;

  const out = (texto, cls = "t-out") => term.print(texto, cls);

  // ---------- utilidades ----------
  function archivoOError(args) {
    if (!args) {
      term.printErr("Falta el archivo.");
      return null;
    }
    const res = leer(engine.caso.fs, args.trim());
    if (!res.ok) {
      term.printErr(res.error);
      return null;
    }
    return res;
  }

  function printFile(contenido, maxLines = 400) {
    const lineas = contenido.split("\n");
    const mostrar = lineas.slice(0, maxLines);
    out(mostrar.join("\n"));
    if (lineas.length > maxLines) {
      term.print(`… (${lineas.length - maxLines} líneas más. Usa head/tail/grep)`, "t-out-dim");
    }
  }

  function printHeadTail(lineas, n, desdeElFinal) {
    const sel = desdeElFinal ? lineas.slice(-n) : lineas.slice(0, n);
    out(sel.join("\n"));
    term.print(`── ${sel.length} líneas (total ${lineas.length}) ──`, "t-out-dim");
  }

  // ---------- comandos ----------
  const cmds = {
    ayuda(args) {
      if (args) {
        const c = args.trim().split(/\s+/)[0];
        if (AYUDA[c]) { out(AYUDA[c], "t-out-info"); return; }
        term.printErr(`Comando desconocido: ${c}`);
        return;
      }
      term.separator("COMANDOS DEL TERMINAL");
      const nombres = Object.keys(AYUDA).sort();
      for (const n of nombres) out(AYUDA[n], "t-sec");
      term.print("");
      term.print("Sugerencia: Tab autocompleta. ↑/↓ historial. Ctrl+L limpia.", "t-out-dim");
    },

    help: (a) => cmds.ayuda(a),

    tutorial() { ui.mostrarTutorial(false); },

    clear() { term.clear(); },
    cls() { term.clear(); },

    whoami() {
      const r = estadoRango();
      out(`${GAME.nombre} — ${r.icono} ${r.nombre} del SOC de ACME Corp`, "t-out-info");
    },
    id() {
      out("uid=1001(analista) gid=1001(soc) groups=1001(soc),1002(incidentes)", "t-out");
    },
    pwd() { out("/home/analista"); },
    date() { out(new Date().toLocaleString("es-ES")); },
    echo(a) { out(a || ""); },

    "ver_caso"(a) {
      const c = engine.caso;
      term.separator(`CASO #${String(numCaso(c.id)).padStart(2, "0")} — ${c.titulo}`);
      out(`Severidad: ${c.severidad}  |  SLA: ${Math.floor(c.sla / 60)} min  |  Nivel: ${c.nivel}  |  XP: ${c.xp}`, "t-out-info");
      term.print("");
      out(c.briefing, "t-out");
      term.print("");
      term.print("Pistas disponibles: " + (c.pistas?.length || 0) + " (usa `pista`)", "t-out-dim");
    },

    mail(a) {
      const correos = engine.caso.correos || [];
      if (!a) {
        if (correos.length === 0) {
          out("Buzón vacío.", "t-out-dim");
          return;
        }
        term.separator(`BUZÓN (${correos.length})`);
        correos.forEach((m, i) => {
          out(`${i + 1}. [${m.estado}] ${m.de} — «${m.asunto}»`, i === 0 ? "t-out" : "t-out-dim");
        });
        term.print("Usa `mail <id>` para leer un correo completo.", "t-out-dim");
        return;
      }
      const idx = parseInt(a.trim(), 10) - 1;
      const m = correos[idx];
      if (!m) { term.printErr("Correo no encontrado. Usa `mail` para listar."); return; }
      term.separator(`CORREO ${idx + 1}`);
      out(`De: ${m.de}`, "t-out");
      out(`Para: ${m.para}`, "t-out");
      out(`Asunto: ${m.asunto}`, "t-out-hi");
      out(`Fecha: ${m.fecha}`, "t-out");
      out(`Estado: ${m.estado}`, "t-out-warn");
      out(`Adjunto: ${m.adjunto}`, "t-out-warn");
      if (m.nota) { out(`Nota: ${m.nota}`, "t-out-info"); }
      term.print("");
      out(m.cuerpo, "t-out");
      if (m.headers) {
        term.print("");
        out(`Cabeceras completas en: ${m.headers}`, "t-out-dim");
      }
    },

    alertas(a) {
      const alertas = engine.caso.alertas || [];
      if (alertas.length === 0) { out("Sin alertas registradas.", "t-out-dim"); return; }
      term.separator(`ALERTAS SIEM (${alertas.length})`);
      for (const al of alertas) {
        const cls = al.sev === "CRITICAL" || al.sev === "HIGH" ? "t-out-err" : al.sev === "MEDIUM" ? "t-out-warn" : "t-out-info";
        out(`[${al.sev}] ${al.id} (${al.fuente}) — ${al.titulo}`, cls);
      }
      term.print("Detalles completos en /opt/siem/alerts.json", "t-out-dim");
    },
    siem: (a) => cmds.alertas(a),

    ls(a) {
      const ruta = a ? a.trim() : "/home/analista";
      const hijos = listar(engine.caso.fs, ruta);
      if (hijos.length === 0) {
        out(`ls: no se puede abrir '${ruta}': directorio no encontrado`, "t-out-err");
        return;
      }
      out(hijos.map((h) => (esDir(h) ? h + "/" : h)).join("  "));
      function esDir(h) {
        const p = (ruta.endsWith("/") ? ruta : ruta + "/") + h;
        return listar(engine.caso.fs, p).length > 0;
      }
    },

    cat(a) {
      const res = archivoOError(a);
      if (res) printFile(res.contenido);
    },

    head(a) {
      const m = /^(-n\s+(\d+)\s+)?(.*)$/.exec(a?.trim() || "");
      const n = m && m[2] ? parseInt(m[2], 10) : 10;
      const res = archivoOError(m ? m[3] : a);
      if (res) printHeadTail(res.contenido.split("\n"), n, false);
    },

    tail(a) {
      const m = /^(-n\s+(\d+)\s+)?(.*)$/.exec(a?.trim() || "");
      const n = m && m[2] ? parseInt(m[2], 10) : 10;
      const res = archivoOError(m ? m[3] : a);
      if (res) printHeadTail(res.contenido.split("\n"), n, true);
    },

    grep(a) {
      const partes = a?.trim().split(/\s+/);
      if (!partes || partes.length < 2) {
        term.printErr("Uso: grep <patrón> <archivo>");
        return;
      }
      const patron = partes[0];
      const archivo = partes.slice(1).join(" ");
      const res = leer(engine.caso.fs, archivo);
      if (!res.ok) { term.printErr(res.error); return; }
      const hits = res.contenido.split("\n").filter((l) => l.toLowerCase().includes(patron.toLowerCase()));
      if (hits.length === 0) {
        term.print(`Sin coincidencias de '${patron}' en ${archivo}`, "t-out-dim");
        return;
      }
      out(hits.join("\n"), "t-out-hi");
      term.print(`── ${hits.length} coincidencias de '${patron}' en ${res.path} ──`, "t-out-dim");
    },

    wc(a) {
      const res = archivoOError(a);
      if (!res) return;
      const lineas = res.contenido.split("\n").length;
      out(`${lineas} líneas  ${res.contenido.length} caracteres  ${res.path}`);
    },

    less(a) {
      const res = archivoOError(a);
      if (res) printFile(res.contenido, 120);
    },

    find(a) {
      const nombre = a?.trim();
      if (!nombre) { term.printErr("Uso: find <nombre>"); return; }
      const res = buscar(engine.caso.fs, nombre);
      if (res.length === 0) { term.print(`No se encontró '${nombre}'`, "t-out-dim"); return; }
      out(res.join("\n"));
    },

    strings(a) {
      const res = archivoOError(a);
      if (!res) return;
      const cadenas = res.contenido.match(/[\x20-\x7e]{4,}/g) || [];
      if (cadenas.length === 0) { out("(sin cadenas legibles)", "t-out-dim"); return; }
      out(cadenas.join("\n"));
    },

    file(a) {
      const ruta = a?.trim();
      if (!ruta) { term.printErr("Uso: file <archivo>"); return; }
      const contenido = engine.archivo(ruta);
      if (contenido === null) { term.printErr(`No existe '${ruta}'`); return; }
      const ext = ruta.split(".").pop().toLowerCase();
      const inicio = contenido.slice(0, 4);
      if (ext === "docm" || ext === "docx" || ext === "xlsm") {
        out(`${ruta}: Composite Document File V2, Microsoft Word for Windows (contenedor OLE/OpenXML)`, "t-out-warn");
        out("  ⚠ Los documentos con macros (.docm) pueden ejecutar código al abrirse.", "t-out-warn");
      } else if (inicio.startsWith("MZ")) {
        out(`${ruta}: PE32 executable (GUI) Intel 80386, for MS Windows`, "t-out-warn");
      } else if (inicio.startsWith("PK")) {
        out(`${ruta}: Zip archive data (al menos v1.0)`, "t-out");
      } else if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(contenido.trim().replace(/\n/g, ""))) {
        out(`${ruta}: ASCII text (posiblemente base64 codificado)`, "t-out-info");
      } else {
        out(`${ruta}: ASCII text`, "t-out");
      }
    },

    md5sum(a) {
      const ruta = a?.trim();
      if (!ruta) { term.printErr("Uso: md5sum <archivo>"); return; }
      const h = engine.hashArchivo(ruta);
      if (!h) { term.printErr(`No existe '${ruta}'`); return; }
      engine.registrarHashVt(ruta, h.md5);
      out(`${h.md5}  ${ruta}`, "t-out-hi");
    },

    sha256sum(a) {
      const ruta = a?.trim();
      if (!ruta) { term.printErr("Uso: sha256sum <archivo>"); return; }
      const h = engine.hashArchivo(ruta);
      if (!h) { term.printErr(`No existe '${ruta}'`); return; }
      engine.registrarHashVt(ruta, h.sha256);
      out(`${h.sha256}  ${ruta}`, "t-out-hi");
    },

    decode(a) {
      const entrada = (a || "").trim();
      if (!entrada) { term.printErr("Uso: decode <cadena base64>"); return; }
      // Extrae el primer bloque base64 largo que encuentre en la entrada
      // (así funciona aunque pegues la línea completa de `strings`).
      const candidatos = entrada.match(/[A-Za-z0-9+/]{40,}={0,2}/g) || [entrada];
      for (const candidato of candidatos) {
        const dec = decodificarBase64(candidato);
        if (dec !== null) {
          const esPS = dec.tipo === "UTF-16LE";
          out(`Cadena decodificada (${dec.tipo}):`, "t-out-info");
          out(dec.texto, "t-out-hi");
          if (esPS) {
            out("⚠ Es un comando PowerShell ofuscado. Los atacantes lo usan para descargar y ejecutar malware.", "t-out-warn");
          }
          return;
        }
      }
      term.printErr("No he podido decodificar la entrada. Pega una cadena base64 (ej: el bloque -enc del strings).");
    },
    "base64"(a) {
      const m = /^(-d\s+)?(.*)$/.exec(a?.trim() || "");
      cmds.decode(m ? m[2] : a);
    },

    whois(a) {
      const obj = (a || "").trim().toLowerCase();
      if (!obj) { term.printErr("Uso: whois <dominio|ip>"); return; }
      const c = engine.caso;
      if (c.dominios[obj] && c.dominios[obj].whois) {
        out(c.dominios[obj].whois, "t-out");
        return;
      }
      if (c.ips[obj] && c.ips[obj].whois) {
        out(c.ips[obj].whois, "t-out");
        return;
      }
      // Buscar dominio por IP
      for (const [dom, info] of Object.entries(c.dominios)) {
        if (info.ip === obj) {
          out(info.whois || `${obj}: ${info.registrador || "sin datos"}`, "t-out");
          return;
        }
      }
      out(`${obj}: sin registro en la base local. Consulta externa no disponible en el simulador.`, "t-out-dim");
    },

    dig(a) {
      const obj = (a || "").trim().toLowerCase();
      if (!obj) { term.printErr("Uso: dig <dominio>"); return; }
      const c = engine.caso;
      if (c.dominios[obj]) {
        out(`; <<>> DiG 9.18 <<>> ${obj}`, "t-out-dim");
        out(`;; ANSWER SECTION:`, "t-out-dim");
        out(`${obj}. 300 IN A ${c.dominios[obj].ip}`, "t-out-hi");
        out(`;; registro: ${c.dominios[obj].registrado || "n/d"}`, "t-out-info");
        return;
      }
      out(`; No hay registro para ${obj} en la base local.`, "t-out-dim");
    },
    host: (a) => cmds.dig(a),
    nslookup: (a) => cmds.dig(a),

    curl(a) {
      const url = (a || "").trim();
      if (!url) { term.printErr("Uso: curl <url>"); return; }
      const c = engine.caso;
      if (c.urls && c.urls[url] !== undefined) {
        out(c.urls[url], "t-out");
        return;
      }
      for (const [u, resp] of Object.entries(c.urls || {})) {
        if (u.split("/")[2] === url.replace(/^https?:\/\//, "").split("/")[0]) {
          out(`→ ${u}`, "t-out-dim");
          out(resp, "t-out");
          return;
        }
      }
      out(`curl: (7) Failed to connect. La URL ${url} no responde (no está en la base del simulador).`, "t-out-dim");
    },

    vt(a) {
      const hash = (a || "").trim().toLowerCase();
      if (!hash) { term.printErr("Uso: vt <hash md5|sha256>"); return; }
      const c = engine.caso;
      const reporte = c.hashes?.[hash] || engine.vtRuntime?.[hash];
      if (!reporte) {
        out(`VirusTotal: sin resultados para ${hash}`, "t-out-dim");
        return;
      }
      const v = reporte.vt;
      term.separator(`VIRUSTOTAL — ${reporte.nombre}`);
      out(`Hash (${reporte.tipo}): ${hash}`, "t-out");
      out(`Detección: ${v.deteccion}`, v.maliciosos > v.repos / 2 ? "t-out-err" : v.maliciosos > 0 ? "t-out-warn" : "t-out");
      out(`Motores: ${v.repos} analizados, ${v.maliciosos} maliciosos`, "t-out");
      if (v.familia) out(`Familia: ${v.familia}`, "t-out-hi");
      if (v.comentarios) out(`Comentario: ${v.comentarios}`, "t-out-info");
      if (reporte.nota) out(`Nota: ${reporte.nota}`, "t-out-warn");
    },

    pista() { engine.pista(); },

    bloquear(a) { engine.bloquear(a); },
    aislar(a) { engine.aislar(a); },
    deshabilitar(a) { engine.deshabilitar(a); },
    escalar() { engine.escalar(); },
    cerrar_caso(a) { engine.cerrarCaso(a); },
    informe() { engine.abrirInforme(); },

    estado() {
      const r = estadoRango();
      term.separator(`ESTADO DE ${GAME.nombre.toUpperCase()}`);
      out(`Rango: ${r.icono} ${r.nombre}`, "t-out");
      out(`XP: ${GAME.xp}  |  Puntos: ${GAME.puntos}`, "t-out");
      out(`Casos resueltos: ${GAME.casosResueltos}  |  Caso actual: ${GAME.casoActual || "ninguno"}`, "t-out");
      if (engine.caso) {
        out(`SLA restante: ${Math.max(0, engine.caso.sla - GAME.reloj)}s`, "t-out-info");
        out(`Acciones correctas: ${engine.hecho.size}  |  Errores: ${engine.errores}  |  Pistas: ${engine.pistasUsadas}`, "t-out-info");
      }
    },

    carrera() { ui.mostrarCarrera(); },
    glosario() { ui.mostrarGlosario(); },
    h() { cmds.ayuda(""); },

    history() {
      const h = term.historial.slice(-20);
      if (h.length === 0) { out("Historial vacío.", "t-out-dim"); return; }
      h.forEach((c, i) => out(`${String(i + 1).padStart(3, " ")}  ${c}`, "t-out-dim"));
    },

    salir() {
      out("No puedes salir. El SOC no duerme.", "t-out-warn");
    },
  };

  return {
    cmds,
    lista: Object.keys(AYUDA).sort(),
  };
}

// Decodificador de base64: prueba UTF-8 primero y, si no es legible,
// UTF-16LE (formato -enc de PowerShell). Devuelve null si nada sirve.
function decodificarBase64(b64) {
  const esLegible = (s) => {
    if (!s || !s.trim()) return false;
    let imprimibles = 0;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c === 0x0a || c === 0x0d || c === 0x09 || (c >= 0x20 && c <= 0x7e) || (c >= 0xc0 && c <= 0x24f)) imprimibles++;
    }
    return imprimibles / s.length > 0.8;
  };
  try {
    const bin = atob(b64.replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    // Intento 1: UTF-8
    try {
      const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (esLegible(utf8)) return { tipo: "UTF-8", texto: utf8 };
    } catch { /* no es UTF-8 válido */ }
    // Intento 2: UTF-16LE (PowerShell -enc)
    let out = "";
    for (let i = 0; i + 1 < bin.length; i += 2) {
      const c = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
      if (c === 0) continue;
      out += String.fromCharCode(c);
    }
    if (esLegible(out)) return { tipo: "UTF-16LE", texto: out };
  } catch { /* no es base64 */ }
  return null;
}
