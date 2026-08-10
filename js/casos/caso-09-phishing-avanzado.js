// ============================================================
// Caso 09 — «El CEO aprobó la transferencia» (Phishing avanzado)
// Spear phishing con robo de sesión: thread hijacking, dominio
// lookalike con SPF/DKIM configurados (el correo PASA la
// autenticación), robo de sesión del CEO y regla de reenvío.
// La lección: SPF/DKIM/DMARC PASS no significa legítimo.
// ============================================================

export default {
  id: "phishing-avanzado-01",
  titulo: "«El CEO aprobó la transferencia» — Spear phishing con robo de sesión",
  severidad: "CRÍTICA",
  nivel: 5,
  sla: 900, // 15 minutos
  xp: 600,
  briefing:
    "Finanzas acaba de aprobar una transferencia internacional de 84.500 € a un proveedor nuevo. " +
    "El correo que lo ordenó parece del CEO, responde dentro de un hilo de facturas REAL y — lo más " +
    "inquietante — pasó todos los controles de autenticación de correo. Además, el buzón del CEO " +
    "tiene una regla de reenvío nueva y su cuenta inició sesión desde una ubicación anómala.\n\n" +
    "Este es el phishing avanzado: no te fías de SPF/DKIM, verificas el dominio real y el contexto. " +
    "El reloj corre: si avisamos al banco antes de las 18:00, la transferencia se puede revertir.",

  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-901",
          sev: "HIGH",
          fuente: "correo_seguro",
          ts: "2026-02-16T09:02:11Z",
          titulo: "Dominio lookalike detectado en hilo de facturación",
          detalle:
            "Mensaje 'Re: Factura #7841' con remitente ceo@acme.co (una letra distinta de acme.com). El correo pasó SPF/DKIM porque el atacante configuró esos registros en su dominio.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-902",
          sev: "HIGH",
          fuente: "edr",
          ts: "2026-02-16T09:07:45Z",
          titulo: "Regla de reenvío creada en el buzón del CEO",
          detalle:
            "Se creó una regla en el buzón de ceo@acme.com que reenvía correos con 'factura' o 'proveedor' a reenvio@acme-verify.co. Creada vía Outlook Web (sesión con origen anómalo).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-903",
          sev: "CRITICAL",
          fuente: "siem",
          ts: "2026-02-16T09:11:02Z",
          titulo: "Inicio de sesión del CEO desde ubicación anómala",
          detalle:
            "ceo@acme.com inició sesión desde 45.155.204.9 (🇷🇺) a las 08:57. El CEO está en la oficina de Madrid. MFA no solicitado: reutilización de token de sesión robado.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-904",
          sev: "CRITICAL",
          fuente: "fraude",
          ts: "2026-02-16T10:24:37Z",
          titulo: "Transferencia internacional aprobada por p.diaz (Finanzas)",
          detalle:
            "Orden de transferencia de 84.500 € a cuenta del 'proveedor' indicado en el correo 'Re: Factura #7841'. Aprobada por p.diaz sin verificación telefónica.",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/var/log/mail.log": [
      "Feb 16 09:01:52 mx01 postfix/smtpd[22104]: connect from mail.acme.co[45.155.204.9]",
      "Feb 16 09:01:54 mx01 postfix/smtpd[22104]: 9F2A1B00C1: client=mail.acme.co[45.155.204.9]",
      "Feb 16 09:01:54 mx01 postfix/smtpd[22104]: 9F2A1B00C1: SPF: PASS (acme.co publica SPF y autoriza a mail.acme.co)",
      "Feb 16 09:01:55 mx01 postfix/smtpd[22104]: 9F2A1B00C1: DKIM: PASS (firma válida para acme.co)",
      "Feb 16 09:01:55 mx01 postfix/smtpd[22104]: 9F2A1B00C1: DMARC: PASS (política p=reject publicada en acme.co)",
      "Feb 16 09:01:56 mx01 postfix/smtpd[22104]: 9F2A1B00C1: 250 2.0.0 Accepted: to=<p.diaz@acme.com>",
      "Feb 16 09:01:56 mx01 postfix/smtpd[22104]: 9F2A1B00C1: lost connection after DATA from mail.acme.co[45.155.204.9]",
      "Feb 16 08:58:30 mx01 postfix/smtpd[22104]: connect from mail.acme.com[203.0.113.10]",
      "Feb 16 08:58:32 mx01 postfix/smtpd[22104]: 7A1C0B00D2: client=mail.acme.com[203.0.113.10]",
      "Feb 16 08:58:32 mx01 postfix/smtpd[22104]: 7A1C0B00D2: SPF: PASS · DKIM: PASS · DMARC: PASS (acme.com)",
      "Feb 16 08:58:33 mx01 postfix/smtpd[22104]: 7A1C0B00D2: 250 2.0.0 Accepted: to=<p.diaz@acme.com> (hilo legítimo)",
    ].join("\n"),

    "/home/analista/casos/evidencias/headers.txt": [
      "Return-Path: <ceo@acme.co>",
      "Received: from mail.acme.co (45.155.204.9) by mx01.acme.com",
      "From: \"Carlos Mendoza\" <ceo@acme.co>",
      "To: p.diaz@acme.com",
      "Reply-To: reenvio@acme-verify.co",
      "Subject: Re: Factura #7841",
      "Date: Mon, 16 Feb 2026 09:01:41 +0100",
      "Message-ID: <20260216090141.3d8f1a@mail.acme.co>",
      "In-Reply-To: <20260212083055.9f2c1a@acme.com>  ← responde a un hilo REAL de facturación",
      "X-Mailer: Microsoft Outlook 16.0 (es)",
      "",
      "Nota del analista:",
      "  - El dominio REAL del CEO es ceo@acme.com (con .com). acme.co es un lookalike.",
      "  - Reply-To apunta a reenvio@acme-verify.co: el buzón donde se recoge lo que se filtra.",
      "  - SPF/DKIM/DMARC PASAN porque el atacante controla acme.co y configuró los registros.",
      "  - In-Reply-To: el mensaje se cuela en un hilo legítimo (thread hijacking).",
    ].join("\n"),

    "/var/log/proxy.log": [
      "Feb 16 08:54:40 squid[1044]: 10.0.4.412 - GET https://acme.co/ - TCP_MISS/200 text/html",
      "Feb 16 08:55:02 squid[1044]: 10.0.4.412 - GET https://acme.co/login - TCP_MISS/200 text/html",
      "Feb 16 08:55:19 squid[1044]: 10.0.4.412 - POST https://acme.co/login - TCP_MISS/200 text/html",
      "Feb 16 08:56:47 squid[1044]: 10.0.4.412 - GET https://login.microsoftonline.com/consent?client_id=... - TCP_MISS/302 text/html",
      "Nota: p.diaz (HOST-412) introdujo sus credenciales de Office 365 en el portal falso de acme.co",
      "y aceptó el consentimiento OAuth 'Acme Portal' que pidió acceso a su correo.",
    ].join("\n"),

    "/var/log/edr.json": [
      '{"ts":"2026-02-16T09:07:42Z","host":"HOST-101","event":"mail_rule_created","mailbox":"ceo@acme.com","rule":"forward_facturas","action":"forward to reenvio@acme-verify.co","via":"OWA (origen 45.155.204.9)"}',
      '{"ts":"2026-02-16T09:11:02Z","host":"HOST-101","event":"login_anomaly","account":"ceo@acme.com","src_ip":"45.155.204.9","geo":"RU","mfa":false,"note":"token de sesión reutilizado"}',
      '{"ts":"2026-02-16T09:30:15Z","host":"HOST-412","event":"process_start","proc":"outlook.exe","user":"p.diaz","note":"abre hilo Re: Factura #7841"}',
    ].join("\n"),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-6613 — fraude BEC avanzado / robo de sesión.\n" +
      "Fuentes: /opt/siem/alerts.json, /var/log/mail.log, /var/log/proxy.log,\n" +
      "         /var/log/edr.json, evidencias/headers.txt\n" +
      "Investiga con: mail, cat, grep, whois, dig, curl, vt\n" +
      "OJO: la tentación es bloquear el dominio 'obvio'. Verifica cuál es el real.",
  },

  correos: [
    {
      id: 1,
      de: "Carlos Mendoza <ceo@acme.co>",
      para: "p.diaz@acme.com",
      asunto: "Re: Factura #7841",
      fecha: "16 Feb 2026 09:01",
      estado: "ABIERTO Y RESPONDIDO (p.diaz)",
      adjunto: "ninguno",
      headers: "/home/analista/casos/evidencias/headers.txt",
      cuerpo: [
        "Paula,",
        "",
        "He hablado con el proveedor de la factura #7841 y acordamos adelantar el pago a su",
        "nueva cuenta bancaria hoy mismo (condición para mantener el descuento).",
        "",
        "Ordena la transferencia de 84.500 € a la cuenta que indico abajo y confírmame el",
        "justificante antes de las 13:00.",
        "",
        "IBAN: DE89 3704 0044 0532 0130 00 — TITULAR: Proyectos del Sur S.L.",
        "",
        "Carlos Mendoza — CEO, ACME Corp",
        "",
        "------------------------------------------------------------------",
        "[Marca de la pasarela de correo]",
        "⚠ El remitente NO es ceo@acme.com: es ceo@acme.co (dominio distinto, 1 letra).",
        "⚠ SPF/DKIM/DMARC pasan porque el dominio acme.co pertenece al atacante.",
      ].join("\n"),
    },
    {
      id: 2,
      de: "Facturación ACME <facturacion@acme.com>",
      para: "p.diaz@acme.com",
      asunto: "Factura #7841 — vencimiento 28 feb",
      fecha: "12 Feb 2026 08:30",
      estado: "LEÍDO (hilo original legítimo)",
      adjunto: "factura_7841.pdf",
      cuerpo: [
        "Hola Paula,",
        "",
        "Adjuntamos la factura #7841 con vencimiento el 28 de febrero. El pago se realiza",
        "por transferencia a la cuenta habitual de ACME (no cambie de cuenta sin verificación).",
        "",
        "Un saludo,",
        "Departamento de Facturación — ACME Corp",
      ].join("\n"),
    },
    {
      id: 3,
      de: "newsletter@amazon.es",
      para: "p.diaz@acme.com",
      asunto: "Tus novedades de esta semana",
      fecha: "15 Feb 2026 18:12",
      estado: "NO LEÍDO",
      adjunto: "ninguno",
      cuerpo: "Boletín de novedades de Amazon.es. Puedes darte de baja en el enlace del pie.",
    },
  ],

  alertas: [
    { id: "ALT-901", sev: "HIGH", fuente: "correo_seguro", titulo: "Dominio lookalike detectado en hilo de facturación" },
    { id: "ALT-902", sev: "HIGH", fuente: "edr", titulo: "Regla de reenvío creada en el buzón del CEO" },
    { id: "ALT-903", sev: "CRITICAL", fuente: "siem", titulo: "Inicio de sesión del CEO desde ubicación anómala" },
    { id: "ALT-904", sev: "CRITICAL", fuente: "fraude", titulo: "Transferencia internacional aprobada por p.diaz (Finanzas)" },
  ],

  dominios: {
    "acme.co": {
      ip: "45.155.204.9",
      registrado: "Hace 5 días (11 Feb 2026)",
      registrador: "Namecheap (datos ocultos)",
      whois: [
        "Domain: acme.co",
        "Registrar: Namecheap Inc. - titular oculto (WhoisGuard)",
        "Registered: 2026-02-11 (hace 5 DÍAS)",
        "Name Server: ns1.hostanon.net, ns2.hostanon.net",
        "IP actual: 45.155.204.9",
        "ASN: AS44477 - hosting tolerante con malware",
        "SPF: v=spf1 ip4:45.155.204.9 -all  (configurado por el atacante)",
        "DKIM: selector 's1' activo  (configurado por el atacante)",
        "DMARC: p=reject  (configurado por el atacante)",
        "NOTA: por eso el correo pasó la autenticación. El dominio es de 5 días y",
        "no tiene nada que ver con ACME Corp (acme.com, registrado hace 22 años).",
      ].join("\n"),
      vt: {
        repos: 14,
        maliciosos: 12,
        deteccion: "MALICIOSO (12/14)",
        familia: "Infraestructura de phishing BEC",
        comentarios: "Portal falso de inicio de sesión. Registro reciente, hosting anónimo.",
      },
    },
    "acme-verify.co": {
      ip: "45.155.204.9",
      registrado: "Hace 5 días (11 Feb 2026)",
      registrador: "Namecheap (datos ocultos)",
      whois: [
        "Domain: acme-verify.co",
        "Registrar: Namecheap Inc. - titular oculto",
        "Registered: 2026-02-11 (hace 5 DÍAS)",
        "IP actual: 45.155.204.9",
        "NOTA: el buzón destino de la regla de reenvío del CEO. Misma IP que acme.co:",
        "misma campaña. Aquí termina todo lo que se filtra del buzón del CEO.",
      ].join("\n"),
      vt: {
        repos: 11,
        maliciosos: 9,
        deteccion: "MALICIOSO (9/11)",
        familia: "Buzón de recogida (exfiltración)",
        comentarios: "Destino de reenvíos de buzones comprometidos.",
      },
    },
    "acme.com": {
      ip: "203.0.113.10",
      registrado: "Hace 22 años",
      registrador: "MarkMonitor Inc.",
      whoi: "Dominio legítimo de ACME Corp. El CEO real es ceo@acme.com. NO bloquear esto.",
      vt: { repos: 92, maliciosos: 0, deteccion: "LIMPIO (0/92)" },
    },
  },

  ips: {
    "45.155.204.9": {
      pais: "🇷🇺 Rusia (hosting anónimo)",
      asn: "AS44477",
      reputacion: "MALICIOSA — listada en 12 blacklists. Origen del login del CEO y del correo del hilo.",
      whois: "Misma infraestructura que acme.co y acme-verify.co. Campaña BEC organizada.",
    },
    "203.0.113.10": {
      pais: "🏢 Oficina central Madrid",
      asn: "ACME Corp",
      reputacion: "IP legítima del correo corporativo (mail.acme.com).",
    },
  },

  urls: {
    "https://acme.co/": [
      "<!DOCTYPE html>",
      "<html><head><title>Iniciar sesión — Office 365</title></head>",
      "<body>",
      "  <h1>Portal de empleados</h1>",
      "  <form action=\"login\" method=\"post\">",
      "    <input type=\"text\" name=\"user\" placeholder=\"usuario@acme.com\">",
      "    <input type=\"password\" name=\"pass\" placeholder=\"Contraseña\">",
      "    <button type=\"submit\">Entrar</button>",
      "  </form>",
      "  <!-- Portal FALSO: el dominio es acme.co (1 letra distinta de acme.com) -->",
      "  <!-- Roba credenciales y reutiliza el token de sesión de la víctima -->",
      "</body></html>",
    ].join("\n"),
    "https://acme.co/login":
      "302 Found — tras enviar las credenciales, redirige a https://login.microsoftonline.com/consent (consentimiento OAuth 'Acme Portal'). El atacante obtiene acceso persistente al correo de la víctima.",
    "https://acme-verify.co/":
      "HTTP/1.1 200 OK — buzón de recogida. Sin contenido público. Es el destino de la regla de reenvío del buzón del CEO.",
  },

  correctas: {
    bloquear: ["dominio:acme.co", "dominio:acme-verify.co", "ip:45.155.204.9"],
    aislar: ["host:HOST-412"],
    deshabilitar: ["usuario:p.diaz"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|dominio:acme.com",
    "deshabilitar|usuario:ceo",
    "aislar|host:srv-mail-01",
    "deshabilitar|usuario:m.garcia",
  ],

  eventos: [
    {
      en: 240,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Intento de segunda transferencia",
      detalle: "Se detectó una segunda orden de pago de 122.000 € al mismo 'proveedor', bloqueada por el control de fraude. La campaña sigue activa.",
    },
    {
      en: 480,
      tipo: "msg",
      titulo: "Director Financiero",
      detalle: "«Confirmado: la transferencia de 84.500 € salió esta mañana. El banco puede revertirla si avisamos antes de las 18:00. Tenemos la ventana abierta.»",
    },
  ],

  pistas: [
    "El correo pasó SPF/DKIM/DMARC porque el atacante controla el dominio remitente. Verifica el dominio REAL: `whois acme.co` (5 días) vs acme.com (22 años).",
    "El hilo es real (Re: Factura #7841) pero el remitente NO: `mail 1` y `cat` de headers.txt muestran ceo@acme.co y el Reply-To a acme-verify.co.",
    "La regla de reenvío del CEO exfiltra facturas a reenvio@acme-verify.co. Bloquea el dominio de destino y el lookalike.",
    "Responde: bloquea acme.co y acme-verify.co (+ la IP), aísla el equipo de finanzas, deshabilita p.diaz y escala. OJO: NO bloquees acme.com.",
  ],

  leccion: {
    titulo: "Phishing avanzado: cuando SPF/DKIM/DMARC no bastan",
    mitre: ["T1566.002", "T1539", "T1114.003", "T1078", "T1204.001"],
    resumen:
      "El atacante registró acme.co (una letra distinta de acme.com), configuró SPF/DKIM/DMARC en su dominio y robó la sesión del CEO con un portal " +
      "falso de inicio de sesión (consentimiento OAuth). Desde el buzón del CEO creó una regla de reenvío hacia acme-verify.co y, dentro de un hilo de " +
      "facturas REAL, ordenó a finanzas una transferencia de 84.500 €. El correo pasó TODA la autenticación: la defensa no estaba en los registros DNS, " +
      "estaba en verificar quién es el dominio y por qué una regla nueva reenvía correos del CEO.",
    deteccion:
      "- SPF/DKIM/DMARC PASS no prueba legitimidad: prueba que el dominio remitente controla sus registros. Verifica el dominio en WHOIS (fecha, registrador, ASN).\\n" +
      "- Lookalike de una letra (acme.co vs acme.com): el correo 'Re:' dentro de un hilo real es thread hijacking.\\n" +
      "- Reglas de reenvío NUEVAS en buzones ejecutivos: la persistencia favorita del BEC.\\n" +
      "- Inicio de sesión desde geo anómala sin MFA = token de sesión robado (robo de sesión, no de contraseña).\\n" +
      "- Orden de pago urgente con cuenta nueva y confirmación 'antes de las 13:00': urgencia + cambio de cuenta = fraude.",
    respuesta:
      "1. Bloquear los dominios del atacante (acme.co, acme-verify.co) y su IP en DNS/pasarela/firewall.\\n" +
      "2. Aislar el equipo de finanzas (HOST-412) y deshabilitar la cuenta de p.diaz (credenciales + sesión robadas).\\n" +
      "3. En el buzón del CEO: ELIMINAR la regla de reenvío, forzar cierre de todas las sesiones y rotar credenciales.\\n" +
      "4. Avisar al banco para REVERTIR la transferencia (la ventana suele ser de horas).\\n" +
      "5. Buscar qué más se filtró por la regla de reenvío (facturas, proveedores, datos bancarios).\\n" +
      "6. Escalar: fraude financiero → forense + legal. Implementar verificación telefónica para pagos.",
    aprendizaje: [
      "SPF/DKIM/DMARC PASS ≠ legítimo: la autenticación valida el dominio, no la intención. Siempre compara con el dominio oficial.",
      "El thread hijacking se cuela en conversaciones reales: el contexto del hilo no es prueba de autenticidad.",
      "Los tokens de sesión (OAuth) se roban y se reutilizan sin contraseña ni MFA: vigila las geo-anomalías y las apps con consentimiento.",
      "Las reglas de reenvío en buzones ejecutivos son exfiltración silenciosa: alerta en cualquier regla nueva.",
      "Cambio de cuenta bancaria + urgencia + 'confírmame' = proceso de doble verificación, siempre.",
    ],
    glosario: ["Spear phishing", "BEC", "Thread hijacking", "Robo de sesión", "OAuth", "Regla de reenvío", "SPF", "DKIM", "DMARC", "Lookalike"],
  },
};
