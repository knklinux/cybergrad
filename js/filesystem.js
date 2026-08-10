// ============================================================
// filesystem.js — Sistema de archivos virtual del caso activo
// El analista investiga leyendo logs, correos y evidencias.
// ============================================================

export function normalizar(path) {
  if (!path || path === "~") return "/home/analista";
  let p = path.startsWith("/") ? path : "/home/analista/" + path;
  // Resolver . y ..
  const partes = [];
  for (const parte of p.split("/")) {
    if (parte === "" || parte === ".") continue;
    if (parte === "..") { partes.pop(); continue; }
    partes.push(parte);
  }
  return "/" + partes.join("/");
}

export function esDirectorio(fs, path) {
  const p = normalizar(path);
  if (fs[p] !== undefined) return false;
  // Un directorio existe si hay algún archivo bajo él
  return Object.keys(fs).some((k) => k.startsWith(p === "/" ? "/" : p + "/"));
}

export function listar(fs, path) {
  const p = normalizar(path);
  const prefijo = p === "/" ? "/" : p + "/";
  const hijos = new Set();
  for (const k of Object.keys(fs)) {
    if (!k.startsWith(prefijo)) continue;
    const resto = k.slice(prefijo.length);
    const primera = resto.split("/")[0];
    if (primera) hijos.add(primera);
  }
  return [...hijos].sort();
}

export function leer(fs, path) {
  const p = normalizar(path);
  if (fs[p] !== undefined) return { ok: true, contenido: fs[p], path: p };
  return { ok: false, error: `No existe el archivo '${path}'` };
}

export function existe(fs, path) {
  const p = normalizar(path);
  return fs[p] !== undefined || esDirectorio(fs, p);
}

export function buscar(fs, patron, pathInicio = "/") {
  // Búsqueda simple tipo grep -r por nombre de archivo
  const p = normalizar(pathInicio);
  const prefijo = p === "/" ? "/" : p + "/";
  const res = [];
  for (const k of Object.keys(fs)) {
    if (!k.startsWith(prefijo)) continue;
    if (k.includes(patron)) res.push(k);
  }
  return res;
}

// Tamaño simulado en bytes (para ls -l / wc -c)
export function tamano(contenido) {
  return (contenido || "").length;
}
