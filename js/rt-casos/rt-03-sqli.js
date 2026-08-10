// ============================================================
// RT-03 — Inyección SQL: la tienda que habla SQL
// sqlmap + crackeo de hash para entrar al panel admin (T1190).
// ============================================================

export default {
  id: "rt-03-sqli",
  modo: "rt",
  titulo: "Inyección SQL: la tienda que habla SQL",
  nivel: 2,
  severidad: "ALTA",
  sla: 1500,
  xp: 320,
  briefing:
    "La tienda online de ACME (10.10.10.30) muestra productos con una URL sospechosa: /producto?id=1. Sospechas de inyección SQL. Tu misión: confirmarlo con `sqlmap`, volcar la base de datos, crackear el hash del admin con `john` y entrar en el panel /admin con sus credenciales. La tienda es de juguete y el contrato te cubre.",
  red: {
    hosts: {
      "10.10.10.30": {
        hostname: "app.acme.local",
        os: "Linux Ubuntu 22.04",
        puertos: "80/tcp  open  http       nginx 1.24.0\n3306/tcp filtered mysql",
      },
    },
  },
  web: {
    "http://10.10.10.30": {
      raiz:
        "<html><head><title>ACME Store</title></head>\n<body><h1>Tienda online de ACME</h1><a href='/producto?id=1'>Producto 1</a></body></html>",
      rutas: {
        "/producto?id=1": "<h1>Producto: Tornillos ACME</h1><p>Precio: 0.50 EUR</p>",
        "/admin": "<h1>Login de administracion</h1><form><input name='usuario'><input type='password' name='password'></form>",
      },
      login: { url: "/admin", usuario: "admin", password: "Admin#2024$" },
    },
  },
  sqli: {
    url: "http://10.10.10.30/producto?id=1",
    db: "acme_shop",
    tablas: [
      {
        nombre: "usuarios",
        filas: [
          { id: 1, usuario: "admin", hash: "e780398db6d13628abc3105042702fc6", rol: "administrador" },
          { id: 2, usuario: "m.garcia", hash: "5f4dcc3b5aa765d61d8327deb882cf99", rol: "cliente" },
          { id: 3, usuario: "j.castro", hash: "388e6bb3a54af83cbb093acd6236a743", rol: "cliente" },
        ],
      },
      {
        nombre: "pedidos",
        filas: [
          { id: 1, cliente: "m.garcia", total: "128.50 EUR", tarjeta: "**** 4242" },
          { id: 2, cliente: "j.castro", total: "59.99 EUR", tarjeta: "**** 1337" },
        ],
      },
    ],
  },
  hashes: {
    e780398db6d13628abc3105042702fc6: { tipo: "MD5", password: "Admin#2024$" },
  },
  fs: {
    "/tmp/": ["hash.txt"],
    "/tmp/hash.txt": "admin:e780398db6d13628abc3105042702fc6",
  },
  correctas: {
    recon: ["host:10.10.10.30"],
    exfiltracion: ["db:usuarios"],
    acceso: ["url:http://10.10.10.30/admin"],
    escalada: [],
  },
  incorrectas: [],
  pistas: [
    "`sqlmap -u http://10.10.10.30/producto?id=1 --dump` volcará las tablas de la base de datos.",
    "El hash del admin es MD5: `john /tmp/hash.txt` lo descifra al instante.",
    "Con las credenciales del admin, entra en el panel: `curl -u admin:Admin#2024$ http://10.10.10.30/admin`.",
  ],
  eventos: [
    { en: 400, tipo: "alerta", sev: "MEDIUM", titulo: "Web server: peticiones inusuales a /producto?id= (WAF desactivado)" },
  ],
  leccion: {
    titulo: "Inyección SQL: cuando la web habla la lengua de la base de datos",
    resumen:
      "Si la aplicación concatena parámetros del usuario en consultas SQL sin parametrizar, el atacante puede manipular la consulta y leer (o modificar) toda la base de datos. sqlmap automatiza la detección y explotación, y los hashes de passwords se crackean con diccionarios en segundos cuando son débiles.",
    deteccion:
      "- Parámetros en la URL sin validación (/producto?id=1).\n- Errores SQL visibles en la respuesta.\n- WAF desactivado o mal configurado.\n- Hashes MD5/SHA1 (sin sal) en la base de datos.",
    respuesta:
      "1. Consultas parametrizadas (prepared statements) SIEMPRE.\n2. Hashes con sal y algoritmo fuerte (bcrypt/argon2).\n3. Principio de mínimo privilegio en la cuenta de BD de la app.\n4. WAF + validación de entrada.\n5. Rotar credenciales del panel admin.",
    aprendizaje: [
      "Un solo parámetro sin parametrizar compromete toda la base de datos.",
      "sqlmap hace en segundos lo que a mano lleva horas.",
      "Los hashes débiles son passwords en texto plano con retraso.",
    ],
    glosario: ["SQLi", "Prepared statements", "Sal (salt)", "WAF"],
    mitre: ["T1190", "T1213", "T1110.002"],
  },
};
