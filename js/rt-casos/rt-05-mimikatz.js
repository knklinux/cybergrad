// ============================================================
// RT-05 — Mimikatz: la memoria lo recuerda todo
// Post-explotación en Windows, volcado de credenciales y pivote.
// ============================================================

export default {
  id: "rt-05-mimikatz",
  modo: "rt",
  titulo: "Mimikatz: la memoria lo recuerda todo",
  nivel: 3,
  severidad: "CRÍTICA",
  sla: 1800,
  xp: 420,
  briefing:
    "El servidor Windows 10.10.10.60 (SRV-WIN01) está sin parchear contra EternalBlue. Tu misión: abrir sesión con `msf smb-eternalblue`, volcar las credenciales en memoria con `mimikatz`, usar las del admin para saltar al servidor de archivos (10.10.10.70) y exfiltrar la base de clientes /data/clientes.db. Los logs de Windows se rotan cada 30 minutos: el tiempo corre.",
  red: {
    hosts: {
      "10.10.10.60": {
        hostname: "srv-win01.acme.local",
        os: "Windows Server 2019 (sin parchear, MS17-010)",
        puertos: "135/tcp open  msrpc\n445/tcp open  microsoft-ds (SMB)\n3389/tcp open ms-wbt-server (RDP)",
      },
      "10.10.10.70": {
        hostname: "files.acme.local",
        os: "Linux Ubuntu 22.04",
        puertos: "22/tcp  open  ssh  OpenSSH 8.9p1\n443/tcp open  https nginx 1.24.0",
      },
    },
  },
  exploits: {
    "smb-eternalblue": {
      objetivo: "10.10.10.60",
      tipo: "meterpreter",
      resultado:
        "[*] EternalBlue exploit (MS17-010) ejecutado\n[*] Payload SYSTEM en srv-win01.acme.local\n[*] Meterpreter session 2 opened (10.10.10.60:445)\nmeterpreter > sysinfo\nComputer: SRV-WIN01\nOS: Windows Server 2019 (Build 17763)\nmeterpreter > getuid\nServer username: NT AUTHORITY\\SYSTEM",
    },
  },
  mimikatz: {
    host: "10.10.10.60",
    creds: [
      "ACME-DOMAIN\\admin : Passw0rd!2024  (plaintext)",
      "ACME-DOMAIN\\j.castro : Tr0bador!77  (NTLM hash: aad3b435b51404ee...)",
      "SRV-WIN01\\localadmin : Lab#2024$  (plaintext)",
      "ACME-DOMAIN\\krbtgt : (hash, no descifrable)",
    ],
    nota: "El dominio reutiliza la password de admin en el servidor de archivos (10.10.10.70).",
  },
  fs: {
    "/data/": ["clientes.db", "README.txt"],
    "/data/clientes.db": [
      "=== BASE DE CLIENTES ACME (confidencial) ===",
      "registros: 42.000",
      "campos: nombre, DNI, email, direccion, IBAN",
      "ultima exportacion: hace 3 dias",
      "responsable: j.castro (cumplimiento)",
      "NOTA: datos personales regulados por RGPD - acceso restringido",
    ].join("\n"),
    "/data/README.txt": "Mantener cifrado. Solo personal autorizado. - Seguridad",
  },
  credenciales: [
    {
      servicio: "ssh",
      host: "10.10.10.70",
      usuario: "admin",
      password: "Passw0rd!2024",
      nota: "Reutilizacion de password: la misma del dominio en el servidor de archivos.",
    },
  ],
  correctas: {
    recon: ["host:10.10.10.60"],
    acceso: ["host:10.10.10.60"],
    escalada: ["host:10.10.10.60"],
    exfiltracion: ["archivo:/data/clientes.db"],
  },
  incorrectas: [],
  pistas: [
    "`msf smb-eternalblue 10.10.10.60` abre la sesión SYSTEM.",
    "`mimikatz 10.10.10.60` extrae las credenciales en memoria (sekurlsa::logonpasswords).",
    "El admin reutiliza su password: prueba `ssh admin@10.10.10.70` con Passw0rd!2024.",
    "Objetivo final: `exfiltrar /data/clientes.db`.",
  ],
  eventos: [
    { en: 600, tipo: "alerta", sev: "HIGH", titulo: "Windows Event 4625/4624: accesos anomalos en SRV-WIN01" },
  ],
  leccion: {
    titulo: "Post-explotación: credenciales en memoria y movimiento lateral",
    resumen:
      "En Windows, las credenciales viven en memoria (proceso LSASS). Mimikatz las extrae en texto plano o como hashes NTLM. Con una cuenta de dominio, el atacante se mueve lateralmente a otros servidores. Y si el admin reutiliza la misma password, un salto más y tienes los datos de 42.000 clientes.",
    deteccion:
      "- Windows Event 4624 (inicio de sesión) desde IPs inusuales.\n- Carga de mimikatz o herramientas similares (firma en AV/EDR).\n- Accesos SMB administrativos (Event 5140).\n- Reutilización de credenciales entre servicios.",
    respuesta:
      "1. Proteger LSASS (Credential Guard) y PPL.\n2. Cuentas con MFA y passwords únicas por servicio.\n3. Segmentación de red: el servidor de archivos no debe aceptar SSH de Internet.\n4. Detección de mimikatz con EDR.\n5. Cifrado de datos en reposo y monitorización de accesos.",
    aprendizaje: [
      "Si alguien llega a una sesión SYSTEM en Windows, las credenciales del dominio son suyas.",
      "El movimiento lateral se alimenta de passwords reutilizadas.",
      "Los datos personales sin cifrar + acceso amplio = brecha RGPD.",
    ],
    glosario: ["LSASS", "NTLM", "Pivote", "Credential Guard"],
    mitre: ["T1003.001", "T1078", "T1021.001"],
  },
};
