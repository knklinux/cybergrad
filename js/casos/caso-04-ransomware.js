import { edrRansomware, notaRescate } from "./helpers.js";

export default {
  id: "ransomware-01",
  titulo: "«LockCrypt» — Ransomware en progreso",
  severidad: "CRÍTICA",
  nivel: 2,
  sla: 840, // 14 minutos
  xp: 420,
  briefing:
    "El EDR acaba de notificar comportamiento de ransomware en dos estaciones de trabajo. " +
    "Los archivos se están renombrando con extensión .lcrypt y los eventos siguen llegando.\n\n" +
    "Prioridad: CONTENER cuanto antes para limitar el cifrado. Luego investiga el alcance " +
    "y prepara el informe. El reloj corre: cada minuto son más archivos cifrados.",

  fs: {
    "/var/log/edr/endpoint-events.json": edrRansomware(["HOST-201", "HOST-202"]),

    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-501",
          sev: "CRITICAL",
          fuente: "edr",
          ts: "2026-02-11T03:41:10Z",
          titulo: "Comportamiento de ransomware detectado (LockCrypt)",
          detalle:
            "HOST-201: svch0st.exe en C:\\Windows\\Temp cifrando archivos (.lcrypt). Intento de borrado de copias de sombra (vssadmin).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-502",
          sev: "CRITICAL",
          fuente: "edr",
          ts: "2026-02-11T03:44:35Z",
          titulo: "Segundo host afectado",
          detalle: "HOST-202 muestra los mismos indicadores: proceso svch0st.exe + extensión .lcrypt.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-503",
          sev: "HIGH",
          fuente: "firewall",
          ts: "2026-02-11T03:46:02Z",
          titulo: "Comunicación con C2 sospechoso",
          detalle: "Tráfico saliente desde HOST-201/HOST-202 hacia 91.240.118.77:443 (dominio kraken-update.top).",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/var/log/dns.log": [
      "Feb 11 03:38:12 dns01 queries: client 10.0.4.201#53000: query: kraken-update.top IN A",
      "Feb 11 03:38:13 dns01 queries: client 10.0.4.201#53000: query: kraken-update.top IN A",
      "Feb 11 03:39:47 dns01 queries: client 10.0.4.202#53000: query: kraken-update.top IN A",
      "Feb 11 03:41:02 dns01 queries: client 10.0.4.201#53000: query: kraken-update.top IN A",
      "Feb 11 03:41:03 dns01 queries: client 10.0.4.202#53000: query: kraken-update.top IN A",
      "Feb 11 03:42:55 dns01 queries: client 10.0.4.201#53000: query: kraken-update.top IN A",
    ].join("\n"),

    "/var/log/firewall.log": [
      "Feb 11 03:38:21 fw01 drop out: 10.0.4.201:49152 -> 91.240.118.77:443 TCP ALLOWED (rule: proxy-out)",
      "Feb 11 03:39:55 fw01 drop out: 10.0.4.202:49162 -> 91.240.118.77:443 TCP ALLOWED (rule: proxy-out)",
      "Feb 11 03:41:10 fw01 drop out: 10.0.4.201:49180 -> 91.240.118.77:443 TCP ALLOWED (rule: proxy-out)",
      "Feb 11 03:44:35 fw01 drop out: 10.0.4.202:49201 -> 91.240.118.77:443 TCP ALLOWED (rule: proxy-out)",
    ].join("\n"),

    "/home/analista/casos/evidencias/README_LOCKCRYPT.txt": notaRescate(),

    "/var/log/edr/process-tree.txt": [
      "HOST-201 (10.0.4.201)",
      "  03:36:02  WINWORD.EXE (m.ruiz)  <- abrió 'factura_urgente.docx' recibido por correo",
      "  03:36:20    └─ powershell.exe -enc <ofuscado>",
      "  03:36:41      └─ cmd.exe /c copy \\\\dc01\\public\\svch0st.exe C:\\Windows\\Temp\\",
      "  03:36:52        └─ svch0st.exe (beaconing a kraken-update.top)",
      "  03:37:30          └─ vssadmin.exe delete shadows /all /quiet",
      "  03:38:00          └─ cifrado de archivos: C:\\Users\\m.ruiz\\*.lcrypt",
      "",
      "HOST-202 (10.0.4.202)",
      "  03:43:20  m.ruiz intenta abrir recurso compartido en HOST-202 (movimiento lateral)",
    ].join("\n"),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-2044 — ransomware LockCrypt.\n" +
      "Evidencias: endpoint-events.json, process-tree.txt, README_LOCKCRYPT.txt",
  },

  correos: [
    {
      id: 1,
      de: "soporte@correo-corporativo.top",
      para: "m.ruiz@cibercorp.com",
      asunto: "URGENTE: actualización de nómina",
      fecha: "11 Feb 2026 03:31",
      estado: "ABIERTO (m.ruiz)",
      adjunto: "factura_urgente.docx (24 KB)",
      cuerpo: [
        "Estimado empleado,",
        "Debe revisar el documento adjunto referente a su nómina antes del final del turno.",
        "Equipo de RRHH",
      ].join("\n"),
    },
  ],

  alertas: [
    { id: "ALT-501", sev: "CRITICAL", fuente: "edr", titulo: "Comportamiento de ransomware detectado (LockCrypt)" },
    { id: "ALT-502", sev: "CRITICAL", fuente: "edr", titulo: "Segundo host afectado" },
    { id: "ALT-503", sev: "HIGH", fuente: "firewall", titulo: "Comunicación con C2 sospechoso" },
  ],

  dominios: {
    "kraken-update.top": {
      ip: "91.240.118.77",
      registrado: "Hace 9 días",
      registrador: "PDR Ltd. d/b/a PublicDomainRegistry",
      whois: [
        "Domain: kraken-update.top",
        "Registered: 2026-02-02 (hace 9 días)",
        "Registrant: Privacy Protect (oculto)",
        "Name Server: ns1.keep-alive.net",
        "IP: 91.240.118.77 (AS51786 — hosting de alto riesgo)",
        "Nota: dominio usado como C2 en la campaña LockCrypt.",
      ].join("\n"),
      vt: { repos: 22, maliciosos: 21, deteccion: "MALICIOSO (21/22)", comentarios: "C2 activo de ransomware LockCrypt." },
    },
    "correo-corporativo.top": {
      ip: "185.220.101.66",
      registrado: "Hace 5 días",
      registrador: "Njalla",
      whois: "Dominio de entrega del correo con el documento malicioso.",
      vt: { repos: 15, maliciosos: 14, deteccion: "MALICIOSO (14/15)" },
    },
  },

  ips: {
    "91.240.118.77": {
      pais: "🇷🇴 Rumanía",
      asn: "AS51786",
      reputacion: "MALICIOSA — C2 de LockCrypt, listada en 14 blacklists.",
    },
    "185.220.101.66": {
      pais: "🇩🇪 Alemania (anonimizador)",
      asn: "AS44477",
      reputacion: "MALICIOSA — asociada a campañas de phishing.",
    },
  },

  urls: {},

  hashes: {
    a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef: {
      nombre: "svch0st.exe",
      tipo: "SHA-256",
      vt: { repos: 45, maliciosos: 44, deteccion: "MALICIOSO (44/45)", familia: "LockCrypt Ransomware" },
      nota: "Binario de cifrado de LockCrypt. También borra copias de sombra y desactiva recuperación.",
    },
  },

  correctas: {
    bloquear: ["dominio:kraken-update.top", "ip:91.240.118.77", "dominio:correo-corporativo.top"],
    aislar: ["host:HOST-201", "host:HOST-202"],
    deshabilitar: ["usuario:m.ruiz"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:cibercorp.com",
  ],

  eventos: [
    {
      en: 90,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Tercer host afectado",
      detalle: "HOST-203 muestra eventos de cifrado .lcrypt. El ransomware se propaga por red.",
    },
    {
      en: 240,
      tipo: "alerta",
      sev: "HIGH",
      titulo: "Intento de acceso a recursos compartidos",
      detalle: "HOST-201 intenta acceder a \\\\srv-files-01\\compartido con credenciales de m.ruiz.",
    },
    {
      en: 480,
      tipo: "msg",
      titulo: "Dirección de CSIRT",
      detalle: "«¿Estado de la contención? Apaga el acceso a la red de los hosts afectados YA. No apagues los equipos.»",
    },
  ],

  // Ataque adaptativo: si no aíslas HOST-201 en 2,5 minutos, el ransomware
  // termina de propagarse y HOST-203 (ya mencionado en la narrativa) se
  // convierte en objetivo OBLIGATORIO de contención.
  pivot: {
    en: 150,
    siNo: "aislar:host:HOST-201",
    correctas: { aislar: ["host:HOST-203"] },
    alerta: {
      sev: "CRITICAL",
      titulo: "Ransomware en propagación: HOST-203 cifrado",
      detalle: "Sin contener HOST-201, el ransomware se ha movido por SMB y HOST-203 queda completamente cifrado. Contenerlo YA es obligatorio.",
    },
    detalle: "No aíslas HOST-201 a tiempo: el cifrado se ha extendido y HOST-203 ahora es un objetivo de contención exigido.",
    penalizacion: 40,
  },

  pistas: [
    "El EDR ya te da el árbol de procesos: ¿qué usuario y qué vector de entrada?",
    "Identifica C2: `dig kraken-update.top` y `whois`. Bloquea dominio e IP.",
    "Aísla TODOS los hosts afectados y deshabilita la cuenta comprometida.",
    "Regla de oro: no apagar los equipos (pierdes evidencias), aislarlos de red.",
    "Cuando hayas contenido, `escalar` a CSIRT y redacta el `informe`.",
  ],

  leccion: {
    titulo: "Ransomware: la carrera contra el cifrado",
    mitre: ["T1486", "T1490", "T1059.001", "T1078", "T1021.002", "T1105"],
    resumen:
      "Un documento de Office con macro (entregado por correo) ejecutó PowerShell, descargó el binario " +
      "svch0st.exe y comenzó a cifrar archivos con extensión .lcrypt, borrando copias de sombra. " +
      "Desde HOST-201 se propagó a HOST-202 vía recursos compartidos usando las credenciales del usuario. " +
      "El C2 (kraken-update.top) coordinaba la operación.",
    deteccion:
      "- Proceso anómalo en C:\\Windows\\Temp con nombre suplantado (svch0st.exe suplanta a svchost.exe).\n" +
      "- Renombrado masivo de archivos (.lcrypt) y borrado de copias de sombra (vssadmin).\n" +
      "- Beaconing periódico a dominio de registro reciente.\n" +
      "- Árbol de procesos: Office → PowerShell → descarga → ejecución (Living Off the Land).\n" +
      "- Movimiento lateral: WINWORD abriendo recursos compartidos.",
    respuesta:
      "1. AISLAR de red todos los hosts afectados de inmediato (sin apagarlos: preserva evidencias).\n" +
      "2. Bloquear el C2 en firewall/DNS (dominio + IP) para cortar el mando y control.\n" +
      "3. Deshabilitar cuentas comprometidas y forzar rotación de credenciales.\n" +
      "4. Escalar a CSIRT: forense, búsqueda de más hosts (alcance) y plan de restauración desde backups LIMPIOS.\n" +
      "5. NO pagar el rescate: no garantiza recuperación y financia el siguiente ataque.\n" +
      "6. El informe debe incluir vector de entrada, alcance, IOCs y lecciones aprendidas.",
    aprendizaje: [
      "La contención es una carrera: los primeros 15 minutos deciden el alcance del desastre.",
      "Aislar ≠ apagar. Apagar destruye evidencias en memoria (procesos, claves, conexiones).",
      "Las macros y el Living Off the Land (PowerShell) son el combo de entrada favorito del ransomware.",
      "Las copias de seguridad off-line, inmutables y probadas son la única defensa real contra el rescate.",
      "Documenta el vector de entrada: sin él, el mismo ataque volverá a entrar por la misma puerta.",
    ],
    glosario: ["Ransomware", "C2", "Copias de sombra", "Living Off the Land", "Beaconing", "Movimiento lateral"],
  },
};
