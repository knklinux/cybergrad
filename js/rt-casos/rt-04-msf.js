// ============================================================
// RT-04 — De la web al sistema: Metasploit + escalada
// Subida de archivos vulnerable, meterpreter y sudo mal configurado.
// ============================================================

export default {
  id: "rt-04-msf",
  modo: "rt",
  titulo: "De la web al sistema: Metasploit y escalada de privilegios",
  nivel: 2,
  severidad: "ALTA",
  sla: 1500,
  xp: 360,
  briefing:
    "La intranet 10.10.10.50 tiene una subida de archivos que no valida nada. Tu misión: buscar el exploit con `searchsploit`, abrir sesión con `msf`, escalar privilegios a www-data (un sudo mal configurado) y exfiltrar /var/www/config/app.env. Cuidado con el reloj: el equipo de SOC rota en 25 minutos.",
  red: {
    hosts: {
      "10.10.10.50": {
        hostname: "web02.cibercorp.local",
        os: "Linux Ubuntu 20.04",
        puertos: "22/tcp open ssh  OpenSSH 8.2p1\n80/tcp open http nginx 1.18.0",
      },
    },
  },
  web: {
    "http://10.10.10.50": {
      raiz:
        "<html><head><title>Intranet CiberCorp</title></head>\n<body><h1>Intranet corporativa</h1><a href='/upload'>Subir archivo</a></body></html>",
      rutas: {
        "/upload": "<h1>Subida de archivos</h1><form enctype='multipart/form-data'><input type='file'><button>Subir</button></form><p style='color:red'>Sin validacion de extension ni contenido</p>",
      },
      dirs: ["/upload", "/panel", "/backup"],
      nikto: [
        "/upload: subida de archivos sin validacion (RCE potencial)",
        "Server: nginx 1.18.0 (desactualizado)",
      ],
    },
  },
  exploits: {
    "php-upload-rce": {
      objetivo: "http://10.10.10.50/upload",
      tipo: "meterpreter",
      resultado:
        "[*] Uploading shell.php...\n[*] Payload ejecutado en web02.cibercorp.local (uid=33(www-data))\n[*] Meterpreter session 1 opened (10.10.10.50:4444 -> 10.10.10.50:80)\nmeterpreter > getuid\nServer username: www-data\nmeterpreter > shell\n$ sudo -l\nUser www-data may run the following commands on web02:\n    (root) NOPASSWD: /usr/bin/find",
    },
  },
  fs: {
    "/var/www/config/": ["app.env"],
    "/var/www/config/app.env": [
      "DB_HOST=10.10.10.30",
      "DB_NAME=cibercorp_shop",
      "DB_USER=app",
      "DB_PASS=App#2024$db",
      "API_KEY=sk_live_51a7f9e2b8c4d3e2f1a0b",
      "SMTP_PASS=Correo#2024",
    ].join("\n"),
    "/opt/exploitdb/": ["searchsploit.txt"],
    "/opt/exploitdb/searchsploit.txt": [
      "php/upload/php-upload-rce  |  Subida de archivos sin validar en PHP (RCE)  |  remote",
      "linux/local/sudo-find-privesc  |  sudo NOPASSWD /usr/bin/find -> root  |  local",
      "windows/smb/ms17-010  |  EternalBlue SMB RCE  |  remote",
    ].join("\n"),
  },
  correctas: {
    recon: ["host:10.10.10.50"],
    acceso: ["url:http://10.10.10.50/upload"],
    escalada: ["usuario:www-data"],
    exfiltracion: ["archivo:/var/www/config/app.env"],
  },
  incorrectas: ["acceso|url:http://10.10.10.30"],
  pistas: [
    "Busca el exploit en la base local: `searchsploit php upload`.",
    "`msf php-upload-rce http://10.10.10.50/upload` abre la sesión meterpreter.",
    "La sesión te dice qué comando puedes ejecutar como root: `escalar_priv www-data`.",
    "Después de escalar: `exfiltrar /var/www/config/app.env`.",
  ],
  eventos: [
    { en: 300, tipo: "alerta", sev: "MEDIUM", titulo: "IDS: subida de archivo con extension .php a intranet" },
  ],
  leccion: {
    titulo: "De una subida de archivos a root: la cadena de la explotación",
    resumen:
      "Una subida de archivos sin validar permite ejecutar código en el servidor (RCE). Metasploit lo automatiza con meterpreter. Y un sudo mal configurado (NOPASSWD para un binario abusable como find) convierte la sesión de www-data en root. Tres fallos pequeños, una cadena letal.",
    deteccion:
      "- Subida de archivos sin validar extensión y contenido.\n- Endpoints de subida expuestos en la intranet.\n- sudoers con binarios abusables (find, vim, python...).\n- Servicios web desactualizados.",
    respuesta:
      "1. Validar tipo MIME, extensión y contenido en la subida + antivirus.\n2. Servir archivos subidos desde otro dominio sin ejecución.\n3. Auditar sudoers: solo binarios imprescindibles.\n4. Segregar intranet y parchear versiones.\n5. Detectar subidas sospechosas con el WAF/IDS.",
    aprendizaje: [
      "RCE vía subida de archivos es uno de los fallos más explotados.",
      "meterpreter es el estándar de facto para post-explotación.",
      "Un privilegio mal concedido es una escalada regalada.",
    ],
    glosario: ["RCE", "Meterpreter", "sudoers", "NOPASSWD"],
    mitre: ["T1190", "T1068", "T1505.003"],
  },
};
