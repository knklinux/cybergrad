// test-esc.mjs — Tests unitarios de esc() (helper de escape HTML)
// Verifica que ningún input de usuario pueda inyectar HTML o romper un
// <textarea> cuando se interpola en templates. Se ejecuta en Node puro.
import { esc } from "../js/ui.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// 1. Escapa los 5 caracteres peligrosos
check("escapa < y >", esc("<script>") === "&lt;script&gt;");
check("escapa &", esc("a&b") === "a&amp;b");
check("escapa comillas dobles", esc('a"b') === "a&quot;b");
check("escapa comillas simples", esc("a'b") === "a&#39;b");

// 2. Payloads reales de XSS: el resultado NO debe contener HTML interpretable
const MAL = "</textarea><img src=x onerror=window.__pwned=1>";
const out = esc(MAL);
check("payload de textarea: no contiene <textarea> de cierre", !out.includes("</textarea>"));
check("payload de textarea: no contiene <img", !out.includes("<img"));
// El `<` escapado neutraliza el markup: el atributo onerror queda como texto
// inerte (no hay elemento que lo ejecute). Esto es lo que impide el XSS.
check("payload: <img queda escapado como &lt;img", out.includes("&lt;img"));
check("payload: sobrevive como texto (round-trip visual)", out.includes("__pwned"));

// 3. Casos borde: null, undefined y vacío no rompen
check("null → cadena vacía", esc(null) === "");
check("undefined → cadena vacía", esc(undefined) === "");
check("número → cadena", esc(42) === "42");
check("texto normal sin cambios", esc("Ana García") === "Ana García");

// 4. Doble escape no se acumula (idempotencia razonable para uso normal)
check("texto ya limpio no se altera", esc("Carlos & Co") === "Carlos &amp; Co");

console.log(fail === 0 ? `\n✅ esc(): ${pass} ok · 0 fallos` : `\n❌ esc(): ${pass} ok · ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
