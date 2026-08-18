export default {
  id: "fp-backup-01",
  titulo: "«Exfiltración de datos» — Backup nocturno (falso positivo)",
  severidad: "MEDIA",
  nivel: 2,
  sla: 720, // 12 minutos
  xp: 240,
  briefing:
    "El DLP ha disparado una alerta CRÍTICA: 40 GB de datos salientes desde el servidor de archivos " +
    "hacia Google Cloud (34.77.0.0/16) a las 03:00. Nadie trabaja a esa hora.\n\n" +
    "Tu tarea: investigar antes de actuar. No toda alerta es un ataque: el triaje correcto " +
    "distingue ruido de señal y evita el agotamiento por alertas. ¿Es exfiltración real?",
  fs: {
    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-401",
          sev: "CRITICAL",
          fuente: "dlp",
          ts: "2026-02-11T03:02:00Z",
          titulo: "Exfiltración de datos: 40 GB salientes",
          detalle:
            "srv-files-01 transfiere 40 GB a 34.77.0.0/16 (Google Cloud) en la madrugada. Volumen muy superior a la media diaria (≈2 GB).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-402",
          sev: "MEDIUM",
          fuente: "edr",
          ts: "2026-02-11T03:03:00Z",
          titulo: "Cuenta de servicio con privilegios elevados activa",
          detalle: "La cuenta de servicio 'backupsvc' inicia sesión en srv-files-01 a las 03:00 (horario inusual).",
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
      "Feb 11 03:20:09 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:25:52 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:30:17 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:35:29 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:40:44 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:45:58 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:50:12 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 03:55:27 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/",
      "Feb 11 04:00:03 dlp01 transfer: srv-files-01 -> 34.77.94.118:443  bytes=524288000 dir=/mnt/backup/  FIN",
    ].join("\n"),

    "/var/log/dlp/historial.txt": [
      "Ene 28 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Ene 29 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Ene 30 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 01 03:00:02 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 02 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 03 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 04 03:00:02 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 05 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 06 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 07 03:00:02 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 08 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 09 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
      "Feb 10 03:00:01 dlp01 transfer: srv-files-01 -> 34.77.94.118:443 bytes=524288000 dir=/mnt/backup/",
    ].join("\n"),

    "/etc/crontab": [
      "# Minuto  Hora  Día  Mes  Semana  Usuario  Comando",
      "0  3  *  *  1-6  backupsvc  /usr/local/bin/backup-to-cloud.sh --dest gdrive:cibercorp-backups",
      "",
      "# Nota: el backup diario a Google Drive se ejecuta cada noche a las 03:00.",
    ].join("\n"),

    "/usr/local/bin/backup-to-cloud.sh": [
      "#!/bin/bash",
      "# Backup automatizado de /mnt/backup a Google Drive (cuenta backupsvc)",
      "rclone copy /mnt/backup gdrive:cibercorp-backups --log-file /var/log/rclone.log",
    ].join("\n"),

    "/var/log/rclone.log": [
      "2026/02/11 03:00:01 INFO  : Starting backup run (backupsvc)",
      "2026/02/11 03:00:01 INFO  : Copying 40.0 GiB from /mnt/backup to gdrive:cibercorp-backups",
      "2026/02/11 04:00:03 INFO  : Finished: 40.0 GiB copied, 0 errors",
    ].join("\n"),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-1189 — presunta exfiltración.\n" +
      "Revisa: /var/log/dlp/transfer.log, /var/log/dlp/historial.txt, /etc/crontab.",
  },

  correos: [],
  alertas: [
    { id: "ALT-401", sev: "CRITICAL", fuente: "dlp", titulo: "Exfiltración de datos: 40 GB salientes" },
    { id: "ALT-402", sev: "MEDIUM", fuente: "edr", titulo: "Cuenta de servicio con privilegios elevados activa" },
  ],

  dominios: {},
  ips: {
    "34.77.94.118": {
      pais: "🇺🇸 Estados Unidos",
      asn: "AS396982 (Google)",
      reputacion: "LIMPIA — infraestructura oficial de Google Cloud.",
      nota: "Rango 34.77.0.0/16 pertenece a Google LLC.",
    },
  },

  urls: {},

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

  eventos: [
    {
      en: 300,
      tipo: "msg",
      titulo: "Jefe de turno",
      detalle: "«Ojo: esta alerta se dispara cada noche desde hace meses. El DLP no tiene baseline configurado. Investiga antes de bloquear nada.»",
    },
  ],

  pistas: [
    "Compara el log de hoy con el historial (`/var/log/dlp/historial.txt`).",
    "¿Quién ejecuta el proceso? Mira `/etc/crontab` y el script de backup.",
    "Comprueba a quién pertenece la IP de destino: `whois 34.77.94.118`.",
    "Si todo cuadra con una operación rutinaria, el cierre correcto es `cerrar_caso` con justificación.",
  ],

  leccion: {
    titulo: "Triaje: no toda alerta es un ataque",
    mitre: ["T1071.001 (contexto)", "T1036 (impostor)"],
    resumen:
      "La alerta era correcta en los datos (40 GB salientes) pero el contexto la invalidaba: " +
      "es el backup nocturno automatizado de siempre, hacia Google Drive, con la cuenta de servicio backupsvc. " +
      "El DLP carecía de baseline y disparaba un falso positivo todas las noches.",
    deteccion:
      "- Compara con el histórico: la transferencia es idéntica cada noche desde hace semanas.\n" +
      "- Identifica al actor: cuenta de servicio conocida (backupsvc), no una cuenta nueva.\n" +
      "- Verifica el destino: 34.77.94.118 es infraestructura oficial de Google, no una IP de hosting anónimo.\n" +
      "- Confirma la automatización: /etc/crontab ejecuta el script de backup a las 03:00.\n" +
      "- El volumen 'inusual' es inusual solo porque no hay baseline: eso es un problema del DLP, no un ataque.",
    respuesta:
      "1. Reunir contexto: histórico, actor, destino, automatización.\n" +
      "2. Cerrar el caso como falso positivo con justificación documentada.\n" +
      "3. Proponer una mejora: configurar baseline en el DLP para reducir ruido.\n" +
      "4. En un incidente real, este mismo patrón (volumen + destino nuevo + cuenta nueva) sería exfiltración.",
    aprendizaje: [
      "Los datos sin contexto no son señal: siempre pregunta '¿es normal en esta red?'.",
      "El historial de logs es tu mejor amigo: el comportamiento anómalo se define contra la normalidad.",
      "Cerrar un falso positivo correctamente es TAN valioso como contener un ataque: ahorra horas al equipo.",
      "Si algo es 'inusual', comprueba primero si es simplemente desconocido para ti.",
    ],
    glosario: ["Falso positivo", "Baseline", "DLP", "Cuenta de servicio", "Triaje"],
  },
};
