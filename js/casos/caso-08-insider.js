// ============================================================
// Caso 08 — «La nómina que no cuadra» (Insider)
// Exfiltración de datos de RRHH por un empleado descontento:
// descarga masiva del share de nóminas, copia a USB y subida a
// una nube personal. Credenciales legítimas, horario anómalo.
// La lección: el insider ya tiene la llave; se gestiona distinto.
// ============================================================

export default {
  id: "insider-01",
  titulo: "«La nómina que no cuadra» — Insider: exfiltración de datos de RRHH",
  severidad: "ALTA",
  nivel: 4,
  sla: 900, // 15 minutos
  xp: 500,
  briefing:
    "El DLP ha disparado tres alertas seguidas: una descarga masiva de registros de nómina desde " +
    "el share de RRHH, una copia a un USB y una subida de archivos a un sitio de intercambio externo. " +
    "Todo desde el equipo de l.fuentes, empleada de RRHH, a las 3 de la madrugada.\n\n" +
    "Pregunta clave: ¿cuenta comprometida o insider? La respuesta cambia por completo la respuesta: " +
    "un atacante externo se bloquea y aísla; un insider se gestiona con RRHH y legal, preservando " +
    "evidencias. Investiga antes de actuar.",

  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-801",
          sev: "CRITICAL",
          fuente: "dlp",
          ts: "2026-02-15T03:12:44Z",
          titulo: "Descarga masiva de registros de nómina desde share de RRHH",
          detalle:
            "HOST-307 (l.fuentes) leyó 3.214 archivos de \\\\srv-hr-01\\nomina\\ en 52 minutos (02:20–03:12). Volumen 1,9 GB. El acceso normal de la cuenta es de 20-40 archivos al día, en horario laboral.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-802",
          sev: "HIGH",
          fuente: "dlp",
          ts: "2026-02-15T03:41:09Z",
          titulo: "Subida de archivos a sitio de intercambio externo",
          detalle:
            "HOST-307 sube 1,4 GB a upload.personal-stash.net mediante POST fragmentados desde el navegador. El dominio no está en la lista blanca de servicios aprobados.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-803",
          sev: "MEDIUM",
          fuente: "edr",
          ts: "2026-02-15T03:05:12Z",
          titulo: "Dispositivo USB insertado en HOST-307",
          detalle: "Unidad USB Kingston de 64 GB (serial KF-9C2A771) montada a las 03:05 y desmontada a las 03:38.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-804",
          sev: "MEDIUM",
          fuente: "siem",
          ts: "2026-02-15T02:20:03Z",
          titulo: "Acceso a share de RRHH fuera de horario",
          detalle: "Sesión de l.fuentes iniciada a las 02:18 (la cuenta nunca había iniciado sesión antes de las 07:45 en 14 meses).",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/var/log/hr-share.log": [
      "Feb 15 02:20:14 srv-hr-01 smbd[22104]: connect to service nomina from 10.0.4.307 (HOST-307)",
      "Feb 15 02:20:41 srv-hr-01 smbd[22105]: read nomina\\nomina_Q1_2026.xlsx (l.fuentes)",
      "Feb 15 02:21:09 srv-hr-01 smbd[22106]: read nomina\\nomina_Q1_2026.xlsx (l.fuentes)",
      "Feb 15 02:21:37 srv-hr-01 smbd[22107]: read nomina\\nomina_Q2_2026.xlsx (l.fuentes)",
      "Feb 15 02:22:02 srv-hr-01 smbd[22108]: read nomina\\nomina_Q2_2026.xlsx (l.fuentes)",
      "Feb 15 02:22:30 srv-hr-01 smbd[22109]: read nomina\\complementos_2026.xlsx (l.fuentes)",
      "Feb 15 02:23:04 srv-hr-01 smbd[22110]: read nomina\\bajas_2026.xlsx (l.fuentes)",
      "Feb 15 03:10:58 srv-hr-01 smbd[22111]: read nomina\\proyecto_expansion\\salarios_directivos.xlsx (l.fuentes)",
      "Feb 15 03:11:29 srv-hr-01 smbd[22112]: read nomina\\proyecto_expansion\\paquetes_acciones.xlsx (l.fuentes)",
      "Feb 15 03:12:31 srv-hr-01 smbd[22113]: disconnect from 10.0.4.307 (HOST-307)",
    ].join("\n"),

    "/var/log/usb.log": [
      "Feb 15 03:05:12 HOST-307 kernel: usb 1-3: new high-speed USB device using xhci_hcd",
      "Feb 15 03:05:13 HOST-307 kernel: usb 1-3: Manufacturer: Kingston, Product: DataTraveler, SerialNumber: KF-9C2A771",
      "Feb 15 03:05:15 HOST-307 kernel: sd 2:0:0:0: [sdb] 125045424 512-byte logical blocks: (64.0 GB)",
      "Feb 15 03:05:20 HOST-307 systemd[1]: Mounted /media/lfuentes/KINGSTON",
      "Feb 15 03:38:41 HOST-307 kernel: usb 1-3: USB disconnect, device number 7",
    ].join("\n"),

    "/var/log/proxy.log": [
      "Feb 15 03:18:02 squid[1044]: 10.0.4.307 - POST http://upload.personal-stash.net/upload - TCP_MISS/200 text/html [1.2 MB]",
      "Feb 15 03:21:47 squid[1044]: 10.0.4.307 - POST http://upload.personal-stash.net/upload - TCP_MISS/200 text/html [1.1 MB]",
      "Feb 15 03:24:19 squid[1044]: 10.0.4.307 - POST http://upload.personal-stash.net/upload - TCP_MISS/200 text/html [986 KB]",
      "Feb 15 03:27:52 squid[1044]: 10.0.4.307 - POST http://upload.personal-stash.net/upload - TCP_MISS/200 text/html [1.3 MB]",
      "Feb 15 03:41:09 squid[1044]: 10.0.4.307 - POST http://upload.personal-stash.net/upload - TCP_MISS/200 text/html [0.9 MB]",
    ].join("\n"),

    "/var/log/vpn.log": [
      "Feb 15 02:18:03 vpn01 openvpn[7311]: l.fuentes/10.0.4.307: session established (office — sin VPN, red interna)",
      "Feb 15 02:18:05 vpn01 openvpn[7311]: peer info: IV_HWADDR=00:1A:2B:3C:4D:5E (equipo corporativo HOST-307)",
      "Feb 15 02:18:06 vpn01 openvpn[7311]: auth: LDAP ok (l.fuentes) — segundo factor: PASS (MFA válido)",
      "Nota: la sesión usa el equipo corporativo y las credenciales legítimas de la empleada.",
      "Nada de esto es un atacante externo: es alguien con acceso autorizado usándolo mal.",
    ].join("\n"),

    "/opt/rrhh/nota-evaluacion.txt":
      "CONFIDENCIAL — Evaluación de desempeño 2026-01 (l.fuentes, RRHH).\n" +
      "  - Candidatura al puesto de Supervisor de RRHH: DENEGADA (2026-01-19).\n" +
      "  - Motivo: perfil técnico insuficiente para el rol; se ofreció plan de formación.\n" +
      "  - Registro de quejas del empleado por el resultado en 2 ocasiones (enero-febrero).\n" +
      "  - Entrevista de salida PROGRAMADA: 2026-03-02 (en 2 semanas).\n" +
      "  - Accesos a nomina\\ y personal: rol con permisos amplios por antigüedad (12 años).\n" +
      "  - Nota del responsable: revisar permisos del rol antes de la salida (pendiente).\n" +
      "  - CUSTODIA: este documento NO debe salir de RRHH.",

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-5502 — posible insider en RRHH (l.fuentes).\n" +
      "Fuentes: /opt/siem/alerts.json, /var/log/hr-share.log, /var/log/usb.log,\n" +
      "         /var/log/proxy.log, /var/log/vpn.log, /opt/rrhh/nota-evaluacion.txt\n" +
      "Pregunta a responder: ¿cuenta comprometida o uso malintencionado legítimo?\n" +
      "Investiga con: cat, grep, tail, whois, dig, curl, vt",
  },

  correos: [
    {
      id: 1,
      de: "rrhh@cibercorp.com",
      para: "l.fuentes@cibercorp.com",
      asunto: "Tu candidatura al puesto de Supervisor de RRHH",
      fecha: "19 Ene 2026 11:02",
      estado: "LEÍDO",
      adjunto: "ninguno",
      cuerpo: [
        "Hola Laura,",
        "",
        "Gracias por tu interés y por el tiempo dedicado al proceso. Tras evaluar todas las",
        "candidaturas, hemos decidido asignar el puesto a otra persona. Valoramos mucho tu",
        "trayectoria y te ofrecemos un plan de formación para futuras oportunidades.",
        "",
        "Si quieres comentarlo, tu responsable está disponible esta semana.",
        "",
        "Un saludo,",
        "Dirección de RRHH — CiberCorp",
      ].join("\n"),
    },
    {
      id: 2,
      de: "newsletter@amazon.es",
      para: "l.fuentes@cibercorp.com",
      asunto: "Tus novedades de esta semana",
      fecha: "14 Feb 2026 18:12",
      estado: "NO LEÍDO",
      adjunto: "ninguno",
      cuerpo: "Boletín de novedades de Amazon.es. Puedes darte de baja en el enlace del pie.",
    },
  ],

  alertas: [
    { id: "ALT-801", sev: "CRITICAL", fuente: "dlp", titulo: "Descarga masiva de registros de nómina desde share de RRHH" },
    { id: "ALT-802", sev: "HIGH", fuente: "dlp", titulo: "Subida de archivos a sitio de intercambio externo" },
    { id: "ALT-803", sev: "MEDIUM", fuente: "edr", titulo: "Dispositivo USB insertado en HOST-307" },
    { id: "ALT-804", sev: "MEDIUM", fuente: "siem", titulo: "Acceso a share de RRHH fuera de horario" },
  ],

  dominios: {
    "upload.personal-stash.net": {
      ip: "45.144.33.10",
      registrado: "Hace 8 meses",
      registrador: "Njal.la (anonimizador)",
      whois: [
        "Domain: upload.personal-stash.net",
        "Registrar: Njal.la (anonimizador) - titular oculto",
        "Registered: hace 8 meses",
        "IP actual: 45.144.33.10",
        "ASN: AS9009 - proveedor de almacenamiento de bajo coste",
        "Nota: servicio de intercambio de archivos ANÓNIMO, sin cifrado ni registro.",
        "No está en la lista blanca de servicios aprobados de CiberCorp.",
      ].join("\n"),
      vt: {
        repos: 17,
        maliciosos: 2,
        deteccion: "SOSPECHOSO (2/17)",
        comentarios: "Servicio legítimo de intercambio anónimo, pero usado habitualmente para exfiltrar datos sin dejar rastro.",
      },
    },
    "dropbox.com": {
      ip: "162.125.5.18",
      registrado: "Hace 17 años",
      registrador: "MarkMonitor Inc.",
      whoi: "Servicio de almacenamiento legítimo y aprobado por CiberCorp. Nada sospechoso aquí.",
      vt: { repos: 88, maliciosos: 0, deteccion: "LIMPIO (0/88)" },
    },
  },

  ips: {
    "45.144.33.10": {
      pais: "🇷🇴 Rumanía (hosting barato)",
      asn: "AS9009",
      reputacion: "SOSPECHOSA — hosting de bajo coste, listada en 3 blacklists. Usada por servicios de intercambio anónimo.",
      whois: "Infraestructura de almacenamiento anónimo. Sin registrante real.",
    },
    "10.0.4.77": {
      pais: "🏢 Red interna",
      asn: "Interno",
      reputacion: "srv-hr-01 — servidor de RRHH con las nóminas. El share NO está comprometido: lo está quien lo lee.",
    },
    "10.0.4.307": {
      pais: "🏢 Red interna",
      asn: "Interno",
      reputacion: "HOST-307 — estación de trabajo de l.fuentes (RRHH). Equipo corporativo.",
    },
  },

  urls: {
    "http://upload.personal-stash.net/upload":
      "HTTP/1.1 200 OK — formulario de subida sin autenticación ni registro. El sitio entrega una URL de descarga anónima a cualquiera.",
  },

  correctas: {
    bloquear: ["dominio:upload.personal-stash.net", "ip:45.144.33.10"],
    aislar: ["host:HOST-307"],
    deshabilitar: ["usuario:l.fuentes"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:dropbox.com",
    "aislar|host:srv-hr-01",
    "deshabilitar|usuario:m.garcia",
    "deshabilitar|usuario:l.ortiz",
  ],

  eventos: [
    {
      en: 240,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Copia masiva a dispositivo USB",
      detalle: "EDR confirma la copia de 1,2 GB a KINGSTON (KF-9C2A771) entre 03:05 y 03:38. La unidad ya no está conectada.",
    },
    {
      en: 480,
      tipo: "msg",
      titulo: "Responsable de RRHH",
      detalle: "«l.fuentes está al corriente de la denegación del ascenso desde enero y tiene la entrevista de salida en dos semanas. Pidamos valoración de riesgo ANTES de que se vaya.»",
    },
  ],

  pistas: [
    "Las alertas DLP (`alertas`) ya cuentan la historia: descarga masiva, USB y subida externa. ¿Qué falta por saber?",
    "¿Cuenta comprometida o insider? Compara VPN/horario/volumen/destino: revisa /var/log/vpn.log y la nota de RRHH.",
    "El destino es un servicio de intercambio anónimo. `whois upload.personal-stash.net` y `vt` lo confirman: no está aprobado.",
    "Responde: bloquea el dominio/IP, aísla el equipo (sin apagar: evidencias), deshabilita la cuenta y ESCALA a RRHH/legal. No es un atacante externo.",
  ],

  leccion: {
    titulo: "Insider: el atacante ya tiene llave",
    mitre: ["T1078", "T1039", "T1052.001", "T1567.002", "T1005"],
    resumen:
      "l.fuentes, empleada de RRHH con 12 años de antigüedad y permisos amplios, descargó 3.214 archivos de nómina (1,9 GB) a las 3 de la madrugada " +
      "con sus credenciales legítimas, los copió a un USB y los subió a un servicio de intercambio anónimo. El detonante probable: la denegación del " +
      "ascenso en enero y la entrevista de salida en dos semanas. No había malware, ni fuerza bruta, ni IP externa: la amenaza estaba dentro y tenía llave.",
    deteccion:
      "- DLP: volumen de descarga 100x superior al baseline de la cuenta, fuera de horario.\\n" +
      "- USB insertado de madrugada en un equipo con acceso a datos sensibles.\\n" +
      "- Subida a servicios externos NO aprobados (upload.personal-stash.net).\\n" +
      "- Contexto humano (UEBA): denegación de ascenso + entrevista de salida próxima.\\n" +
      "- La autenticación es correcta (MFA, equipo corporativo): eso descarta al atacante externo y apunta al insider.",
    respuesta:
      "1. Bloquear el dominio y la IP del servicio externo en el proxy/firewall (cortar la exfiltración activa).\\n" +
      "2. Aislar el equipo SIN apagarlo: conserva las evidencias (logs, USB, descargas) con cadena de custodia.\\n" +
      "3. Deshabilitar la cuenta y revocar accesos (share de RRHH, VPN, correo) coordinado con RRHH/legal.\\n" +
      "4. NOTA CRÍTICA: un insider no se confronta sin legal — riesgo de destrucción de evidencias o represalias.\\n" +
      "5. Revisar permisos del rol: mínimo privilegio y segregación de funciones en datos de RRHH.\\n" +
      "6. Valorar obligaciones legales (RGPD: brecha de datos personales — notificar en 72 h).",
    aprendizaje: [
      "El insider no necesita malware: usa sus propias credenciales. La detección depende de DLP + UEBA (volumen, horario, destino).",
      "Autenticación correcta NO significa incidente falso: significa que la pregunta es '¿quién y por qué?', no '¿cómo entró?'.",
      "Datos de RRHH/nóminas son crown jewels: mínimo privilegio, revisión periódica de permisos y registro de accesos.",
      "En insiders, la gestión de la respuesta es de RRHH/legal: preservar evidencias antes que confrontar.",
      "Los servicios de intercambio anónimo son el destino favorito de la exfiltración: bloqueados por defecto, aprobados por excepción.",
    ],
    glosario: ["Insider", "DLP", "UEBA", "Cadena de custodia", "Mínimo privilegio", "Exfiltración", "RGPD", "Baseline"],
  },
};
