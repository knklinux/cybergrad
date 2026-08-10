// check-syntax.mjs — node --check sobre todos los .js del proyecto
// El package.json declara "type": "module", así que todos los .js se
// parsean como ES modules sin ambigüedad.
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    out = statSync(p).isDirectory() ? out.concat(walk(p)) : out.concat(p);
  }
  return out;
}

const files = [...walk("js"), "serve.js"].filter((f) => f.endsWith(".js"));
let fallas = 0;
for (const f of files) {
  try {
    execSync(`node --check "${f}"`, { stdio: "pipe" });
  } catch {
    console.error(`✖ Sintaxis inválida: ${f}`);
    fallas++;
  }
}
if (fallas) {
  console.error(`\n${fallas} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}
console.log(`✔ Sintaxis OK en ${files.length} archivos .js`);
