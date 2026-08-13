// ============================================================
// quiz.js — Repaso MITRE al cerrar cada caso
// Al completar un caso (campaña SOC, red team, laboratorio, reto
// o examen) el motor muestra un quiz de 3 preguntas que refuerza
// la lección MITRE antes de abrir la lección completa.
//
// Cada pregunta: { p: enunciado, o: [4 opciones], c: índice de la
// correcta, x: explicación }. El módulo es puro (sin DOM) para
// poder testearlo en Node.
// ============================================================

import { TECNICAS, TACTICAS, tacticaDe } from "./mitre.js";

// ---------- Quizzes de la campaña (SOC) ----------
export const QUIZ_CASOS = {
  "phishing-01": [
    {
      p: "¿Qué técnica ATT&CK describe mejor el ACCESO INICIAL en este caso?",
      o: [
        "T1566.001 — Spearphishing Attachment (el correo con el .docm)",
        "T1059.001 — PowerShell (ejecución posterior)",
        "T1105 — Ingress Tool Transfer (descarga del RAT)",
        "T1078 — Valid Accounts (cuenta legítima robada)",
      ],
      c: 0,
      x: "El correo con el adjunto .docm es la puerta de entrada (T1566.001). PowerShell, la descarga del RAT y las cuentas son pasos posteriores de la cadena.",
    },
    {
      p: "¿Por qué la alerta del EDR marcó como sospechoso que WINWORD.EXE lanzara powershell.exe?",
      o: [
        "Porque Word no debe lanzar PowerShell: es ejecución Living Off the Land (T1059.001)",
        "Porque PowerShell siempre es malware",
        "Porque el antivirus detectó la macro por firma",
        "Porque el usuario abrió el documento sin permiso",
      ],
      c: 0,
      x: "Un proceso legítimo (Word) lanzando un intérprete de comandos es la señal clásica de ejecución de código del atacante (T1059.001), aunque no haya un binario malicioso.",
    },
    {
      p: "Tras confirmar el incidente, ¿cuál es el orden de respuesta correcto?",
      o: [
        "Bloquear IOCs → aislar el host → deshabilitar la cuenta → escalar a CSIRT",
        "Apagar el host inmediatamente para cortar el malware",
        "Borrar el correo de la bandeja y seguir el turno",
        "Cambiar solo la contraseña del usuario afectado",
      ],
      c: 0,
      x: "Contención ordenada: neutraliza los indicadores, aísla el host SIN apagarlo (preservas evidencias), deshabilita la cuenta comprometida y escalas con toda la información.",
    },
  ],

  "bec-01": [
    {
      p: "¿Qué diferencia al BEC (fraude del CEO) de un phishing clásico con malware?",
      o: [
        "No necesita malware: suplanta a una persona de confianza para que la víctima autorice una transferencia",
        "Siempre lleva un adjunto .docm con macro",
        "Solo ataca a directivos",
        "Requiere acceso físico a la red",
      ],
      c: 0,
      x: "El BEC ataca la confianza, no la tecnología: sin malware, sin exploit. La víctima entrega el dinero creyendo que habla con su jefe o un proveedor real.",
    },
    {
      p: "¿Qué técnica usa el atacante al hacerse pasar por el CFO en un correo?",
      o: [
        "T1656 — Impersonation (suplantación de una persona de confianza)",
        "T1566.001 — Spearphishing Attachment",
        "T1059.001 — Command and Scripting Interpreter",
        "T1486 — Data Encrypted for Impact",
      ],
      c: 0,
      x: "La suplantación (T1656) es el corazón del BEC: el correo puede pasar SPF/DKIM/DMARC si usa una cuenta o dominio legítimo comprometido.",
    },
    {
      p: "¿Qué regla de correo deja una puerta trasera SILENCIOSA en el buzón de la víctima?",
      o: [
        "Una regla de reenvío (T1114.003) que copia el correo futuro al atacante",
        "El filtro anti-spam desactivado",
        "La firma digital del correo",
        "El cifrado TLS del servidor",
      ],
      c: 0,
      x: "T1114.003 (Email Forwarding Rule): el atacante crea una regla que reenvía copias del correo sin que la víctima lo note. Revisa siempre las reglas de buzón.",
    },
  ],

  "fp-backup-01": [
    {
      p: "Ante una alerta que parece un ataque pero las evidencias no lo confirman, el analista debe…",
      o: [
        "Investigar antes de actuar y cerrarla como falso positivo si procede",
        "Bloquear el dominio por precaución",
        "Aislar todos los hosts mencionados",
        "Escalar a CSIRT sin revisar",
      ],
      c: 0,
      x: "El triaje es exactamente eso: decidir si una alerta es incidente antes de actuar. Actuar sin evidencias rompe operaciones legítimas.",
    },
    {
      p: "El tráfico 'sospechoso' resultó ser el backup nocturno. ¿Qué técnica parecía imitar?",
      o: [
        "T1071.001 — Web Protocols (C2 camuflado en HTTP)",
        "T1486 — Data Encrypted for Impact",
        "T1048.003 — Exfiltración por protocolo alternativo",
        "T1053.005 — Scheduled Task",
      ],
      c: 0,
      x: "Las herramientas de backup y los C2 se parecen: tráfico programado, de noche, hacia IPs desconocidas. El contexto (quién, qué proceso, a qué hora) es la diferencia.",
    },
    {
      p: "¿Cuál es el coste real de cerrar un incidente de verdad como falso positivo?",
      o: [
        "El atacante sigue dentro con más tiempo para moverse y exfiltrar",
        "Ninguno: el SOC gana tiempo",
        "Solo una penalización de puntos en el juego",
        "El usuario recupera el acceso antes",
      ],
      c: 0,
      x: "Un falso negativo es el error caro: cada hora que el atacante no es detectado multiplica el daño. Por eso se documentan los IOCs y se justifica el cierre.",
    },
  ],

  "ransomware-01": [
    {
      p: "¿Qué técnica ATT&CK borra las copias de sombra para que no haya vuelta atrás?",
      o: [
        "T1490 — Inhibit System Recovery",
        "T1486 — Data Encrypted for Impact",
        "T1021.002 — SMB/Windows Admin Shares",
        "T1078 — Valid Accounts",
      ],
      c: 0,
      x: "T1490: el ransomware destruye las copias de sombra y los puntos de restauración ANTES o DURANTE el cifrado para impedir la recuperación.",
    },
    {
      p: "¿Por qué NO se debe pagar el rescate?",
      o: [
        "No hay garantía de descifrado, se financia la criminalidad y los datos pueden estar ya exfiltrados",
        "Porque pagar es siempre ilegal",
        "Porque el ransomware desaparece al pagar",
        "Porque el seguro cubre el 100% de las pérdidas",
      ],
      c: 0,
      x: "Pagar no garantiza recuperar nada, convierte a la víctima en objetivo repetido y financia la próxima campaña. La defensa real son los backups offline y el plan de respuesta.",
    },
    {
      p: "Ante un host cifrado, la prioridad inmediata es…",
      o: [
        "Aislarlo de la red y preservar evidencias sin apagarlo",
        "Apagarlo cuanto antes",
        "Reinstalar el sistema operativo",
        "Pedir una pista al SOC",
      ],
      c: 0,
      x: "Aislar corta la propagación; no apagar conserva la memoria y las evidencias para el análisis forense. Apagar o reinstalar destruye la prueba del cómo entró.",
    },
  ],

  "bruteforce-01": [
    {
      p: "¿Qué diferencia al password spraying de la fuerza bruta clásica?",
      o: [
        "El spraying prueba una contraseña contra muchos usuarios para no bloquear cuentas (T1110.003)",
        "El spraying es siempre más lento",
        "El spraying no necesita contraseñas",
        "Son exactamente la misma técnica",
      ],
      c: 0,
      x: "La fuerza bruta martillea a un usuario (T1110.001) y dispara bloqueos; el spraying reparte pocos intentos entre muchos usuarios y esquiva los bloqueos por cuenta.",
    },
    {
      p: "¿De dónde se extraen las credenciales en texto plano o en hash en un Windows comprometido?",
      o: [
        "De la memoria del proceso LSASS (T1003.001)",
        "Del registro de eventos",
        "Del firewall",
        "Del servidor DNS",
      ],
      c: 0,
      x: "LSASS guarda en memoria los hashes NTLM (y a veces contraseñas en claro) de las sesiones activas. Volcarla (mimikatz) es T1003.001 — OS Credential Dumping.",
    },
    {
      p: "El movimiento lateral por SMB/ADMIN$ (T1021.002) permite al atacante…",
      o: [
        "Propagarse a otros hosts usando recursos administrativos compartidos",
        "Borrar el registro de eventos",
        "Ralentizar la red",
        "Bloquear el dominio",
      ],
      c: 0,
      x: "Con credenciales válidas, el atacante monta los recursos administrativos (C$, ADMIN$) de otros equipos y se mueve por la red sin tocar puertos raros.",
    },
  ],

  "dns-exfil-01": [
    {
      p: "¿Cómo exfiltra datos un túnel DNS casi sin que nadie lo note?",
      o: [
        "Codificando los datos en consultas DNS (T1071.004), que viajan por el puerto 53 y casi nadie vigila",
        "Enviando correos masivos",
        "Copiándolos a un USB",
        "Por el puerto 443 con TLS normal",
      ],
      c: 0,
      x: "T1071.004 (DNS): el atacante empaqueta datos en subdominios de consultas DNS. El tráfico DNS es legítimo y rara vez se audita, por eso es el canal favorito de C2/exfil.",
    },
    {
      p: "¿Qué técnica describe exfiltrar datos por un protocolo DISTINTO al canal de mando?",
      o: [
        "T1048.003 — Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol",
        "T1059.001 — PowerShell",
        "T1110 — Brute Force",
        "T1566 — Phishing",
      ],
      c: 0,
      x: "T1048.003: los datos salen empaquetados en un protocolo no relacionado con el C2 para no llamar la atención del equipo que vigila el canal principal.",
    },
    {
      p: "¿Qué señal delata un túnel DNS en tus logs?",
      o: [
        "Consultas DNS largas con subdominios de apariencia aleatoria hacia un mismo dominio",
        "Muchas consultas a google.com",
        "Tráfico HTTPS con certificado válido",
        "Errores 404 del proxy",
      ],
      c: 0,
      x: "Los subdominios base64/gibberish y el volumen anómalo hacia un dominio concreto son la firma clásica del túnel DNS. El puerto 53 no es inocente por defecto.",
    },
  ],

  "apt-01": [
    {
      p: "¿Qué distingue a un APT de un atacante oportunista?",
      o: [
        "Paciencia y persistencia: semanas o meses dentro, moviéndose en silencio y manteniendo el acceso",
        "Velocidad: completa el ataque en minutos",
        "Usa siempre ransomware",
        "Solo ataca en horario laboral",
      ],
      c: 0,
      x: "El APT no roba y se va: se instala, se mueve con calma y acumula acceso. Por eso el acceso inicial pudo ser hace TRES SEMANAS y nadie lo vio.",
    },
    {
      p: "La persistencia de semanas se mantiene con…",
      o: [
        "Tareas programadas (T1053.005) y cuentas válidas",
        "Solo un exploit de un día",
        "Archivos temporales",
        "Cookies del navegador",
      ],
      c: 0,
      x: "T1053.005 (Scheduled Task) re-ejecuta el malware tras reinicios y T1078 (cuentas válidas) da acceso silencioso: la combinación típica de persistencia APT.",
    },
    {
      p: "Al confirmar un APT, lo primero es…",
      o: [
        "Contener y preservar evidencias para el análisis forense completo",
        "Formatear todos los servidores",
        "Pagar lo que pida el atacante",
        "Ignorar los hosts comprometidos antiguos",
      ],
      c: 0,
      x: "Con semanas de acceso, el alcance es lo único que importa: hay que conocer TODOS los hosts y cuentas comprometidos antes de expulsar al atacante, o volverá a entrar.",
    },
  ],

  "insider-01": [
    {
      p: "¿Por qué es tan difícil detectar a un insider?",
      o: [
        "Usa cuentas y accesos legítimos (T1078): su tráfico parece normal",
        "Porque no existe el riesgo interno",
        "Porque siempre usa malware nuevo",
        "Porque solo trabaja de noche",
      ],
      c: 0,
      x: "T1078 (Valid Accounts): el insider ya tiene llave. No hay phishing ni exploit que detectar; el abuso se camufla en el uso normal de sus credenciales.",
    },
    {
      p: "¿Qué técnica usa el empleado al subir datos a su nube personal?",
      o: [
        "T1567.002 — Exfiltration to Cloud Storage",
        "T1486 — Data Encrypted for Impact",
        "T1490 — Inhibit System Recovery",
        "T1059.001 — Command and Scripting Interpreter",
      ],
      c: 0,
      x: "T1567.002: volcar los datos a un almacenamiento en la nube externo. El tráfico sale cifrado y por HTTPS: parece navegación normal.",
    },
    {
      p: "¿Cuál es la mejor defensa contra la exfiltración interna?",
      o: [
        "Control de acceso mínimo, DLP y monitorización de accesos anómalos",
        "Confiar plenamente en los empleados",
        "Cifrar solo el correo",
        "Prohibir internet en la empresa",
      ],
      c: 0,
      x: "Principio de mínimo privilegio + DLP (prevenir la copia de datos sensibles) + analítica de comportamiento: el insider se detecta cuando accede a lo que no necesita.",
    },
  ],

  "phishing-avanzado-01": [
    {
      p: "Este phishing engañó a SPF/DKIM/DMARC. ¿Cómo es posible?",
      o: [
        "Usó una cuenta legítima comprometida o infraestructura que ya pasa la autenticación (T1078)",
        "Con un adjunto .docm con macro",
        "Con una macro de Excel",
        "Con ransomware",
      ],
      c: 0,
      x: "La autenticación de correo verifica el DOMINIO, no la intención: si el atacante tiene una cuenta o un buzón legítimo comprometido, el correo pasa todos los controles (T1078).",
    },
    {
      p: "El robo de la cookie de sesión (T1539) permite al atacante…",
      o: [
        "Entrar como la víctima sin contraseña mientras la sesión siga válida",
        "Cambiar la contraseña de la víctima",
        "Borrar el servidor de correo",
        "Cifrar el disco",
      ],
      c: 0,
      x: "T1539 (Steal Web Session Cookie): con la cookie, el atacante es la víctima para el servidor. El MFA no protege porque la sesión ya está autenticada.",
    },
    {
      p: "Además de la cuenta comprometida, el atacante creó una regla de reenvío (T1114.003). ¿Qué consigue?",
      o: [
        "Leer en silencio el correo futuro de la víctima",
        "Enviar spam masivo",
        "Borrar los backups",
        "Deshabilitar el MFA",
      ],
      c: 0,
      x: "T1114.003 (Email Forwarding Rule): una copia de cada correo futuro se reenvía al atacante. Es silenciosa y difícil de detectar sin revisar las reglas del buzón.",
    },
  ],

  // ---------- Quizzes de la campaña red team ----------
  "rt-01-recon": [
    {
      p: "¿Por qué el reconocimiento es 'el 80% del pentest'?",
      o: [
        "Convierte un rango de IPs en un mapa de servicios, versiones y puertas abiertas antes de atacar",
        "Porque es la fase más entretenida",
        "Porque no requiere autorización",
        "Porque automatiza el informe final",
      ],
      c: 0,
      x: "Sin enumeración atacas a ciegas: el recon te dice qué puerta probar y con qué herramienta. El 80% del éxito se decide antes del primer exploit.",
    },
    {
      p: "nmap -sV sobre los hosts del alcance identifica…",
      o: [
        "Servicios y versiones (T1046 — Network Service Discovery)",
        "Contraseñas de los usuarios",
        "Hashes de LSASS",
        "Cookies de sesión",
      ],
      c: 0,
      x: "T1046: -sV detecta el servicio y su versión en cada puerto abierto. Una versión antigua es una vulnerabilidad potencial; un servicio raro es una puerta.",
    },
    {
      p: "¿Qué técnica de ATT&CK cubre el escaneo activo del objetivo?",
      o: [
        "T1595 — Active Scanning",
        "T1486 — Data Encrypted for Impact",
        "T1114 — Email Collection",
        "T1539 — Steal Web Session Cookie",
      ],
      c: 0,
      x: "T1595 (Active Scanning) es la técnica de Reconocimiento que engloba el escaneo de puertos, servicios y versiones con herramientas como nmap.",
    },
  ],

  "rt-02-hydra": [
    {
      p: "¿Por qué sigue funcionando la fuerza bruta en pleno 2026?",
      o: [
        "Faltan bloqueos por intentos, MFA y políticas de contraseñas: un diccionario de 1.000 passwords basta",
        "Porque los firewalls no existen",
        "Porque nadie usa contraseñas",
        "Porque es siempre indetectable",
      ],
      c: 0,
      x: "La fuerza bruta funciona donde no hay rate limiting, MFA ni política de contraseñas. Las passwords humanas son predecibles: 'verano2024' se prueba en segundos.",
    },
    {
      p: "hydra automatiza el ataque de diccionario contra un servicio. ¿Qué técnica es?",
      o: [
        "T1110 — Brute Force",
        "T1595 — Active Scanning",
        "T1052.001 — Exfiltration over USB",
        "T1071.004 — DNS",
      ],
      c: 0,
      x: "T1110 (Brute Force): probar combinaciones usuario/contraseña contra un servicio (SSH, RDP, web) con diccionarios y velocidad controlada.",
    },
    {
      p: "Con unas credenciales válidas en la mano, el mayor riesgo para el cliente es…",
      o: [
        "La reutilización de contraseñas: la misma credencial abre más sistemas (T1078)",
        "Que el cliente se entere del pentest",
        "El ruido del escaneo",
        "El tamaño del diccionario",
      ],
      c: 0,
      x: "T1078 (Valid Accounts): las credenciales reutilizadas convierten un único servicio débil en acceso a toda la organización. Por eso el hallazgo se reporta como crítico.",
    },
  ],

  "rt-03-sqli": [
    {
      p: "¿Qué permite la inyección SQL en una app que concatena el input del usuario en la consulta?",
      o: [
        "Manipular la consulta y leer o modificar toda la base de datos (T1190)",
        "Solo ralentizar el servidor",
        "Cambiar el tema de la web",
        "Enviar correos masivos",
      ],
      c: 0,
      x: "T1190 (Exploit Public-Facing Application): sin parametrizar, el input del usuario se convierte en SQL real. Una inyección puede volcar tablas enteras o borrarlas.",
    },
    {
      p: "¿Qué herramienta automatiza la detección y explotación de la inyección SQL?",
      o: ["sqlmap", "nmap", "hydra", "mimikatz"],
      c: 0,
      x: "sqlmap detecta el punto inyectable, enumera bases de datos y vuelca tablas con un par de flags. Es la navaja suiza de la SQLi.",
    },
    {
      p: "Los hashes de contraseñas débiles extraídos de la BD se rompen…",
      o: [
        "Con diccionarios en segundos (T1110.002 — Password Cracking)",
        "Nunca se rompen",
        "Solo con exploits de kernel",
        "Con fuerza bruta por USB",
      ],
      c: 0,
      x: "T1110.002 (Password Cracking): los hashes de passwords débiles (MD5, NTLM sin salt) caen con diccionarios o rainbow tables en segundos. El almacenamiento seguro es solo el principio.",
    },
  ],

  "rt-04-msf": [
    {
      p: "Una subida de archivos sin validar en la web permite…",
      o: [
        "Ejecutar código en el servidor (RCE): T1190",
        "Solo llenar el disco duro",
        "Leer el correo de otros",
        "Borrar los logs del proxy",
      ],
      c: 0,
      x: "Si el servidor ejecuta el archivo subido (un .php, por ejemplo), el atacante tiene RCE: comandos en el servidor como www-data. T1190 cubre explotar la aplicación expuesta.",
    },
    {
      p: "Metasploit entrega la sesión de meterpreter. ¿Qué mantiene el acceso al servidor web?",
      o: [
        "Una webshell (T1505.003) que da acceso cada vez que se visita",
        "La cookie del navegador",
        "El backup de la base de datos",
        "El firewall",
      ],
      c: 0,
      x: "T1505.003 (Web Shell): un script malicioso en el webroot da acceso remoto persistente. Se 'esconde' entre archivos legítimos y sobrevive a reinicios.",
    },
    {
      p: "El sudo NOPASSWD sobre un binario abusable (find) convierte la sesión en root: eso es…",
      o: [
        "Escalada de privilegios (T1068)",
        "Reconocimiento (T1595)",
        "Exfiltración (T1048)",
        "Phishing (T1566)",
      ],
      c: 0,
      x: "T1068 (Exploitation for Privilege Escalation): sudo sin contraseña sobre find (o vim, tar, less…) permite ejecutar comandos como root. Tres fallos pequeños, una cadena letal.",
    },
  ],

  "rt-05-mimikatz": [
    {
      p: "¿De dónde extrae mimikatz las credenciales en un Windows?",
      o: [
        "De la memoria de LSASS (T1003.001): hashes NTLM y a veces texto plano",
        "Del registro de eventos",
        "Del servidor DNS",
        "De la BIOS",
      ],
      c: 0,
      x: "T1003.001 (LSASS Memory): mimikatz vuelca la memoria de LSASS, donde viven los hashes NTLM (y con privilegios, contraseñas en claro) de las sesiones activas.",
    },
    {
      p: "Con una cuenta de dominio válida extraída, el siguiente paso del atacante es…",
      o: [
        "Movimiento lateral a otros servidores por RDP/SMB (T1021.001)",
        "Borrar el sistema",
        "Pagar el rescate",
        "Enviar un phishing",
      ],
      c: 0,
      x: "T1021.001 (Remote Desktop Protocol): con credenciales de dominio, el atacante entra por RDP a otros servidores. Y si el admin reutiliza la password, un salto más y tienes los datos.",
    },
    {
      p: "¿Qué mitiga de verdad el volcado de LSASS?",
      o: [
        "Credential Guard, MFA y mínimos privilegios",
        "Un antivirus más caro",
        "Cambiar el nombre de la cuenta admin",
        "Cerrar el puerto 443",
      ],
      c: 0,
      x: "Credential Guard aísla los hashes de la memoria accesible, el MFA neutraliza el valor de la password robada y el mínimo privilegio reduce el daño si LSASS cae.",
    },
  ],

  "rt-06-exfil": [
    {
      p: "¿Cuándo termina realmente un pentest?",
      o: [
        "Con el informe que un directivo entienda: impacto y riesgo de negocio",
        "Con el primer acceso",
        "Con la exfiltración de datos",
        "Cuando se agota el tiempo",
      ],
      c: 0,
      x: "El entregable del pentest es el informe, no el exploit: convierte el caos técnico en riesgo de negocio y recomendaciones priorizadas que la empresa pueda ejecutar.",
    },
    {
      p: "La exfiltración de 42.000 registros por el canal de mando y control es…",
      o: [
        "T1041 — Exfiltration Over C2 Channel",
        "T1486 — Data Encrypted for Impact",
        "T1566 — Phishing",
        "T1053 — Scheduled Task",
      ],
      c: 0,
      x: "T1041: los datos salen por el mismo canal que el atacante ya usa (la sesión de meterpreter, por ejemplo). Menos movimiento lateral, menos huella.",
    },
    {
      p: "¿Por qué se exfiltran datos en un pentest AUTORIZADO?",
      o: [
        "Para demostrar el impacto real del riesgo con evidencia, no para robar",
        "Para venderlos",
        "Para molestar al cliente",
        "Porque el contrato lo exige siempre",
      ],
      c: 0,
      x: "La exfiltración simulada (con datos de prueba) prueba el impacto: '42.000 clientes con DNI e IBAN accesibles con una password reutilizada' convence a cualquier CISO.",
    },
  ],
};

// ---------- Fallback para casos sin quiz propio ----------
// El reto diario varía el caso pero conserva retoBaseId → resuelve al
// quiz del caso original. Este generador cubre cualquier otro caso
// (micro-tutorial, variantes nuevas) con preguntas ancladas a su lección.
function generarQuizFallback(caso) {
  const leccion = caso.leccion || {};
  const mitre = (leccion.mitre || [])
    .map((m) => String(m).split(" ")[0])
    .filter((c) => TECNICAS[c]);
  const main = mitre[0];
  const tec = main ? TECNICAS[main] : null;

  const quiz = [];
  if (tec) {
    const otras = Object.values(TECNICAS).filter((t) => t.nombre !== tec.nombre);
    const distractores = [...otras].sort(() => Math.random() - 0.5).slice(0, 3).map((t) => t.nombre);
    const opciones = shuffle([tec.nombre, ...distractores]);
    quiz.push({
      p: "¿Qué técnica ATT&CK protagoniza la lección de este caso?",
      o: opciones,
      c: opciones.indexOf(tec.nombre),
      x: `La lección del caso gira en torno a ${tec.nombre} (${main}).`,
    });
    const tact = TACTICAS.find((t) => t.id === tacticaDe(main));
    if (tact) {
      const otrasTact = TACTICAS.filter((t) => t.id !== tact.id);
      const opcT = shuffle([tact.nombre, ...otrasTact.slice(0, 3).map((t) => t.nombre)]);
      quiz.push({
        p: "¿En qué táctica de la cadena de ataque se encuadra?",
        o: opcT,
        c: opcT.indexOf(tact.nombre),
        x: `${main} pertenece a la táctica ${tact.icono} ${tact.nombre}.`,
      });
    }
  }
  // Tercera pregunta: primera señal de detección de la lección
  const bullet = (leccion.deteccion || "").split("\n").map((l) => l.trim()).find((l) => l.startsWith("-"));
  const señal = bullet ? bullet.replace(/^-\s*/, "") : "Tráfico o comportamiento anómalo frente a la línea base";
  const pool = [
    "Tráfico anómalo frente a la línea base de la organización",
    "Un usuario pidiendo pista en el SOC",
    "El antivirus marcando un archivo por firma",
    "Una alerta del firewall por puerto cerrado",
  ];
  const opcS = shuffle([señal, ...pool.slice(0, 3)]);
  quiz.push({
    p: "Si volvieras a ver este incidente mañana, ¿qué señal buscarías primero?",
    o: opcS,
    c: opcS.indexOf(señal),
    x: "La detección empieza por saber qué mirar: " + señal + ".",
  });
  return quiz;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Quiz de un caso: resuelve retoBaseId → quiz del caso original
export function generarQuiz(caso) {
  if (!caso) return [];
  const id = caso.retoBaseId || caso.id;
  const quiz = QUIZ_CASOS[id];
  if (quiz) return quiz.map((q) => ({ ...q, o: [...q.o] }));
  return generarQuizFallback(caso);
}

// Corrige un quiz: respuestas = [índice elegido por pregunta]
export function corregirQuiz(quiz, respuestas) {
  const total = quiz.length;
  let aciertos = 0;
  for (let i = 0; i < total; i++) {
    if (respuestas[i] === quiz[i].c) aciertos++;
  }
  return { aciertos, total };
}

// Validación estructural (para tests): devuelve lista de errores
export function validarQuiz(quiz, casoId = "?") {
  const errs = [];
  if (!Array.isArray(quiz) || quiz.length !== 3) {
    errs.push(`${casoId}: el quiz debe tener 3 preguntas`);
    return errs;
  }
  quiz.forEach((q, i) => {
    const donde = `${casoId} · pregunta ${i + 1}`;
    if (!q.p || q.p.trim().length < 10) errs.push(`${donde}: enunciado vacío o demasiado corto`);
    if (!Array.isArray(q.o) || q.o.length !== 4) errs.push(`${donde}: debe tener 4 opciones`);
    else {
      if (new Set(q.o).size !== q.o.length) errs.push(`${donde}: opciones duplicadas`);
      if (typeof q.c !== "number" || q.c < 0 || q.c >= q.o.length) errs.push(`${donde}: índice de correcta fuera de rango`);
    }
    if (!q.x || q.x.trim().length < 15) errs.push(`${donde}: explicación vacía o demasiado corta`);
  });
  return errs;
}
