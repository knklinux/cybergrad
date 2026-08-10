// eslint.config.js — linter básico (flat config, ESLint 9)
// El juego usa ES modules y globals del navegador; los scripts de CI/serve
// usan globals de Node.
const browserGlobals = {
  document: "readonly",
  window: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  console: "readonly",
  URL: "readonly",
  Blob: "readonly",
  FileReader: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  location: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  performance: "readonly",
  fetch: "readonly",
  Image: "readonly",
  HTMLCanvasElement: "readonly",
  CanvasRenderingContext2D: "readonly",
  FormData: "readonly",
  Date: "readonly",
  Math: "readonly",
  JSON: "readonly",
  parseInt: "readonly",
  parseFloat: "readonly",
  isNaN: "readonly",
  TextDecoder: "readonly",
  Uint8Array: "readonly",
  Int32Array: "readonly",
  Float32Array: "readonly",
};

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
};

const reglas = {
  "no-debugger": "error",
  "no-constant-condition": "error",
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
};

export default [
  {
    files: ["js/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: browserGlobals },
    rules: reglas,
  },
  {
    files: ["serve.js", "ci/**/*.mjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: nodeGlobals },
    rules: reglas,
  },
];
