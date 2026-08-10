// ============================================================
// becario.js — Modo Becario: práctica guiada paso a paso
// Para quien llega sin haber tocado un SOC en su vida.
// Cada paso explica QUÉ hacer y, sobre todo, POR QUÉ se hace.
// Jimmy valida comando a comando y el panel de guía muestra
// el paso actual con su explicación.
// ============================================================

import { notaRescate } from "./casos/helpers.js";

// ---------- BEC-01: phishing con adjunto malicioso ----------
export const BEC01 = {
  id: "bec-01-phishing",
  titulo: "Becario 1/3: el correo que huele mal (phishing)",
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
  titulo: "Becario 2/3: la alerta que gritaba «lobo» (triaje)",
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

// ---------- BEC-03: ransomware paso a paso ----------
export const BEC03 = {
  id: "bec-03-ransomware",
  titulo: "Becario 3/3: «LockCrypt» — ransomware paso a paso",
  nivel: 1,
  severidad: "CRÍTICA",
  sla: 9999,
  xp: 0,
  briefing:
    "Práctica guiada: el EDR acaba de detectar ransomware. Los archivos de un equipo se están cifrando con extensión .lcrypt y hay un servidor de mando y control (C2) coordinando la operación.\n\nAquí aprenderás la secuencia de oro: CONTENER, ver qué pasó con las copias de sombra, cortar el C2 y —lo más importante— por qué NO se paga el rescate. Te guío paso a paso y en cada uno te digo el porqué. Escribe `alertas` para empezar.",
  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-B3",
          sev: "CRITICAL",
          fuente: "edr",
          ts: "2026-02-11T03:41:10Z",
          titulo: "Comportamiento de ransomware detectado (LockCrypt)",
          detalle: "HOST-201: svch0st.exe en C:\\Windows\\Temp cifrando archivos (.lcrypt). Intento de borrado de copias de sombra (vssadmin).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-B4",
          sev: "HIGH",
          fuente: "firewall",
          ts: "2026-02-11T03:46:02Z",
          titulo: "Comunicación con C2 sospechoso",
          detalle: "Tráfico saliente desde HOST-201 hacia 91.240.118.77:443 (dominio kraken-update.top).",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),
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
  },
  correos: [],
  alertas: [
    { id: "ALT-B3", sev: "CRITICAL", fuente: "edr", titulo: "Comportamiento de ransomware detectado (LockCrypt)" },
    { id: "ALT-B4", sev: "HIGH", fuente: "firewall", titulo: "Comunicación con C2 sospechoso" },
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
    },
  },
  ips: {
    "91.240.118.77": {
      pais: "🇷🇴 Rumanía",
      asn: "AS51786",
      reputacion: "MALICIOSA — C2 de LockCrypt, listada en 14 blacklists.",
    },
  },
  vss: {
    host: "HOST-201",
    estado: "ELIMINADAS",
    detalle: "vssadmin delete shadows /all /quiet ejecutado por svch0st.exe a las 03:37:30",
    nota: "El ransomware borra las copias de sombra (VSS) para impedir la restauración local. La recuperación debe venir de backups offline/inalterables.",
  },
  correctas: {
    bloquear: ["dominio:kraken-update.top"],
    aislar: ["host:HOST-201", "host:HOST-202"],
    deshabilitar: ["usuario:m.ruiz"],
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
    titulo: "Becario 3: ransomware",
    resumen: "Práctica guiada completada.",
    deteccion: "-",
    respuesta: "-",
    aprendizaje: [
      "Contener primero: aislar de red (sin apagar) corta la propagación; cada minuto son más archivos cifrados.",
      "El ransomware borra las copias de sombra: el backup offline, inmutable y probado es la única defensa real.",
      "Cortar el C2 deja al malware sin piloto: bloquea dominio e IP en firewall y DNS.",
      "NO se paga el rescate: sin garantía de descifrado, y financia el siguiente ataque.",
    ],
    glosario: ["Ransomware", "C2", "Copias de sombra", "EDR", "Beaconing", "Movimiento lateral", "Rescate", "VSS"],
    mitre: ["T1486", "T1490", "T1078"],
  },
  becario: {
    pasos: [
      {
        cmd: "alertas",
        tipo: "comando",
        ejemplo: "alertas",
        que: "Lee la alerta del EDR",
        porque:
          "El EDR es el centinela del endpoint: detecta comportamiento de ransomware (cifrado masivo, procesos anómalos) antes que nadie. Una alerta CRÍTICA de EDR no se tria con calma: se actúa. Pero primero, lee qué dice exactamente.",
        ok: "Ahí está: LockCrypt cifrando archivos .lcrypt en HOST-201 y, ojo, «intento de borrado de copias de sombra». Ese detalle es la firma clásica del ransomware. Vamos paso a paso.",
        msg: "El atacante dejó una nota en el equipo afectado. Léela: escribe `cat /home/analista/casos/evidencias/README_LOCKCRYPT.txt`.",
        fallback: "Este paso es leer la alerta del EDR: escribe `alertas`.",
      },
      {
        cmd: "cat",
        tipo: "comando",
        ejemplo: "cat /home/analista/casos/evidencias/README_LOCKCRYPT.txt",
        que: "Lee la nota del rescate",
        porque:
          "La nota del rescate es el «correo» del atacante: cuánto pide, a dónde pagar y qué amenaza. Leerla te dice la magnitud del golpe. Y guarda la lección: NUNCA se paga. No hay garantía de recuperar los archivos y cada pago financia la siguiente víctima.",
        ok: "Exigen bitcoins «para devolver tus archivos». Suena tentador, pero es una promesa sin garantía: muchas víctimas pagan y no recuperan nada. El rescate NO es una opción.",
        msg: "Ahora mira qué pasó con las copias de sombra del sistema: escribe `vssadmin list shadows`.",
        fallback: "Este paso es leer la nota del rescate: escribe `cat /home/analista/casos/evidencias/README_LOCKCRYPT.txt`.",
      },
      {
        cmd: "vssadmin",
        tipo: "comando",
        ejemplo: "vssadmin list shadows",
        que: "Mira las copias de sombra",
        porque:
          "Windows crea copias de sombra (VSS) para restaurar archivos. El ransomware las BORRA a propósito con vssadmin para que no puedas recuperar nada localmente. Por eso el backup offline, desconectado de la red, es la única defensa real: el atacante no puede tocarlo.",
        ok: "Confirmado: las copias de sombra de HOST-201 fueron ELIMINADAS por el propio malware. La restauración local no existe: la recuperación saldrá de los backups limpios.",
        msg: "Hora de contener. Primero, corta la propagación: aísla el host afectado. Escribe `aislar HOST-201`.",
        fallback: "Este paso es comprobar las copias de sombra: escribe `vssadmin list shadows`.",
      },
      {
        cmd: "aislar",
        tipo: "aislar",
        objetivo: "HOST-201",
        ejemplo: "aislar HOST-201",
        que: "Aísla el host afectado",
        porque:
          "Contener es la prioridad nº1: cada minuto son más archivos cifrados y más posibilidades de que el ransomware salte a otros equipos. Aislar HOST-201 de la red corta la propagación… sin apagarlo, porque apagar destruye las evidencias del forense (procesos, conexiones, memoria).",
        ok: "HOST-201 aislado en cuarentena. El malware ya no puede saltar a otros equipos ni seguir recibiendo órdenes… en teoría. Falta cortar el mando.",
        msg: "El ransomware aún puede recibir órdenes del C2. Bloquea el servidor de mando y control: escribe `bloquear kraken-update.top`.",
        fallback: "Casi. Aísla el host donde se ejecuta el ransomware: `aislar HOST-201`.",
      },
      {
        cmd: "bloquear",
        tipo: "bloquear",
        objetivo: "kraken-update.top",
        ejemplo: "bloquear kraken-update.top",
        que: "Corta el servidor de mando y control (C2)",
        porque:
          "El C2 es el cerebro de la operación: da órdenes al ransomware (qué cifrar, cuándo). Bloquear su dominio —y su IP— en firewall y DNS corta el mando y control: el malware se queda sin piloto y sin forma de entregar los datos robados.",
        ok: "Dominio kraken-update.top bloqueado en firewall y DNS. El C2 ya no llega a HOST-201: el ransomware está huérfano. También bloquea su IP 91.240.118.77 si quieres rematar la faena.",
        msg: "Ahora la puerta que usó el atacante para entrar: la cuenta del usuario. Escribe `deshabilitar m.ruiz`.",
        fallback: "Casi. Bloquea el dominio del C2: `bloquear kraken-update.top` (es el que aparece en las alertas).",
      },
      {
        cmd: "deshabilitar",
        tipo: "deshabilitar",
        objetivo: "m.ruiz",
        ejemplo: "deshabilitar m.ruiz",
        que: "Deshabilita la cuenta comprometida",
        porque:
          "El ransomware entró por el documento que abrió m.ruiz y luego usó SUS credenciales para intentar moverse a otros equipos (movimiento lateral). Deshabilitar la cuenta corta ese acceso de inmediato y obliga a rotar la contraseña antes de reactivarla.",
        ok: "Cuenta m.ruiz deshabilitada y sesiones revocadas. El atacante ha perdido su puerta de entrada y su llave para moverse. Contención completa.",
        msg: "Última decisión, la más importante: el atacante pide el rescate. ¿Qué haces? Escribe `pagar` y piénsalo bien.",
        fallback: "Casi. Deshabilita la cuenta del usuario cuyo documento abrió el ransomware: `deshabilitar m.ruiz`.",
      },
      {
        cmd: "pagar",
        tipo: "comando",
        ejemplo: "pagar",
        que: "Decide: ¿pagas el rescate?",
        porque:
          "La pregunta del millón. Respuesta profesional: NO. Pagar no garantiza que te devuelvan los archivos, te marca como objetivo para el siguiente ataque y financia la próxima campaña contra otra empresa. La recuperación sale de los backups limpios y del plan de restauración. El rescate no es un gasto: es una inversión en que te ataquen otra vez.",
        ok: "¡Exacto! NO se paga. Has hecho una contención completa de ransomware: aislar, cortar el C2, deshabilitar la cuenta y rechazar el rescate. La restauración saldrá de los backups limpios. Así se responde a un LockCrypt de verdad.",
        msg: "¡Enhorabuena, becario! Has completado la tercera práctica. Ya sabes responder ante el enemigo más temido del SOC.",
        fallback: "Este paso es tomar la decisión: escribe `pagar` y mira qué dice Jimmy (spoiler: no se paga).",
      },
    ],
  },
};

export const BECARIO_CASOS = [BEC01, BEC02, BEC03];
