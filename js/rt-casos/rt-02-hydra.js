// ============================================================
// RT-02 — Fuerza bruta SSH: la puerta con la cerradura mala
// Acceso inicial con hydra (MITRE T1110) + primera exfiltración.
// ============================================================

export default {
  id: "rt-02-hydra",
  modo: "rt",
  titulo: "Fuerza bruta SSH: la puerta con la cerradura mala",
  nivel: 1,
  severidad: "MEDIA",
  sla: 1200,
  xp: 280,
  briefing:
    "El servidor de backups 10.10.10.20 responde SSH, y la empresa 'olvidó' aplicar bloqueo por intentos fallidos. Tu misión: conseguir acceso con `hydra` usando el diccionario de /opt/wordlists/top1000.txt, entrar por `ssh` y robar el archivo de credenciales que el admin dejó en su home. Todo está autorizado por contrato.",
  red: {
    hosts: {
      "10.10.10.20": {
        hostname: "srv-backup.cibercorp.local",
        os: "Linux Debian 12",
        puertos: "22/tcp open ssh  OpenSSH 9.2p1\n80/tcp open http nginx 1.24.0",
      },
    },
  },
  credenciales: [
    {
      servicio: "ssh",
      host: "10.10.10.20",
      usuario: "admin",
      password: "Verano2024!",
      wordlist: "/opt/wordlists/top1000.txt",
      nota: "Cuenta admin con password predecible. El usuario esta en el diccionario.",
    },
  ],
  fs: {
    "/opt/wordlists/": ["top1000.txt"],
    "/opt/wordlists/top1000.txt": [
      "password", "123456", "admin", "cibercorp", "cibercorp2023", "verano2023",
      "Verano2024!", "Admin#2024$", "Passw0rd!2024", "invierno2024",
      "clave123", "administrador", "root", "toor", "qwerty", "letmein",
      "cibercorpAdmin1", "backup", "Backup2024", "monkey", "iloveyou",
    ].join("\n"),
    "/home/admin/": ["credenciales.txt", "notes.txt"],
    "/home/admin/credenciales.txt": [
      "=== CREDENCIALES (¡no subir a git!) ===",
      "ssh srv-fin-01: j.castro / Tr0bador!77",
      "panel ERP: admin / Admin#2024$",
      "vpn: m.garcia / VPN-2024-rojo",
      "TODO: rotar passwords cada 90 dias — pendiente desde 2022",
    ].join("\n"),
    "/home/admin/notes.txt": "Recordatorio: cambiar password del backup. Cualquier dia de estos...",
  },
  correctas: {
    recon: ["host:10.10.10.20"],
    acceso: ["host:10.10.10.20"],
    escalada: [],
    exfiltracion: ["archivo:/home/admin/credenciales.txt"],
  },
  incorrectas: ["acceso|host:10.10.10.5"],
  pistas: [
    "`hydra ssh 10.10.10.20 -u admin -w /opt/wordlists/top1000.txt` — la password del admin está en ese diccionario.",
    "Una vez dentro con `ssh admin@10.10.10.20`, explora /home/admin y exfiltra lo que encuentres con `exfiltrar <archivo>`.",
  ],
  eventos: [
    { en: 300, tipo: "alerta", sev: "LOW", titulo: "Intentos de login fallidos detectados en srv-backup (syslog)" },
  ],
  leccion: {
    titulo: "Fuerza bruta y credenciales débiles",
    resumen:
      "La fuerza bruta sigue funcionando donde faltan bloqueos por intentos fallidos, MFA y políticas de contraseñas. Un diccionario de 1.000 passwords es suficiente contra passwords humanas predecibles. Y una vez dentro: la misma password reutilizada en varios sitios.",
    deteccion:
      "- syslog con ráfagas de 'Failed password' en sshd.\n- Cuentas de servicio con passwords nunca rotadas.\n- Falta de fail2ban / bloqueo por IP.\n- Passwords en notas y archivos sin cifrar.",
    respuesta:
      "1. Bloqueo por intentos fallidos y retardos (fail2ban).\n2. MFA obligatorio en SSH y VPN.\n3. Política de contraseñas robusta + rotación.\n4. Prohibir reutilización y passwords en archivos.\n5. Inventario de cuentas de servicio.",
    aprendizaje: [
      "hydra automatiza el ataque de diccionario contra un servicio.",
      "La reutilización de credenciales convierte un fallo pequeño en una brecha grande.",
      "Nunca guardes passwords en archivos de texto en el servidor.",
    ],
    glosario: ["Fuerza bruta", "Diccionario", "MFA", "fail2ban"],
    mitre: ["T1110", "T1078", "T1552.001"],
  },
};
