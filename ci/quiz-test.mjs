// quiz-test.mjs — Test del REPASO MITRE (quiz de 3 preguntas post-caso)
// Parte 1 (Node puro): estructura de los quizzes de los 15 casos de
//   campaña (3 preguntas, 4 opciones únicas, índice válido, explicación),
//   el fallback para casos sin quiz propio, la resolución del reto diario
//   (retoBaseId → quiz del caso original) y la corrección de respuestas.
// Parte 2 (E2E Playwright): completa el caso-01 de verdad (acciones +
//   informe), pasa el quiz respondiendo las 3 preguntas, llega a la
//   lección y verifica que las estadísticas quedan persistidas (localStorage)
//   y visibles en el panel Carrera — sin errores de consola.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { CASOS } from "../js/casos.js";
import { RT_CASOS } from "../js/rt-casos.js";
import { generarQuiz, corregirQuiz, validarQuiz } from "../js/quiz.js";
import { variarCaso } from "../js/reto.js";

let pass = 0;
let fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}  ${extra}`); }
};

// ---------- Unidad: estructura de los quizzes de campaña ----------
const TODOS = [...CASOS, ...RT_CASOS];
const SIN_QUIZ = TODOS.filter((c) => !generarQuiz(c).length || generarQuiz(c)[0]?.fallback);
check(`todos los casos de campaña tienen quiz propio (${TODOS.length})`, SIN_QUIZ.length === 0,
  `sin quiz: ${SIN_QUIZ.map((c) => c.id).join(", ")}`);

let errsTodos = [];
for (const c of TODOS) {
  errsTodos = errsTodos.concat(validarQuiz(generarQuiz(c), c.id));
}
check("los 15 quizzes de campaña son estructuralmente válidos", errsTodos.length === 0, errsTodos.slice(0, 3).join(" ; "));

// Las explicaciones y enunciados están anclados a MITRE real
const q01 = generarQuiz(CASOS[0]); // phishing-01
check("el quiz del phishing-01 menciona su técnica (T1566.001)", q01[0].p.includes("T1566.001") || q01[0].o.join(" ").includes("T1566.001"));
const qR4 = generarQuiz(RT_CASOS[3]); // rt-04-msf
const qR4Txt = JSON.stringify(qR4);
check("el quiz del rt-04 menciona sus técnicas (T1068/T1190/T1505.003)", qR4Txt.includes("T1068") && qR4Txt.includes("T1190") && qR4Txt.includes("T1505.003"));

// ---------- Unidad: corrección ----------
const r1 = corregirQuiz(q01, [0, 0, 0]);
check("corregirQuiz: 3/3 respuestas correctas", r1.aciertos === 3 && r1.total === 3);
const r2 = corregirQuiz(q01, [1, 1, 1]);
check("corregirQuiz: 0/3 respuestas falladas", r2.aciertos === 0 && r2.total === 3);
const r3 = corregirQuiz(q01, [0, 1, 0]);
check("corregirQuiz: 2/3 mixto", r3.aciertos === 2 && r3.total === 3);

// ---------- Unidad: reto diario resuelve al quiz del caso original ----------
const variado = variarCaso(CASOS[0], "2026-08-13").caso;
check("el caso variado conserva retoBaseId", variado.retoBaseId === CASOS[0].id);
const qVariado = generarQuiz(variado);
check("el reto diario usa el quiz del caso original (mismo enunciado)", qVariado[0].p === q01[0].p);
check("el quiz del reto no arrastra el fallback", validarQuiz(qVariado, "reto").length === 0);

// ---------- Unidad: fallback para casos sin quiz propio ----------
const sintetico = {
  id: "caso-desconocido",
  retoBaseId: undefined,
  leccion: {
    mitre: ["T1190"],
    deteccion: "- Una app pública que devuelve errores SQL en la URL",
    resumen: "x",
    respuesta: "x",
    aprendizaje: [],
  },
};
const fb = generarQuiz(sintetico);
check("el fallback genera 3 preguntas", fb.length === 3);
check("el fallback es estructuralmente válido", validarQuiz(fb, "sintetico").length === 0);
check("el fallback ancla la técnica de la lección", fb[0].o.join(" ").includes("Exploit Public-Facing Application"));
check("el fallback ancla la señal de detección", fb[2].o[fb[2].c].includes("errores SQL"));

// ---------- E2E ----------
const BASE = process.env.CYBERGRAD_URL || "http://127.0.0.1:8000/";
const PORT = parseInt(new URL(BASE).port || "8000", 10);
async function servidorDisponible() {
  try { return (await fetch(BASE, { method: "HEAD" })).ok; } catch { return false; }
}
let proc = null;
if (!(await servidorDisponible())) {
  proc = spawn(process.execPath, ["serve.js", String(PORT)], { stdio: "ignore" });
  let intentos = 0;
  while (!(await servidorDisponible()) && intentos < 40) {
    await new Promise((r) => setTimeout(r, 250));
    intentos++;
  }
  if (!(await servidorDisponible())) {
    console.error(`✖ No se pudo levantar el servidor estático en ${BASE}`);
    process.exit(1);
  }
}

const falla = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });
const salir = (codigo) => browser.close().finally(() => { if (proc) proc.kill(); process.exit(codigo); });
const ejecutar = async (cmd) => {
  await page.fill("#terminal input", cmd);
  await page.press("#terminal input", "Enter");
  await page.waitForTimeout(350);
};

// 1) Onboarding + briefing del caso-01
await page.goto(BASE + "?quiz=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("#input-nombre", { timeout: 15000 }).catch(() => falla("No apareció el onboarding"));
await page.fill("#input-nombre", "CI-Quiz");
await page.click("#btn-empezar");
const aceptar = page.locator('[data-action="aceptar-briefing"]');
await aceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await aceptar.count()) await aceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => falla("La terminal no arrancó"));

// 2) Completar el caso-01 (todas las acciones correctas)
const acciones = [
  "bloquear dominio:cibercorp-facturas.info",
  "bloquear ip:185.220.101.34",
  "bloquear url:http://cibercorp-facturas.info/payment.exe",
  "bloquear dominio:paypal-verifica.top",
  "aislar HOST-104",
  "deshabilitar m.garcia",
  "escalar",
];
for (const a of acciones) await ejecutar(a);

// 3) Informe con cobertura completa → ENTREGAR
await ejecutar("informe");
const txtarea = page.locator("#informe-texto");
if (!(await txtarea.count())) falla("El comando informe no abrió el textarea");
const informe = [
  "Incidente de phishing confirmado con macro.",
  "IOCs: cibercorp-facturas.info, 185.220.101.34,",
  "http://cibercorp-facturas.info/payment.exe, paypal-verifica.top.",
  "Host HOST-104 aislado, cuenta m.garcia deshabilitada.",
  "Escalar a CSIRT.",
].join("\n");
await txtarea.fill(informe);
await page.locator('[data-action="enviar-informe"]').click();
await page.locator("#modal-content .modal-title", { hasText: "CASO RESUELTO" }).waitFor({ timeout: 15000 }).catch(() => falla("No apareció el resultado del caso"));

// 4) Resultado → SIGUIENTE → el quiz de 3 preguntas
await page.locator('[data-action="siguiente"]').click();
await page.locator("#modal-content .modal-title", { hasText: "REPASO MITRE" }).waitFor({ timeout: 10000 }).catch(() => falla("No apareció el quiz de repaso MITRE"));
let modalTxt = await page.locator("#modal-content").innerText();
check("el quiz muestra PREGUNTA 1/3", modalTxt.includes("PREGUNTA 1/3"));
check("el quiz muestra los tags MITRE del caso", modalTxt.includes("T1566.001"));

// Responder las 3 preguntas (en el quiz del phishing la correcta es la 0)
for (let n = 1; n <= 3; n++) {
  const ops = page.locator(".quiz-op");
  if ((await ops.count()) !== 4) falla(`Pregunta ${n}: no hay 4 opciones`);
  await ops.nth(0).click();
  await page.locator("#quiz-explicacion").waitFor({ state: "visible", timeout: 5000 }).catch(() => falla(`Pregunta ${n}: no salió la explicación`));
  const expl = await page.locator("#quiz-explicacion").innerText();
  check(`pregunta ${n}: la explicación aparece`, expl.length > 15);
  await page.locator('[data-action="quiz-siguiente"]').click();
}
await page.locator("#modal-content .modal-title", { hasText: "REPASO: 3/3" }).waitFor({ timeout: 10000 }).catch(() => falla("El resultado del quiz no muestra 3/3"));
modalTxt = await page.locator("#modal-content").innerText();
check("el resultado del quiz es 3/3 ACIERTOS", modalTxt.includes("3/3 ACIERTOS"));

// 5) Quiz → lección → siguiente caso
await page.locator('[data-action="quiz-fin"]').click();
await page.locator("#modal-content .modal-title", { hasText: "LECCIÓN" }).waitFor({ timeout: 10000 }).catch(() => falla("No apareció la lección tras el quiz"));
check("la lección llega después del quiz", true);
await page.locator('[data-action="cerrar-leccion"]').click();
await page.locator("#modal-content .modal-title", { hasText: "SIGUIENTE CASO" }).waitFor({ timeout: 10000 }).catch(() => falla("No apareció el siguiente caso"));

// 6) Estadísticas persistidas: quiz 3/3 en el guardado y en el panel Carrera
const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem("cybergrad_save_v1") || "null"));
check("el guardado persiste el quiz (3/3)", !!guardado?.estadisticas?.quiz && guardado.estadisticas.quiz.aciertos === 3 && guardado.estadisticas.quiz.total === 3);
await page.locator('[data-action="aceptar-caso"]').click();
const bAceptar = page.locator('[data-action="aceptar-briefing"]');
await bAceptar.first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
if (await bAceptar.count()) await bAceptar.first().click();
await page.waitForSelector("#terminal input", { timeout: 15000 }).catch(() => {});
await page.click("#btn-carrera");
await page.waitForTimeout(500);
const carrera = await page.locator("#modal-content").innerText();
check("el panel Carrera muestra los repasos MITRE 3/3", carrera.includes("Repasos MITRE") && carrera.includes("3/3"));

// 7) Sin errores de consola
if (errs.length) {
  console.error("✖ Errores de consola:");
  for (const e of errs.slice(0, 8)) console.error("   " + e);
  salir(1);
}
check("sin errores de consola", true);

console.log(fail === 0 ? `✔ quiz-test OK: ${pass} checks, 0 fallos.` : `✖ ${fail} checks fallidos.`);
salir(fail === 0 ? 0 : 1);
