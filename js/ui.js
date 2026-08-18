// ============================================================
// ui.js — Interfaz: HUD, modales, notificaciones, Jimmy, splash
// ============================================================

import { GAME, RANKS, RT_RANKS, estadoRango, estadoRangoRT } from "./state.js";
import { guardar, borrarGuardado, reiniciarCampania, slotActual } from "./save.js";
import { CASOS, numCaso, siguienteCaso } from "./casos.js";
import { RT_CASOS, numCasoRT, siguienteCasoRT } from "./rt-casos.js";
import { GLOSARIO } from "./glosario.js";
import { PASOS_TUTORIAL, MICROCASO } from "./tutorial.js";
import { BECARIO_CASOS, BECARIO_RT_CASOS } from "./becario.js";
import { logrosDesbloqueados, logrosPendientes, totalLogros, evaluarLogros } from "./logros.js";
import { retoDelDia, filasRankingReto, resumenIndicadores } from "./reto.js";
import { elegirCasoExamen, apruebaExamen, textoVeredicto } from "./examen.js";
import { generarQuiz } from "./quiz.js";
import { DUELO_ESCENARIOS } from "./duelo.js";
import { descargarCertificado, imprimirCertificado } from "./certificado.js";
import { estadoHabilidades } from "./habilidades.js";
import { aplicarModoPresentador } from "./presentador.js";
import { sonido, sonidoActivado, fijarSonido } from "./sonido.js";
import { vozActivada, fijarVoz, hablar, callar, comprobarPiper } from "./piper.js";
import {
  JIMMY, JIMMY_PRESENTACION, JIMMY_CASO, JIMMY_RESULTADO,
  JIMMY_LECCION, JIMMY_LAB, JIMMY_FINAL,
} from "./jimmy.js";

const $ = (id) => document.getElementById(id);
const alea = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Escapa texto de usuario (p. ej. el nombre del analista, persistido en
// localStorage) antes de interpolar en HTML. Sin esto, un nombre como
// <img src=x onerror=...> se ejecutaría al renderizar modales (XSS).
// Exportado para tests unitarios (ci/test-esc.mjs): la función es pura.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

export class UI {
  constructor(term, fx) {
    this.term = term;
    this.fx = fx || null;
    this._sla = 0;
    this._acciones = {};
    this._becIdx = 0;
    this._jimmyClicks = 0;
    this._jimmyClicksLast = 0;
    this._bindBotones();
    document.addEventListener("click", (e) => this._onClickJimmy(e));
    const sc = $("secreto-cerrar");
    if (sc) sc.addEventListener("click", () => $("secreto-overlay")?.classList.add("hidden"));
  }

  // ---------- Secreto: 3 clics en el avatar de Jimmy ----------
  _onClickJimmy(e) {
    if (!e.target || !e.target.closest || !e.target.closest(".holo-avatar")) return;
    const ahora = Date.now();
    if (ahora - this._jimmyClicksLast > 1200) this._jimmyClicks = 0; // serie rota por pausa
    this._jimmyClicks++;
    this._jimmyClicksLast = ahora;
    if (this._jimmyClicks >= 3) {
      this._jimmyClicks = 0;
      this._desbloquearSecreto();
    }
  }

  _desbloquearSecreto() {
    const yaEncontrado = GAME.secretos.includes("jimmy");
    if (!yaEncontrado) GAME.secretos.push("jimmy");
    const nuevos = evaluarLogros();
    guardar();
    this.actualizarPerfil();
    this._mostrarSecreto(yaEncontrado);
    if (nuevos.length) {
      this.notificar("🥚 SECRETO DESBLOQUEADO", `${nuevos[0].icono} ${nuevos[0].nombre} — ${nuevos[0].desc}`, "logro");
    } else {
      this.notificar("🥚 Secreto ya desbloqueado", "Jimmy aprecia tu insistencia.", "logro");
    }
  }

  _mostrarSecreto(yaEncontrado) {
    const overlay = $("secreto-overlay");
    if (!overlay) return;
    $("secreto-titulo").textContent = yaEncontrado ? "🥚 SECRETO YA CONOCIDO" : "🥚 SECRETO DESBLOQUEADO";
    $("secreto-msg").textContent = yaEncontrado
      ? "Ya encontraste mi secreto, analista. La curiosidad no se premia dos veces… pero se agradece. — Jimmy"
      : "Nadie te dijo que pulsaras mi avatar tres veces. Pero lo hiciste. La curiosidad es el primer vector de intrusión del mundo: úsala a tu favor. — Jimmy";
    $("secreto-logro").innerHTML = yaEncontrado
      ? `🥚 Huevo de pascua · Encuentra el secreto escondido en el avatar de Jimmy`
      : `🏅 NUEVO LOGRO: 🥚 Huevo de pascua — Encuentra el secreto escondido en el avatar de Jimmy`;
    overlay.classList.remove("hidden");
  }

  _bindBotones() {
    $("btn-carrera").addEventListener("click", () => this.mostrarCarrera());
    $("btn-logros").addEventListener("click", () => this.mostrarLogros());
    $("btn-glosario").addEventListener("click", () => this.mostrarGlosario());
    $("btn-ayuda").addEventListener("click", () => this.mostrarAyuda());
    $("btn-lab").addEventListener("click", () => this.mostrarLaboratorio());
    $("btn-tutorial").addEventListener("click", () => this.mostrarTutorial(false));
    $("btn-rt").addEventListener("click", () => this.mostrarRedTeam());
    $("btn-becario").addEventListener("click", () => this.mostrarBecario());
    $("btn-compartir").addEventListener("click", () => this.mostrarCompartir());
    $("btn-reto").addEventListener("click", () => this.mostrarRetoDiario());
    $("btn-examen").addEventListener("click", () => this.mostrarExamen());
    $("btn-habilidades").addEventListener("click", () => this.mostrarHabilidades());
    $("btn-demo").addEventListener("click", () => this.mostrarPresentador());
    $("btn-sonido").addEventListener("click", () => this.toggleSonido());
    this.actualizarBotonSonido();
    $("btn-voz").addEventListener("click", () => this.toggleVoz());
    this.actualizarBotonVoz();
  }

  // ---------- Sonido ----------
  toggleSonido() {
    const on = !sonidoActivado();
    fijarSonido(on);
    sonido.setActivado(on);
    this.actualizarBotonSonido();
    if (on) sonido.ok();
  }

  actualizarBotonSonido() {
    const btn = $("btn-sonido");
    if (!btn) return;
    const on = sonidoActivado();
    btn.textContent = on ? "🔊" : "🔇";
    btn.title = on ? "Sonido: activado (clic para silenciar)" : "Sonido: silenciado (clic para activar)";
    btn.classList.toggle("off", !on);
  }

  // ---------- Voz de Jimmy (Piper TTS local) ----------
  toggleVoz() {
    const on = !vozActivada();
    fijarVoz(on);
    if (on) {
      callar();
      comprobarPiper(); // sonda del servidor local (asíncrona, no bloquea)
    }
    this.actualizarBotonVoz();
    if (on) sonido.ok();
  }

  actualizarBotonVoz() {
    const btn = $("btn-voz");
    if (!btn) return;
    const on = vozActivada();
    btn.textContent = on ? "🗣️" : "🤫";
    btn.title = on
      ? "Voz de Jimmy (Piper): activada — clic para silenciar"
      : "Voz de Jimmy (Piper): desactivada — clic para activar (requiere el servidor local)";
    btn.classList.toggle("off", !on);
  }

  // ---------- Motor gráfico ----------
  setTemaCaso(tema) {
    if (this.fx) this.fx.setTema(tema);
  }
  pulsoTema(intensidad) {
    if (this.fx) this.fx.pulsoAlerta(intensidad);
  }

  setModoLab(lab, tutorial, becario) {
    this._modoLab = lab;
    this._modoTutorial = tutorial;
    this._modoBecario = becario;
    $("btn-lab").classList.toggle("on", lab);
    this._renderModo();
  }

  _renderModo() {
    const mode = $("sla-mode");
    if (!mode) return;
    mode.textContent = this._modoBecario ? "MODO BECARIO — GUIADO" : this._modoTutorial ? "MODO TUTORIAL — GUIADO" : this._modoLab ? "MODO LABORATORIO — SIN SLA" : "";
  }

  // ---------- Panel de guía (tutorial / becario) ----------
  mostrarGuia(paso, idx, total, modo) {
    const el = $("guia-panel");
    if (!el) return;
    const cmd = paso.ejemplo || (paso.tipo !== "comando" && paso.objetivo ? `${paso.cmd} ${paso.objetivo}` : paso.cmd);
    el.innerHTML = `
      <div class="guia-head">${modo === "becario" ? "&#127891; BECARIO" : "&#129517; TUTORIAL"} · PASO ${idx + 1}/${total}</div>
      <div class="guia-que">${paso.que || `Haz: ${cmd}`}</div>
      <div class="guia-cmd">&#9654; <span class="mono">${cmd}</span></div>
      ${paso.porque ? `<div class="guia-porque"><b>¿POR QUÉ?</b> ${paso.porque}</div>` : ""}
    `;
    el.classList.remove("hidden");
  }

  ocultarGuia() {
    const el = $("guia-panel");
    if (el) el.classList.add("hidden");
  }

  // ---------- Jimmy ----------
  jimmyDice(msg) {
    const el = $("jimmy-msg");
    if (el) el.textContent = msg;
  }

  holoHTML(tam = "holo-md") {
    return `<div class="holo-avatar ${tam}"><img src="${JIMMY.foto}" alt="${JIMMY.nombre}" /></div>`;
  }

  // ---------- Modales ----------
  abrirModal(html) {
    $("modal-content").innerHTML = html;
    $("modal-overlay").classList.remove("hidden");
    $("modal-content").querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const acc = btn.getAttribute("data-action");
        const fn = this._acciones[acc];
        if (fn) fn(btn);
      });
    });
    return $("modal-content");
  }

  cerrarModal() {
    $("modal-overlay").classList.add("hidden");
    $("modal-content").innerHTML = "";
  }

  setAcciones(acciones) {
    this._acciones = acciones || {};
  }

  // ---------- Splash de incidente ----------
  mostrarSplash(caso, cb) {
    const splash = $("splash");
    $("splash-titulo").textContent = caso.titulo;
    const sev = $("splash-sev");
    sev.textContent = "SEVERIDAD " + caso.severidad;
    sev.style.color = caso.severidad === "CRÍTICA" ? "var(--red)"
      : caso.severidad === "ALTA" ? "var(--amber)"
      : caso.severidad === "MEDIA" ? "var(--cyan)" : "var(--green)";
    sev.style.borderColor = sev.style.color;
    splash.classList.remove("hidden");
    setTimeout(() => {
      splash.classList.add("hidden");
      if (cb) cb();
    }, 2200);
  }

  // ---------- Briefing de Jimmy ----------
  mostrarBriefing(caso, cb) {
    const esRT = caso.modo === "rt";
    const lineas = JIMMY_CASO[caso.id] || (esRT ? ["Contrato firmado: tú eres el atacante bueno. Respeta el alcance y documenta todo.", "Cada hallazgo que encuentres antes que un atacante real vale oro."] : ["Analiza el caso y responde. Yo vigilo los datos."]);
    const num = esRT ? numCasoRT(caso.id) : numCaso(caso.id);
    const total = esRT ? RT_CASOS.length : CASOS.length;
    const html = `
      <div class="modal-title">${esRT ? "&#127919;" : "&#129302;"} ${esRT ? "CONTRATO PENTEST" : "BRIEFING"} — ${caso.titulo}</div>
      <div class="briefing-avatar">
        ${this.holoHTML("holo-lg")}
        <div class="briefing-lines">
          <div class="briefing-line">${lineas[0]}</div>
          ${lineas[1] ? `<div class="briefing-line">${lineas[1]}</div>` : ""}
          <div class="briefing-line" style="color:#5f8a6a;font-size:11.5px">
            ${esRT ? "Pentest" : "Caso"} ${num}/${total} · Severidad ${caso.severidad} ·
            SLA ${Math.floor(caso.sla / 60)} min · +${caso.xp} XP
          </div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="aceptar-briefing">&#9654; ${esRT ? "ACEPTAR CONTRATO" : "ACEPTAR CASO"}</button>
      </div>`;
    this.setAcciones({
      "aceptar-briefing": () => { this.cerrarModal(); cb(); },
    });
    this.abrirModal(html);
    // Jimmy presenta el caso con su voz local (Piper) si está activa.
    hablar(lineas.join(". ")).catch(() => {});
  }

  // ---------- Selector de partida (arranque con guardado) ----------
  mostrarSelectorPartida(guardados, { onContinuar, onNueva }) {
    const card = (g) => `
      <div class="partida-card">
        <div class="p-num">PARTIDA ${g.slot}</div>
        <div class="p-nombre">${esc(g.datos.nombre || "Analista")}</div>
        <div class="p-meta">&#128737;&#65039; ${g.datos.xp || 0} XP SOC · ${g.datos.casosResueltos || 0}/${CASOS.length} casos</div>
        <div class="p-meta">&#127919; ${g.datos.rtXp || 0} XP Red Team · ${g.datos.rtCasosResueltos || 0}/${RT_CASOS.length} pentests</div>
        <div class="p-meta">&#127941; ${(g.datos.logros || []).length} logros · &#11088; ${g.datos.puntos || 0} puntos</div>
        <button class="btn-primary" data-action="continuar-${g.slot}">&#9654; CONTINUAR PARTIDA ${g.slot}</button>
      </div>`;
    const html = `
      <div class="modal-title">&#127918; SELECTOR DE PARTIDA</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px">
        Tienes <b>${guardados.length} ${guardados.length === 1 ? "partida guardada" : "partidas guardadas"}</b> en este navegador.
        ¿Continuamos donde lo dejaste o empiezas una aventura nueva?
      </div>
      <div class="partida-grid">${guardados.map(card).join("")}</div>
      <div class="modal-section">
        <h3>✨ EMPEZAR DE CERO</h3>
        <div class="modal-text" style="font-size:11.5px;color:#5f8a6a;margin-bottom:8px">
          Crea una partida nueva <b>sin borrar las existentes</b>: se guardará en un hueco libre.
          Si no hay hueco, sustituirá a la partida menos reciente en cuanto hagas tu primer progreso.
        </div>
        <button class="btn-secondary" data-action="nueva-partida">✨ EMPEZAR DE CERO</button>
      </div>
      <div class="jimmy-habla">Un buen analista no borra evidencias: conserva y elige. — Jimmy</div>
      <div class="btn-row"><button class="btn-secondary" data-action="cerrar-selector">CERRAR</button></div>`;
    this.setAcciones({
      "continuar-1": () => { this.cerrarModal(); onContinuar(1); },
      "continuar-2": () => { this.cerrarModal(); onContinuar(2); },
      "nueva-partida": () => { this.cerrarModal(); onNueva(); },
      "cerrar-selector": () => this.cerrarModal(),
    });
    this.abrirModal(html);
  }

  // ---------- Onboarding ----------
  onboarding(cb) {
    const lineas = JIMMY_PRESENTACION;
    const html = `
      <div class="modal-title">&#129513; BIENVENIDO AL SOC — CYBERGRAD</div>
      <div class="briefing-avatar">
        ${this.holoHTML("holo-lg")}
        <div class="briefing-lines">
          ${lineas.map((l) => `<div class="briefing-line">${l}</div>`).join("")}
          <div class="briefing-line" style="color:#5f8a6a;font-size:11.5px">
            Empezarás como Analista Junior con 0 XP. Cada caso incluye una lección al terminar.
            Escribe <span class="mono">ayuda</span> cuando quieras.
          </div>
        </div>
      </div>
      <div class="modal-section">
        <h3>IDENTIFICACIÓN DEL ANALISTA</h3>
        <input type="text" id="input-nombre" placeholder="Tu nombre o callsign (ej: Neo)" style="width:100%;background:#04080a;border:1px solid #1c2a20;color:#c8ffd0;padding:8px;font-family:var(--mono);border-radius:4px;" />
      </div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="ver-tutorial">&#129517; TUTORIAL RÁPIDO</button>
        <button class="btn-secondary" data-action="ver-becario">&#127891; MODO BECARIO</button>
        <button class="btn-primary" id="btn-empezar" data-action="empezar">EMPEZAR TURNO</button>
      </div>`;
    this.setAcciones({
      "ver-tutorial": () => this.mostrarTutorial(true, () => this.onboarding(cb)),
      "ver-becario": () => this.mostrarBecario(() => this.onboarding(cb)),
      "empezar": () => {
        const nombre = ($("input-nombre")?.value || "").trim() || "Analista";
        GAME.nombre = nombre;
        guardar();
        this.cerrarModal();
        this.jimmyDice(`Turno iniciado. Estoy contigo, ${nombre}.`);
        cb(nombre);
      },
    });
    this.abrirModal(html);
    this.term.focus();
  }

  // ---------- Tutorial ----------
  mostrarTutorial(conMicro = false, onCerrar = null) {
    this._tutIdx = 0;
    this._tutMicro = conMicro;
    this._tutOnCerrar = onCerrar;
    this._renderTutorialSlide();
  }

  _renderTutorialSlide() {
    const p = PASOS_TUTORIAL[this._tutIdx];
    const total = PASOS_TUTORIAL.length;
    const esUltima = this._tutIdx === total - 1;
    const dots = PASOS_TUTORIAL.map((_, i) => `<span class="tut-dot ${i === this._tutIdx ? "on" : ""}"></span>`).join("");
    const html = `
      <div class="modal-title">${p.icono} ${p.titulo}</div>
      <div class="tut-slide">
        <div class="tut-ejemplo">${p.ejemplo}</div>
        <div class="modal-text" style="font-size:13px;line-height:1.8">${p.texto}</div>
      </div>
      <div class="tut-dots">${dots}</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="tut-atras" ${this._tutIdx === 0 ? "disabled" : ""}>&#8592; ATRÁS</button>
        ${esUltima
          ? this._tutMicro
            ? `<button class="btn-secondary" data-action="tut-cerrar">IR AL JUEGO</button>
               <button class="btn-primary" data-action="tut-probar">&#9654; PROBAR EN LA TERMINAL</button>`
            : `<button class="btn-primary" data-action="tut-cerrar">ENTENDIDO</button>`
          : `<button class="btn-primary" data-action="tut-siguiente">SIGUIENTE &#8594;</button>`}
      </div>`;
    this.setAcciones({
      "tut-atras": () => { this._tutIdx = Math.max(0, this._tutIdx - 1); this._renderTutorialSlide(); },
      "tut-siguiente": () => { this._tutIdx = Math.min(total - 1, this._tutIdx + 1); this._renderTutorialSlide(); },
      "tut-cerrar": () => {
        this.cerrarModal();
        if (this._tutOnCerrar) this._tutOnCerrar();
      },
      "tut-probar": () => {
        this.cerrarModal();
        this._onNuevoCaso(MICROCASO, { tutorial: true });
      },
    });
    this.abrirModal(html);
  }

  mostrarFinTutorial() {
    const html = `
      <div class="modal-title">&#127881; TUTORIAL COMPLETADO</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">
        Ya sabes lo esencial: leer evidencias, identificar indicadores y responder.
        El SOC tiene tu <b>primer incidente real</b> esperándote.
      </div>
      <div class="jimmy-habla">Buen trabajo, analista. La teoría ya la has vivido; ahora demuéstrala con tu primer caso. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-tutorial-fin">CERRAR</button>
        <button class="btn-primary" data-action="empezar-campana">&#9654; EMPEZAR CAMPAÑA</button>
      </div>`;
    this.setAcciones({
      "cerrar-tutorial-fin": () => this.cerrarModal(),
      "empezar-campana": () => {
        this.cerrarModal();
        const siguiente = CASOS.find((c) => !GAME.casosCompletados.includes(c.id)) || CASOS[0];
        this._onNuevoCaso(siguiente);
      },
    });
    this.abrirModal(html);
  }

  // ---------- Modo Becario ----------
  mostrarBecario(onCerrar = null) {
    this._becOnCerrar = onCerrar;
    const seccion = (lista, titulo) => lista.map((c, i) => {
      const hecha = GAME.becarioCompletadas.includes(c.id);
      return `
      <div class="bec-card ${hecha ? "bec-hecha" : ""}" style="${hecha ? "opacity:.75" : ""}">
        <div class="bec-num">${titulo} ${i + 1}/${lista.length}${hecha ? " · ✔ COMPLETADA" : ""}</div>
        <div class="bec-titulo">${c.titulo}</div>
        <div class="bec-meta">${c.severidad} ${c.modo === "rt" ? "· Red Team" : "· SOC"} · Sin penalizaciones · 0 XP</div>
        <div class="bec-brief">${c.briefing.slice(0, 160)}…</div>
      </div>`;
    }).join("");
    const html = `
      <div class="modal-title">&#127891; MODO BECARIO — APRENDE CON JIMMY</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">
        ¿Nunca has tocado un SOC ni un pentest? Perfecto: este modo es para ti.
        Prácticas guiadas de blue team y red team donde yo te llevo de la mano:
        en cada paso te digo <b>qué escribir</b> y, sobre todo, <b>por qué se hace</b>.
        Sin reloj, sin penalizaciones, sin XP.
      </div>
      <h3 style="color:#8fd39e;margin:10px 0 4px;font-size:13px">&#128737; PRÁCTICAS BLUE TEAM (SOC)</h3>
      <div class="bec-cards">${seccion(BECARIO_CASOS, "Práctica")}</div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn-primary" data-action="becario-empezar">&#9654; EMPEZAR PRÁCTICA 1</button>
      </div>
      <h3 style="color:#35e0ff;margin:14px 0 4px;font-size:13px">&#127919; PRÁCTICAS RED TEAM (pentest)</h3>
      <div class="bec-cards">${seccion(BECARIO_RT_CASOS, "Práctica")}</div>
      <div class="jimmy-habla">No se nace analista ni pentester: se aprende atacando (con permiso), paso a paso. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-becario">CERRAR</button>
        <button class="btn-primary" data-action="becario-rt-empezar">&#9654; EMPEZAR PENTEST GUIADO</button>
      </div>`;
    this.setAcciones({
      "cerrar-becario": () => {
        this.cerrarModal();
        if (this._becOnCerrar) this._becOnCerrar();
      },
      "becario-empezar": () => {
        this.cerrarModal();
        this._becLista = "blue";
        this._onNuevoCaso(BECARIO_CASOS[0], { becario: true });
      },
      "becario-rt-empezar": () => {
        this.cerrarModal();
        this._becLista = "rt";
        this._onNuevoCaso(BECARIO_RT_CASOS[0], { becario: true });
      },
    });
    this.abrirModal(html);
  }

  mostrarFinBecario() {
    const lista = this._becLista === "rt" ? BECARIO_RT_CASOS : BECARIO_CASOS;
    const hayMas = this._becIdx < lista.length - 1;
    const siguiente = hayMas ? lista[this._becIdx + 1] : null;
    const isRT = this._becLista === "rt";
    const titleCompletado = isRT ? "PENTEST GUIADO COMPLETADO" : "MODO BECARIO COMPLETADO";
    const titleSuperado = isRT ? "PENTEST GUIADO SUPERADO" : "PRÁCTICA " + (this._becIdx + 1) + " SUPERADA";
    const finalMsg = isRT
      ? "Has completado el pentest guiado. Ya conoces el ciclo ofensivo: contrato → recon → acceso → hallazgo → evidencia. Ahora toca demostrarlo con tu primer pentest real."
      : "Has completado las tres prácticas guiadas. Ya entiendes la mecánica del SOC: <b>investigar antes de actuar</b>, contener sin pánico y saber cuándo NO pagar. Ahora toca demostrarlo con tu primer incidente real.";
    const html = `
      <div class="modal-title">${isRT ? "&#127919;" : "&#127891;"} ${hayMas ? titleSuperado : titleCompletado}</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">
        ${hayMas
          ? `¡Bien hecho! Has completado la práctica ${this._becIdx + 1}. Prepara el siguiente reto: <b>${siguiente.titulo}</b>.`
          : finalMsg}
      </div>
      <div class="jimmy-habla">${hayMas ? "Un paso más y dominas el oficio. — Jimmy" : isRT ? "El mejor pentester es el que piensa como atacante y documenta como auditor. — Jimmy" : "El SOC confía en ti. Vamos a por tu primer caso de verdad. — Jimmy"}</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-becario-fin">CERRAR</button>
        ${hayMas
          ? `<button class="btn-primary" data-action="becario-siguiente">&#9654; SIGUIENTE PRÁCTICA</button>`
          : `<button class="btn-primary" data-action="empezar-campana-bec">&#9654; EMPEZAR ${isRT ? "CAMPAÑA RED TEAM" : "CAMPAÑA"}</button>`}
      </div>`;
    this.setAcciones({
      "cerrar-becario-fin": () => {
        this.cerrarModal();
        if (this._becOnCerrar) this._becOnCerrar();
      },
      "becario-siguiente": () => {
        this.cerrarModal();
        this._onNuevoCaso(siguiente, { becario: true });
      },
      "empezar-campana-bec": () => {
        this.cerrarModal();
        if (isRT) {
          const sig = siguienteCasoRT(GAME.rtCasosCompletados);
          if (sig) { this._onNuevoCaso(sig); return; }
          this.mostrarRedTeam();
        } else {
          const siguienteC = CASOS.find((c) => !GAME.casosCompletados.includes(c.id)) || CASOS[0];
          this._onNuevoCaso(siguienteC);
        }
      },
    });
    this.abrirModal(html);
    this.actualizarPerfil();
  }

  // ---------- HUD ----------
  actualizarPerfil() {
    const esRT = GAME.modo === "rt";
    const r = esRT ? estadoRangoRT() : estadoRango();
    const ranks = esRT ? RT_RANKS : RANKS;
    const xp = esRT ? GAME.rtXp : GAME.xp;
    $("perfil-nombre").textContent = GAME.nombre;
    $("perfil-rango").textContent = `${r.icono} ${r.nombre}`;
    const next = ranks[r.indice + 1];
    if (next) {
      const pct = Math.min(100, Math.round(((xp - r.xpRequerida) / (next.xpRequerida - r.xpRequerida)) * 100));
      $("xp-fill").style.width = pct + "%";
      $("xp-num").textContent = `${xp} / ${next.xpRequerida}`;
    } else {
      $("xp-fill").style.width = "100%";
      $("xp-num").textContent = `${xp} XP — MÁXIMO`;
    }
    $("puntos").textContent = GAME.puntos;
    $("casos-resueltos").textContent = esRT ? GAME.rtCasosResueltos : GAME.casosResueltos;
    const casosTotal = $("casos-total");
    if (casosTotal) casosTotal.textContent = esRT ? RT_CASOS.length : CASOS.length;
    this.actualizarContadorLogros();
  }

  actualizarContadorLogros() {
    const badge = $("badge-logros");
    if (!badge) return;
    const n = logrosDesbloqueados().length;
    badge.textContent = n;
    badge.classList.toggle("has", n > 0);
  }

  mostrarCaso(caso, hecho) {
    this._sla = caso.sla;
    const esRT = caso.modo === "rt";
    const sev = caso.severidad.toLowerCase();
    const sevClass = { critica: "sev-critica", alta: "sev-alta", media: "sev-media", baja: "sev-baja" }[sev] || "sev-media";
    const num = esRT ? numCasoRT(caso.id) : numCaso(caso.id);
    const total = esRT ? RT_CASOS.length : CASOS.length;
    let html = `
      <div class="caso-titulo">${esRT ? `&#127919; PENTEST #${String(num).padStart(2, "0")}` : `#${String(num).padStart(2, "0")}`} · ${caso.titulo}</div>
      <div class="caso-meta">Caso ${num}/${total} · Nivel ${caso.nivel} · XP ${caso.xp}</div>
      <span class="caso-sev ${sevClass}">${caso.severidad}</span>
      <div class="modal-section" style="margin-top:10px">
        <h3>${esRT ? "CHECKLIST DE OBJETIVOS" : "CHECKLIST DE RESPUESTA"}</h3>
        <ul style="font-size:12px;line-height:1.8;padding-left:18px;color:#8fd39e" id="checklist"></ul>
      </div>`;
    $("caso-info").innerHTML = html;
    this._renderChecklist(caso, hecho);
    this.actualizarReloj(0, caso.sla);
  }

  _renderChecklist(caso, hecho) {
    const ul = $("checklist");
    if (!ul) return;
    const items = [];
    const li = (txt, ok) => items.push(`<li style="color:${ok ? "#33ff66" : "#5f8a6a"}">${ok ? "✔" : "○"} ${txt}</li>`);
    const ETIQUETAS = { bloquear: "Bloquear", aislar: "Aislar", deshabilitar: "Deshabilitar", recon: "Reconocer", acceso: "Acceso", escalada: "Escalar privilegios", exfiltracion: "Exfiltrar" };
    for (const [tipo, lista] of Object.entries(caso.correctas || {})) {
      if (tipo === "escalar") { li("Escalar a CSIRT", hecho.has("escalar")); continue; }
      if (tipo === "cerrar") { li("Cerrar como falso positivo", hecho.has("cerrar")); continue; }
      if (!lista) continue;
      for (const target of lista) {
        const valor = target.slice(target.indexOf(":") + 1);
        const clave = tipo === "bloquear" || tipo === "aislar" || tipo === "deshabilitar" ? tipo + ":" + target : "objetivo:" + tipo + ":" + target;
        li(`${ETIQUETAS[tipo] || tipo} ${valor}`, hecho.has(clave));
      }
    }
    if (items.length === 0) items.push('<li style="color:#5f8a6a">Investiga y determina si es incidente.</li>');
    ul.innerHTML = items.join("");
  }

  actualizarReloj(reloj, sla) {
    const restante = Math.max(0, sla - reloj);
    const mm = String(Math.floor(restante / 60)).padStart(2, "0");
    const ss = String(restante % 60).padStart(2, "0");
    const el = $("sla-timer");
    el.textContent = `${mm}:${ss}`;
    el.classList.toggle("warn", restante < sla * 0.3 && restante > sla * 0.15);
    el.classList.toggle("crit", restante <= sla * 0.15);
    const pct = Math.min(100, (restante / sla) * 100);
    const fill = $("sla-fill");
    fill.style.width = pct + "%";
    fill.className = "sla-fill" + (restante <= sla * 0.15 ? " crit" : restante < sla * 0.3 ? " warn" : "");
    $("reloj").textContent = `${String(Math.floor(reloj / 3600)).padStart(2, "0")}:${String(Math.floor((reloj % 3600) / 60)).padStart(2, "0")}:${String(reloj % 60).padStart(2, "0")}`;
    this._renderModo();
  }

  feed(texto, tipo = "new-msg") {
    const wrap = $("feed");
    const item = document.createElement("div");
    item.className = "feed-item " + tipo;
    const t = new Date();
    const hora = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    item.innerHTML = `<span class="f-time">${hora}</span> ${texto}`;
    wrap.prepend(item);
    while (wrap.children.length > 40) wrap.lastChild.remove();
  }

  notificar(titulo, detalle, clase = "") {
    const wrap = $("notif-wrap");
    const n = document.createElement("div");
    n.className = "notif " + clase;
    n.innerHTML = `<div class="n-title">${titulo}</div><div>${detalle}</div>`;
    wrap.appendChild(n);
    setTimeout(() => n.remove(), 9000);
  }

  // ---------- Informe ----------
  abrirInforme(engine) {
    const caso = engine.caso;
    const esRT = caso.modo === "rt";
    const r = esRT ? estadoRangoRT() : estadoRango();
    const acciones = GAME.acciones.map((a) => `  - [${a.tiempo}s] ${a.t}: ${a.detalle}`).join("\n");
    const plantilla = esRT
      ? `INFORME DE PENTEST — ENGAGEMENT #RT-${String(numCasoRT(caso.id)).padStart(2, "0")}
============================================
Título: ${caso.titulo}
Pentester: ${esc(GAME.nombre)} (${r.nombre})
Fecha: ${new Date().toLocaleString("es-ES")}
Alcance: ${Object.keys(caso.red?.hosts || {}).join(", ") || "n/d"} | SLA: ${caso.sla}s

1. RESUMEN EJECUTIVO
   (Qué se ha probado, qué se ha encontrado y el riesgo para la organización)

2. HALLAZGOS
   - Vulnerabilidad:
   - Severidad:
   - Evidencia:

3. DATOS OBTENIDOS
   - Hosts y servicios comprometidos:
   - Credenciales y datos exfiltrados:

4. IMPACTO
   (Qué pasaría si un atacante real lo explotara)

5. RECOMENDACIONES
   (Priorizadas por riesgo)`
      : `INFORME DE INCIDENTE — CASO #${numCaso(caso.id)}
============================================
Título: ${caso.titulo}
Analista: ${esc(GAME.nombre)} (${r.nombre})
Fecha: ${new Date().toLocaleString("es-ES")}
Severidad: ${caso.severidad} | SLA: ${caso.sla}s

1. RESUMEN DEL INCIDENTE
   (Describe qué ha ocurrido, cómo lo has detectado y el impacto)

2. INDICADORES DE COMPROMISO (IOC)
   - Dominio:
   - IP:
   - Hash:
   - Otros:

3. ACCIONES DE RESPUESTA EJECUTADAS
${acciones}

4. ALCANCE
   (Hosts afectados, usuarios, datos implicados)

5. LECCIONES Y RECOMENDACIONES
   (Hardening, mejoras de detección, formación)`;

    const html = `
      <div class="modal-title">${esRT ? "&#127919; INFORME DE PENTEST" : "&#128221; INFORME DE INCIDENTE"}</div>
      <div class="modal-text" style="font-size:12px;color:#8fd39e;margin-bottom:10px">
        ${esRT
          ? "Documenta el engagement antes de entregarlo al CISO. Se evalúa la <b>cobertura de hallazgos</b>: hosts, vulnerabilidades y datos obtenidos."
          : "Documenta el caso antes de cerrarlo. Se evalúa la <b>cobertura de IOCs</b> y las acciones ejecutadas."
        }
        Escribe libremente, pero no olvides los indicadores clave.
      </div>
      <textarea id="informe-texto" spellcheck="false">${plantilla}</textarea>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cancelar-informe">Cancelar</button>
        <button class="btn-primary" data-action="enviar-informe">ENTREGAR INFORME</button>
      </div>`;
    this.setAcciones({
      "cancelar-informe": () => { this.cerrarModal(); engine._bloqueado = false; },
      "enviar-informe": () => {
        const texto = $("informe-texto")?.value || "";
        this.cerrarModal();
        engine.evaluarInforme(texto);
      },
    });
    this.abrirModal(html);
  }

  // ---------- Resultado ----------
  mostrarResultado(r, onSiguiente) {
    const caso = r.caso;
    const esReto = !!r.reto;
    const esExamen = !!r.examen;
    const aprobado = esExamen && apruebaExamen(r.rating);
    const icono = { "S+": "🏆", S: "⭐", A: "💪", B: "👍", C: "📖" }[r.rating] || "📖";
    const lista = r.menciones.map((m) => `<li style="color:${m.ok ? "#33ff66" : "#ffb000"}">${m.ok ? "✔" : "✘"} ${m.texto}</li>`).join("");
    const jimmy = alea(JIMMY_RESULTADO[r.rating] || JIMMY_RESULTADO.C);
    const titulo = esReto ? "🔥 RETO DIARIO COMPLETADO" : esExamen ? "🎓 EXAMEN — CALIFICACIÓN " + r.rating : `${icono} CASO RESUELTO — CALIFICACIÓN ${r.rating}`;
    const recompensa = esReto || esExamen
      ? `<div style="font-size:15px;color:#35e0ff">${esReto ? "🔥 Reto diario" : "🎓 Examen"}: no suma XP a tu carrera (certificación independiente)</div>`
      : this._modoLab
        ? `+${r.xp} XP de práctica (no suma a tu carrera en laboratorio)`
        : `+${r.xp} XP (base ${caso.xp} × ${r.mult.toFixed(2)})`;
    const veredicto = esExamen
      ? `<div class="modal-section"><h3>VEREDICTO</h3><div style="font-size:13.5px;color:${aprobado ? "#33ff66" : "#ffb000"}">${textoVeredicto(r.rating)}</div></div>`
      : "";
    const botonCert = esExamen && aprobado
      ? `<button class="btn-secondary" data-action="descargar-certificado">📜 PNG</button>
         <button class="btn-secondary" data-action="imprimir-certificado">🖨️ PDF (imprimir)</button>`
      : "";
    // Si el atacante pivotó (no contuviste a tiempo), el informe lo señala
    const avisoPivote = caso.pivoteado
      ? `<div class="modal-text" style="font-size:12px;color:#ffb000;margin-top:4px">🔄 <b>Ataque adaptativo</b>: no contuviste a tiempo y el atacante pivotó a otro host/cuenta — el caso exigió más objetivos.</div>`
      : "";

    const html = `
      <div class="modal-title">${titulo}</div>
      <div class="modal-text" style="margin-bottom:6px">
        Has completado <b>${caso.titulo}</b> en ${Math.floor(r.tUsado * caso.sla / 60)} min
        (${Math.round(r.tUsado * 100)}% del SLA) con ${r.errores} error(es) y ${r.pistas} pista(s).
      </div>
      ${avisoPivote}
      <div class="modal-section">
        <h3>RECOMPENSA</h3>
        ${recompensa}
      </div>
      ${veredicto}
      <div class="modal-section">
        <h3>COBERTURA DEL INFORME</h3>
        <ul style="font-size:12.5px;line-height:1.8;padding-left:18px">${lista}</ul>
      </div>
      <div class="jimmy-habla">${jimmy}</div>
      <div class="btn-row">
        ${botonCert}
        <button class="btn-primary" data-action="siguiente">SIGUIENTE →</button>
      </div>`;
    this.setAcciones({
      "descargar-certificado": () => {
        descargarCertificado({
          nombre: GAME.nombre,
          rating: r.rating,
          caso: caso.titulo,
          fecha: new Date().toISOString().slice(0, 10),
          modo: caso.modo === "rt" ? "rt" : "soc",
        });
      },
      "imprimir-certificado": () => {
        imprimirCertificado({
          nombre: GAME.nombre,
          rating: r.rating,
          caso: caso.titulo,
          fecha: new Date().toISOString().slice(0, 10),
          modo: caso.modo === "rt" ? "rt" : "soc",
        });
      },
      "siguiente": () => { this.cerrarModal(); onSiguiente(); },
    });
    this.abrirModal(html);
    this.actualizarPerfil();
  }

  siguienteCasoDisponible(completados, saltado = false) {
    const siguiente = siguienteCaso(completados);
    if (!siguiente) {
      this.mostrarFinJuego();
      return;
    }
    const html = `
      <div class="modal-title">${saltado ? "⏭ CASO SALTADO" : "📋 SIGUIENTE CASO"}</div>
      <div class="modal-text">
        ${saltado
          ? "Has dejado el incidente sin resolver. El SOC lo asumió con pérdidas, pero la campaña continúa."
          : "Buen trabajo. El SOC sigue activo: ha llegado un nuevo incidente."}
        <br/><br/>
        <b>${siguiente.titulo}</b><br/>
        <span style="color:#8fd39e">Nivel ${siguiente.nivel} · Severidad ${siguiente.severidad} · SLA ${Math.floor(siguiente.sla / 60)} min · +${siguiente.xp} XP</span>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="aceptar-caso">ACEPTAR CASO</button>
      </div>`;
    this.setAcciones({
      "aceptar-caso": () => {
        this.cerrarModal();
        this._onNuevoCaso(siguiente);
      },
    });
    this.abrirModal(html);
  }

  setNuevoCasoHandler(fn) {
    this._onNuevoCaso = (caso, opciones) => {
      if (opciones?.becario) {
        let idx = BECARIO_CASOS.findIndex((c) => c.id === caso.id);
        if (idx >= 0) { this._becIdx = idx; this._becLista = "blue"; }
        else {
          idx = BECARIO_RT_CASOS.findIndex((c) => c.id === caso.id);
          if (idx >= 0) { this._becIdx = idx; this._becLista = "rt"; }
          else this._becIdx = 0;
        }
      }
      fn(caso, opciones);
    };
  }

  fracasarCaso(motivo, onReintentar, onSaltar) {
    const html = `
      <div class="modal-title">&#10060; CASO PERDIDO</div>
      <div class="modal-text">${motivo}</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="saltar">Saltar caso (sin XP)</button>
        <button class="btn-primary" data-action="reintentar">Reintentar</button>
      </div>`;
    this.setAcciones({
      "reintentar": () => { this.cerrarModal(); onReintentar(); },
      "saltar": () => { this.cerrarModal(); onSaltar(); },
    });
    this.abrirModal(html);
  }

  mostrarFinJuego() {
    const r = estadoRango();
    const jimmy = JIMMY_FINAL.join("<br/><br/>");
    const html = `
      <div class="modal-title">🎓 CAMPAÑA COMPLETADA</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">
        Has resuelto los <b>${CASOS.length} casos</b> de la campaña y has llegado a
        <b>${r.icono} ${r.nombre}</b> con ${GAME.xp} XP y ${GAME.puntos} puntos.
        <br/><br/>
        <b>${esc(GAME.nombre)}</b>, esto es solo el principio. En el mundo real, los incidentes no
        tienen pistas ni calificaciones: tienen víctimas reales. Cada lección de estos casos
        es una habilidad que te llevas al trabajo.
      </div>
      <div class="jimmy-habla">${jimmy}</div>
      <div class="btn-row">
        <button class="btn-primary" data-action="ver-lecciones">REPASAR LECCIONES</button>
      </div>`;
    this.setAcciones({
      "ver-lecciones": () => { this.cerrarModal(); this.mostrarGlosario(); },
    });
    this.abrirModal(html);
    this.actualizarPerfil();
  }

  // ---------- Repaso MITRE (quiz post-caso) ----------
  // 3 preguntas por caso entre el resultado y la lección. `onDone` recibe
  // (aciertos, total) para que el motor acumule las estadísticas.
  mostrarQuiz(caso, onDone) {
    const quiz = generarQuiz(caso);
    if (!quiz.length) {
      onDone(0, 0);
      return;
    }
    const esRT = caso.modo === "rt";
    const mitreTags = (caso.leccion?.mitre || []).map((m) => `<span class="mitre-tag">${m}</span>`).join("");
    let idx = 0;
    let aciertos = 0;

    const renderPregunta = () => {
      const q = quiz[idx];
      const esUltima = idx === quiz.length - 1;
      const html = `
        <div class="modal-title">🧠 REPASO MITRE — PREGUNTA ${idx + 1}/${quiz.length}${esRT ? " · RED TEAM" : " · SOC"}</div>
        <div style="margin-bottom:8px">${mitreTags}</div>
        <div class="quiz-question">${q.p}</div>
        <div class="quiz-opciones">
          ${q.o.map((op, i) => `<button class="quiz-op" data-i="${i}"><span class="quiz-letra">${String.fromCharCode(65 + i)}</span> ${op}</button>`).join("")}
        </div>
        <div class="quiz-explicacion hidden" id="quiz-explicacion"></div>
        <div class="btn-row">
          <button class="btn-primary hidden" data-action="quiz-siguiente">${esUltima ? "VER RESULTADO →" : "SIGUIENTE →"}</button>
        </div>`;
      this.setAcciones({
        "quiz-siguiente": () => {
          if (idx < quiz.length - 1) {
            idx++;
            renderPregunta();
          } else {
            renderResultado();
          }
        },
      });
      this.abrirModal(html);
      document.querySelectorAll(".quiz-op").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = parseInt(btn.dataset.i, 10);
          const ok = i === q.c;
          if (ok) aciertos++;
          document.querySelectorAll(".quiz-op").forEach((b) => {
            b.disabled = true;
            const bi = parseInt(b.dataset.i, 10);
            b.classList.toggle("quiz-ok", bi === q.c);
            b.classList.toggle("quiz-ko", bi === i && !ok);
          });
          const expl = $("quiz-explicacion");
          if (expl) {
            expl.classList.remove("hidden");
            expl.innerHTML = (ok ? "✅ ¡Correcto! " : "❌ No exactamente. ") + q.x;
          }
          const sig = document.querySelector('[data-action="quiz-siguiente"]');
          if (sig) sig.classList.remove("hidden");
          if (ok) sonido.ok(); else sonido.err();
        });
      });
    };

    const renderResultado = () => {
      const total = quiz.length;
      const pct = Math.round((aciertos / total) * 100);
      const msg = pct === 100
        ? "Dominas la lección: el MITRE ya es parte de tu vocabulario."
        : pct >= 67
          ? "Buen repaso. Lo que has fallado lo asientas ahora en la lección."
          : "La lección te espera: repasa los conceptos antes de seguir.";
      const html = `
        <div class="modal-title">${pct === 100 ? "🏅" : pct >= 67 ? "💪" : "📖"} REPASO: ${aciertos}/${total} ACIERTOS</div>
        <div class="quiz-score-bar"><div class="quiz-score-fill" style="width:${pct}%"></div></div>
        <div class="modal-text" style="font-size:13px">${msg}</div>
        <div class="jimmy-habla">El MITRE no es memorizar códigos: es saber en qué punto de la cadena del ataque estás. — Jimmy</div>
        <div class="btn-row">
          <button class="btn-primary" data-action="quiz-fin">CONTINUAR A LA LECCIÓN →</button>
        </div>`;
      this.setAcciones({
        "quiz-fin": () => {
          this.cerrarModal();
          onDone(aciertos, total);
        },
      });
      this.abrirModal(html);
      this.actualizarPerfil();
    };

    renderPregunta();
  }

  // ---------- Lección post-caso ----------
  mostrarLeccion(caso, onDone) {
    const le = caso.leccion;
    const mitre = (le.mitre || []).map((m) => `<span class="mitre-tag">${m}</span>`).join("");
    const aprende = (le.aprendizaje || []).map((a) => `<li>${a}</li>`).join("");
    const glos = (le.glosario || []).map((g) => {
      const def = GLOSARIO[g] || { def: "Término técnico." };
      return `<div class="gloss-term"><span class="gt">${g}</span> — <span class="gd">${def.def}</span></div>`;
    }).join("");
    const jimmy = alea(JIMMY_LECCION);
    const html = `
      <div class="modal-title">📚 LECCIÓN: ${le.titulo}</div>
      <div style="margin-bottom:8px">${mitre}</div>
      <div class="lesson-block">
        <h4>¿QUÉ HA PASADO?</h4>
        <p>${le.resumen}</p>
      </div>
      <div class="lesson-block">
        <h4>¿CÓMO DETECTARLO?</h4>
        <p style="white-space:pre-wrap">${le.deteccion}</p>
      </div>
      <div class="lesson-block">
        <h4>¿CÓMO RESPONDER?</h4>
        <p style="white-space:pre-wrap">${le.respuesta}</p>
      </div>
      <div class="lesson-block">
        <h4>APRENDIZAJE CLAVE</h4>
        <ul>${aprende}</ul>
      </div>
      <div class="modal-section">
        <h3>GLOSARIO DEL CASO</h3>
        ${glos}
      </div>
      <div class="jimmy-habla">${jimmy}</div>
      <div class="btn-row">
        <button class="btn-primary" data-action="cerrar-leccion">ENTENDIDO, ANALISTA</button>
      </div>`;
    this.setAcciones({
      "cerrar-leccion": () => {
        this.cerrarModal();
        if (onDone) onDone();
      },
    });
    this.abrirModal(html);
    this.actualizarPerfil();
    // Jimmy lee el título y el resumen de la lección con su voz local.
    if (le) hablar(`${le.titulo}. ${le.resumen} ${jimmy}`).catch(() => {});
  }

  // ---------- Campaña red team ----------
  mostrarRedTeam() {
    const r = estadoRangoRT();
    const next = RT_RANKS[r.indice + 1];
    const xpLine = next ? `${GAME.rtXp} / ${next.xpRequerida} XP` : `${GAME.rtXp} XP — MÁXIMO`;
    const tarjetas = RT_CASOS.map((c) => {
      const idx = RT_CASOS.indexOf(c);
      const completado = GAME.rtCasosCompletados.includes(c.id);
      const desbloqueado = idx === 0 || GAME.rtCasosCompletados.includes(RT_CASOS[idx - 1].id);
      const estado = completado ? "✔ Completado" : desbloqueado ? "▶ Empezar" : "🔒 Completa el caso anterior";
      return `
      <div class="lab-card ${desbloqueado && !completado ? "" : "locked"}" data-rt="${c.id}" ${desbloqueado && !completado ? "" : "style='opacity:.55'"}>
        <div class="lc-titulo">${completado ? "✔ " : desbloqueado ? "▶ " : "🔒 "}${c.titulo}</div>
        <div class="lc-meta">Nivel ${c.nivel} · Severidad ${c.severidad} · XP ${c.xp} · ${estado}</div>
      </div>`;
    }).join("");
    const html = `
      <div class="modal-title">&#127919; CAMPAÑA RED TEAM — PENTEST DE CiberCorp</div>
      ${this.holoHTML("holo-sm")}
      <div class="jimmy-habla">El SOC te contrata para atacar tu propia empresa antes que los atacantes reales. Contrato firmado: 6 objetivos autorizados, del reconocimiento al informe final.</div>
      <div class="modal-text" style="font-size:12.5px;margin-bottom:6px">
        Rango actual: <b>${r.icono} ${r.nombre}</b> · <b>${xpLine}</b> · ${GAME.rtCasosResueltos}/${RT_CASOS.length} completados
      </div>
      <div id="lab-lista">${tarjetas}</div>
      <div class="modal-text" style="font-size:11.5px;color:#5f8a6a">Los casos se desbloquean en orden. Cada uno se evalúa por cobertura de hallazgos en el informe.</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-rt">Volver</button>
      </div>`;
    this.setAcciones({ "cerrar-rt": () => this.cerrarModal() });
    this.abrirModal(html);
    document.querySelectorAll("#lab-lista .lab-card[data-rt]").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-rt");
        const idx = RT_CASOS.findIndex((c) => c.id === id);
        const desbloqueado = idx === 0 || GAME.rtCasosCompletados.includes(RT_CASOS[idx - 1].id);
        if (!desbloqueado || GAME.rtCasosCompletados.includes(id)) return;
        const caso = RT_CASOS[idx];
        this.cerrarModal();
        this._onNuevoCaso(caso);
      });
    });
  }

  siguienteCasoRTDisponible(siguiente, completados, saltado = false) {
    const html = `
      <div class="modal-title">${saltado ? "⏭ CASO SALTADO" : "🎯 SIGUIENTE PENTEST"}</div>
      <div class="modal-text">
        ${saltado
          ? "Has dejado el objetivo sin completar. El informe se entrega con huecos y el cliente lo nota."
          : "El engagement continúa: nuevo objetivo autorizado por contrato."}
        <br/><br/>
        <b>${siguiente.titulo}</b><br/>
        <span style="color:#8fd39e">Nivel ${siguiente.nivel} · Severidad ${siguiente.severidad} · SLA ${Math.floor(siguiente.sla / 60)} min · +${siguiente.xp} XP</span>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="aceptar-caso">ACEPTAR CASO</button>
      </div>`;
    this.setAcciones({
      "aceptar-caso": () => {
        this.cerrarModal();
        this._onNuevoCaso(siguiente);
      },
    });
    this.abrirModal(html);
  }

  mostrarFinRT() {
    const r = estadoRangoRT();
    const html = `
      <div class="modal-title">&#127942; CAMPAÑA RED TEAM COMPLETADA</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">
        Has completado los <b>6 pentests</b> autorizados y has llegado a
        <b>${r.icono} ${r.nombre}</b> con ${GAME.rtXp} XP y ${GAME.puntos} puntos.
        <br/><br/>
        <b>${esc(GAME.nombre)}</b>, el informe que has aprendido a entregar es la diferencia
        entre una empresa que descubre sus fallos por ti o por un atacante real.
      </div>
      <div class="jimmy-habla">El atacante real no pide permiso ni avisa. Lo que has entrenado aquí es lo que separa una brecha de un susto. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-primary" data-action="cerrar-fin-rt">VOLVER AL SOC</button>
      </div>`;
    this.setAcciones({
      "cerrar-fin-rt": () => {
        this.cerrarModal();
        GAME.modo = "soc";
        this.actualizarPerfil();
      },
    });
    this.abrirModal(html);
    this.actualizarPerfil();
  }

  // ---------- Laboratorio ----------
  mostrarLaboratorio() {
    const tarjetas = CASOS.map((c) => `
      <div class="lab-card" data-lab="${c.id}">
        <div class="lc-titulo">${c.titulo}</div>
        <div class="lc-meta">Nivel ${c.nivel} · Severidad ${c.severidad} · XP ${c.xp} (práctica)</div>
      </div>`).join("");
    const html = `
      <div class="modal-title">&#128300; LABORATORIO PERSONAL</div>
      ${this.holoHTML("holo-sm")}
      <div class="jimmy-habla">${alea(JIMMY_LAB)}</div>
      <div class="modal-text" style="font-size:12.5px;margin-bottom:6px">
        Práctica libre: <b>sin SLA, sin penalizaciones, pistas gratis</b>.
        Elige un caso y repítelo tantas veces como quieras. El laboratorio no avanza la campaña.
      </div>
      <div id="lab-lista">${tarjetas}</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-lab">Volver</button>
      </div>`;
    this.setAcciones({
      "cerrar-lab": () => this.cerrarModal(),
    });
    this.abrirModal(html);
    $("lab-lista").querySelectorAll(".lab-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-lab");
        const caso = CASOS.find((c) => c.id === id);
        if (!caso) return;
        this.cerrarModal();
        this._modoLab = true;
        $("btn-lab").classList.add("on");
        this._onNuevoCaso(caso, { lab: true });
      });
    });
  }

  // ---------- Logros ----------
  mostrarLogros() {
    const hechos = logrosDesbloqueados();
    const pendientes = logrosPendientes();
    const card = (l, hecho) => `
      <div class="logro-card ${hecho ? "desbloqueado" : "locked"} ${l.oculto && hecho ? "secreto" : ""}">
        <span class="l-icon">${hecho ? l.icono : "&#128274;"}</span>
        <div style="flex:1">
          <div class="l-name">${l.nombre}</div>
          <div class="l-desc">${l.desc}</div>
        </div>
        ${hecho ? `<span class="l-ok">✔</span>` : ""}
      </div>`;
    const html = `
      <div class="modal-title">&#127941; LOGROS E INSIGNIAS</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px;margin-bottom:6px">
        <b>${hechos.length}/${totalLogros()}</b> desbloqueados. Se ganan por rango y por hitos:
        primer caso, primer pentest, S+, sin pistas, campañas completadas…
      </div>
      <div class="modal-section">
        <h3>DESBLOQUEADOS (${hechos.length})</h3>
        ${hechos.map((l) => card(l, true)).join("") || "<div class='modal-text' style='font-size:12px;color:#5f8a6a'>Todavía ninguno. ¡Resuelve tu primer caso!</div>"}
      </div>
      <div class="modal-section">
        <h3>PENDIENTES (${pendientes.length})</h3>
        ${pendientes.map((l) => card(l, false)).join("")}
      </div>
      <div class="jimmy-habla">Las insignias no se regalan: se ganan resolviendo incidentes de verdad. — Jimmy</div>
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-logros">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-logros": () => this.cerrarModal() });
    this.abrirModal(html);
  }

  // ---------- Exportar resumen (Markdown / JSON / portapapeles) ----------
  // Datos estructurados compartidos por el Markdown y el JSON
  _datosResumen() {
    const rSOC = estadoRango();
    const rRT = estadoRangoRT();
    const socDet = GAME.casosCompletados.map((id) => ({ id, titulo: CASOS.find((c) => c.id === id)?.titulo || id }));
    const rtDet = GAME.rtCasosCompletados.map((id) => ({ id, titulo: RT_CASOS.find((c) => c.id === id)?.titulo || id }));
    const becDet = GAME.becarioCompletadas.map((id) => ({ id, titulo: [...BECARIO_CASOS, ...BECARIO_RT_CASOS].find((c) => c.id === id)?.titulo || id }));
    const logs = logrosDesbloqueados();
    return {
      rSOC, rRT, socDet, rtDet, becDet, logs,
      socC: socDet.map((c) => c.titulo),
      rtC: rtDet.map((c) => c.titulo),
      becs: becDet.map((c) => c.titulo),
    };
  }

  _resumenMarkdown() {
    const { rSOC, rRT, socC, rtC, becs, logs } = this._datosResumen();
    return `# 🛡️ CYBERGRAD — Informe de Carrera

**Jugador:** ${GAME.nombre}  
**Generado:** ${new Date().toLocaleString("es-ES")}

## 📊 Resumen

| Métrica | Valor |
|---------|-------|
| XP SOC | ${GAME.xp} / 2.400 |
| XP Red Team | ${GAME.rtXp} / 2.600 |
| Puntos | ${GAME.puntos} |
| Rango SOC | ${rSOC.icono} ${rSOC.nombre} |
| Rango Red Team | ${rRT.icono} ${rRT.nombre} |
| Casos SOC | ${GAME.casosResueltos} / ${CASOS.length} |
| Pentests | ${GAME.rtCasosResueltos} / ${RT_CASOS.length} |
| Logros | ${logs.length} / ${totalLogros()} |

## ✅ Casos completados (SOC)

${socC.length ? socC.map((t, i) => `- #${String(i + 1).padStart(2, "0")} — ${t} (✔)`).join("\n") : "— (*ninguno todavía*)"}

## ✅ Pentests completados (Red Team)

${rtC.length ? rtC.map((t, i) => `- #RT-${String(i + 1).padStart(2, "0")} — ${t} (✔)`).join("\n") : "— (*ninguno todavía*)"}

## 🎓 Prácticas de becario

${becs.length ? becs.map((t) => `- ${t} (✔)`).join("\n") : "— (*ninguna todavía*)"}

## 🏅 Logros desbloqueados

${logs.length ? logs.map((l) => `- ${l.icono} **${l.nombre}**: ${l.desc}`).join("\n") : "— (*ninguno todavía*)"}

---
*Generado por CYBERGRAD — https://knklinux.github.io/cybergrad/*`;
  }

  _descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _nombreBase() {
    // Solo [a-z0-9-] en el nombre de archivo: un nombre con /, : o \\ daría
    // un download raro o ambiguo (el navegador lo sanea, pero por higiene).
    const limpio = GAME.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `cybergrad-carrera-${limpio || "analista"}`;
  }

  exportarResumen() {
    this._descargar(`${this._nombreBase()}.md`, this._resumenMarkdown(), "text/markdown;charset=utf-8");
    this.notificar("📥 INFORME EXPORTADO", "Resumen de carrera descargado como Markdown (.md)", "logro");
  }

  exportarJSON() {
    const { socDet, rtDet, becDet, logs, rSOC, rRT } = this._datosResumen();
    const datos = {
      juego: "CYBERGRAD",
      version: 1,
      jugador: GAME.nombre,
      generado: new Date().toISOString(),
      resumen: {
        xpSOC: GAME.xp,
        xpRedTeam: GAME.rtXp,
        puntos: GAME.puntos,
        rangoSOC: rSOC.nombre,
        rangoRedTeam: rRT.nombre,
        casosSOCResueltos: GAME.casosResueltos,
        pentestsResueltos: GAME.rtCasosResueltos,
        logrosDesbloqueados: logs.length,
        logrosTotales: totalLogros(),
      },
      campanaSOC: {
        xp: GAME.xp,
        casosCompletados: socDet,
      },
      redTeam: {
        xp: GAME.rtXp,
        pentestsCompletados: rtDet,
      },
      becario: becDet,
      logros: logs.map((l) => ({ icono: l.icono, nombre: l.nombre, desc: l.desc, oculto: !!l.oculto })),
      secretosEncontrados: GAME.secretos || [],
      estadisticas: {
        tiempoJugadoSegundos: GAME.estadisticas?.tiempoJugado || 0,
        tiempoJugado: this._formatearTiempo(GAME.estadisticas?.tiempoJugado || 0),
        accionesCorrectas: GAME.estadisticas?.accionesOk || 0,
        errores: GAME.estadisticas?.accionesErr || 0,
        pistasUsadas: GAME.estadisticas?.pistasUsadas || 0,
        quizAciertos: GAME.estadisticas?.quiz?.aciertos || 0,
        quizTotal: GAME.estadisticas?.quiz?.total || 0,
        ratings: GAME.estadisticas?.ratings || [],
      },
      url: "https://knklinux.github.io/cybergrad/",
    };
    this._descargar(`${this._nombreBase()}.json`, JSON.stringify(datos, null, 2), "application/json;charset=utf-8");
    this.notificar("🧾 JSON EXPORTADO", "Datos de carrera descargados como JSON (.json)", "logro");
  }

  async copiarResumen(btn) {
    await this._copiarAlPortapapeles(this._resumenMarkdown(), btn);
  }

  // Compartir en LinkedIn: abre el diálogo oficial (muestra la tarjeta del juego
  // vía Open Graph) y copia un mensaje del resumen al portapapeles. LinkedIn no
  // permite precargar texto por URL, así que el mensaje se pega con Ctrl+V.
  compartirLinkedin(btn) {
    const urlJuego = "https://knklinux.github.io/cybergrad/";
    const nLogros = GAME.logros?.length || 0;
    const mejor = GAME.mejorRating; // null → "S+", persistido con el guardado
    let mensaje;
    if (GAME.casosResueltos === 0 && GAME.rtCasosResueltos === 0) {
      // Aún no hay casos completados: resumen corto de presentación
      mensaje = `Acabo de crear CYBERGRAD: un simulador gratuito para aprender ciberseguridad jugando desde el navegador, con terminal funcional, ${CASOS.length + RT_CASOS.length} casos (SOC + red team), modo becario guiado y lecciones MITRE ATT&CK. ${urlJuego}`;
    } else {
      const rSOC = estadoRango();
      const rRT = estadoRangoRT();
      let progreso = `Acabo de completar ${GAME.casosResueltos}/${CASOS.length} casos SOC (${rSOC.nombre}) y ${GAME.rtCasosResueltos}/${RT_CASOS.length} pentests red team (${rRT.nombre}) en CYBERGRAD: ${GAME.xp} XP SOC · ${GAME.rtXp} XP RT`;
      if (mejor === "S+" || mejor === "S") progreso += ` · mejor calificación ${mejor}`;
      if (nLogros > 0) progreso += ` · ${nLogros} logros desbloqueados`;
      mensaje = `${progreso}. Un simulador gratuito para aprender ciberseguridad jugando desde el navegador. ${urlJuego}`;
    }
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlJuego)}`, "_blank", "noopener,width=650,height=700");
    this._copiarAlPortapapeles(mensaje, btn);
    this.notificar("💼 LINKEDIN", "Diálogo abierto y mensaje copiado: pulsa Ctrl+V en el cuadro de LinkedIn para publicar.", "logro");
  }

  // ---------- Estadísticas ----------
  _formatearTiempo(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return h > 0 ? `${h}h ${m}m ${seg}s` : m > 0 ? `${m}m ${seg}s` : `${seg}s`;
  }

  _renderRatingTable() {
    const r = GAME.estadisticas?.ratings || [];
    if (!r.length) return '<div class="modal-text" style="font-size:11.5px;color:#5f8a6a;margin-top:6px">Sin casos completados todavía.</div>';
    const filas = r.map((e) => {
      const num = e.modo === "rt"
        ? `RT-${String(numCasoRT(e.casoId) || "?").padStart(2, "0")}`
        : `#${String(numCaso(e.casoId) || "?").padStart(2, "0")}`;
      const color = e.rating === "S+" ? "var(--green)" : e.rating === "S" ? "var(--cyan)" : e.rating === "A" ? "var(--amber)" : e.rating === "B" ? "#9fd8ab" : "var(--red-dim)";
      return `<div class="rating-row">
        <span class="rating-caso">${num}</span>
        <span class="rating-mod">${e.modo === "rt" ? "🎯" : "🛡️"}</span>
        <span class="rating-val" style="color:${color}">${e.rating}</span>
      </div>`;
    }).join("");
    return `
      <h3 style="margin-top:10px">⭐ CALIFICACIONES</h3>
      <div class="rating-grid">${filas}</div>
      <div class="modal-text" style="font-size:11px;color:#5f8a6a;margin-top:4px">Último: ${r[r.length - 1]?.rating} en ${r[r.length - 1]?.casoId}</div>`;
  }

  // ---------- Carrera ----------
  // ---------- Duelo SOC vs Red Team ----------
  mostrarSelectorDuelo(onElegir) {
    const tarjetas = DUELO_ESCENARIOS.map((e, i) => `
      <div class="modal-section">
        <h3>⚔ ESCENARIO ${i + 1} — ${e.titulo}</h3>
        <div class="modal-text" style="font-size:12.5px">${e.descripcion}</div>
        <div class="duelo-kits-mini">
          <span class="duelo-kit rojo">🔴 ROJO: ${e.rojo.objetivos.length} objetivos ofensivos</span>
          <span class="duelo-kit azul">🔵 AZUL: ${e.azul.objetivos.length} objetivos defensivos</span>
          <span class="duelo-kit neutro">⏱ ${e.turnosMax} turnos máx.</span>
        </div>
        <div class="btn-row" style="justify-content:flex-start">
          <button class="btn-primary" data-action="duelo-${i}">⚔ JUGAR</button>
        </div>
      </div>`).join("");
    const acciones = {
      "cerrar-selector-duelo": () => this.cerrarModal(),
    };
    DUELO_ESCENARIOS.forEach((e, i) => {
      acciones[`duelo-${i}`] = () => { this.cerrarModal(); onElegir(e); };
    });
    this.setAcciones(acciones);
    this.abrirModal(`
      <div class="modal-title">⚔ DUELO SOC vs RED TEAM</div>
      <div class="modal-text">
        Dos jugadores, un mismo escenario y turnos alternos. El <b>ROJO</b> ataca con su kit ofensivo
        (nmap, hydra, sqlmap, mimikatz...) y el <b>AZUL</b> defiende (bloquear, aislar, deshabilitar, escalar...).
        Cada jugada consume el turno: acierta o falla, el turno pasa. Gana quien complete todos sus objetivos
        primero; si se agotan los turnos, decide quién tiene más.
      </div>
      ${tarjetas}
      <div class="btn-row"><button class="btn-secondary" data-action="cerrar-selector-duelo">CERRAR</button></div>`);
  }

  _ultimaJugadaDuelo(d) {
    const h = d.historial[d.historial.length - 1];
    if (!h) return "Sin jugadas todavía. Empieza el ROJO.";
    const bando = h.bando === "rojo" ? "🔴 ROJO" : "🔵 AZUL";
    if (!h.ok) return `${bando} intentó algo que no resultó (se perdió el turno).`;
    return `${bando} completó: ${h.canon.replace(/^[a-z_]+:/, "")} (+${h.puntos} pts).`;
  }

  mostrarDuelo(engine) {
    const d = engine.duelo;
    if (!d) return;
    const e = d.escenario;
    const columna = (lado) => {
      const esRojo = lado === "rojo";
      const ladoEsc = e[lado];
      const items = ladoEsc.objetivos.map((o) => {
        const ok = d.hecho[lado].has(`${o.tipo}|${o.canon}`);
        return `<li class="duelo-obj ${ok ? "ok" : ""}">${ok ? "✔" : "○"} ${o.etiqueta}</li>`;
      }).join("");
      return `
        <div class="duelo-lado ${esRojo ? "rojo" : "azul"}">
          <div class="duelo-nombre">${esRojo ? "🔴" : "🔵"} ${ladoEsc.nombre}</div>
          <div class="duelo-puntos">${d.puntos[lado]} pts</div>
          <ul class="duelo-objetivos">${items}</ul>
        </div>`;
    };
    const html = `
      <div class="duelo-hud">
        <div class="duelo-titulo">⚔ DUELO · ${e.titulo}</div>
        <div class="duelo-turno ${d.turno === "rojo" ? "rojo" : "azul"}">▶ TURNO DE ${d.turno === "rojo" ? "🔴 RED TEAM" : "🔵 SOC"} · ${d.turnos}/${e.turnosMax} turnos</div>
        <div class="duelo-columnas">
          ${columna("rojo")}
          <div class="duelo-vs">VS</div>
          ${columna("azul")}
        </div>
        <div class="duelo-ultima">${this._ultimaJugadaDuelo(d)}</div>
        <div class="btn-row">
          <button class="btn-danger" data-action="salir-duelo-hud">🚪 ABANDONAR DUELO</button>
        </div>
      </div>`;
    $("caso-info").innerHTML = html;
    this.setAcciones({ "salir-duelo-hud": () => engine.salirDuelo() });
    $("caso-info").querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fn = this._acciones[btn.getAttribute("data-action")];
        if (fn) fn();
      });
    });
  }

  mostrarFinDuelo(engine) {
    const d = engine.duelo;
    if (!d || !d.fin) return;
    const fin = d.fin;
    const titulo = fin.ganador === "empate" ? "🤝 ¡EMPATE!" : fin.ganador === "rojo" ? "🔴 GANA RED TEAM" : "🔵 GANA EL SOC";
    this.setAcciones({
      "revancha-duelo": () => { this.cerrarModal(); engine.iniciarDuelo(d.escenario); },
      "salir-duelo-fin": () => { this.cerrarModal(); engine.salirDuelo(); },
    });
    this.abrirModal(`
      <div class="modal-title">🏁 ${titulo}</div>
      <div class="modal-text">${fin.motivo}</div>
      <div class="duelo-marcador">
        <span class="duelo-marcador-lado rojo">🔴 RED TEAM — ${d.puntos.rojo} pts</span>
        <span class="duelo-marcador-lado azul">🔵 SOC — ${d.puntos.azul} pts</span>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="revancha-duelo">⚔ REVANCHA</button>
        <button class="btn-secondary" data-action="salir-duelo-fin">SALIR DEL DUELO</button>
      </div>`);
  }

  mostrarCarrera() {
    const esRT = GAME.modo === "rt";
    const ranks = esRT ? RT_RANKS : RANKS;
    const r = esRT ? estadoRangoRT() : estadoRango();
    const xp = esRT ? GAME.rtXp : GAME.xp;
    const resueltos = esRT ? GAME.rtCasosResueltos : GAME.casosResueltos;
    const total = esRT ? RT_CASOS.length : CASOS.length;
    const listaCasos = esRT ? RT_CASOS : CASOS;
    const filas = ranks.map((rank) => {
      const estado = rank.xpRequerida > xp ? "locked" : rank.indice === r.indice ? "current" : "";
      const req = rank.indice === 0 ? "Rango inicial" : `${rank.xpRequerida} XP`;
      return `
        <div class="career-rank ${estado}">
          <span class="r-icon">${rank.icono}</span>
          <div style="flex:1">
            <div class="r-name">${rank.nombre}</div>
            <div class="r-req">${req}</div>
            <div class="r-desc">${rank.desc}</div>
          </div>
        </div>`;
    }).join("");
    const casosHechos = (esRT ? GAME.rtCasosCompletados : GAME.casosCompletados)
      .map((id) => listaCasos.find((c) => c.id === id)?.titulo || id).join("<br/>");
    const becHechas = GAME.becarioCompletadas
      .map((id) => [...BECARIO_CASOS, ...BECARIO_RT_CASOS].find((c) => c.id === id)?.titulo || id).join("<br/>");
    const html = `
      <div class="modal-title">🎖 ${esRT ? "TU CARRERA EN RED TEAM" : "TU CARRERA EN EL SOC"}</div>
      <div class="modal-text" style="margin-bottom:8px">
        <b>${esc(GAME.nombre)}</b> · ${xp} XP · ${GAME.puntos} puntos · ${resueltos}/${total} ${esRT ? "pentests" : "casos"} resueltos
      </div>
      <div class="career-path">${filas}</div>
      <div class="modal-section">
        <h3>${esRT ? "PENTESTS COMPLETADOS" : "CASOS COMPLETADOS"}</h3>
        <div class="modal-text" style="font-size:12.5px">${casosHechos || "Ninguno todavía. ¡A trabajar!"}</div>
      </div>
      <div class="modal-section">
        <h3>🎓 PRÁCTICAS DE BECARIO</h3>
        <div class="modal-text" style="font-size:12.5px">${becHechas || "Ninguna todavía. Abre el modo Becario para empezar."}</div>
      </div>
      <div class="modal-section">
        <h3>📊 ESTADÍSTICAS GLOBALES</h3>
        <div class="stats-grid">
          <div class="stats-item"><span class="stats-label">&#9202; Tiempo jugado</span><span class="stats-val">${this._formatearTiempo(GAME.estadisticas?.tiempoJugado || 0)}</span></div>
          <div class="stats-item"><span class="stats-label">&#9989; Acciones correctas</span><span class="stats-val">${GAME.estadisticas?.accionesOk || 0}</span></div>
          <div class="stats-item"><span class="stats-label">&#10060; Errores</span><span class="stats-val">${GAME.estadisticas?.accionesErr || 0}</span></div>
          <div class="stats-item"><span class="stats-label">&#128161; Pistas usadas</span><span class="stats-val">${GAME.estadisticas?.pistasUsadas || 0}</span></div>
          <div class="stats-item"><span class="stats-label">&#129504; Repasos MITRE</span><span class="stats-val">${GAME.estadisticas?.quiz?.aciertos || 0}/${GAME.estadisticas?.quiz?.total || 0}</span></div>
        </div>
        <div style="margin-top:8px">
          <div class="xp-mini-row">
            <span class="xp-mini-label">&#128737;&#65039; SOC XP</span>
            <div class="xp-mini-bar"><div class="xp-mini-fill" style="width:${Math.min(100, (GAME.xp / 2400) * 100)}%"></div></div>
            <span class="xp-mini-num">${GAME.xp} / 2.400</span>
          </div>
          <div class="xp-mini-row">
            <span class="xp-mini-label">&#127919; RT XP</span>
            <div class="xp-mini-bar"><div class="xp-mini-fill rt" style="width:${Math.min(100, (GAME.rtXp / 2600) * 100)}%"></div></div>
            <span class="xp-mini-num">${GAME.rtXp} / 2.600</span>
          </div>
        </div>
        ${this._renderRatingTable()}
      </div>
      <div class="modal-text" style="font-size:11px;color:#5f8a6a;margin-top:6px">💾 Progreso guardado automáticamente en este navegador (localStorage) · Partida ${slotActual()}.</div>
      <div class="modal-section">
        <h3>♻ REINICIAR PROGRESO</h3>
        <div class="modal-text" style="font-size:11.5px;color:#5f8a6a;margin-bottom:8px">
          Borra solo una campaña y conserva la otra intacta, o borra todo.
          Cada botón pide confirmación antes de actuar.
        </div>
        <div class="btn-row">
          <button class="btn-secondary" data-action="reiniciar-soc">🛡️ SOLO CAMPAÑA SOC</button>
          <button class="btn-secondary" data-action="reiniciar-rt">🎯 SOLO RED TEAM</button>
          <button class="btn-danger" data-action="reiniciar">🔄 TODO</button>
        </div>
      </div>
      <div class="modal-section">
        <h3>📤 EXPORTAR / COMPARTIR</h3>
        <div class="btn-row" style="justify-content:flex-start">
          <button class="btn-secondary" data-action="exportar-resumen">📥 MD</button>
          <button class="btn-secondary" data-action="exportar-json">🧾 JSON</button>
          <button class="btn-secondary" data-action="copiar-resumen">📋 COPIAR</button>
          <button class="btn-secondary" data-action="compartir-linkedin">💼 LINKEDIN</button>
        </div>
        <div class="modal-text" style="font-size:11px;color:#5f8a6a;margin-top:6px">
          MD y JSON descargan el resumen. COPIAR lo pone en el portapapeles. LINKEDIN abre el diálogo de
          LinkedIn con la tarjeta del juego y copia un mensaje adaptado a tu progreso (rangos, XP, mejor
          calificación y logros) listo para pegar (Ctrl+V).
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="cerrar-carrera">CERRAR</button>
      </div>`;
    let confirmando = null; // "soc" | "rt" | "todo"
    const pedirConfirmacion = (btn, clave, fn) => {
      if (confirmando !== clave) {
        confirmando = clave;
        btn.textContent = "⚠ ¿CONFIRMAS? PULSA OTRA VEZ";
        btn.style.borderColor = "var(--red)";
        btn.style.color = "#ff6b6b";
        return;
      }
      fn();
    };
    this.setAcciones({
      "exportar-resumen": () => this.exportarResumen(),
      "exportar-json": () => this.exportarJSON(),
      "copiar-resumen": (btn) => this.copiarResumen(btn),
      "compartir-linkedin": (btn) => this.compartirLinkedin(btn),
      "cerrar-carrera": () => this.cerrarModal(),
      "reiniciar-soc": (btn) => pedirConfirmacion(btn, "soc", () => {
        reiniciarCampania("soc");
        location.reload();
      }),
      "reiniciar-rt": (btn) => pedirConfirmacion(btn, "rt", () => {
        reiniciarCampania("rt");
        location.reload();
      }),
      "reiniciar": (btn) => pedirConfirmacion(btn, "todo", () => {
        borrarGuardado();
        location.reload();
      }),
    });
    this.abrirModal(html);
  }

  // ---------- Reto diario ----------
  mostrarRetoDiario() {
    const reto = retoDelDia();
    const yaHoy = GAME.estadisticas?.reto?.fecha === reto.fecha;
    const ranking = filasRankingReto(GAME.estadisticas?.retoHistorial || []);
    const filasRanking = ranking.length
      ? ranking.map((m) => `
        <div class="rk-fila">
          <span class="rk-fecha">${m.fecha}</span>
          <span class="rk-titulo">${m.titulo}</span>
          <span class="rk-rating">${m.rating}</span>
          <span class="rk-tiempo">${m.tiempo}</span>
        </div>`).join("")
      : `<div class="rk-vacia">Aún no hay marcas. Completa el reto de hoy para estrenar el ranking.</div>`;
    const indicadores = resumenIndicadores(reto.mapas);
    const fichaI = indicadores.length
      ? `<div class="reto-inds">${indicadores.map((i) => `
        <div class="reto-ind">
          <span class="reto-ind-tipo">${i.tipo}</span>
          <span class="reto-ind-orig">${esc(i.original)}</span>
          <span class="reto-ind-flecha">→</span>
          <span class="reto-ind-var">${esc(i.variante)}</span>
        </div>`).join("")}</div>`
      : `<div class="modal-text" style="font-size:12px;color:#5f8a6a">Este caso no tiene indicadores variables: hoy nada cambia.</div>`;
    const html = `
      <div class="modal-title">🔥 RETO DIARIO</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px">
        El mismo incidente con <b>indicadores distintos cada día</b>: las IPs, los hosts, los dominios y
        los correos cambian según la semilla de la fecha (sustitución reversible: nada se rompe).
        Sin pistas y con el SLA real — aquí se nota el criterio, no la memoria.
      </div>
      <div class="modal-section">
        <h3>RETO DE HOY · ${reto.fecha}</h3>
        <div class="modal-text" style="font-size:13px">
          <b>${reto.titulo}</b><br/>
          <span style="color:#8fd39e">${reto.esRT ? "Campaña Red Team" : "Campaña SOC"} · Severidad ${reto.caso.severidad} · SLA ${Math.floor(reto.caso.sla / 60)} min</span>
        </div>
        ${yaHoy ? `<div class="modal-text" style="font-size:12px;color:#33ff66">✔ Ya superaste el reto de hoy con ${GAME.estadisticas.reto.rating}. Puedes repetirlo para mejorar tu marca.</div>` : ""}
      </div>
      <div class="modal-section">
        <h3>🔎 INDICADORES DE HOY</h3>
        <div class="modal-text" style="font-size:11.5px;color:#5f8a6a;margin-bottom:6px">
          Las variantes que ha generado la semilla de hoy, <b>antes de jugar</b>: busca estos valores en
          las evidencias y responde con ellos.
        </div>
        ${fichaI}
      </div>
      <div class="modal-section">
        <h3>🏆 RANKING LOCAL · ÚLTIMAS 30 MARCAS</h3>
        <div class="rk-lista">${filasRanking}</div>
      </div>
      <div class="jimmy-habla">Repetir el mismo caso con indicadores nuevos: así se aprende el patrón, no las respuestas. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-reto">CERRAR</button>
        <button class="btn-primary" data-action="jugar-reto">🔥 JUGAR RETO DE HOY</button>
      </div>`;
    this.setAcciones({
      "cerrar-reto": () => this.cerrarModal(),
      "jugar-reto": () => {
        this.cerrarModal();
        this._onNuevoCaso(reto.caso, { reto: true });
      },
    });
    this.abrirModal(html);
  }

  // ---------- Modo examen ----------
  mostrarExamen() {
    const mejor = GAME.mejorExamen;
    const nExamenes = (GAME.estadisticas?.examenes || []).length;
    const html = `
      <div class="modal-title">🎓 MODO EXAMEN</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px">
        Un caso al azar (SOC o Red Team), <b>sin pistas</b>, con el SLA real y el reloj en contra.
        Tu informe se califica como siempre (S+/S/A/B/C) y, si apruebas con <b>A o mejor</b>,
        obtienes un <b>certificado descargable</b> con tu nombre y tu calificación.
        El examen <b>no toca tu carrera</b>: ni XP, ni casos completados.
      </div>
      ${mejor ? `<div class="modal-text" style="font-size:12.5px;color:#33ff66;margin-top:6px">Mejor nota: ${mejor} · ${nExamenes} ${nExamenes === 1 ? "examen hecho" : "exámenes hechos"}.</div>` : ""}
      <div class="jimmy-habla">Un certificado no demuestra que sepas: demuestra que lo hiciste bajo presión. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-examen">CERRAR</button>
        <button class="btn-primary" data-action="empezar-examen">🎓 EMPEZAR EXAMEN</button>
      </div>`;
    this.setAcciones({
      "cerrar-examen": () => this.cerrarModal(),
      "empezar-examen": () => {
        this.cerrarModal();
        this._onNuevoCaso(elegirCasoExamen(), { examen: true });
      },
    });
    this.abrirModal(html);
  }

  // ---------- Modo presentador (demo) ----------
  mostrarPresentador() {
    const html = `
      <div class="modal-title">🎬 MODO PRESENTADOR</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px">
        Carga un <b>estado demo avanzado</b> (rangos máximos, casos completados, logros) para
        enseñar CYBERGRAD en entrevistas o demos sin tener que grindear.
        <br/><br/>
        <b>No se guarda nada:</b> tu progreso real queda intacto. Para volver a tu carrera, recarga la página.
      </div>
      <div class="jimmy-habla">El presentador enseña el potencial del juego, no tu partida. — Jimmy</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="cerrar-demo">CERRAR</button>
        <button class="btn-primary" data-action="entrar-demo">🎬 ENTRAR EN MODO DEMO</button>
      </div>`;
    this.setAcciones({
      "cerrar-demo": () => this.cerrarModal(),
      "entrar-demo": () => {
        aplicarModoPresentador();
        this.cerrarModal();
        this.actualizarPerfil();
        this.mostrarCarrera();
      },
    });
    this.abrirModal(html);
  }

  // ---------- Árbol de habilidades MITRE ----------
  mostrarHabilidades() {
    const est = estadoHabilidades();
    const secciones = est.tacticas
      .filter((t) => t.tecnicas.length)
      .map((t) => `
        <div class="hab-tactica">
          <div class="hab-titulo">${t.icono} ${t.nombre} <span class="hab-prog">${t.nHechas}/${t.tecnicas.length}</span></div>
          <div class="hab-desc">${t.desc}</div>
          <div class="hab-tecnicas">
            ${t.tecnicas.map((te) => `
              <div class="hab-chip ${te.hecha ? "hab-hecha" : "hab-locked"}">
                <span class="hab-code">${te.code}</span>
                <span class="hab-nombre">${te.nombre}</span>
                <span class="hab-estado">${te.hecha ? "✔ dominada" : `— ${te.casos.map((c) => c.titulo).join(", ").slice(0, 70)}`}</span>
              </div>`).join("")}
          </div>
        </div>`).join("");
    const html = `
      <div class="modal-title">🧭 ÁRBOL DE HABILIDADES MITRE</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px;margin-bottom:6px">
        <b>${est.dominadas} de ${est.total} técnicas</b> dominadas. Cada técnica se desbloquea al
        completar el caso que la enseña (SOC o Red Team). El mapa muestra qué dominas y qué te falta.
      </div>
      <div id="habilidades-lista">${secciones}</div>
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-habilidades">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-habilidades": () => this.cerrarModal() });
    this.abrirModal(html);
  }

  // ---------- Fin de modo especial (reto / examen) ----------
  mostrarFinModoEspecial(modo, perdido = false) {
    const esReto = modo === "reto";
    const titulo = perdido
      ? esReto ? "⏱ RETO DIARIO PERDIDO" : "🎓 EXAMEN NO SUPERADO"
      : esReto ? "🔥 RETO DIARIO COMPLETADO" : "🎓 EXAMEN COMPLETADO";
    const texto = esReto
      ? perdido
        ? "El SLA se agotó en el reto de hoy. Mañana habrá un reto nuevo con indicadores distintos."
        : "Reto de hoy completado. Mañana, indicadores nuevos: vuelve a demostrar que entiendes el patrón."
      : perdido
        ? "No superaste el examen esta vez. Repasa con el tutor (`explicar` / `preguntar`) y reinténtalo cuando estés listo."
        : "Examen entregado. Puedes repetirlo cuando quieras para mejorar tu nota.";
    const html = `
      <div class="modal-title">${titulo}</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text">${texto}</div>
      <div class="btn-row">
        <button class="btn-secondary" data-action="volver-juego">VOLVER AL JUEGO</button>
        <button class="btn-primary" data-action="repetir-especial">${perdido ? "REINTENTAR" : "REPETIR"}</button>
      </div>`;
    this.setAcciones({
      "volver-juego": () => { this.cerrarModal(); location.reload(); },
      "repetir-especial": () => {
        this.cerrarModal();
        if (esReto) this.mostrarRetoDiario();
        else this.mostrarExamen();
      },
    });
    this.abrirModal(html);
  }

  // ---------- Glosario ----------
  mostrarGlosario() {
    const terminos = Object.entries(GLOSARIO)
      .map(([t, { def }]) => `<div class="gloss-term"><span class="gt">${t}</span> — <span class="gd">${def}</span></div>`)
      .join("");
    const html = `
      <div class="modal-title">📖 GLOSARIO DEL ANALISTA</div>
      <div class="modal-text" style="font-size:12px;color:#8fd39e;margin-bottom:8px">
        Términos que aparecen en los casos y en la profesión. Tu diccionario de cabecera.
      </div>
      ${terminos}
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-glosario">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-glosario": () => this.cerrarModal() });
    this.abrirModal(html);
  }

  // ---------- Compartir ----------
  mostrarCompartir() {
    const urlJuego = "https://knklinux.github.io/cybergrad/";
    const urlRepo = "https://github.com/knklinux/cybergrad";
    const mensaje = `Aprende ciberseguridad jugando: CYBERGRAD, simulador de carrera SOC + Red Team con terminal real y modo becario. 🎮 ${urlJuego}`;
    const fila = (titulo, texto, clave) => `
      <h3>${titulo}</h3>
      <div class="share-row">
        <span class="share-url">${texto}</span>
        <button class="btn-secondary share-copy" data-share="${clave}">COPIAR</button>
      </div>`;
    const html = `
      <div class="modal-title">&#128279; COMPARTE CYBERGRAD</div>
      ${this.holoHTML("holo-md")}
      <div class="modal-text" style="font-size:12.5px">
        Lleva el juego a quien quieras: entrevistadores, compañeros, comunidades de ciberseguridad.
        Se juega desde el navegador, sin instalar nada.
      </div>
      <div class="modal-section">
        ${fila("JUGAR ONLINE", urlJuego, "juego")}
        ${fila("CÓDIGO FUENTE (REPO)", urlRepo, "repo")}
        ${fila("MENSAJE PARA REDES", mensaje, "mensaje")}
      </div>
      <div class="jimmy-habla">Un buen analista comparte el conocimiento: cuanta más gente sepa, más difícil lo tendrán los atacantes. — Jimmy</div>
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-compartir">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-compartir": () => this.cerrarModal() });
    this.abrirModal(html);
    document.querySelectorAll(".share-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const clave = btn.getAttribute("data-share");
        const texto = clave === "juego" ? urlJuego : clave === "repo" ? urlRepo : mensaje;
        this._copiarAlPortapapeles(texto, btn);
      });
    });
  }

  // Copia al portapapeles (clipboard API con fallback a execCommand)
  async _copiarAlPortapapeles(texto, btn) {
    const ok = await this._clipboard(texto);
    const original = btn.textContent;
    btn.textContent = ok ? "✔ COPIADO" : "Selecciona y copia";
    btn.style.color = ok ? "#33ff66" : "#ffb000";
    setTimeout(() => {
      btn.textContent = original;
      btn.style.color = "";
    }, 1800);
  }

  async _clipboard(texto) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch { /* contextos no seguros o sin permiso: se usa el fallback */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  mostrarAyuda() {
    const html = `
      <div class="modal-title">❓ AYUDA RÁPIDA</div>
      <div class="modal-text" style="font-size:13px;line-height:1.7">
        Escribe <b>ayuda</b> en la terminal para ver todos los comandos.<br/><br/>
        <b>Flujo de trabajo:</b><br/>
        1. <span class="mono">ver_caso</span> — lee el briefing del incidente<br/>
        2. <span class="mono">mail</span> / <span class="mono">alertas</span> — primeras fuentes<br/>
        3. <span class="mono">ls</span>, <span class="mono">cat</span>, <span class="mono">grep</span> — investiga los logs<br/>
        4. <span class="mono">whois</span>, <span class="mono">dig</span>, <span class="mono">vt</span> — valida los indicadores<br/>
        5. <span class="mono">bloquear</span>, <span class="mono">aislar</span>, <span class="mono">deshabilitar</span>, <span class="mono">escalar</span> — responde<br/>
        6. <span class="mono">informe</span> — documenta y cierra<br/><br/>
        ¿Atascado? <span class="mono">pista</span> te ayuda. <span class="mono">carrera</span> muestra tu progreso.<br/>
        <b>&#128300; Laboratorio:</b> práctica libre sin SLA ni penalizaciones.<br/>
        ¿Primera vez? Abre el <b>&#129517; Tutorial</b> (botón del menú o comando <span class="mono">tutorial</span>) para ponerte en contexto en 2 minutos.
      </div>
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-ayuda">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-ayuda": () => this.cerrarModal() });
    this.abrirModal(html);
  }
}
