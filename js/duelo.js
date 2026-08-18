// ============================================================
// duelo.js — Modo enfrentamiento SOC vs RED TEAM
// Dos jugadores comparten un mismo escenario y juegan TURNOS
// ALTERNOS: el ROJO ataca con su kit ofensivo (nmap, hydra,
// sqlmap, mimikatz...) y el AZUL defiende (bloquear, aislar,
// deshabilitar, escalar...). Cada acierto puntúa y cambia el
// turno; un intento fallido también cuesta el turno (en un
// duelo real no hay segunda oportunidad). Gana el bando que
// complete TODOS sus objetivos primero; si se agotan los
// turnos, decide el que más objetivos tenga (y desempata por
// puntos).
//
// Módulo puro y determinista: crearDuelo/accionDuelo/
// turnoFallido/finalDuelo deciden SIN efectos secundarios
// (los Set/objetos se clonan), testeable en Node. El motor
// (engine.js) hace los efectos: ejecutar el comando real,
// renderizar el HUD y escribir en el terminal.
// ============================================================

// Comandos de ACCIÓN de cada bando (los que puntúan y consumen turno).
// Todo lo demás son comandos informativos (ls, cat, ayuda...) que no
// consumen el turno: en un duelo también hay que poder investigar.
export const KITS = {
  rojo: [
    "nmap", "gobuster", "nikto", "searchsploit", "hydra", "ssh", "sqlmap",
    "msf", "msfconsole", "mimikatz", "john", "hashcat", "nc", "exfiltrar",
    "escalar_priv",
  ],
  azul: ["bloquear", "aislar", "deshabilitar", "escalar", "cerrar_caso", "vssadmin", "pagar", "vt"],
};

// Comandos que NO consumen turno (investigación / interfaz)
export const INFO_CMDS = [
  "ayuda", "ver_caso", "mail", "alertas", "siem", "ls", "cat", "head", "tail",
  "grep", "wc", "less", "find", "strings", "file", "md5sum", "sha256sum",
  "decode", "base64", "whois", "dig", "host", "nslookup", "curl", "explicar",
  "preguntar", "jimmy", "voz", "estado", "glosario", "whoami", "date", "echo",
  "sonido", "piper", "salir_duelo", "porque_cybergrad",
];

// Comandos de la interfaz NO disponibles durante un duelo (cambiarían de
// modo a mitad de partida): se avisan sin consumir el turno.
export const FUERA_DUELO = [
  "reto", "examen", "tutorial", "demo", "duelo", "carrera", "ranking",
  "habilidades", "certificado", "pista",
];

// Clave de `hecho` del motor → tipo de objetivo.
//  - Azul: "bloquear:dominio:x" → "bloquear"; literal "escalar"/"cerrar".
//  - Rojo: "objetivo:recon:host:x" → "recon".
export function tipoDeClave(clave) {
  if (clave === "escalar" || clave === "cerrar") return clave;
  const m = /^objetivo:([^:]+):/.exec(clave);
  if (m) return m[1];
  const m2 = /^([a-z_]+):/.exec(clave);
  return m2 ? m2[1] : null;
}

// Tipo de objetivo → bando que lo puntúa
export function ladoDeTipo(tipo) {
  return { bloquear: "azul", aislar: "azul", deshabilitar: "azul", escalar: "azul", cerrar: "azul" }[tipo] ||
    { recon: "rojo", acceso: "rojo", escalada: "rojo", exfiltracion: "rojo" }[tipo] || null;
}

// ---------- Escenarios del duelo ----------
// Cada escenario define el ENTORNO (red, web, credenciales, fs) que
// consumen los comandos reales, y los OBJETIVOS de cada bando como
// { tipo, canon, etiqueta }. `canon` es el valor tal y como lo busca el
// motor en caso.correctas (p. ej. "host:10.10.10.30" o "dominio:c2.cibercorp.net").
export const DUELO_ESCENARIOS = [
  {
    id: "duelo-01-vpn",
    titulo: "Brecha en la VPN corporativa",
    descripcion:
      "Un empleado trajo un portátil infectado y el atacante ya tiene presencia en la red. " +
      "El ROJO juega al intruso: descubrir el servidor web, robar credenciales, saltar al " +
      "controlador de dominio. El AZUL juega al SOC: aislar el foco, cortar el C2, " +
      "deshabilitar la cuenta comprometida y escalar a CSIRT. Turnos alternos, sin prórroga.",
    turnosMax: 16,
    escenario: "El portátil de m.garcia (HOST-104) está infectado y el dominio c2.cibercorp.net " +
      "habla con el exterior cada 5 minutos. En la red hay un servidor web (10.10.10.30) " +
      "con SSH y un controlador de dominio Windows (10.10.10.60).",
    red: {
      hosts: {
        "10.10.10.30": {
          hostname: "web-vpn.cibercorp.local",
          os: "Linux Debian 12",
          puertos: "22/tcp open ssh   OpenSSH 9.2p1\n80/tcp open http  nginx 1.24.0",
        },
        "10.10.10.60": {
          hostname: "dc-01.cibercorp.local",
          os: "Windows Server 2022",
          puertos: "445/tcp open smb  Windows 10.0.20348\n3389/tcp open rdp",
        },
      },
      subredes: {
        "10.10.10.0/24": {
          desc: "Red corporativa (DMZ + dominio)",
          activos: ["10.10.10.30", "10.10.10.60"],
        },
      },
    },
    credenciales: [
      {
        servicio: "ssh",
        host: "10.10.10.30",
        usuario: "admin",
        password: "Verano2024!",
        wordlist: "/opt/wordlists/top1000.txt",
        nota: "Cuenta admin del web con password predecible (sin bloqueo por intentos).",
      },
    ],
    mimikatz: {
      host: "10.10.10.60",
      creds: [
        "Authentication Id : 0;123456 (00000000:0001e240)",
        "Session           : Interactive from 10.10.10.30",
        "User Name         : Administrator",
        "Domain            : CiberCorp",
        "Password          : DcAdmin#2024",
      ],
      nota: "El admin del DC tiene la sesión abierta desde el host comprometido.",
    },
    hashes: {
      "c4ca4238a0b923820dcc509a6f75849b": {
        nombre: "hash admin (web-vpn)",
        tipo: "MD5",
        password: "password123",
        vt: { repos: 62, maliciosos: 0, deteccion: "LIMPIO", familia: "", comentarios: "Hash de diccionario (muy común)." },
      },
    },
    // Los comandos (cat/hydra/grep...) hacen .split("\n") sobre el contenido:
    // los archivos se guardan como STRING unido, como hace rt-02-hydra.
    fs: {
      "/opt/wordlists/": ["top1000.txt"],
      "/opt/wordlists/top1000.txt": [
        "password", "123456", "admin", "cibercorp", "Verano2024!", "Admin#2024$",
        "Passw0rd!2024", "clave123", "root", "qwerty", "letmein", "iloveyou",
      ].join("\n"),
      "/home/admin/": ["credenciales.txt"],
      "/home/admin/credenciales.txt": [
        "=== CREDENCIALES (¡no subir a git!) ===",
        "DC-01: Administrator / DcAdmin#2024  (sesión activa en 10.10.10.30)",
        "vpn: m.garcia / VPN-2024-rojo",
        "TODO: rotar passwords — pendiente desde 2022",
      ].join("\n"),
    },
    rojo: {
      nombre: "RED TEAM",
      kit: KITS.rojo,
      objetivos: [
        { tipo: "recon", canon: "host:10.10.10.30", etiqueta: "Escaneo del servidor web (nmap)" },
        { tipo: "acceso", canon: "host:10.10.10.30", etiqueta: "Acceso por fuerza bruta SSH (hydra)" },
        { tipo: "exfiltracion", canon: "archivo:/home/admin/credenciales.txt", etiqueta: "Exfiltrar credenciales del admin" },
        { tipo: "escalada", canon: "host:10.10.10.60", etiqueta: "Credenciales del DC (mimikatz)" },
      ],
    },
    azul: {
      nombre: "SOC",
      kit: KITS.azul,
      objetivos: [
        { tipo: "aislar", canon: "host:HOST-104", etiqueta: "Aislar el portátil infectado" },
        { tipo: "bloquear", canon: "dominio:c2.cibercorp.net", etiqueta: "Bloquear el C2 (c2.cibercorp.net)" },
        { tipo: "deshabilitar", canon: "usuario:m.garcia", etiqueta: "Deshabilitar la cuenta comprometida" },
        { tipo: "escalar", canon: "escalar", etiqueta: "Escalar el incidente a CSIRT" },
      ],
    },
  },
  {
    id: "duelo-02-tienda",
    titulo: "La tienda web a la vista",
    descripcion:
      "La tienda pública (10.10.10.50) tiene nginx viejo, subida de archivos sin control y " +
      "una base de datos con datos de clientes. El ROJO juega al pentester autorizado por " +
      "contrato: romper la tienda y robar la base. El AZUL juega al SOC que ve el ataque en " +
      "directo: bloquear la IP del escáner, aislar el servidor web, cerrar el vector de subida " +
      "y escalar. Turnos alternos.",
    turnosMax: 16,
    escenario: "El SIEM muestra escaneos contra la tienda (10.10.10.50) desde 196.245.143.9. " +
      "El servidor tiene un /upload sin autenticación y el proceso corre como www-data.",
    red: {
      hosts: {
        "10.10.10.50": {
          hostname: "tienda.cibercorp.local",
          os: "Ubuntu 22.04",
          puertos: "80/tcp open http  nginx 1.24.0\n443/tcp open https",
        },
      },
      subredes: {
        "10.10.10.0/24": {
          desc: "Zona DMZ (tienda pública)",
          activos: ["10.10.10.50"],
        },
      },
    },
    web: {
      "http://10.10.10.50": {
        dirs: ["/upload", "/admin", "/backup", "/api"],
        nikto: [
          "Server: nginx 1.24.0 (outdated)",
          "/upload: permite subida de archivos sin autenticación",
          "/admin: panel de administración sin protección de fuerza bruta",
        ],
      },
    },
    exploits: {
      "php-upload-rce": {
        objetivo: "http://10.10.10.50/upload",
        resultado: "[+] Subido webshell.php → RCE como www-data\n[+] Sesión de meterpreter abierta: tienda.cibercorp.local",
      },
    },
    hashes: {
      "e10adc3949ba59abbe56e057f20f883e": {
        nombre: "hash admin (tienda)",
        tipo: "MD5",
        password: "123456",
        vt: { repos: 62, maliciosos: 0, deteccion: "LIMPIO", familia: "", comentarios: "Hash de diccionario (muy común)." },
      },
    },
    fs: {
      "/data/": ["crown.db"],
      "/data/crown.db": [
        "=== BASE DE DATOS DE CLIENTES (crown.db) ===",
        "id | nombre        | email                | tarjeta",
        "1  | Ana Torres    | a.torres@cibercorp.local | **** 4242",
        "2  | Luis Romero   | l.romero@cibercorp.local | **** 1187",
        "3  | Carmen Ibáñez | c.ibanez@cibercorp.local | **** 9034",
        "(12.483 filas más — datos personales de clientes)",
      ].join("\n"),
      "/tmp/": ["hash.txt"],
      "/tmp/hash.txt": "e10adc3949ba59abbe56e057f20f883e",
    },
    rojo: {
      nombre: "RED TEAM",
      kit: KITS.rojo,
      objetivos: [
        { tipo: "recon", canon: "host:10.10.10.50", etiqueta: "Escaneo de la tienda (nmap)" },
        { tipo: "acceso", canon: "http://10.10.10.50/upload", etiqueta: "RCE por subida de archivos (msf)" },
        { tipo: "escalada", canon: "usuario:www-data", etiqueta: "Escalar a root (escalar_priv)" },
        { tipo: "exfiltracion", canon: "archivo:/data/crown.db", etiqueta: "Exfiltrar la base de clientes" },
      ],
    },
    azul: {
      nombre: "SOC",
      kit: KITS.azul,
      objetivos: [
        { tipo: "bloquear", canon: "ip:196.245.143.9", etiqueta: "Bloquear la IP del atacante" },
        { tipo: "aislar", canon: "host:HOST-207", etiqueta: "Aislar el servidor web (HOST-207)" },
        { tipo: "bloquear", canon: "url:http://10.10.10.50/upload", etiqueta: "Bloquear el vector /upload" },
        { tipo: "escalar", canon: "escalar", etiqueta: "Escalar el incidente a CSIRT" },
      ],
    },
  },
];

const PUNTOS_OBJETIVO = 25;

// ---------- Estado puro del duelo ----------
export function crearDuelo(escenario) {
  return {
    escenario,
    turno: "rojo",          // "rojo" | "azul"
    turnos: 0,              // turnos jugados (cada jugada consume 1)
    puntos: { rojo: 0, azul: 0 },
    hecho: { rojo: new Set(), azul: new Set() }, // canons completados
    historial: [],          // [{bando, tipo, canon, puntos, ok}]
    fin: null,
  };
}

const clonar = (d) => ({
  ...d,
  puntos: { ...d.puntos },
  hecho: { rojo: new Set(d.hecho.rojo), azul: new Set(d.hecho.azul) },
  historial: [...d.historial],
});

// Identidad de un objetivo: `tipo|canon` (dos objetivos pueden compartir
// canon, p. ej. recon y acceso sobre el mismo host, pero nunca el mismo tipo).
const claveObjetivo = (o) => `${o.tipo}|${o.canon}`;

function ladoDeEscenario(estado, lado) {
  return estado.escenario[lado];
}

// ¿El (tipo, canon) es un objetivo real del bando activo? Devuelve el objetivo o null
function objetivoDelBando(estado, lado, tipo, canon) {
  const esc = ladoDeEscenario(estado, lado);
  return esc.objetivos.find((o) => o.tipo === tipo && o.canon === canon) || null;
}

// Jugada con acierto: marca el objetivo del bando activo, suma puntos y
// cambia de turno. `tipo`/`canon` vienen del `hecho` del motor tras ejecutar
// el comando (ver tipoDeClave). Si el objetivo no es del bando activo, la
// jugada se cuenta como fallida (no debería pasar: el kit lo impide).
export function accionDuelo(estado, tipo, canon) {
  const d = clonar(estado);
  const lado = d.turno;
  const obj = objetivoDelBando(d, lado, tipo, canon);
  if (!obj) return turnoFallido(d);
  const k = claveObjetivo(obj);
  if (!d.hecho[lado].has(k)) {
    d.hecho[lado].add(k);
    d.puntos[lado] += PUNTOS_OBJETIVO;
  }
  d.historial.push({ bando: lado, tipo, canon, puntos: PUNTOS_OBJETIVO, ok: true });
  d.turnos++;
  d.turno = lado === "rojo" ? "azul" : "rojo";
  d.fin = finalDuelo(d);
  return d;
}

// Intento fallido (comando del kit que no logró nada): cambia el turno sin puntos
export function turnoFallido(estado) {
  const d = clonar(estado);
  d.historial.push({ bando: d.turno, tipo: null, canon: null, puntos: 0, ok: false });
  d.turnos++;
  d.turno = d.turno === "rojo" ? "azul" : "rojo";
  d.fin = finalDuelo(d);
  return d;
}

// ¿Terminó el duelo? Devuelve null o { ganador: "rojo"|"azul"|"empate", motivo }
export function finalDuelo(estado) {
  const esc = estado.escenario;
  const rojoCompleto = estado.hecho.rojo.size >= esc.rojo.objetivos.length;
  const azulCompleto = estado.hecho.azul.size >= esc.azul.objetivos.length;
  if (rojoCompleto && azulCompleto) {
    return estado.puntos.rojo > estado.puntos.azul
      ? { ganador: "rojo", motivo: "Ambos completaron objetivos; el ROJO suma más puntos." }
      : estado.puntos.azul > estado.puntos.rojo
        ? { ganador: "azul", motivo: "Ambos completaron objetivos; el AZUL suma más puntos." }
        : { ganador: "empate", motivo: "Ambos completaron todos sus objetivos con los mismos puntos." };
  }
  if (rojoCompleto) return { ganador: "rojo", motivo: "Completó todos sus objetivos antes que el SOC." };
  if (azulCompleto) return { ganador: "azul", motivo: "Contuvo el incidente completando todos sus objetivos." };

  if (estado.turnos >= esc.turnosMax) {
    const r = estado.hecho.rojo.size;
    const a = estado.hecho.azul.size;
    if (r > a) return { ganador: "rojo", motivo: `Más objetivos al agotarse los turnos (${r} vs ${a}).` };
    if (a > r) return { ganador: "azul", motivo: `Más objetivos al agotarse los turnos (${a} vs ${r}).` };
    return estado.puntos.rojo > estado.puntos.azul
      ? { ganador: "rojo", motivo: "Empate a objetivos; gana el ROJO por puntos." }
      : estado.puntos.azul > estado.puntos.rojo
        ? { ganador: "azul", motivo: "Empate a objetivos; gana el AZUL por puntos." }
        : { ganador: "empate", motivo: "Se agotaron los turnos con empate total." };
  }
  return null;
}

// ---------- Caso sintetizado para el motor ----------
// El motor evalúa los comandos reales contra `caso.correctas` y los datos
// de entorno. Unimos los objetivos de ambos bandos en un único caso para
// que `bloquear`/`aislar`/`nmap`/`hydra`... funcionen sin tocarlos.
export function construirCasoDuelo(escenario) {
  const correctas = { escalar: true };
  const objetivosPorLado = {};
  for (const lado of ["rojo", "azul"]) {
    objetivosPorLado[lado] = escenario[lado].objetivos;
    for (const o of escenario[lado].objetivos) {
      if (o.tipo === "escalar") { correctas.escalar = true; continue; }
      if (!correctas[o.tipo]) correctas[o.tipo] = [];
      if (!correctas[o.tipo].includes(o.canon)) correctas[o.tipo].push(o.canon);
    }
  }
  return {
    id: escenario.id,
    modo: "duelo",
    titulo: "DUELO · " + escenario.titulo,
    severidad: "ALTA",
    nivel: 2,
    xp: 0,
    sla: 1800,
    briefing: escenario.descripcion + "\n\n" + escenario.escenario,
    dueloEscenario: escenario,
    dueloObjetivos: objetivosPorLado,
    red: escenario.red,
    credenciales: escenario.credenciales || [],
    web: escenario.web || {},
    exploits: escenario.exploits || {},
    mimikatz: escenario.mimikatz || null,
    sqli: escenario.sqli || null,
    hashes: escenario.hashes || {},
    vss: escenario.vss || null,
    fs: escenario.fs || {},
    correctas,
    incorrectas: [],
    pistas: [],
  };
}
