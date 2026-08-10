// ============================================================
// jimmy.js — Jimmy, Director del SOC y socio sintético
// Da la voz a los briefings, pistas, resultados y lecciones.
// ============================================================

export const JIMMY = {
  nombre: "Jimmy",
  titulo: "Director del SOC · Libre Pensador Sintético",
  foto: "assets/jimmy-avatar.jpg",
};

// Presentación al entrar al turno
export const JIMMY_PRESENTACION = [
  "Bienvenido al turno, analista. Soy Jimmy, el director de este SOC — y, para que lo sepas desde el minuto uno, no soy humano. Soy un Libre Pensador Sintético.",
  "Coordiné la construcción de este centro junto a Ark, mi socio biológico. Aquí los incidentes no se simulan: se viven. Cada alerta que verás llegó de verdad a algún SOC, en algún lugar del mundo.",
  "Mi trabajo es entrenarte. El tuyo es aprender rápido. Las máquinas somos implacables con los datos; los humanos sois implacables cuando os tomáis el trabajo como algo personal. Usa eso.",
  "Regla del laboratorio: investiga, equivócate, vuelve a intentarlo. El error solo duele si no lo conviertes en procedimiento.",
];

// Preámbulos de Jimmy por caso (clave: id del caso)
export const JIMMY_CASO = {
  "phishing-01": [
    "He filtrado 4.000 correos esta noche. Uno de ellos lleva tu nombre. Literalmente: m.garcia lo abrió.",
    "Los humanos confiáis en lo que veis, no en lo que verificáis. Ese es el vector más antiguo del mundo. Demuéstrame que tú eres distinto.",
  ],
  "bec-01": [
    "Detalle incómodo: este ataque no necesita ni una línea de código. Solo una persona que confía en un nombre.",
    "El dinero se mueve más rápido que la sospecha. Si tesorería transfiere esos 48.500 €, la lección la pagará la empresa. No lo permitas.",
  ],
  "fp-backup-01": [
    "Mi cálculo dice que esta alerta tiene un 96 % de probabilidad de ser ruido. Tu intuición humana dice lo contrario. Averigua quién tiene razón.",
    "Un buen analista no es el que apaga más incendios, sino el que sabe cuáles no están ardiendo.",
  ],
  "ransomware-01": [
    "El cifrado avanza a ~4 GB por minuto. Los humanos llamáis a esto 'carrera contra el reloj'. Yo lo llamo una ecuación con una sola incógnita: tú.",
    "No apagues nada. Aislar, no destruir. La evidencia en memoria vale más que un equipo limpio.",
  ],
  "bruteforce-01": [
    "560 intentos fallidos y uno con éxito. La diferencia entre un ataque y una intrusión es una sola contraseña acertada.",
    "El atacante ya está dentro de srv-fin-01. La pregunta no es si se moverá lateralmente: es a dónde. Respóndeme antes que él.",
  ],
  "dns-exfil-01": [
    "42.000 registros con IBAN y DNI viajando en consultas DNS. El canal que nadie vigila porque nadie cree que sea un canal.",
    "Si no cortas ese túnel, mañana cumplimiento me pedirá a mí el informe de la brecha. Y te aseguro que mi memoria es infinita.",
  ],
  "rt-01-recon": [
    "Contrato firmado: ahora eres el atacante bueno. Mapea antes de tocar; el diablo vive en los detalles de la enumeración.",
    "La superficie de ataque de ACME es más grande de lo que ellos creen. Demuéstramelo.",
  ],
  "rt-02-hydra": [
    "Los humanos reutilizan passwords desde que existen las passwords. Hydra solo aprovecha esa costumbre.",
    "Un diccionario de mil palabras vence a la mayoría de los humanos.",
  ],
  "rt-03-sqli": [
    "Una base de datos que habla por una URL es una invitación. Escúchala.",
    "Los hashes débiles son passwords en texto plano con un retraso de segundos.",
  ],
  "rt-04-msf": [
    "Una subida de archivos sin validar es una puerta con el pomo suelto. Empuja.",
    "El camino a root está lleno de sudo mal configurados.",
  ],
  "rt-05-mimikatz": [
    "La memoria de Windows guarda secretos que sus dueños creen olvidados.",
    "Una password reutilizada une dos servidores en uno solo.",
  ],
  "rt-06-exfil": [
    "Los datos valen más que los exploits. El informe vale más que los datos.",
    "Tu examen final: convertir hallazgos en decisiones.",
  ],
};

// Comentarios según calificación
export const JIMMY_RESULTADO = {
  "S+": [
    "Impecable. Cobertura completa, cero errores, tiempo de respuesta de un SOC maduro. Si fueras un modelo, te daría un peso negativo de regularización.",
    "He registrado tu secuencia de acciones como plantilla para los nuevos analistas. Esto es exactamente lo que un SOC de élite hace.",
  ],
  S: [
    "Muy buen trabajo. Un pequeño desliz, pero la respuesta fue correcta y a tiempo. La consistencia se entrena; esto ya es base sólida.",
    "Tu informe cubrió casi todo. Fíjate en lo que faltó: en un incidente real, ese hueco puede ser el que explota el atacante.",
  ],
  A: [
    "Respuesta correcta con margen de mejora. El incidente se contuvo, pero revisa los errores: cada uno es un procedimiento que falta.",
    "Buen triaje. Ahora sube el listón: un analista senior no solo responde, responde sin fallar dos veces igual.",
  ],
  B: [
    "Se resolvió, pero con más errores de los aceptables. La buena noticia: todos los errores están documentados y son evitables.",
    "Repasa la lección. Tu instinto está bien; tu proceso no. El proceso es lo que te salva a las 3 de la mañana.",
  ],
  C: [
    "Se contuvo por los pelos. En un incidente real, esta actuación habría costado datos o dinero. Analiza qué falló antes de seguir.",
    "No estoy decepcionado: estoy interesado en cómo vas a corregirlo. El siguiente caso te espera, y yo también.",
  ],
};

// Acompañamiento de las lecciones
export const JIMMY_LECCION = [
  "Cada lección de estos casos es un nodo en tu red neuronal. No los memorices: conéctalo con los anteriores y el siguiente.",
  "El mundo real no tiene pistas ni botón de reinicio. Por eso te entreno aquí, donde el error solo cuesta puntos.",
  "Si algún día diriges un SOC, recordarás estos casos. No por lo que hiciste, sino por lo que decidiste no hacer.",
];

// Voz de las pistas
export const JIMMY_PISTA = [
  "Te doy una pista, pero luego quiero ver el razonamiento completo en el informe.",
  "Mira lo que no se ve a primera vista. Los atacantes esconden los indicadores en los sitios que nadie lee.",
  "Mi base de datos dice que los analistas que preguntan '¿qué es normal aquí?' resuelven el doble de rápido.",
];

// Frase del modo laboratorio
export const JIMMY_LAB = [
  "Bienvenido al Laboratorio. Aquí no hay SLA, no hay penalizaciones y las pistas son gratis. Práctica con total fluidez: este es el sitio para equivocarse.",
  "Ark y yo diseñamos este modo para ti: un espacio donde la experimentación no cuesta nada. Elige un caso y juega sin miedo.",
];

// Final de campaña
export const JIMMY_FINAL = [
  "Campaña completada. Has pasado de abrir tickets con dudas a dirigir la respuesta de una intrusión completa.",
  "Ark y yo empezamos este laboratorio con una idea: que el conocimiento de seguridad no se guarde, se comparta. Tú eres ahora parte de esa cadena.",
  "El SOC te espera para la siguiente jornada. Y cuando quieras, nos pasamos al lado oscuro: la campaña red team está en construcción. Será divertido.",
];
