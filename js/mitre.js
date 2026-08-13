// ============================================================
// mitre.js — Base de conocimiento MITRE ATT&CK del juego
// Catálogo de tácticas y técnicas que aparecen en las lecciones
// de los casos (SOC y Red Team). Es la fuente única de verdad
// para el árbol de habilidades (habilidades.js) y para que
// Jimmy responda preguntas libres (jimmy-ia.js).
// ============================================================

// Orden de tácticas en el árbol (del ataque a la respuesta)
export const TACTICAS = [
  { id: "TA0043", nombre: "Reconocimiento", icono: "🧭", desc: "Enumerar el objetivo antes de atacar: IPs, servicios, versiones, dominios." },
  { id: "TA0001", nombre: "Acceso Inicial", icono: "🚪", desc: "Conseguir la primera puerta: phishing, exploits a servicios expuestos, credenciales válidas." },
  { id: "TA0002", nombre: "Ejecución", icono: "⚡", desc: "Correr código en el sistema: PowerShell, macros, tareas programadas, scripts." },
  { id: "TA0003", nombre: "Persistencia", icono: "🔁", desc: "Que el acceso sobreviva a reinicios y cambios: tareas, webshells, cuentas válidas." },
  { id: "TA0004", nombre: "Escalada de Privilegios", icono: "🪜", desc: "Subir de usuario a administrador/system: exploits locales, cuentas con más permisos." },
  { id: "TA0005", nombre: "Defensa Evasión", icono: "🫥", desc: "No ser detectado: suplantar procesos, ocultar artefactos, usar cuentas legítimas." },
  { id: "TA0006", nombre: "Acceso a Credenciales", icono: "🔑", desc: "Robar contraseñas y hashes: fuerza bruta, volcado de memoria, credenciales en archivos." },
  { id: "TA0007", nombre: "Descubrimiento", icono: "🔎", desc: "Explorar la red y los sistemas para decidir el siguiente movimiento." },
  { id: "TA0008", nombre: "Movimiento Lateral", icono: "🕸️", desc: "Saltar de un host a otro: servicios remotos (RDP, SMB, SSH)." },
  { id: "TA0009", nombre: "Recolección", icono: "📂", desc: "Recopilar datos de interés: correos, archivos locales, repositorios, unidades compartidas." },
  { id: "TA0011", nombre: "Comando y Control (C2)", icono: "📡", desc: "Mantener el canal con el atacante: protocolos de aplicación, DNS, transferencia de herramientas." },
  { id: "TA0010", nombre: "Exfiltración", icono: "📤", desc: "Sacar los datos robados: protocolos alternativos, C2, servicios web, USB." },
  { id: "TA0040", nombre: "Impacto", icono: "💥", desc: "El daño final: cifrar (ransomware), borrar copias de seguridad, interrumpir el negocio." },
];

// Técnicas presentes en las lecciones del juego (código → nombre, táctica principal, descripción)
export const TECNICAS = {
  // Reconocimiento
  "T1595": { nombre: "Active Scanning", tactica: "TA0043", desc: "Escaneo activo del objetivo: nmap para descubrir puertos, servicios y versiones." },
  "T1590": { nombre: "Gather Victim Network Information", tactica: "TA0043", desc: "Recopilar información de red del objetivo: IPs, DNS, topología, segmentos." },
  "T1046": { nombre: "Network Service Discovery", tactica: "TA0007", desc: "Descubrir servicios de red: puertos abiertos, versiones, protocolos accesibles." },
  // Acceso inicial
  "T1566": { nombre: "Phishing", tactica: "TA0001", desc: "Correo con enlace o adjunto malicioso dirigido a usuarios. La puerta de entrada número uno." },
  "T1566.001": { nombre: "Phishing: Spearphishing Attachment", tactica: "TA0001", desc: "Adjunto malicioso (macro, docm, pdf) enviado a una víctima concreta." },
  "T1566.002": { nombre: "Phishing: Spearphishing Link", tactica: "TA0001", desc: "Enlace malicioso en el correo que lleva a descargar malware o suplantar un login." },
  "T1190": { nombre: "Exploit Public-Facing Application", tactica: "TA0001", desc: "Explotar una vulnerabilidad de una aplicación expuesta: SQLi, RCE, webshell." },
  "T1078": { nombre: "Valid Accounts", tactica: "TA0001", desc: "Usar cuentas legítimas robadas o reutilizadas. Difícil de detectar: parece tráfico normal." },
  // Ejecución
  "T1204": { nombre: "User Execution", tactica: "TA0002", desc: "La víctima ejecuta el código: abrir un adjunto o pulsar un enlace." },
  "T1204.001": { nombre: "User Execution: Malicious Link", tactica: "TA0002", desc: "La víctima pulsa el enlace y descarga o autentica donde no debía." },
  "T1204.002": { nombre: "User Execution: Malicious File", tactica: "TA0002", desc: "La víctima abre el archivo con macros y el código malicioso se ejecuta." },
  "T1059": { nombre: "Command and Scripting Interpreter", tactica: "TA0002", desc: "Ejecutar comandos/scripts: PowerShell, bash, cmd. El pan de cada día del atacante." },
  "T1059.001": { nombre: "PowerShell", tactica: "TA0002", desc: "PowerShell con scripts ofuscados o -enc (base64). Muy común en Windows." },
  "T1053": { nombre: "Scheduled Task/Job", tactica: "TA0002", desc: "Programar tareas para ejecutar código: persistencia y ejecución programada." },
  "T1053.005": { nombre: "Scheduled Task", tactica: "TA0003", desc: "Tarea programada de Windows que ejecuta el malware y se mantiene tras reinicios." },
  // Persistencia
  "T1505": { nombre: "Server Software Component", tactica: "TA0003", desc: "Inyectar un componente en el servidor (p. ej. una webshell) que sobrevive." },
  "T1505.003": { nombre: "Web Shell", tactica: "TA0003", desc: "Un script en el servidor web que da acceso remoto cada vez que se visita." },
  // Escalada de privilegios
  "T1068": { nombre: "Exploitation for Privilege Escalation", tactica: "TA0004", desc: "Explotar una vulnerabilidad para pasar a root/system o a más privilegios." },
  // Defensa evasión
  "T1036": { nombre: "Masquerading", tactica: "TA0005", desc: "Disfrazar el malware de archivo o proceso legítimo (nombre, icono, firma)." },
  "T1656": { nombre: "Impersonation", tactica: "TA0005", desc: "Suplantar a una persona de confianza (directivo, proveedor) para engañar a la víctima." },
  // Acceso a credenciales
  "T1110": { nombre: "Brute Force", tactica: "TA0006", desc: "Probar contraseñas contra un servicio: diccionarios, sprays, combinaciones." },
  "T1110.001": { nombre: "Brute Force: Password Guessing", tactica: "TA0006", desc: "Probar contraseñas comunes contra un usuario concreto." },
  "T1110.002": { nombre: "Brute Force: Password Cracking", tactica: "TA0006", desc: "Romper hashes fuera de línea con diccionarios (john/hashcat)." },
  "T1110.003": { nombre: "Brute Force: Password Spraying", tactica: "TA0006", desc: "Una misma contraseña contra muchos usuarios: evita bloqueos de cuenta." },
  "T1003": { nombre: "OS Credential Dumping", tactica: "TA0006", desc: "Extraer credenciales de la memoria o del sistema (LSASS, SAM)." },
  "T1003.001": { nombre: "LSASS Memory", tactica: "TA0006", desc: "Volcar la memoria de LSASS con mimikatz para obtener hashes y contraseñas." },
  "T1552": { nombre: "Unsecured Credentials", tactica: "TA0006", desc: "Credenciales guardadas sin proteger: archivos de config, historiales, scripts." },
  "T1552.001": { nombre: "Credentials In Files", tactica: "TA0006", desc: "Contraseñas en archivos legibles: configs, .env, historiales, notas." },
  "T1539": { nombre: "Steal Web Session Cookie", tactica: "TA0006", desc: "Robar la cookie de sesión para entrar como la víctima sin contraseña." },
  // Movimiento lateral
  "T1021": { nombre: "Remote Services", tactica: "TA0008", desc: "Usar servicios remotos legítimos para moverse: RDP, SMB, SSH." },
  "T1021.001": { nombre: "Remote Desktop Protocol", tactica: "TA0008", desc: "Entrar por RDP con credenciales robadas y controlar el escritorio remoto." },
  "T1021.002": { nombre: "SMB/Windows Admin Shares", tactica: "TA0008", desc: "Propagarse por la red usando recursos compartidos administrativos (C$, ADMIN$)." },
  // Recolección
  "T1005": { nombre: "Data from Local System", tactica: "TA0009", desc: "Robar datos del sistema local: documentos, correos, bases de datos pequeñas." },
  "T1114": { nombre: "Email Collection", tactica: "TA0009", desc: "Acceder al correo de la víctima y leerlo o reenviarlo." },
  "T1114.003": { nombre: "Email Forwarding Rule", tactica: "TA0009", desc: "Crear una regla que reenvía copias del correo al atacante en silencio." },
  "T1213": { nombre: "Data from Information Repositories", tactica: "TA0009", desc: "Extraer datos de repositorios: bases de datos, wikis, sharepoint, gestores documentales." },
  "T1039": { nombre: "Data from Network Shared Drive", tactica: "TA0009", desc: "Copiar datos de unidades de red compartidas donde la empresa guarda lo importante." },
  // C2
  "T1071": { nombre: "Application Layer Protocol", tactica: "TA0011", desc: "Usar protocolos legítimos (HTTP, DNS) para el canal de mando y control." },
  "T1071.001": { nombre: "Web Protocols", tactica: "TA0011", desc: "C2 camuflado en tráfico HTTP/HTTPS: peticiones que parecen normales." },
  "T1071.004": { nombre: "DNS", tactica: "TA0011", desc: "C2 por DNS: las consultas DNS codifican datos y casi nadie las vigila." },
  "T1105": { nombre: "Ingress Tool Transfer", tactica: "TA0011", desc: "El atacante descarga más herramientas al sistema comprometido." },
  // Exfiltración
  "T1041": { nombre: "Exfiltration Over C2 Channel", tactica: "TA0010", desc: "Sacar datos por el mismo canal de mando y control (nc, DNS, HTTP)." },
  "T1048": { nombre: "Exfiltration Over Alternative Protocol", tactica: "TA0010", desc: "Sacar datos por un protocolo distinto al C2 (FTP, HTTP propio, DNS)." },
  "T1048.003": { nombre: "Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol", tactica: "TA0010", desc: "Datos empaquetados en un protocolo no cifrado u ofuscado para no llamar la atención." },
  "T1052": { nombre: "Exfiltration Over Physical Medium", tactica: "TA0010", desc: "Sacar datos por un medio físico: USB, disco externo." },
  "T1052.001": { nombre: "Exfiltration over USB", tactica: "TA0010", desc: "Copiar los datos a un USB. Requiere acceso físico, difícil de detectar en red." },
  "T1567": { nombre: "Exfiltration Over Web Service", tactica: "TA0010", desc: "Subir los datos a un servicio web externo (nube, transfer, paste)." },
  "T1567.002": { nombre: "Exfiltration to Cloud Storage", tactica: "TA0010", desc: "Volcar los datos en almacenamiento en la nube del atacante." },
  "T1020": { nombre: "Automated Exfiltration", tactica: "TA0010", desc: "Exfiltrar de forma automática y continua, sin intervención del atacante." },
  // Impacto
  "T1486": { nombre: "Data Encrypted for Impact", tactica: "TA0040", desc: "Cifrar los archivos de la víctima y pedir rescate: el ransomware." },
  "T1490": { nombre: "Inhibit System Recovery", tactica: "TA0040", desc: "Borrar las copias de sombra y puntos de restauración para que no haya vuelta atrás." },
};

// Táctica principal de una técnica (por defecto, la primera del orden)
export function tacticaDe(code) {
  const t = TECNICAS[code];
  return t ? t.tactica : "TA0043";
}

// Describe una técnica (para el tutor): código, nombre, táctica y descripción
export function describirTecnica(code) {
  const t = TECNICAS[code];
  if (!t) return `Técnica ${code} (no documentada en la KB del juego).`;
  const tact = TACTICAS.find((x) => x.id === t.tactica);
  return `${code} · ${t.nombre} — Táctica: ${tact ? tact.icono + " " + tact.nombre : t.tactica}. ${t.desc}`;
}

// Táctica completa con su lista de técnicas (para el árbol de habilidades)
export function tacticasConTecnicas() {
  return TACTICAS.map((t) => ({
    ...t,
    tecnicas: Object.entries(TECNICAS)
      .filter(([, v]) => v.tactica === t.id)
      .map(([code, v]) => ({ code, ...v })),
  }));
}
