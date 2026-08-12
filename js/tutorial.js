// ============================================================
// tutorial.js — Mini tutorial para ponerte en contexto
// Slideshow de contextualización + micro-caso guiado donde
// Jimmy te lleva de la mano escribiendo tus primeros comandos.
// ============================================================

export const PASOS_TUTORIAL = [
  {
    icono: "🛡️",
    titulo: "¿QUÉ ES ESTO?",
    texto:
      "<b>CYBERGRAD</b> es un simulador de carrera en un <b>SOC</b> (Security Operations Center): el centro de operaciones donde se detectan y responden los ciberataques de una empresa.<br/><br/>Tú eres un <b>analista de seguridad</b> en ACME Corp. Cada turno llega un incidente realista y tu trabajo es investigarlo y responderlo, igual que en un SOC de verdad.<br/><br/>¿Quieres cambiar de bando? La campaña <b>Red Team</b> te convierte en <b>pentester</b>: pentests ofensivos autorizados con herramientas reales (nmap, hydra, Metasploit…).",
    ejemplo: "SOC = Security Operations Center · El 'bombero digital' de la empresa",
  },
  {
    icono: "🕵️",
    titulo: "TU TRABAJO",
    texto:
      "Cada incidente trae evidencias: un <b>correo</b> sospechoso, una <b>alerta</b> del SIEM, <b>logs</b> de red, archivos.<br/><br/>Tu misión es identificar los <b>IOCs</b> (Indicadores de Compromiso: dominios, IPs, hashes maliciosos) y <b>responder</b>: bloquear, aislar hosts, deshabilitar cuentas… y documentarlo todo en un <b>informe</b>.",
    ejemplo: "IOC = Indicator of Compromise · La 'huella' que deja un atacante",
  },
  {
    icono: "💻",
    titulo: "LA TERMINAL",
    texto:
      "Todo se hace desde esta terminal, con <b>comandos reales</b>:<br/>• <span class='mono'>mail</span> — lee el correo<br/>• <span class='mono'>alertas</span> — consulta el SIEM<br/>• <span class='mono'>ls</span> / <span class='mono'>cat</span> — explora archivos y logs<br/>• <span class='mono'>whois</span> / <span class='mono'>dig</span> — investiga dominios<br/>• <span class='mono'>md5sum</span> / <span class='mono'>vt</span> — analiza archivos<br/><br/>Escribe <span class='mono'>ayuda</span> para verlos todos. <span class='mono'>Tab</span> autocompleta.",
    ejemplo: "analista@acme:~$ mail  ←  así se empieza a investigar",
  },
  {
    icono: "⚡",
    titulo: "CONTRA EL RELOJ",
    texto:
      "Cada caso tiene un <b>SLA</b> (tiempo límite) y <b>eventos en vivo</b>: el ataque avanza mientras investigas.<br/><br/>Si te atascas, <span class='mono'>pista</span> te ayuda… pero cuesta puntos. Al final, tu <b>informe</b> se evalúa por la cobertura de IOCs y recibes una calificación de <b>S+ a C</b>.",
    ejemplo: "SLA = Service Level Agreement · El tiempo que tienes para responder",
  },
  {
    icono: "📈",
    titulo: "PROGRESIÓN",
    texto:
      "Cada caso resuelto te da <b>XP</b> y subes de rango:<br/><br/>🌱 Analista Junior → 🔍 Analista SOC → 🛡️ Analista Senior → 🎖️ Líder de Equipo → 🏆 Jefe de CSIRT<br/><br/>Y en la campaña <b>Red Team</b>: 🌱 Aprendiz de Pentester → 🕷️ Pentester Junior → 🥷 Pentester → 🔥 Pentester Senior → 👑 Líder Red Team → 🏆 CISO<br/><br/>Cada caso termina con una <b>lección</b>: la anatomía del ataque, cómo detectarlo y su mapeo a <b>MITRE ATT&CK</b> (la taxonomía mundial de ciberataques).",
    ejemplo: "MITRE ATT&CK · El catálogo de técnicas de ataque que usan los profesionales",
  },
  {
    icono: "🔬",
    titulo: "PRACTICA SIN MIEDO",
    texto:
      "El botón <b>🔬 Laboratorio</b> del menú te deja repetir cualquier caso sin SLA ni penalizaciones: el sitio para experimentar y equivocarte a gusto.<br/><br/>Cuando domines lo básico, el botón <b>🎓 Carrera</b> muestra tu progreso profesional. Y ahora… toca probarlo: pulsa <b>PROBAR EN LA TERMINAL</b> y yo te guío.",
    ejemplo: "El error solo duele si no lo conviertes en procedimiento. — Jimmy",
  },
];

// Micro-caso guiado: Jimmy valida cada comando antes de pasar al siguiente
export const MICROCASO = {
  id: "tut-01",
  titulo: "Micro-práctica: primer análisis",
  nivel: 1,
  severidad: "BAJA",
  sla: 9999,
  xp: 0,
  briefing:
    "Práctica guiada: ha llegado un correo sospechoso al buzón. Yo te guío paso a paso: escribe `mail` para leerlo, revisa `alertas` y bloquea el indicador. Sin prisa: aquí no hay SLA ni penalizaciones.",
  fs: {
    "/home/analista/": ["README.txt"],
    "/home/analista/README.txt": [
      "Bienvenido al SOC, analista.",
      "Flujo de trabajo:",
      "  1. mail      → lee el correo entrante",
      "  2. alertas   → consulta lo que detectó el SIEM",
      "  3. bloquear  → neutraliza los indicadores maliciosos",
      "Empieza escribiendo: mail",
    ].join("\n"),
    "/opt/siem/": ["alerts.json"],
    "/opt/siem/alerts.json": [
      "{",
      '  "alerts": [',
      "    {",
      '      "id": "ALT-T1",',
      '      "severity": "MEDIUM",',
      '      "source": "mail-gateway",',
      '      "title": "Correo entrante de dominio no autenticado (SPF fail)",',
      '      "from": "soporte@phishing-tutorial.xyz",',
      '      "detail": "El dominio phishing-tutorial.xyz no tiene SPF/DKIM y su nombre imita a un servicio interno."',
      "    }",
      "  ]",
      "}",
    ].join("\n"),
  },
  correos: [
    {
      id: "t1",
      de: "soporte@phishing-tutorial.xyz",
      para: "analista@acme.com",
      asunto: "⚠ Acceso anómalo detectado en tu cuenta",
      fecha: "hace 5 minutos",
      estado: "SOSPECHOSO",
      adjunto: "ninguno",
      nota: "Marcado por la pasarela: dominio desconocido sin SPF/DKIM.",
      cuerpo:
        "Hola,\n\nhemos detectado un acceso anómalo a tu cuenta desde otra ciudad.\nPara verificar tu identidad, entra aquí:\n\n  http://phishing-tutorial.xyz/verificar\n\n— Equipo de Seguridad de ACME",
    },
  ],
  alertas: [
    {
      id: "ALT-T1",
      sev: "MEDIUM",
      fuente: "mail-gateway",
      titulo: "Correo entrante de dominio no autenticado (SPF fail)",
    },
  ],
  correctas: {
    bloquear: ["dominio:phishing-tutorial.xyz"],
    aislar: [],
    deshabilitar: [],
    escalar: false,
    cerrar: false,
  },
  incorrectas: ["bloquear|dominio:acme.com"],
  pistas: [
    "El indicador clave es el dominio del remitente del correo (soporte@phishing-tutorial.xyz).",
  ],
  eventos: [],
  leccion: {
    titulo: "Micro-práctica",
    resumen: "Práctica guiada completada.",
    deteccion: "-",
    respuesta: "-",
    aprendizaje: ["Ya sabes leer evidencias y actuar sobre indicadores."],
    glosario: ["IOC", "SIEM"],
    mitre: ["T1566"],
  },
  tutorial: {
    pasos: [
      {
        cmd: "mail",
        tipo: "comando",
        ok: "¡Bien! Has abierto tu primer correo. Fíjate en el remitente: soporte@phishing-tutorial.xyz. Un dominio que nadie conoce y que pide tus credenciales… sospechoso.",
        msg: "Ahora revisa qué detectó el SIEM: escribe `alertas`.",
        fallback: "Este paso es leer el correo: escribe `mail` (sin argumentos).",
      },
      {
        cmd: "alertas",
        tipo: "comando",
        ok: "El SIEM confirma la sospecha: SPF fallido y dominio no autenticado. Es un phishing clásico.",
        msg: "Último paso: neutraliza el indicador. Bloquea el dominio del remitente con `bloquear phishing-tutorial.xyz`.",
        fallback: "Este paso es consultar el SIEM: escribe `alertas`.",
      },
      {
        cmd: "bloquear",
        tipo: "bloquear",
        objetivo: "phishing-tutorial.xyz",
        ok: "¡Eso es, analista! Has neutralizado el primer indicador de tu carrera: bloqueado phishing-tutorial.xyz en la pasarela. Ese dominio ya no volverá a engañar a nadie de ACME.",
        fallback: "Casi. Bloquea el dominio malicioso: `bloquear phishing-tutorial.xyz` (no el dominio legítimo de la empresa).",
      },
    ],
  },
};
