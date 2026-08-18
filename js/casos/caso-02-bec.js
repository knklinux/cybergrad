export default {
  id: "bec-01",
  titulo: "«Transferencia urgente» — Suplantación del CEO (BEC)",
  severidad: "CRÍTICA",
  nivel: 1,
  sla: 780, // 13 minutos
  xp: 280,
  briefing:
    "Finanzas ha recibido un correo que parece enviado por la directora general, A. Santos, " +
    "solicitando una transferencia urgente de 48.500 € a un proveedor. El correo lleva un PDF con " +
    "los datos bancarios. La directora está de vacaciones y no responde.\n\n" +
    "Tu tarea: determinar si la petición es legítima y evitar el fraude si no lo es. " +
    "Empieza por `mail` y analiza las cabeceras con calma.",

  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-301",
          sev: "MEDIUM",
          fuente: "correo_seguro",
          ts: "2026-02-10T11:05:00Z",
          titulo: "Dominio similar a dominio corporativo en remitente",
          detalle:
            "Remitente 'a.santos@ceo-santos.com' — similar al dominio corporativo santos-corp.com. Política de lookalike disparada.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-302",
          sev: "LOW",
          fuente: "dlp",
          ts: "2026-02-10T11:07:00Z",
          titulo: "PDF con datos bancarios adjunto a correo externo",
          detalle: "Adjunto 'datos_proveedor.pdf' con IBAN. Sin marca de agua de verificación.",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/home/analista/casos/evidencias/headers-bec.txt": [
      "Return-Path: <a.santos@ceo-santos.com>",
      "Received: from mx.ceo-santos.com (185.61.134.29) by mx01.cibercorp.com",
      "From: \"A. Santos\" <a.santos@ceo-santos.com>",
      "To: tesoreria@cibercorp.com",
      "Cc: (sin destinatarios en copia)",
      "Reply-To: a.santos@ceo-santos.com",
      "Subject: RE: Transferencia urgente proveedor",
      "Date: Tue, 10 Feb 2026 11:03:41 +0100",
      "X-Mailer: Microsoft Outlook 16.0",
      "",
      "Nota del analista:",
      "  - El dominio oficial de la directora es santos-corp.com (la empresa se llama Santos Corp).",
      "  - ceo-santos.com se registró hace 6 días y no está en los registros DNS de la organización.",
      "  - La directora está de vacaciones en Tailandia (fuera de horario, sin respuesta).",
    ].join("\n"),

    "/var/log/dns.log": [
      "Feb 10 11:02:58 dns01 queries: client 10.0.5.11#53000: query: ceo-santos.com IN MX",
      "Feb 10 11:02:58 dns01 queries: client 10.0.5.11#53000: query: ceo-santos.com IN A",
    ].join("\n"),

    "/var/log/proxy.log":
      "Feb 10 10:55:12 squid[1044]: 10.0.5.11 - GET http://ceo-santos.com/transferencia.pdf - TCP_MISS/200 application/pdf",
  },

  correos: [
    {
      id: 1,
      de: "A. Santos <a.santos@ceo-santos.com>",
      para: "tesoreria@cibercorp.com",
      asunto: "RE: Transferencia urgente proveedor",
      fecha: "10 Feb 2026 11:03",
      estado: "SIN LEER (tesorería espera confirmación del SOC)",
      adjunto: "datos_proveedor.pdf (112 KB)",
      headers: "/home/analista/casos/evidencias/headers-bec.txt",
      cuerpo: [
        "Buenos días equipo de Tesorería,",
        "",
        "Estamos cerrando una operación estratégica con un proveedor internacional y necesito",
        "que se transfieran HOY 48.500 € a la cuenta que os adjunto. El proveedor insiste en",
        "que el pago se reciba antes de las 14:00.",
        "",
        "Confidencial: no comentéis esta operación con nadie, ni siquiera con otros directivos.",
        "Estoy de viaje y no puedo atender llamadas.",
        "",
        "Confirmadme por este mismo correo cuando esté hecha.",
        "",
        "A. Santos",
        "Directora General",
        "------------------------------------------------------------------",
        "[Marca de la pasarela de correo]",
        "⚠ SPF: FAIL. DKIM: NONE. El dominio remitente NO pertenece a la organización.",
      ].join("\n"),
    },
    {
      id: 2,
      de: "a.santos@santos-corp.com",
      para: "rrhh@cibercorp.com",
      asunto: "Aprobación de vacaciones Q1",
      fecha: "9 Feb 2026 09:12",
      estado: "LEÍDO",
      adjunto: "ninguno",
      cuerpo: "Documento de aprobación de vacaciones. Firma: A. Santos.",
      nota: "Este es el correo LEGÍTIMO de la directora (santos-corp.com). Compáralo con el otro.",
    },
  ],

  alertas: [
    { id: "ALT-301", sev: "MEDIUM", fuente: "correo_seguro", titulo: "Dominio similar a dominio corporativo en remitente" },
    { id: "ALT-302", sev: "LOW", fuente: "dlp", titulo: "PDF con datos bancarios adjunto a correo externo" },
  ],

  dominios: {
    "ceo-santos.com": {
      ip: "185.61.134.29",
      registrado: "Hace 6 días (04 Feb 2026)",
      registrador: "NameCheap, Inc.",
      whois: [
        "Domain: ceo-santos.com",
        "Registrar: NameCheap, Inc.",
        "Registered: 2026-02-04 (hace 6 DÍAS)",
        "Registrant: PrivacyGuard (protección de privacidad)",
        "Name Server: ns1.domaincontrol-dns.net",
        "Nota: creado días antes del ataque, imitando a santos-corp.com.",
      ].join("\n"),
      vt: { repos: 6, maliciosos: 4, deteccion: "SOSPECHOSO (4/6)", comentarios: "Dominio reciente usado en fraude BEC." },
    },
    "santos-corp.com": {
      ip: "203.0.113.42",
      registrado: "Hace 14 años",
      registrador: "MarkMonitor Inc.",
      whois: "Dominio legítimo de Santos Corp (empresa matriz de CiberCorp).",
      vt: { repos: 88, maliciosos: 0, deteccion: "LIMPIO (0/88)" },
    },
  },

  ips: {
    "185.61.134.29": {
      pais: "🇧🇬 Bulgaria",
      asn: "AS207083",
      reputacion: "SOSPECHOSA — sin historial, listada en 2 blacklists.",
    },
  },

  correctas: {
    bloquear: ["dominio:ceo-santos.com", "ip:185.61.134.29"],
    aislar: [],
    deshabilitar: [],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:santos-corp.com",
    "aislar|host:HOST-101",
    "deshabilitar|usuario:a.santos",
  ],

  eventos: [
    {
      en: 240,
      tipo: "msg",
      titulo: "Tesorería presiona",
      detalle: "«¿Confirmamos la transferencia? El proveedor dice que si no llega hoy, perdemos la operación.»",
    },
    {
      en: 480,
      tipo: "alerta",
      sev: "HIGH",
      titulo: "Segundo intento de fraude detectado",
      detalle: "Un correo casi idéntico ha llegado a compras@cibercorp.com con otros datos bancarios. Campaña BEC en curso.",
    },
  ],

  pistas: [
    "Compara el dominio del remitente con el de un correo legítimo de la misma persona (`mail 2`).",
    "Usa `whois ceo-santos.com`: fíjate en la fecha de registro.",
    "Los ataques BEC no instalan malware: la respuesta es bloqueo + escalar a finanzas, NO aislar hosts.",
  ],

  leccion: {
    titulo: "BEC: el fraude que no necesita malware",
    mitre: ["T1566.002", "T1656", "T1114.003"],
    resumen:
      "El atacante suplantó a la directora general con un dominio casi idéntico y presión temporal " +
      "('antes de las 14:00', 'no lo comentéis con nadie') para que finanzas transfiriera dinero sin verificar. " +
      "El BEC (Business Email Compromise) es el fraude más rentable para el crimen organizado: no requiere exploits.",
    deteccion:
      "- Dominio del remitente distinto del oficial (ceo-santos.com vs santos-corp.com).\n" +
      "- Registro reciente del dominio (6 días antes del ataque).\n" +
      "- Urgencia artificial + petición de secreto + cambio de datos bancarios.\n" +
      "- La persona 'no puede atender llamadas' (para evitar la verificación por voz).\n" +
      "- Datos bancarios en PDF adjunto, sin verificación previa.",
    respuesta:
      "1. NO confirmar la transferencia. Bloquear el dominio y la IP en la pasarela.\n" +
      "2. Avisar a tesorería/finanzas por canal oficial (teléfono verificado, no correo).\n" +
      "3. Verificar siempre los datos bancarios por un segundo canal independiente.\n" +
      "4. Escalar el caso y revisar si se han realizado pagos similares en las últimas semanas.\n" +
      "5. Comunicar a toda la plantilla: es una campaña activa contra la organización.",
    aprendizaje: [
      "El factor humano es el vector más explotado: urgencia + autoridad + secreto = fraude.",
      "Siempre verifica por un canal fuera del correo (teléfono conocido, videollamada, presencial).",
      "Los cambios de datos bancarios de proveedores deben activar un proceso de doble verificación.",
      "El BEC no deja malware: la evidencia son las cabeceras, el dominio y el patrón de la conversación.",
    ],
    glosario: ["BEC", "Spear phishing", "Ingeniería social", "SPF", "Dominio lookalike"],
  },
};
