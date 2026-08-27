// ============================================================
// bb-01-idor.js — Caso Bug Bounty: IDOR en panel de usuario
// El jugador descubre que cambiando el ID en la URL puede
// acceder a datos de otros usuarios.
// ============================================================

export default {
  id: "bb-idor-01",
  titulo: "IDOR en Panel de Usuario — Acceso a datos ajenos",
  tipo: "idor",
  severidad: "MEDIA",
  nivel: 1,
  sla: 1800, // 30 minutos
  xp: 300,
  bounty: 500, // $500 USD
  briefing: [
    "Has sido invitado a un programa de bug bounty de la empresa TechCorp.",
    "El scope incluye: *.techcorp.com",
    "Tu tarea: encontrar vulnerabilidades que permitan acceder a datos no autorizados.",
    "",
    "Empieza con `recon techcorp.com` para descubrir endpoints.",
    "Luego usa `scan <url>` para buscar vulnerabilidades.",
    "Si encuentras algo, usa `test <tipo> <param>` para verificarlo.",
    "Para explotar: `exploit <tipo>`.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "Consejo: `scope` muestra el alcance del programa.",
    "Consejo: `ayuda` lista todos los comandos.",
  ].join("\n"),

  // Entorno virtual del target
  fs: {
    // Página principal
    "/target/index.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>TechCorp</title></head>",
      "<body>",
      "  <h1>TechCorp - Tu plataforma de productividad</h1>",
      "  <nav>",
      '    <a href="/login">Login</a>',
      '    <a href="/dashboard">Dashboard</a>',
      '    <a href="/api/docs">API Docs</a>',
      "  </nav>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Login
    "/target/login.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Login - TechCorp</title></head>",
      "<body>",
      "  <h1>Iniciar Sesión</h1>",
      '  <form method="POST" action="/api/login">',
      '    <input name="email" placeholder="Email" />',
      '    <input name="password" type="password" placeholder="Password" />',
      '    <button type="submit">Entrar</button>',
      "  </form>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Dashboard (requiere auth)
    "/target/dashboard.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Dashboard - TechCorp</title></head>",
      "<body>",
      "  <h1>Mi Dashboard</h1>",
      '  <div id="user-info">',
      "    <p>Nombre: María García</p>",
      "    <p>Email: maria.garcia@techcorp.com</p>",
      "    <p>Telefono: +34612345678</p>",
      "    <p>Direccion: Calle Mayor 15, Madrid</p>",
      "    <p>NSS: 28123456789</p>",
      "    <p>IBAN: ES9121000418450200051332</p>",
      "  </div>",
      '  <a href="/api/users/1/profile">Ver mi perfil</a>',
      "</body>",
      "</html>",
    ].join("\n"),

    // API Docs - expone los endpoints
    "/target/api/docs.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>API Documentation</title></head>",
      "<body>",
      "  <h1>TechCorp API v2</h1>",
      "  <h2>Endpoints</h2>",
      "  <ul>",
      '    <li><code>GET /api/users/{id}/profile</code> — Perfil de usuario</li>',
      '    <li><code>GET /api/users/{id}/documents</code> — Documentos del usuario</li>',
      '    <li><code>GET /api/users/{id}/billing</code> — Información de facturación</li>',
      '    <li><code>POST /api/login</code> — Autenticación</li>',
      "  </ul>",
      "  <h2>Autenticación</h2>",
      "  <p>Usa cookies de sesión. El servidor retorna Set-Cookie: session=xxx</p>",
      "</body>",
      "</html>",
    ].join("\n"),

    // API - Perfil de usuario (VULNERABLE: no valida permisos)
    "/target/api/users/1/profile": JSON.stringify({
      id: 1,
      name: "María García",
      email: "maria.garcia@techcorp.com",
      phone: "+34612345678",
      address: "Calle Mayor 15, Madrid",
      nss: "28123456789",
      iban: "ES9121000418450200051332",
      role: "user",
      created_at: "2024-01-15",
    }, null, 2),

    "/target/api/users/2/profile": JSON.stringify({
      id: 2,
      name: "Carlos López",
      email: "carlos.lopez@techcorp.com",
      phone: "+34698765432",
      address: "Avenida de la Paz 42, Barcelona",
      nss: "45123456789",
      iban: "ES9121000418450200051333",
      role: "admin",
      created_at: "2023-06-20",
    }, null, 2),

    "/target/api/users/3/profile": JSON.stringify({
      id: 3,
      name: "Ana Martínez",
      email: "ana.martinez@techcorp.com",
      phone: "+34655512345",
      address: "Calle de Serrano 28, Madrid",
      nss: "52123456789",
      iban: "ES9121000418450200051334",
      role: "user",
      created_at: "2024-03-10",
    }, null, 2),

    // API - Documentos (VULNERABLE)
    "/target/api/users/1/documents": JSON.stringify([
      { id: 101, name: "contrato_laboral.pdf", type: "contract", size: "245KB" },
      { id: 102, name: "nomina_enero.pdf", type: "payslip", size: "128KB" },
      { id: 103, name: "certificado_ascii.pdf", type: "certificate", size: "89KB" },
    ], null, 2),

    "/target/api/users/2/documents": JSON.stringify([
      { id: 201, name: "contrato_director.pdf", type: "contract", size: "312KB" },
      { id: 202, name: "bonus_confidencial.pdf", type: "bonus", size: "56KB" },
    ], null, 2),

    // API - Billing (VULNERABLE)
    "/target/api/users/1/billing": JSON.stringify({
      user_id: 1,
      plan: "premium",
      monthly_fee: 49.99,
      payment_method: "Visa ****1234",
      next_billing: "2026-09-15",
      history: [
        { date: "2026-08-15", amount: 49.99, status: "paid" },
        { date: "2026-07-15", amount: 49.99, status: "paid" },
      ],
    }, null, 2),

    "/target/api/users/2/billing": JSON.stringify({
      user_id: 2,
      plan: "enterprise",
      monthly_fee: 199.99,
      payment_method: "Mastercard ****5678",
      next_billing: "2026-09-01",
      history: [
        { date: "2026-08-01", amount: 199.99, status: "paid" },
        { date: "2026-07-01", amount: 199.99, status: "paid" },
      ],
    }, null, 2),
  },

  // Objetivos que el jugador debe completar
  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-api",
      descripcion: "Descubrir la documentación de la API",
      puntos: 50,
    },
    {
      tipo: "recon",
      id: "descubrir-endpoints",
      descripcion: "Identificar los endpoints de usuarios",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-idor-perfil",
      descripcion: "Probar IDOR en /api/users/{id}/profile",
      puntos: 100,
    },
    {
      tipo: "test",
      id: "probar-idor-documentos",
      descripcion: "Probar IDOR en /api/users/{id}/documents",
      puntos: 100,
    },
    {
      tipo: "exploit",
      id: "exfiltrar-datos",
      descripcion: "Acceder a datos de otro usuario",
      puntos: 150,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con PoC",
      puntos: 100,
    },
  ],

  // Soluciones esperadas
  soluciones: {
    recon: [
      "recon techcorp.com",
      "scan techcorp.com",
      "cat /target/api/docs.html",
    ],
    idor: [
      "test idor /api/users/1/profile",
      "test idor /api/users/2/profile",
      "test idor /api/users/3/profile",
    ],
    exploit: [
      "exploit idor",
    ],
    report: [
      "report",
    ],
  },

  // IOC y evidencias
  evidencias: {
    "api-docs": "/target/api/docs.html",
    "idor-perfil": "/target/api/users/2/profile",
    "idor-documentos": "/target/api/users/2/documents",
    "idor-billing": "/target/api/users/2/billing",
  },

  // Informe esperado del jugador
  informeEsperado: {
    titulo: "IDOR en API de TechCorp",
    tipo: "Insecure Direct Object Reference",
    severidad: "MEDIA",
    endpoint: "/api/users/{id}/profile, /api/users/{id}/documents, /api/users/{id}/billing",
    impacto: "Acceso no autorizado a datos personales, documentos y información de facturación de otros usuarios",
    remediacion: "Implementar validación de autorización en el servidor. Verificar que el usuario autenticado tiene acceso al recurso solicitado.",
  },

  // Puntos extra por calidad del reporte
  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
    conScreenshots: 30,
  },
};
