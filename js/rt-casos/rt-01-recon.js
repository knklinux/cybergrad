// ============================================================
// RT-01 — Reconocimiento: mapeando la superficie de ataque
// Aprendiz de pentester: enumerar antes de atacar (MITRE T1595).
// ============================================================

export default {
  id: "rt-01-recon",
  modo: "rt",
  titulo: "Reconocimiento: mapeando la superficie de ataque",
  nivel: 1,
  severidad: "BAJA",
  sla: 900,
  xp: 240,
  briefing:
    "Contrato firmado: ACME te autoriza a probar su propia infraestructura antes de que lo hagan los atacantes de verdad. Tu primera misión es RECONOCIMIENTO: descubre qué servicios están expuestos en el rango 10.10.10.0/24 y encuentra el panel de administración. No ataques todavía: primero, mapa. Empieza con `nmap`.",
  red: {
    subredes: {
      "10.10.10.0/24": {
        activos: ["10.10.10.5", "10.10.10.20", "10.10.10.50"],
        desc: "DMZ de ACME Corp (segmento expuesto a Internet)",
      },
    },
    hosts: {
      "10.10.10.5": {
        hostname: "web01.acme.local",
        os: "Linux Ubuntu 22.04",
        puertos: "22/tcp   open  ssh       OpenSSH 8.9p1\n80/tcp   open  http      nginx 1.24.0\n8080/tcp open  http-proxy",
      },
      "10.10.10.20": {
        hostname: "srv-backup.acme.local",
        os: "Linux Debian 12",
        puertos: "22/tcp open ssh  OpenSSH 9.2p1\n80/tcp open http nginx 1.24.0",
      },
      "10.10.10.50": {
        hostname: "web02.acme.local",
        os: "Linux Ubuntu 20.04",
        puertos: "22/tcp open ssh  OpenSSH 8.2p1\n80/tcp open http nginx 1.18.0",
      },
    },
  },
  web: {
    "http://10.10.10.5": {
      raiz:
        "<html><head><title>ACME Corp - Inicio</title></head>\n<body><h1>Bienvenido a ACME Corp</h1>\n<p>Soluciones integrales desde 1998. <a href='/contacto'>Contacto</a></p></body></html>",
      rutas: {
        "/contacto": "<h1>Formulario de contacto</h1><form>...</form>",
        "/admin": "<h1>Panel de administracion</h1><form action='/admin/login' method='POST'><input name='usuario'><input type='password' name='password'><button>Entrar</button></form>",
      },
      dirs: ["/admin", "/assets", "/api"],
      nikto: [
        "/admin: panel de administracion expuesto sin autenticacion",
        "Server: nginx 1.24.0 (version desactualizada, CVE-2023-XXXX)",
        "/api: endpoint sin limite de peticiones",
      ],
    },
  },
  correctas: {
    recon: ["host:10.10.10.5", "url:http://10.10.10.5/admin"],
    acceso: [],
    escalada: [],
    exfiltracion: [],
  },
  incorrectas: [],
  pistas: [
    "Escanea el rango primero: `nmap 10.10.10.0/24` para ver qué hosts están vivos.",
    "Sobre web01, prueba `gobuster http://10.10.10.5` para descubrir directorios ocultos.",
  ],
  eventos: [],
  leccion: {
    titulo: "Reconocimiento: el 80% del pentest",
    resumen:
      "Antes de tocar nada, hay que saber qué hay ahí fuera. El reconocimiento (footprinting/enumeración) convierte un rango de IPs en un mapa de servicios, versiones y puertas abiertas. Sin él, atacas a ciegas.",
    deteccion:
      "- nmap: escaneo de puertos y detección de versiones y SO.\n- gobuster: fuerza bruta de directorios en servidores web.\n- nikto: análisis de vulnerabilidades conocidas en el servidor web.\n- OSINT: información pública de la empresa (DNS, correos, empleados).",
    respuesta:
      "1. Escanea el rango completo para identificar hosts vivos.\n2. Enumera puertos y servicios de cada host.\n3. Descubre directorios y paneles ocultos.\n4. Anota versiones: cada versión vieja es una vulnerabilidad potencial.\n5. Documenta todo: es la base del informe final.",
    aprendizaje: [
      "La enumeración es la fase que más tiempo y hallazgos aporta.",
      "Un panel de admin expuesto sin protección es un hallazgo de severidad alta.",
      "Las versiones desactualizadas son candidatas a explotación.",
    ],
    glosario: ["Footprinting", "Enumeración", "CVE", "OSINT"],
    mitre: ["T1595", "T1590", "T1046"],
  },
};
