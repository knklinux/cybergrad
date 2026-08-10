// ============================================================
// becario.js — Modo Becario: práctica guiada paso a paso
// Para quien llega sin haber tocado un SOC en su vida.
// Cada paso explica QUÉ hacer y, sobre todo, POR QUÉ se hace.
// Jimmy valida comando a comando y el panel de guía muestra
// el paso actual con su explicación.
// ============================================================

// ---------- BEC-01: phishing con adjunto malicioso ----------
export const BEC01 = {
  id: "bec-01-phishing",
  titulo: "Becario 1/2: el correo que huele mal (phishing)",
  nivel: 1,
  severidad: "BAJA",
  sla: 9999,
  xp: 0,
  briefing:
    "Práctica guiada: ha llegado un correo sospechoso al buzón de un empleado. Yo te guío paso a paso: leemos el correo, miramos las alertas del SIEM, investigamos el dominio y respondemos. Sin prisa: aquí no hay SLA, no hay penalizaciones y cada paso te explico el porqué. Escribe `mail` para empezar.",
  fs: {
    "/opt/siem/alerts.json": [
      "{",
      '  "alerts": [',
      "    {",
      '      "id": "ALT-B1",',
      '      "severity": "HIGH",',
      '      "source": "correo_seguro",',
      '      "title": "Dominio suplantado detectado en correo entrante",',
      '      "from": "facturacion@acme-facturas.info",',
      '      "detail": "El dominio acme-facturas.info imita a acme.com (lookalike). Adjunto .docm con macros. Posible phishing."',
      "    }",
      "  ]",
      "}",
    ].join("\n"),
    "/home/analista/casos/evidencias/headers.txt": [
      "Return-Path: <facturacion@acme-facturas.info>",
      "From: \"Facturacion ACME\" <facturacion@acme-facturas.info>",
      "To: m.garcia@acme.com",
      "Reply-To: soporte@paypal-verifica.top",
      "Subject: Factura pendiente de pago #88231",
      "",
      "Nota del analista:",
      "  - El dominio real de la empresa es acme.com, NO acme-facturas.info.",
      "  - La dirección legítima de facturación es facturacion@acme.com.",
    ].join("\n"),
  },
  correos: [
    {
      id: 1,
      de: "facturacion@acme-facturas.info",
      para: "m.garcia@acme.com",
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
  ],
  alertas: [
    { id: "ALT-B1", sev: "HIGH", fuente: "correo_seguro", titulo: "Dominio suplantado detectado en correo entrante" },
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
        "IP actual: 185.220.101.34",
        "Nota: dominio registrado hace 2 días para imitar a acme.com. Suplantación clara.",
      ].join("\n"),
    },
  },
  correctas: {
    bloquear: ["dominio:acme-facturas.info"],
    aislar: ["host:HOST-104"],
    deshabilitar: ["usuario:m.garcia"],
    escalar: false,
    cerrar: false,
  },
  incorrectas: [
    "bloquear|dominio:acme.com",
    "aislar|host:HOST-101",
    "deshabilitar|usuario:r.moreno",
  ],
  pistas: [],
  eventos: [],
  leccion: {
    titulo: "Becario 1: phishing",
    resumen: "Práctica guiada completada.",
    deteccion: "-",
    respuesta: "-",
    aprendizaje: ["Ya sabes leer evidencias y responder ante un phishing."],
    glosario: ["Phishing", "IOC", "SIEM", "WHOIS"],
    mitre: ["T1566"],
  },
  becario: {
    pasos: [
      {
        cmd: "mail",
        tipo: "comando",
        ejemplo: "mail",
        que: "Lee el correo del buzón",
        porque:
          "El correo es la primera evidencia de casi todo incidente: el remitente, el asunto y el adjunto te dicen de qué va la amenaza antes de tocar nada más. Un analista empieza siempre por aquí.",
        ok: "¡Bien! Has abierto el correo. Fíjate en el remitente: facturacion@acme-facturas.info. El dominio real de ACME es acme.com… «acme-facturas.info» lo imita. Ese es tu primer indicio.",
        msg: "Ahora mira qué detectaron los sistemas de seguridad: escribe `alertas`.",
        fallback: "Este paso es leer el correo: escribe `mail` (sin argumentos).",
      },
      {
        cmd: "alertas",
        tipo: "comando",
        ejemplo: "alertas",
        que: "Consulta lo que detectó el SIEM",
        porque:
          "El SIEM ya ha correlacionado lo que pasó por debajo: quién envió qué y qué controles saltaron. Una alerta bien hecha te ahorra leer decenas de logs. Triaje = empezar por las alertas.",
        ok: "El SIEM confirma la sospecha: dominio lookalike y adjunto con macros. Esto es phishing con toda la intención.",
        msg: "Ahora investiga al responsable: el dominio del remitente. Escribe `whois acme-facturas.info`.",
        fallback: "Este paso es consultar el SIEM: escribe `alertas`.",
      },
      {
        cmd: "whois",
        tipo: "comando",
        ejemplo: "whois acme-facturas.info",
        que: "Investiga el dominio del remitente",
        porque:
          "WHOIS es el DNI de un dominio: quién lo registró, cuándo y con qué registrador. Un dominio registrado hace 2 días, con datos ocultos y un nombre que imita a la empresa, es phishing casi seguro.",
        ok: "Ahí lo tienes: registrado hace 2 DÍAS, con registrador anónimo y datos ocultos. Los dominios legítimos de ACME tienen 22 años y datos visibles. Confirmado: es malicioso.",
        msg: "Hora de actuar. Primero, corta el canal de entrega: bloquea el dominio. Escribe `bloquear acme-facturas.info`.",
        fallback: "Este paso es investigar el dominio: escribe `whois acme-facturas.info`.",
      },
      {
        cmd: "bloquear",
        tipo: "bloquear",
        objetivo: "acme-facturas.info",
        ejemplo: "bloquear acme-facturas.info",
        que: "Bloquea el dominio en la pasarela",
        porque:
          "Bloquear el dominio en la pasarela de correo y el firewall corta el canal de entrega: nadie más recibirá correos de ese dominio y sus enlaces dejarán de funcionar. Es la contención del vector.",
        ok: "¡Perfecto! Dominio bloqueado: acme-facturas.info ya no puede llegar a nadie de ACME. Primer indicador neutralizado.",
        msg: "Ahora el equipo afectado: el host donde se abrió el adjunto. Escribe `aislar HOST-104`.",
        fallback: "Casi. Bloquea el dominio malicioso del remitente: `bloquear acme-facturas.info` (NO acme.com, que es legítimo).",
      },
      {
        cmd: "aislar",
        tipo: "aislar",
        objetivo: "HOST-104",
        ejemplo: "aislar HOST-104",
        que: "Aísla el equipo afectado",
        porque:
          "El adjunto se abrió en HOST-104: el malware ya está dentro. Aislarlo de la red impide que el atacante se mueva lateralmente a otros equipos… pero sin apagarlo, para conservar las evidencias del forense.",
        ok: "HOST-104 aislado en cuarentena. El malware ya no puede comunicarse con el atacante ni saltar a otros equipos.",
        msg: "Último paso: la cuenta del usuario afectado. Escribe `deshabilitar m.garcia`.",
        fallback: "Casi. Aísla el host donde se abrió el adjunto: `aislar HOST-104` (no uno que no esté implicado).",
      },
      {
        cmd: "deshabilitar",
        tipo: "deshabilitar",
        objetivo: "m.garcia",
        ejemplo: "deshabilitar m.garcia",
        que: "Deshabilita la cuenta comprometida",
        porque:
          "Si el atacante robó credenciales de m.garcia, la cuenta es una puerta abierta. Deshabilitarla revoca el acceso de inmediato y obliga a rotar la contraseña antes de reactivarla. Contención completa.",
        ok: "¡Eso es, becario! Cuenta m.garcia deshabilitada y sesiones revocadas. Has hecho un triaje completo: identificar → contener → neutralizar. Así se trabaja en un SOC.",
        msg: "Has completado tu primera investigación. Sigue cuando estés listo.",
        fallback: "Casi. Deshabilita la cuenta del usuario que abrió el adjunto: `deshabilitar m.garcia`.",
      },
    ],
  },
};

// ---------- BEC-02: triaje de un falso positivo ----------
export const BEC02 = {
  id: "bec-02-triaje",
  titulo: "Becario 2/2: la alerta que gritaba «lobo» (triaje)",
  nivel: 1,
  severidad: "MEDIA",
  sla: 9999,
  xp: 0,
  briefing:
    "Práctica guiada: el DLP ha disparado una alerta CRÍTICA — 40 GB de datos salientes a las 3 de la madrugada. Suena a exfiltración… pero no toda alerta es un ataque. Tu trabajo: investigar antes de actuar y decidir con datos. Te guío paso a paso y en cada uno te digo el porqué. Escribe `alertas` para empezar.",
  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-B2",
          sev: "CRITICAL",
          fuente: "dlp",
          ts: "2026-02-11T03:02:00Z",
          titulo: "Exfiltración de datos: 40 GB salientes",
          detalle: "srv-files-01 transfiere 40 GB a 34.77.0.0/16 (Google Cloud) en la madrugada. Volumen muy superior a la media diaria (≈2 GB).",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),
    "/var/log/dlp/transfer.log": [
      "Feb 11 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  protocol=HTTPS user=backupsvc",
      "Feb 11 03:00:05 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:05:12 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:10:33 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:15:41 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:55:27 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 04:00:03 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/  FIN",
    ].join("\n"),
    "/var/log/dlp/historial.txt": [
      "Ene 28 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Ene 29 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Ene 30 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 09 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 10 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
    ].join("\n"),
    "/etc/crontab": [
      "# Minuto  Hora  Día  Mes  Semana  Usuario  Comando",
      "0  3  *  *  1-6  backupsvc  /usr/local/bin/backup-to-cloud.sh --dest gdrive:acme-backups",
      "",
      "# Nota: el backup diario a Google Drive se ejecuta cada noche a las 03:00.",
    ].join("\n"),
    "/var/log/rclone.log": [
      "2026/02/11 03:00:01 INFO  : Starting backup run (backupsvc)",
      "2026/02/11 03:00:01 INFO  : Copying 40.0 GiB from /mnt/backup to gdrive:acme-backups",
      "2026/02/11 04:00:03 INFO  : Finished: 40.0 GiB copied, 0 errors",
    ].join("\n"),
  },
  correos: [],
  dominios: {},
  alertas: [
    { id: "ALT-B2", sev: "CRITICAL", fuente: "dlp", titulo: "Exfiltración de datos: 40 GB salientes" },
  ],
  ips: {
    "34.77.94.118": {
      pais: "🇺🇸 Estados Unidos",
      asn: "AS396982 (Google)",
      reputacion: "LIMPIA — infraestructura oficial de Google Cloud.",
      nota: "Rango 34.77.0.0/16 pertenece a Google LLC.",
      whois: [
        "IP: 34.77.94.118",
        "Pais: Estados Unidos",
        "ASN: AS396982 (Google LLC)",
        "Rango: 34.77.0.0/16 — infraestructura oficial de Google Cloud.",
        "Reputacion: LIMPIA. No es un hosting anonimo: es el destino legitimo de un backup.",
      ].join("\n"),
    },
  },
  correctas: {
    bloquear: [],
    aislar: [],
    deshabilitar: [],
    escalar: false,
    cerrar: true,
  },
  incorrectas: [
    "bloquear|ip:34.77.94.118",
    "aislar|host:srv-files-01",
    "deshabilitar|usuario:backupsvc",
  ],
  pistas: [],
  eventos: [],
  leccion: {
    titulo: "Becario 2: triaje",
    resumen: "Práctica guiada completada.",
    deteccion: "-",
    respuesta: "-",
    aprendizaje: ["Sabes distinguir señal de ruido antes de actuar."],
    glosario: ["Falso positivo", "Baseline", "DLP", "Cuenta de servicio", "Triaje"],
    mitre: [],
  },
  becario: {
    pasos: [
      {
        cmd: "alertas",
        tipo: "comando",
        ejemplo: "alertas",
        que: "Lee la alerta del SIEM",
        porque:
          "Empieza por lo que los sistemas ya han detectado. La alerta dice «40 GB salientes a las 03:00»: suena grave, pero una alerta es una hipótesis, no una sentencia. Tu trabajo es verificarla.",
        ok: "Ahí está: el DLP marca 40 GB salientes desde srv-files-01 hacia Google Cloud a las 3 de la madrugada. Nadie trabaja a esa hora… o eso parece. Vamos a verificarlo.",
        msg: "Mira el detalle de las transferencias: escribe `ls /var/log/dlp`.",
        fallback: "Este paso es leer la alerta: escribe `alertas`.",
      },
      {
        cmd: "ls",
        tipo: "comando",
        ejemplo: "ls /var/log/dlp",
        que: "Explora los logs del DLP",
        porque:
          "Los logs son el detalle que la alerta resume. En esta carpeta verás los registros de transferencias: qué proceso, qué usuario y hacia dónde van los datos. Ahí está la verdad.",
        ok: "Aquí están los logs del DLP: transfer.log (hoy) e historial.txt (días anteriores). El histórico es oro puro para el triaje.",
        msg: "Compara la transferencia de hoy con las anteriores: escribe `cat /var/log/dlp/historial.txt`.",
        fallback: "Este paso es explorar la carpeta de logs: escribe `ls /var/log/dlp`.",
      },
      {
        cmd: "cat",
        tipo: "comando",
        ejemplo: "cat /var/log/dlp/historial.txt",
        que: "Compara con el histórico",
        porque:
          "La pregunta clave del triaje: ¿es NORMAL en esta red? Si esta transferencia ocurre cada noche desde hace semanas, es el comportamiento de referencia, no un ataque. Lo anómalo se define contra lo habitual.",
        ok: "¡Mira eso! La misma transferencia a las 03:00 aparece cada noche desde hace semanas. El «volumen inusual» es en realidad… el backup de siempre. El DLP no tiene baseline configurado.",
        msg: "Confirma qué lanza esa transferencia: escribe `cat /etc/crontab`.",
        fallback: "Este paso es leer el histórico: escribe `cat /var/log/dlp/historial.txt`.",
      },
      {
        cmd: "cat",
        tipo: "comando",
        ejemplo: "cat /etc/crontab",
        que: "Mira qué hay automatizado",
        porque:
          "Los backups no se lanzan solos: el cron programa tareas. Si /etc/crontab ejecuta un script de backup a las 03:00 con la cuenta de servicio «backupsvc», la transferencia es una operación legítima programada.",
        ok: "Confirmado: el cron ejecuta el backup a Google Drive cada noche a las 03:00 con la cuenta backupsvc. No hay atacante: hay automatización.",
        msg: "Última verificación: a quién pertenece el destino. Escribe `whois 34.77.94.118`.",
        fallback: "Este paso es leer las tareas programadas: escribe `cat /etc/crontab`.",
      },
      {
        cmd: "whois",
        tipo: "comando",
        ejemplo: "whois 34.77.94.118",
        que: "Verifica el destino de los datos",
        porque:
          "El destino importa tanto como el volumen. Si la IP pertenece a Google Cloud, es exactamente adónde debe ir un backup corporativo. Si fuera un hosting anónimo de alto riesgo, la historia cambiaría por completo.",
        ok: "La IP 34.77.94.118 pertenece a Google LLC (AS396982): infraestructura oficial de Google Cloud. El destino es legítimo. Todo cuadra.",
        msg: "Conclusión: es un falso positivo. Ciérralo con justificación: escribe `cerrar_caso falso positivo`.",
        fallback: "Este paso es verificar la IP de destino: escribe `whois 34.77.94.118`.",
      },
      {
        cmd: "cerrar_caso",
        tipo: "cerrar",
        ejemplo: "cerrar_caso falso positivo",
        que: "Cierra el caso con justificación",
        porque:
          "Con contexto completo (mismo backup de cada noche, cuenta de servicio conocida, destino legítimo), la alerta es un falso positivo. Cerrarlo bien documentado ahorra horas al equipo: es triaje de nivel profesional, tan valioso como contener un ataque.",
        ok: "¡Excelente triaje, becario! Caso cerrado como falso positivo con justificación. Has evitado bloquear la IP de Google, aislar un servidor de backups y deshabilitar una cuenta legítima: tres errores carísimos que un analista novato habría cometido.",
        msg: "Con esto dominas lo esencial del SOC: investigar antes de actuar. ¡Enhorabuena!",
        fallback: "Casi. Cierra el caso como falso positivo: escribe `cerrar_caso falso positivo`.",
      },
    ],
  },
};

export const BECARIO_CASOS = [BEC01, BEC02];
