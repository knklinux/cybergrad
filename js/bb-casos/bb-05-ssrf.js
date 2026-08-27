// ============================================================
// bb-05-ssrf.js — Caso Bug Bounty: SSRF vía webhook
// El jugador descubre que el endpoint de webhooks permite
// acceder a servicios internos.
// ============================================================

export default {
  id: "bb-ssrf-01",
  titulo: "SSRF vía Webhook — Acceso a servicios internos",
  tipo: "ssrf",
  severidad: "ALTA",
  nivel: 3,
  sla: 2400,
  xp: 400,
  bounty: 1000,
  briefing: [
    "Programa de bug bounty: DataFlow (plataforma de datos)",
    "Scope: *.dataflow.io",
    "Has detectado que la función de webhooks podría ser vulnerable a SSRF.",
    "",
    "Usa `recon dataflow.io` para explorar.",
    "Usa `test ssrf <url>` para probar si el webhook accede a URLs internas.",
    "Si funciona, `exploit ssrf` para acceder a servicios internos.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "SSRF puede revelar servicios internos, metadatos cloud, y datos sensibles.",
  ].join("\n"),

  fs: {
    // API root
    "/target/api/": JSON.stringify({
      name: "DataFlow API",
      version: "2.0",
      endpoints: ["/api/webhooks", "/api/users", "/api/health"],
    }, null, 2),

    // Endpoint de webhooks (VULNERABLE)
    "/target/api/webhooks": JSON.stringify({
      info: "POST /api/webhooks/test para probar un webhook",
      example: {
        url: "https://example.com/webhook",
        method: "GET",
      },
    }, null, 2),

    // Servicio interno - metadata AWS
    "/target/internal/metadata": JSON.stringify({
      "instance-id": "i-0abc123def456789",
      "instance-type": "t3.medium",
      "ami-id": "ami-0123456789abcdef",
      "security-credentials": {
        "role": "DataFlowAppRole",
        "access_key": "AKIAIOSFODNN7EXAMPLE",
        "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "token": "FwoGZXIvYXdzEBYaDN...",
        "expiration": "2026-08-27T12:00:00Z",
      },
    }, null, 2),

    // Servicio interno - base de datos
    "/target/internal/database": JSON.stringify({
      host: "10.0.1.50",
      port: 5432,
      database: "dataflow_prod",
      status: "connected",
      tables: ["users", "sessions", "api_keys", "billing"],
    }, null, 2),

    // Servicio interno - admin panel
    "/target/internal/admin": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Admin Panel - Internal</title></head>",
      "<body>",
      "  <h1>Panel de Administración</h1>",
      "  <p>Este panel solo es accesible desde la red interna.</p>",
      "  <ul>",
      "    <li>Usuarios activos: 15,432</li>",
      "    <li>API calls hoy: 2,345,678</li>",
      "    <li>Errores: 23</li>",
      "    <li>Uptime: 99.97%</li>",
      "  </ul>",
      "  <p><a href='/admin/config'>Configuración</a></p>",
      "</body>",
      "</html>",
    ].join("\n"),
  },

  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-webhooks",
      descripcion: "Descubrir el endpoint de webhooks",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-ssrf-basico",
      descripcion: "Probar SSRF básico con webhook",
      puntos: 100,
    },
    {
      tipo: "exploit",
      id: "acceder-metadata",
      descripcion: "Acceder a metadata de AWS (169.254.169.254)",
      puntos: 200,
    },
    {
      tipo: "exploit",
      id: "acceder-admin",
      descripcion: "Acceder al panel de administración interno",
      puntos: 150,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con cadena de ataque completa",
      puntos: 100,
    },
  ],

  soluciones: {
    recon: [
      "recon dataflow.io",
      "scan dataflow.io",
    ],
    ssrf: [
      "test ssrf http://169.254.169.254/latest/meta-data/",
      "test ssrf http://10.0.1.50:5432",
      "test ssrf http://internal-admin/",
    ],
    exploit: [
      "exploit ssrf",
    ],
    report: [
      "report",
    ],
  },

  evidencias: {
    "webhook-endpoint": "/target/api/webhooks",
    "metadata-aws": "/target/internal/metadata",
    "admin-interno": "/target/internal/admin",
    "database-info": "/target/internal/database",
  },

  informeEsperado: {
    titulo: "SSRF vía Webhook en DataFlow",
    tipo: "Server-Side Request Forgery (SSRF)",
    severidad: "ALTA",
    endpoint: "POST /api/webhooks/test",
    impacto: "Acceso a metadata AWS (credenciales temporales), servicios internos, y panel de administración",
    remediacion: "Implementar whitelist de URLs permitidas. Bloquear rangos de IP internos (10.x, 172.16-31.x, 192.168.x, 169.254.x).",
  },

  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
    conCadenaCompleta: 100,
  },
};
