// ============================================================
// commands.js — Comandos del terminal del analista
// Cada comando recibe (args, ctx) y escribe en el terminal.
// ============================================================

import { listar, leer, buscar } from "./filesystem.js";
import { GAME, estadoRango, estadoRangoRT } from "./state.js";
import { numCaso } from "./casos.js";
import { numCasoRT } from "./rt-casos.js";
import { explicarTutor, EXPLICAR_AYUDA } from "./tutor.js";
import { preguntarJimmy, PREGUNTAR_AYUDA } from "./jimmy-ia.js";
import { sonido, sonidoActivado, fijarSonido } from "./sonido.js";
import { soportaVoz, escucharVoz } from "./voz.js";
import { filasRankingReto } from "./reto.js";
import { validarCertificado } from "./certificado.js";

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
  "explicar": EXPLICAR_AYUDA,
  "preguntar": PREGUNTAR_AYUDA,
  "jimmy": "jimmy [texto] — alias de preguntar: Jimmy responde sobre el caso actual (sin texto, escucha tu voz)",
  "voz": "voz [off] — pregunta a Jimmy por voz (igual que `preguntar` sin texto); voz off cancela la escucha",
  "reto": "reto — abre el reto diario (mismo incidente, indicadores distintos cada día)",
  "ranking": "ranking — historial de tus marcas del reto diario (mejor rating y tiempo por día)",
  "examen": "examen — modo examen: caso sin pistas a contrarreloj; al aprobar (A o mejor) obtienes certificado",
  "verificar_certificado": "verificar_certificado <código> — Jimmy valida la firma del certificado (CG-…): confirma titular, fecha y nota sin alteraciones",
  "sonido": "sonido [on|off|estado] — activa, silencia o muestra el estado del sonido",
  "habilidades": "habilidades — abre el árbol de habilidades MITRE ATT&CK",
  "demo": "demo — modo presentador: estado avanzado en memoria (nunca se guarda)",
  "nmap": "nmap <ip|rango> — escanea puertos y servicios (red team)",
  "gobuster": "gobuster <url> — descubre directorios en un servidor web",
  "nikto": "nikto <url> — analiza vulnerabilidades del servidor web",
  "searchsploit": "searchsploit <texto> — busca exploits en la base local",
  "hydra": "hydra <servicio> <host> -u <usuario> -w <wordlist> — fuerza bruta de credenciales",
  "ssh": "ssh <usuario>@<host> — conéctate a un servidor con credenciales conocidas",
  "sqlmap": "sqlmap -u <url> --dump — detecta y explota inyecciones SQL",
  "msf": "msf <exploit> <objetivo> — lanza un exploit con Metasploit (alias: msfconsole)",
  "mimikatz": "mimikatz <host> — extrae credenciales de la memoria (Windows)",
  "john": "john <archivo> — crackea hashes con diccionario (alias: hashcat)",
  "nc": "nc <host> <puerto> [< <archivo>] — exfiltra datos por netcat",
  "exfiltrar": "exfiltrar <archivo> — copia un archivo a tu máquina de pentest",
  "escalar_priv": "escalar_priv <objetivo> — escala privilegios en el sistema comprometido",
  "bloquear": "bloquear <dominio|ip|url>:<valor> — bloquea un indicador en firewall/pasarela",
  "aislar": "aislar <host> — aísla un host de la red",
  "deshabilitar": "deshabilitar <usuario> — deshabilita una cuenta comprometida",
  "escalar": "escalar — escala el incidente a CSIRT / Nivel 2",
  "cerrar_caso": "cerrar_caso [razón] — cierra el caso (solo si es falso positivo)",
  "vssadmin": "vssadmin list shadows — muestra las copias de sombra del host (el ransomware las borra)",
  "pagar": "pagar — decide si pagas el rescate (spoiler: no se paga)",
  "informe": "informe — redacta el informe del incidente y lo entrega",
  "tutorial": "tutorial — mini tutorial para ponerte en contexto",
  "estado": "estado — muestra tu progreso y estadísticas",
  "carrera": "carrera — abre el panel de tu carrera profesional",
  "duelo": "duelo — modo enfrentamiento: dos jugadores, SOC vs Red Team, turnos alternos",
  "salir_duelo": "salir_duelo — abandona el duelo en curso y vuelve a tu carrera",
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

  // ---------- Voz (Jimmy-IA) ----------
  // Sesión activa de reconocimiento de voz: { ctrl, estado }
  let vozSesion = null;

  // Arranca la escucha por voz y encadena la pregunta reconocida a Jimmy.
  function preguntarPorVoz() {
    if (vozSesion) {
      term.printInfo("Ya estoy escuchando… escribe `preguntar off` para cancelar.");
      return;
    }
    if (!soportaVoz()) {
      term.printWarn("Este navegador no soporta reconocimiento de voz (webkitSpeechRecognition). Escribe la pregunta: `preguntar <texto>`.");
      return;
    }
    const estado = { cancelada: false };
    let recibida = false;
    let huboError = false;
    const ctrl = escucharVoz({
      onResult: (texto) => {
        // Si el usuario ya canceló, un resultado tardío no debe imprimir nada
        if (estado.cancelada) return;
        recibida = true;
        term.separator("🗣 TU PREGUNTA");
        term.print(texto, "t-out-hi");
        term.separator("🧠 JIMMY — RESPUESTA");
        // Callback asíncrono: fuera del try/catch del terminal, así que
        // cualquier fallo aquí debe avisar sin convertirse en pageerror.
        try {
          term.print(preguntarJimmy(texto, { caso: engine.caso, hecho: engine.hecho, modoRT: engine.modoRT, game: GAME }), "t-out");
        } catch (e) {
          huboError = true;
          term.printErr("Jimmy no pudo responder: " + e.message);
          console.error(e);
        }
      },
      onError: (cod) => {
        // Tras cancelar, algunos navegadores disparan onerror('aborted'):
        // el aviso de cancelación ya se mostró, no se añade ruido.
        if (estado.cancelada) return;
        huboError = true;
        const msgs = {
          "no-soporte": "Este navegador no soporta reconocimiento de voz. Usa `preguntar <texto>`.",
          "no-iniciar": "No se pudo iniciar el micrófono. Comprueba los permisos y vuelve a intentarlo.",
          "not-allowed": "Permiso de micrófono denegado. Actívalo en la configuración del navegador y vuelve a `preguntar`.",
          "no-speech": "No he captado voz. Inténtalo de nuevo.",
          "audio-capture": "Sin micrófono disponible en este dispositivo.",
          "network": "Error de red del servicio de voz del navegador.",
          "service-not-allowed": "El navegador no permite el servicio de voz en esta página.",
        };
        term.printWarn(msgs[cod] || `Error de reconocimiento de voz: ${cod}`);
      },
      onEnd: () => {
        vozSesion = null;
        // Sin resultado, sin error y sin cancelación: solo entonces el aviso genérico.
        if (!recibida && !huboError && !estado.cancelada) {
          term.printWarn("No he captado nada. Vuelve a `preguntar` o escribe la pregunta: `preguntar <texto>`.");
        }
      },
    });
    if (!ctrl) return; // escucharVoz ya avisó por onError
    vozSesion = { ctrl, estado };
    term.separator("🎙 JIMMY — PREGUNTA POR VOZ");
    term.print("Habla ahora… (escribe `preguntar off` para cancelar)", "t-out-dim");
  }

  // Cancela la sesión de voz activa (sin avisar de «no he captado nada»).
  function cancelarVoz() {
    if (!vozSesion) {
      term.printInfo("No hay sesión de voz activa.");
      return;
    }
    vozSesion.estado.cancelada = true;
    vozSesion.ctrl.cancelar();
    vozSesion = null;
    term.print("🛑 Reconocimiento de voz cancelado.", "t-out-info");
  }

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

    // Easter egg: el origen del nombre. NO está en AYUDA a propósito — se
    // descubre por casualidad, por el README o preguntándole a Jimmy.
    porque_cybergrad() {
      term.separator("🏙️ CYBERGRAD — LA CIUDAD DEL CIBER");
      out("«grad» (град) significa «ciudad» en las lenguas eslavas:", "t-out");
      out("Leningrado, Stalingrado, Volgogrado… todas son «la ciudad de X».", "t-out-dim");
      term.print("");
      out("CYBERGRAD = «la ciudad del ciber».", "t-out-hi");
      term.print("");
      out("Aquí no juegas partidas: construyes tu carrera dentro de un mundo.", "t-out");
      out("Entras como analista junior en el turno de mañana y esta ciudad te", "t-out");
      out("ve crecer hasta Jefe de CSIRT… o CISO, en la Unidad Red Team.", "t-out");
      term.print("");
      out("Y de paso, es por eso que el banner de la terminal pinta tu ciudad", "t-out-dim");
      out("con bloques. Bienvenido a casa. 🏙️", "t-out-dim");
    },

    clear() { term.clear(); },
    cls() { term.clear(); },

    whoami() {
      const esRT = GAME.modo === "rt";
      const r = esRT ? estadoRangoRT() : estadoRango();
      out(`${GAME.nombre} — ${r.icono} ${r.nombre} ${esRT ? "de la Unidad Red Team de ACME Corp" : "del SOC de ACME Corp"}`, "t-out-info");
    },
    id() {
      out("uid=1001(analista) gid=1001(soc) groups=1001(soc),1002(incidentes)", "t-out");
    },
    pwd() { out("/home/analista"); },
    date() { out(new Date().toLocaleString("es-ES")); },
    echo(a) { out(a || ""); },

    "ver_caso"() {
      const c = engine.caso;
      const num = c.modo === "rt" ? numCasoRT(c.id) : numCaso(c.id);
      term.separator(`${c.modo === "rt" ? "PENTEST" : "CASO"} #${String(num).padStart(2, "0")} — ${c.titulo}`);
      out(`Severidad: ${c.severidad}  |  SLA: ${Math.floor(c.sla / 60)} min  |  Nivel: ${c.nivel}  |  XP: ${c.xp}`, "t-out-info");
      term.print("");
      out(c.briefing, "t-out");
      term.print("");
      // En reto/examen las pistas están bloqueadas por diseño: el contador
      // de pistas del caso base sería contradictorio en esa pantalla.
      term.print(engine.reto
        ? "Sin pistas: el reto pone a prueba tu criterio, no tu memoria. (Indicadores: usa los de HOY, los ves en el briefing y en el panel del reto)."
        : engine.examen
          ? "Sin pistas: el examen pone a prueba tu criterio, no tu memoria."
          : "Pistas disponibles: " + (c.pistas?.length || 0) + " (usa `pista`)", "t-out-dim");
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

    alertas() {
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
      const dominios = c.dominios || {};
      const ips = c.ips || {};
      if (dominios[obj] && dominios[obj].whois) {
        out(dominios[obj].whois, "t-out");
        return;
      }
      if (ips[obj] && ips[obj].whois) {
        out(ips[obj].whois, "t-out");
        return;
      }
      // Buscar dominio por IP
      for (const [, info] of Object.entries(dominios)) {
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
      const parts = (a || "").trim().split(/\s+/);
      let user = null, pass = null, url = null;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "-u") {
          const cred = (parts[i + 1] || "").split(":");
          user = cred[0]; pass = cred[1]; i++;
        } else if (!url) url = parts[i];
      }
      if (!url) { term.printErr("Uso: curl [-u usuario:password] <url>"); return; }
      const c = engine.caso;
      // Modo red team: web del caso (con login opcional)
      if (c.web) {
        for (const [base, w] of Object.entries(c.web)) {
          if (!url.startsWith(base)) continue;
          const rk = url.slice(base.length).replace(/\/$/, "");
          const contenido = w.rutas && w.rutas[rk] !== undefined ? w.rutas[rk] : rk === "" ? (w.raiz || "") : null;
          if (contenido === null) { out(`curl: (7) 404 Not Found en ${url}`, "t-out-dim"); return; }
          out(contenido, "t-out");
          if (w.login && rk === w.login.url && user !== null) {
            if (user === w.login.usuario && pass === w.login.password) {
              out("→ Login correcto. Bienvenido, administrador.", "t-out-ok");
              engine.completar("acceso", url);
            } else {
              out("→ 401 Unauthorized: credenciales incorrectas.", "t-out-warn");
            }
          }
          return;
        }
        out(`curl: (7) Failed to connect. ${url} no está en el scope del engagement.`, "t-out-dim");
        return;
      }
      // Modo SOC: urls clásicas
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

    // ---------- Comandos red team (pentest ofensivo) ----------
    nmap(a) {
      const objetivo = (a || "").trim();
      if (!objetivo) { term.printErr("Uso: nmap <ip|rango>  (ej: nmap 10.10.10.0/24)"); return; }
      const c = engine.caso;
      const r = c.red || {};
      const sub = r.subredes && r.subredes[objetivo];
      if (sub) {
        term.separator(`NMAP SCAN — ${objetivo} (${sub.desc})`);
        out(`Hosts activos (${sub.activos.length}):`, "t-out");
        for (const ip of sub.activos) {
          const h = r.hosts && r.hosts[ip];
          out(`  ${ip}  ${h ? h.hostname : "(sin resolver)"}`, "t-out-hi");
        }
        out("Usa `nmap <ip>` para el detalle de puertos de cada host.", "t-out-dim");
        return;
      }
      const h = r.hosts && r.hosts[objetivo];
      if (!h) {
        out(`nmap: ${objetivo} no responde al escaneo (fuera del scope autorizado).`, "t-out-dim");
        return;
      }
      term.separator(`NMAP SCAN — ${objetivo} (${h.hostname})`);
      out("Host is up (0.045s latency).", "t-out-dim");
      out(`OS: ${h.os}`, "t-out");
      out("PORT     STATE  SERVICE", "t-out-dim");
      out(h.puertos.split("\n").map((l) => "  " + l).join("\n"), "t-out-hi");
      engine.completar("recon", objetivo);
      const base = Object.keys(c.web || {}).find((u) => u.includes(objetivo));
      if (base) out(`Sugerencia: enumera directorios con \`gobuster ${base}\` y vulnerabilidades con \`nikto ${base}\`.`, "t-out-dim");
    },

    gobuster(a) {
      const url = (a || "").trim();
      if (!url) { term.printErr("Uso: gobuster <url>  (ej: gobuster http://10.10.10.5)"); return; }
      const c = engine.caso;
      const w = c.web && c.web[url];
      if (!w || !w.dirs) { out(`gobuster: ${url} no responde o no hay directorios en la base local.`, "t-out-dim"); return; }
      term.separator(`GOBUSTER — ${url}`);
      for (const d of w.dirs) {
        out(`[+] ${d} (Status: 200, Size: ${800 + d.length * 7})`, /admin|backup|upload|api/i.test(d) ? "t-out-hi" : "t-out");
      }
      for (const target of (c.correctas.recon || [])) {
        const valor = target.slice(target.indexOf(":") + 1).toLowerCase();
        if (valor.startsWith(url.toLowerCase() + "/")) engine.completar("recon", valor);
      }
    },

    nikto(a) {
      const url = (a || "").trim();
      if (!url) { term.printErr("Uso: nikto <url>"); return; }
      const c = engine.caso;
      const w = c.web && c.web[url];
      if (!w || !w.nikto) { out(`nikto: sin hallazgos para ${url} en la base local.`, "t-out-dim"); return; }
      term.separator(`NIKTO — ${url}`);
      out(`- Nikto v2.5.0`, "t-out-dim");
      w.nikto.forEach((n) => out(`+ ${n}`, "t-out-warn"));
      for (const target of (c.correctas.recon || [])) {
        const valor = target.slice(target.indexOf(":") + 1).toLowerCase();
        if (valor.startsWith(url.toLowerCase() + "/")) engine.completar("recon", valor);
      }
    },

    searchsploit(a) {
      const q = (a || "").trim().toLowerCase();
      if (!q) { term.printErr("Uso: searchsploit <texto>  (ej: searchsploit php upload)"); return; }
      const res = leer(engine.caso.fs, "/opt/exploitdb/searchsploit.txt");
      if (!res.ok) { out("searchsploit: la base de exploits local no está disponible en este caso.", "t-out-dim"); return; }
      const hits = res.contenido.split("\n").filter((l) => l.toLowerCase().includes(q));
      term.separator(`EXPLOIT-DB (${hits.length} resultados para '${q}')`);
      if (hits.length === 0) { out("Sin resultados.", "t-out-dim"); return; }
      for (const l of hits) {
        const m = /^([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/.exec(l);
        if (m) out(`${m[1]}  |  ${m[2].trim()}  |  ${m[3].trim()}`, "t-out");
        else out(l, "t-out");
      }
    },

    hydra(a) {
      const m = /^(\S+)\s+(\S+)\s+-u\s+(\S+)\s+-w\s+(\S+)/.exec((a || "").trim());
      if (!m) { term.printErr("Uso: hydra <servicio> <host> -u <usuario> -w <wordlist>  (ej: hydra ssh 10.10.10.20 -u admin -w /opt/wordlists/top1000.txt)"); return; }
      const [, servicio, host, usuario, wordlist] = m;
      const c = engine.caso;
      const entry = (c.credenciales || []).find((x) => x.servicio === servicio.toLowerCase() && x.host === host && x.usuario === usuario);
      if (!entry) {
        out(`hydra: ${servicio}://${host} no es objetivo de fuerza bruta (fuera de scope o sin cuentas conocidas).`, "t-out-dim");
        return;
      }
      const res = leer(c.fs, wordlist);
      if (!res.ok) { term.printErr(`hydra: no se puede leer el diccionario ${wordlist}`); return; }
      const palabras = res.contenido.split("\n").map((s) => s.trim()).filter(Boolean);
      const found = palabras.includes(entry.password);
      term.separator(`HYDRA — ${servicio}://${host} (usuario: ${usuario})`);
      out(`[DATA] Probando ${palabras.length} passwords contra ${servicio}://${host}`, "t-out-dim");
      if (found) {
        out(`[${host}] ${servicio}://${usuario}:${entry.password}  login correcto`, "t-out-hi");
        if (entry.nota) out(`Nota: ${entry.nota}`, "t-out-info");
        engine.completar("acceso", host);
      } else {
        out("[-] No se encontraron credenciales válidas en el diccionario.", "t-out-warn");
      }
    },

    ssh(a) {
      const m = /^([\w.-]+)@([\d.]+)$/.exec((a || "").trim());
      if (!m) { term.printErr("Uso: ssh <usuario>@<host>  (ej: ssh admin@10.10.10.20)"); return; }
      const [, usuario, host] = m;
      const c = engine.caso;
      const entry = (c.credenciales || []).find((x) => x.servicio === "ssh" && x.host === host && x.usuario === usuario);
      if (!entry) {
        out(`ssh: no se pudo autenticar ${usuario}@${host} con las credenciales conocidas.`, "t-out-err");
        return;
      }
      term.separator(`SSH — ${usuario}@${host}`);
      out("Bienvenido a Ubuntu 22.04 (GNU/Linux)", "t-out");
      out("Last login: hoy desde tu maquina", "t-out-dim");
      const hijos = listar(c.fs, `/home/${usuario}/`);
      if (hijos.length > 0) {
        out(`Contenido de /home/${usuario}/:`, "t-out-dim");
        out(hijos.map((h) => "  " + h).join("\n"), "t-out-hi");
      }
      out("", "t-out");
      engine.completar("acceso", host);
      out("Sugerencia: `exfiltrar <archivo>` copia un archivo a tu maquina.", "t-out-dim");
    },

    sqlmap(a) {
      const m = /^-u\s+(\S+)\s+--dump/.exec((a || "").trim());
      if (!m) { term.printErr("Uso: sqlmap -u <url> --dump  (ej: sqlmap -u http://10.10.10.30/producto?id=1 --dump)"); return; }
      const url = m[1];
      const c = engine.caso;
      const s = c.sqli;
      if (!s || s.url !== url) {
        out(`sqlmap: no se detecta inyección SQL en ${url} (el parámetro parece seguro).`, "t-out-dim");
        return;
      }
      term.separator(`SQLMAP — ${url}`);
      out(`[INFO] Inyección confirmada: ' OR 1=1 --`, "t-out-hi");
      out(`[INFO] Base de datos: ${s.db}`, "t-out");
      out("", "t-out");
      for (const tabla of s.tablas) {
        term.separator(`Tabla: ${tabla.nombre} (${tabla.filas.length} filas)`);
        const cols = Object.keys(tabla.filas[0] || {});
        out(cols.join("  |  "), "t-out-dim");
        for (const fila of tabla.filas) out(cols.map((c2) => fila[c2]).join("  |  "), "t-out");
        engine.completar("exfiltracion", tabla.nombre);
      }
      out("", "t-out");
      out("El hash del admin está en /tmp/hash.txt. `john /tmp/hash.txt` lo descifra.", "t-out-info");
    },

    msf(a) {
      const m = /^(\S+)\s+(\S+)$/.exec((a || "").trim());
      if (!m) { term.printErr("Uso: msf <exploit> <objetivo>  (ej: msf php-upload-rce http://10.10.10.50/upload)"); return; }
      const [, exploit, objetivo] = m;
      const c = engine.caso;
      const e = c.exploits && c.exploits[exploit];
      if (!e) { out(`msf: el exploit '${exploit}' no está en el framework local. Prueba \`searchsploit\`.`, "t-out-dim"); return; }
      if (e.objetivo !== objetivo) {
        out(`msf: ${exploit} no aplica a '${objetivo}'. Objetivo esperado: ${e.objetivo}`, "t-out-warn");
        return;
      }
      term.separator(`METASPLOIT — ${exploit}`);
      out(e.resultado, "t-out-hi");
      out("", "t-out");
      engine.completar("acceso", objetivo);
      if (/escalad|sudo|root/i.test(e.resultado)) {
        out("La sesión revela un vector de escalada: usa `escalar_priv` cuando identifiques el objetivo.", "t-out-dim");
      }
    },
    msfconsole: (a) => cmds.msf(a),

    mimikatz(a) {
      const host = (a || "").trim();
      if (!host) { term.printErr("Uso: mimikatz <host>  (ej: mimikatz 10.10.10.60)"); return; }
      const c = engine.caso;
      const mk = c.mimikatz;
      if (!mk || mk.host !== host) {
        out(`mimikatz: no hay sesión elevada en ${host} o el host no es Windows.`, "t-out-dim");
        return;
      }
      term.separator(`MIMIKATZ — ${host}`);
      out("  .#####.   mimikatz 2.2.0 (x64) — sekurlsa::logonpasswords", "t-out-dim");
      for (const cred of mk.creds) out("  " + cred, "t-out-hi");
      if (mk.nota) out("  Nota: " + mk.nota, "t-out-warn");
      out("", "t-out");
      engine.completar("escalada", host);
    },

    john(a) {
      const archivo = (a || "").trim();
      if (!archivo) { term.printErr("Uso: john <archivo>  (ej: john /tmp/hash.txt)"); return; }
      const res = leer(engine.caso.fs, archivo);
      if (!res.ok) { term.printErr(res.error); return; }
      const c = engine.caso;
      const hashMatch = res.contenido.match(/[a-f0-9]{32}/i);
      const hash = hashMatch ? hashMatch[0].toLowerCase() : null;
      const info = hash && c.hashes && c.hashes[hash];
      term.separator(`JOHN THE RIPPER — ${archivo}`);
      out(`Loaded 1 password hash (${info ? info.tipo : "desconocido"})`, "t-out-dim");
      if (info) {
        out(`admin:${info.password}`, "t-out-hi");
        out("1/1 descifrado. Usa la password para acceder a lo que protege.", "t-out-info");
      } else {
        out("No se pudo descifrar con el diccionario local.", "t-out-warn");
      }
    },
    hashcat: (a) => cmds.john(a),

    exfiltrar(a) {
      const archivo = (a || "").trim();
      if (!archivo) { term.printErr("Uso: exfiltrar <archivo>  (ej: exfiltrar /data/crown.db)"); return; }
      const res = leer(engine.caso.fs, archivo);
      if (!res.ok) { term.printErr(res.error); return; }
      term.separator(`EXFILTRACIÓN — ${archivo}`);
      out(res.contenido, "t-out");
      out("", "t-out");
      out("✔ Copia transferida a tu maquina de trabajo.", "t-out-ok");
      engine.completar("exfiltracion", archivo);
    },

    escalar_priv(a) {
      const objetivo = (a || "").trim();
      if (!objetivo) { term.printErr("Uso: escalar_priv <objetivo>  (ej: escalar_priv www-data)"); return; }
      const c = engine.caso;
      const canon = (c.correctas.escalada || []).find((x) => x.slice(x.indexOf(":") + 1).toLowerCase() === objetivo.toLowerCase());
      if (!canon) {
        out(`escalar_priv: no hay vector de escalada evidente para '${objetivo}' en este sistema.`, "t-out-warn");
        return;
      }
      term.separator("ESCALADA DE PRIVILEGIOS");
      out("[+] id: uid=0(root) gid=0(root) groups=0(root)", "t-out-hi");
      out("[+] Has escalado a root. Acceso total al sistema.", "t-out");
      engine.completar("escalada", objetivo);
    },

    nc(a) {
      const m = /^(\S+)\s+(\d+)(?:\s*<\s*(\S+))?$/.exec((a || "").trim());
      if (!m) { term.printErr("Uso: nc <host> <puerto> [< <archivo>]  (ej: nc 10.10.10.100 4444 < /data/crown.db)"); return; }
      const [, host, puerto, archivo] = m;
      if (!archivo) {
        term.separator(`NETCAT — listener ${host}:${puerto}`);
        out("Conectado. Esperando datos... (usa: nc <host> <puerto> < <archivo>)", "t-out-dim");
        return;
      }
      const res = leer(engine.caso.fs, archivo);
      if (!res.ok) { term.printErr(res.error); return; }
      term.separator(`NETCAT — ${host}:${puerto}`);
      out(`[*] Transmitiendo ${archivo} (${res.contenido.length} bytes)`, "t-out");
      out("[*] Transferencia completada. Receptor confirma checksum.", "t-out-ok");
      engine.completar("exfiltracion", archivo);
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

    vssadmin(a) {
      const c = engine.caso;
      if (!c?.vss) { term.printWarn("No hay datos de copias de sombra para este caso."); return; }
      if (a && !/list/i.test(a)) { term.printErr("Uso: vssadmin list shadows"); return; }
      const v = c.vss;
      out("vssadmin 1.1 — Administrador de copias de sombra de volumen", "t-out");
      out("(c) Microsoft Corporation", "t-out-dim");
      term.separator("COPIA DE SOMBRA DEL VOLUMEN (VSS)");
      out(`Host: ${v.host || "n/d"}`, "t-out");
      out(`Estado: ${v.estado || "n/d"}`, String(v.estado || "").toLowerCase().includes("eliminad") ? "t-out-err" : "t-out");
      if (v.detalle) out(`Detalle: ${v.detalle}`, "t-out-warn");
      if (v.nota) { term.print(""); out(`Nota del analista: ${v.nota}`, "t-out-info"); }
    },

    pagar() {
      term.printWarn("✋ NO PAGAS EL RESCATE.");
      out("Pagar no garantiza recuperar nada: una parte importante de las víctimas que pagan nunca recibe el descifrador, y cada pago financia la siguiente campaña contra otra empresa — quizá la tuya.", "t-out");
      out("La recuperación sale de los backups limpios (offline/inalterables) y del plan de restauración. Decisión registrada: NO pagar.", "t-out-info");
    },

    pista() { engine.pista(); },

    preguntar(a) {
      const arg = String(a || "").trim();
      // Sin argumento → reconocimiento de voz del navegador
      if (!arg) { preguntarPorVoz(); return; }
      if (/^(off|cancelar|cancel|stop)$/i.test(arg)) { cancelarVoz(); return; }
      const texto = preguntarJimmy(arg, { caso: engine.caso, hecho: engine.hecho, modoRT: engine.modoRT, game: GAME });
      term.separator("🧠 JIMMY — PREGUNTA LIBRE");
      out(texto, "t-out");
    },
    jimmy: (a) => cmds.preguntar(a),
    voz: (a) => cmds.preguntar(a),

    reto() { ui.mostrarRetoDiario(); },
    ranking() {
      const ranking = filasRankingReto(GAME.estadisticas?.retoHistorial || []);
      term.separator("🏆 RANKING DE RETOS DIARIOS");
      if (!ranking.length) {
        out("Sin marcas todavía: completa el reto diario (`reto`) para estrenar el ranking.", "t-out-dim");
        return;
      }
      for (const m of ranking) {
        out(`${m.fecha} · ${m.titulo} · ${m.rating} · ${m.tiempo}`, "t-out");
      }
      out("Mejor marca por día · hasta 30 días. `reto` para jugar el de hoy.", "t-out-dim");
    },
    examen() { ui.mostrarExamen(); },
    habilidades() { ui.mostrarHabilidades(); },
    demo() { ui.mostrarPresentador(); },

    verificar_certificado(a) {
      const codigo = String(a || "").trim();
      if (!codigo) {
        term.printErr("Uso: verificar_certificado <código> — pega el código del certificado (CG-…).");
        return;
      }
      term.separator("🔍 JIMMY — VALIDACIÓN DE CERTIFICADO");
      const res = validarCertificado(codigo);
      if (!res.ok) {
        out("✖ Certificado NO válido: " + res.error, "t-out-warn");
        out("El código aparece al pie del PDF/PNG. Cópialo entero, sin espacios.", "t-out-dim");
        return;
      }
      const { nombre, fecha, rating, modo } = res.datos;
      const campana = modo === "rt" ? "RED TEAM (PENTEST OFENSIVO)" : "BLUE TEAM (SOC)";
      out("✔ Certificado auténtico. Datos firmados:", "t-out-hi");
      out(`  Titular: ${nombre}`, "t-out");
      out(`  Fecha:   ${fecha}`, "t-out");
      out(`  Nota:    ${rating} (${campana})`, "t-out");
      out("La firma SHA-256 coincide con el contenido: el certificado no ha sido alterado.", "t-out-dim");
    },

    sonido(a) {
      const arg = String(a || "").trim().toLowerCase();
      if (arg === "on") {
        fijarSonido(true);
        sonido.setActivado(true);
        out("🔊 Sonido activado.", "t-out-info");
      } else if (arg === "off") {
        fijarSonido(false);
        sonido.setActivado(false);
        out("🔇 Sonido silenciado.", "t-out-info");
      } else {
        out(`🔊 Sonido: ${sonidoActivado() ? "activado" : "silenciado"}. Usa 'sonido on' o 'sonido off'.`, "t-out-info");
      }
      ui.actualizarBotonSonido();
    },

    explicar(a) {
      const texto = explicarTutor(engine.caso, a);
      if (texto) {
        term.separator("📚 MODO TUTOR");
        out(texto, "t-out");
      }
    },
    tutor: (a) => cmds.explicar(a),

    bloquear(a) { engine.bloquear(a); },
    aislar(a) { engine.aislar(a); },
    deshabilitar(a) { engine.deshabilitar(a); },
    escalar() { engine.escalar(); },
    cerrar_caso(a) { engine.cerrarCaso(a); },
    informe() { engine.abrirInforme(); },

    estado() {
      const esRT = GAME.modo === "rt";
      const r = esRT ? estadoRangoRT() : estadoRango();
      const xp = esRT ? GAME.rtXp : GAME.xp;
      const resueltos = esRT ? GAME.rtCasosResueltos : GAME.casosResueltos;
      term.separator(`ESTADO DE ${GAME.nombre.toUpperCase()}`);
      out(`Campaña: ${esRT ? "RED TEAM (pentest ofensivo)" : "SOC (defensa)"}`, "t-out");
      out(`Rango: ${r.icono} ${r.nombre}`, "t-out");
      out(`XP: ${xp}  |  Puntos: ${GAME.puntos}`, "t-out");
      out(`Casos resueltos: ${resueltos}  |  Caso actual: ${GAME.casoActual || "ninguno"}`, "t-out");
      if (engine.caso) {
        out(`SLA restante: ${Math.max(0, engine.caso.sla - GAME.reloj)}s`, "t-out-info");
        out(`Objetivos cumplidos: ${engine.hecho.size}  |  Errores: ${engine.errores}  |  Pistas: ${engine.pistasUsadas}`, "t-out-info");
      }
    },

    carrera() { ui.mostrarCarrera(); },
    glosario() { ui.mostrarGlosario(); },
    h() { cmds.ayuda(""); },

    duelo() {
      if (engine.duelo) { term.printWarn("Ya hay un duelo en curso. Termínalo con 'salir_duelo' antes de abrir otro."); return; }
      ui.mostrarSelectorDuelo((escenario) => engine.iniciarDuelo(escenario));
    },
    salir_duelo() { engine.salirDuelo(); },

    history() {
      const h = term.historial.slice(-20);
      if (h.length === 0) { out("Historial vacío.", "t-out-dim"); return; }
      h.forEach((c, i) => out(`${String(i + 1).padStart(3, " ")}  ${c}`, "t-out-dim"));
    },

    salir() {
      out(GAME.modo === "rt" ? "El contrato de pentest no termina hasta entregar el informe." : "No puedes salir. El SOC no duerme.", "t-out-warn");
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
