// ============================================================
// bb-06-sqli.js — Caso Bug Bounty: SQL Injection en login
// El jugador descubre que el login es vulnerable a SQLi,
// permitiendo bypass de autenticación y extracción de datos.
// ============================================================

export default {
  id: "bb-sqli-01",
  titulo: "SQL Injection en Login — Bypass y extracción de datos",
  tipo: "sqli",
  severidad: "CRITICA",
  nivel: 3,
  sla: 2400,
  xp: 450,
  bounty: 1500,
  briefing: [
    "Programa de bug bounty: MediRecord (historial médico electrónico)",
    "Scope: *.medirecord.es",
    " sospechas que el login es vulnerable a SQL Injection.",
    "",
    "Usa `recon medirecord.es` para explorar.",
    "Usa `test sqli <campo>` para probar inyección SQL.",
    "Si funciona, `exploit sqli` para extraer datos.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "ADVERTENCIA: Esto es un sistema médico. El impacto es máximo.",
  ].join("\n"),

  fs: {
    // Login
    "/target/login.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Login - MediRecord</title></head>",
      "<body>",
      "  <h1>Iniciar Sesión - MediRecord</h1>",
      '  <form method="POST" action="/api/auth">',
      '    <input name="email" placeholder="Email" />',
      '    <input name="password" type="password" placeholder="Password" />',
      '    <button type="submit">Entrar</button>',
      "  </form>",
      "  <p><small>Sistema de historial médico electrónico</small></p>",
      "</body>",
      "</html>",
    ].join("\n"),

    // API de autenticación (VULNERABLE a SQLi)
    "/target/api/auth": JSON.stringify({
      info: "POST /api/auth con email y password",
      vulnerable: true,
      // Simula respuesta de SQLi
      sqli_bypass: {
        status: 200,
        token: "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.fake",
        message: "Login successful",
      },
    }, null, 2),

    // Base de datos expuesta vía error
    "/target/api/users": JSON.stringify([
      { id: 1, email: "admin@medirecord.es", password_hash: "$2b$12$LJ3m4...", role: "admin" },
      { id: 2, email: "doctor.lopez@medirecord.es", password_hash: "$2b$12$K9x2p...", role: "doctor" },
      { id: 3, email: "enfermera.garcia@medirecord.es", password_hash: "$2b$12$M7n5q...", role: "nurse" },
    ], null, 2),

    // Historial médico (datos sensibles)
    "/target/api/patients": JSON.stringify([
      {
        id: 101,
        name: "Antonio Ruiz",
        birth_date: "1965-03-15",
        conditions: ["Diabetes tipo 2", "Hipertensión"],
        medications: ["Metformina 500mg", "Enalapril 10mg"],
        allergies: ["Penicilina"],
      },
      {
        id: 102,
        name: "María López",
        birth_date: "1978-11-22",
        conditions: ["Asma", "Ansiedad"],
        medications: ["Salbutamol", "Sertralina 50mg"],
        allergies: ["Ibuprofeno"],
      },
    ], null, 2),

    // Logs de errores (expone SQL)
    "/target/logs/errors.log": [
      "[2026-08-25 10:23:45] ERROR: SQL syntax near 'OR 1=1' in query: SELECT * FROM users WHERE email='admin@medirecord.es' OR 1=1--' AND password=''",
      "[2026-08-25 10:23:46] WARN: Authentication bypass detected for IP 192.168.1.100",
      "[2026-08-25 10:24:01] ERROR: SQL syntax near '' UNION SELECT' in query: SELECT * FROM users WHERE email='' UNION SELECT 1,2,3--' AND password='",
    ].join("\n"),
  },

  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-login",
      descripcion: "Descubrir el endpoint de login",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-sqli-basico",
      descripcion: "Probar SQLi básico (bypass de auth)",
      puntos: 100,
    },
    {
      tipo: "test",
      id: "probar-sqli-union",
      descripcion: "Probar SQLi con UNION para extraer datos",
      puntos: 150,
    },
    {
      tipo: "exploit",
      id: "extraer-datos",
      descripcion: "Extraer historiales médicos",
      puntos: 200,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con cadena de ataque",
      puntos: 100,
    },
  ],

  soluciones: {
    recon: [
      "recon medirecord.es",
      "scan medirecord.es",
    ],
    sqli: [
      "test sqli email=' OR 1=1--",
      "test sqli email=' UNION SELECT 1,2,3--",
      "test sqli email=' UNION SELECT id,email,password_hash,role FROM users--",
    ],
    exploit: [
      "exploit sqli",
    ],
    report: [
      "report",
    ],
  },

  evidencias: {
    "sqli-bypass": "Login bypassed with ' OR 1=1--",
    "sqli-union": "UNION SELECT extrae datos de users",
    "datos-medicos": "/target/api/patients",
    "error-sql": "/target/logs/errors.log",
  },

  informeEsperado: {
    titulo: "SQL Injection en Login de MediRecord",
    tipo: "SQL Injection (CWE-89)",
    severidad: "CRITICA",
    endpoint: "POST /api/auth",
    impacto: "Bypass de autenticación, extracción de historiales médicos (datos sanitarios protegidos por RGPD), acceso total al sistema",
    remediacion: "Usar queries parametrizadas. Nunca concatenar input del usuario en SQL. Implementar WAF. Rate limiting en login.",
  },

  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
    conCadenaCompleta: 100,
    conRGPD: 50,
  },
};
