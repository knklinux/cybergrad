// ============================================================
// ui.js — Interfaz: HUD, modales, notificaciones, Jimmy, splash
// ============================================================

import { GAME, RANKS, estadoRango } from "./state.js";
import { CASOS, numCaso, siguienteCaso } from "./casos.js";
import { GLOSARIO } from "./glosario.js";
import { PASOS_TUTORIAL, MICROCASO } from "./tutorial.js";
import {
  JIMMY, JIMMY_PRESENTACION, JIMMY_CASO, JIMMY_RESULTADO,
  JIMMY_LECCION, JIMMY_PISTA, JIMMY_LAB, JIMMY_FINAL,
} from "./jimmy.js";

const $ = (id) => document.getElementById(id);
const alea = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class UI {
  constructor(term, fx) {
    this.term = term;
    this.fx = fx || null;
    this._sla = 0;
    this._acciones = {};
    this._bindBotones();
  }

  _bindBotones() {
    $("btn-carrera").addEventListener("click", () => this.mostrarCarrera());
    $("btn-glosario").addEventListener("click", () => this.mostrarGlosario());
    $("btn-ayuda").addEventListener("click", () => this.mostrarAyuda());
    $("btn-lab").addEventListener("click", () => this.mostrarLaboratorio());
    $("btn-tutorial").addEventListener("click", () => this.mostrarTutorial(false));
  }

  // ---------- Motor gráfico ----------
  setTemaCaso(tema) {
    if (this.fx) this.fx.setTema(tema);
  }
  pulsoTema(intensidad) {
    if (this.fx) this.fx.pulsoAlerta(intensidad);
  }

  setModoLab(lab, tutorial) {
    this._modoLab = lab;
    this._modoTutorial = tutorial;
    $("btn-lab").classList.toggle("on", lab);
    this._renderModo();
  }

  _renderModo() {
    const mode = $("sla-mode");
    if (!mode) return;
    mode.textContent = this._modoTutorial ? "MODO TUTORIAL — GUIADO" : this._modoLab ? "MODO LABORATORIO — SIN SLA" : "";
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
    const lineas = JIMMY_CASO[caso.id] || ["Analiza el caso y responde. Yo vigilo los datos."];
    const html = `
      <div class="modal-title">&#129302; BRIEFING — ${caso.titulo}</div>
      <div class="briefing-avatar">
        ${this.holoHTML("holo-lg")}
        <div class="briefing-lines">
          <div class="briefing-line">${lineas[0]}</div>
          ${lineas[1] ? `<div class="briefing-line">${lineas[1]}</div>` : ""}
          <div class="briefing-line" style="color:#5f8a6a;font-size:11.5px">
            Caso ${numCaso(caso.id)}/${CASOS.length} · Severidad ${caso.severidad} ·
            SLA ${Math.floor(caso.sla / 60)} min · +${caso.xp} XP
          </div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" data-action="aceptar-briefing">&#9654; ACEPTAR CASO</button>
      </div>`;
    this.setAcciones({
      "aceptar-briefing": () => { this.cerrarModal(); cb(); },
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
        <button class="btn-primary" id="btn-empezar" data-action="empezar">EMPEZAR TURNO</button>
      </div>`;
    this.setAcciones({
      "ver-tutorial": () => this.mostrarTutorial(true, () => this.onboarding(cb)),
      "empezar": () => {
        const nombre = ($("input-nombre")?.value || "").trim() || "Analista";
        GAME.nombre = nombre;
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

  // ---------- HUD ----------
  actualizarPerfil() {
    const r = estadoRango();
    $("perfil-nombre").textContent = GAME.nombre;
    $("perfil-rango").textContent = `${r.icono} ${r.nombre}`;
    const next = RANKS[r.indice + 1];
    if (next) {
      const pct = Math.min(100, Math.round(((GAME.xp - r.xpRequerida) / (next.xpRequerida - r.xpRequerida)) * 100));
      $("xp-fill").style.width = pct + "%";
      $("xp-num").textContent = `${GAME.xp} / ${next.xpRequerida}`;
    } else {
      $("xp-fill").style.width = "100%";
      $("xp-num").textContent = `${GAME.xp} XP — MÁXIMO`;
    }
    $("puntos").textContent = GAME.puntos;
    $("casos-resueltos").textContent = GAME.casosResueltos;
  }

  mostrarCaso(caso, hecho) {
    this._sla = caso.sla;
    const sev = caso.severidad.toLowerCase();
    const sevClass = { critica: "sev-critica", alta: "sev-alta", media: "sev-media", baja: "sev-baja" }[sev] || "sev-media";
    let html = `
      <div class="caso-titulo">#${String(numCaso(caso.id)).padStart(2, "0")} · ${caso.titulo}</div>
      <div class="caso-meta">Caso ${numCaso(caso.id)}/${CASOS.length} · Nivel ${caso.nivel} · XP ${caso.xp}</div>
      <span class="caso-sev ${sevClass}">${caso.severidad}</span>
      <div class="modal-section" style="margin-top:10px">
        <h3>CHECKLIST DE RESPUESTA</h3>
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
    for (const target of caso.correctas.bloquear) {
      const valor = target.slice(target.indexOf(":") + 1);
      li(`Bloquear ${valor}`, hecho.has("bloquear:" + target));
    }
    for (const target of caso.correctas.aislar) {
      const valor = target.slice(target.indexOf(":") + 1);
      li(`Aislar ${valor.toUpperCase()}`, hecho.has("aislar:" + target));
    }
    for (const target of caso.correctas.deshabilitar) {
      const valor = target.slice(target.indexOf(":") + 1);
      li(`Deshabilitar ${valor}`, hecho.has("deshabilitar:" + target));
    }
    if (caso.correctas.escalar) li("Escalar a CSIRT", hecho.has("escalar"));
    if (caso.correctas.cerrar) li("Cerrar como falso positivo", hecho.has("cerrar"));
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
    const r = estadoRango();
    const acciones = GAME.acciones.map((a) => `  - [${a.tiempo}s] ${a.tipo}: ${a.detalle}`).join("\n");
    const plantilla = `INFORME DE INCIDENTE — CASO #${numCaso(caso.id)}
============================================
Título: ${caso.titulo}
Analista: ${GAME.nombre} (${r.nombre})
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
      <div class="modal-title">&#128221; INFORME DE INCIDENTE</div>
      <div class="modal-text" style="font-size:12px;color:#8fd39e;margin-bottom:10px">
        Documenta el caso antes de cerrarlo. Se evalúa la <b>cobertura de IOCs</b> y las acciones ejecutadas.
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
    const icono = { "S+": "🏆", S: "⭐", A: "💪", B: "👍", C: "📖" }[r.rating] || "📖";
    const lista = r.menciones.map((m) => `<li style="color:${m.ok ? "#33ff66" : "#ffb000"}">${m.ok ? "✔" : "✘"} ${m.texto}</li>`).join("");
    const jimmy = alea(JIMMY_RESULTADO[r.rating] || JIMMY_RESULTADO.C);

    const html = `
      <div class="modal-title">${icono} CASO RESUELTO — CALIFICACIÓN ${r.rating}</div>
      <div class="modal-text" style="margin-bottom:6px">
        Has completado <b>${caso.titulo}</b> en ${Math.floor(r.tUsado * caso.sla / 60)} min
        (${Math.round(r.tUsado * 100)}% del SLA) con ${r.errores} error(es) y ${r.pistas} pista(s).
      </div>
      <div class="modal-section">
        <h3>RECOMPENSA</h3>
        <div style="font-size:15px;color:#33ff66">${this._modoLab ? `+${r.xp} XP de práctica (no suma a tu carrera en laboratorio)` : `+${r.xp} XP (base ${caso.xp} × ${r.mult.toFixed(2)})`}</div>
      </div>
      <div class="modal-section">
        <h3>COBERTURA DEL INFORME</h3>
        <ul style="font-size:12.5px;line-height:1.8;padding-left:18px">${lista}</ul>
      </div>
      <div class="jimmy-habla">${jimmy}</div>
      <div class="btn-row">
        <button class="btn-primary" data-action="siguiente">SIGUIENTE →</button>
      </div>`;
    this.setAcciones({
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
    this._onNuevoCaso = fn;
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
        <b>${GAME.nombre}</b>, esto es solo el principio. En el mundo real, los incidentes no
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

  // ---------- Carrera ----------
  mostrarCarrera() {
    const r = estadoRango();
    const filas = RANKS.map((rank) => {
      const estado = rank.xpRequerida > GAME.xp ? "locked" : rank.indice === r.indice ? "current" : "";
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
    const casosHechos = GAME.casosCompletados.map((id) => CASOS.find((c) => c.id === id)?.titulo || id).join("<br/>");
    const html = `
      <div class="modal-title">🎖 TU CARRERA EN EL SOC</div>
      <div class="modal-text" style="margin-bottom:8px">
        <b>${GAME.nombre}</b> · ${GAME.xp} XP · ${GAME.puntos} puntos · ${GAME.casosResueltos}/${CASOS.length} casos resueltos
      </div>
      <div class="career-path">${filas}</div>
      <div class="modal-section">
        <h3>CASOS COMPLETADOS</h3>
        <div class="modal-text" style="font-size:12.5px">${casosHechos || "Ninguno todavía. ¡A trabajar!"}</div>
      </div>
      <div class="btn-row"><button class="btn-primary" data-action="cerrar-carrera">CERRAR</button></div>`;
    this.setAcciones({ "cerrar-carrera": () => this.cerrarModal() });
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
