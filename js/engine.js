// ============================================================
// engine.js — Motor del juego
// Gestión del caso activo, acciones del analista, SLA, eventos
// temporizados, puntuación y evaluación del informe.
// ============================================================

import { GAME, addXP, addPuntos, registrarAccion, resetAccionesCaso, estadoRango, xpNecesariaParaSiguiente } from "./state.js";
import { numCaso } from "./casos.js";
import { md5, sha256 } from "./hash.js";
import { temaParaCaso } from "./fx.js";
import { JIMMY_PISTA } from "./jimmy.js";

const PUNTOS = {
  accionCorrecta: 30,
  escalar: 25,
  cerrarCorrecto: 40,
  accionIncorrecta: -25,
  accionNoProcede: -5,
  pista: -15,
  slaSuperado: -50,
};

export class Engine {
  constructor({ term, ui }) {
    this.term = term;
    this.ui = ui;
    this.caso = null;
    this.hecho = new Set();       // acciones correctas ejecutadas
    this.errores = 0;
    this.pistasUsadas = 0;
    this._intervalo = null;
    this._timers = [];
    this._hashCache = new Map();  // path -> {md5, sha256}
    this.vtRuntime = {};          // hash -> reporte VT (archivos locales calculados)
    this._bloqueado = false;      // evita acciones dobles durante modales
    this.lab = false;             // modo laboratorio (práctica libre)
    this.tutorial = false;        // micro-tutorial guiado
    this.tutorialIdx = 0;
    this.tutorialFin = false;
  }

  _gratis() { return this.lab || this.tutorial; }
  _gratisLabel() { return this.lab ? "laboratorio" : "tutorial"; }
  // Sufijo de mensaje: sin penalización en modos de práctica
  _sinPenalizacion() {
    if (this.lab) return " (sin penalización: laboratorio)";
    if (this.tutorial) return " (sin penalización: tutorial)";
    return "";
  }

  // ---------- Ciclo de vida ----------
  iniciarCaso(caso, opciones = {}) {
    this.caso = caso;
    this.lab = !!opciones.lab;
    this.tutorial = !!opciones.tutorial;
    this.tutorialIdx = 0;
    this.tutorialFin = false;
    GAME.casoActual = caso.id;
    GAME.reloj = 0;
    resetAccionesCaso();
    this.hecho = new Set();
    this.errores = 0;
    this.pistasUsadas = 0;
    this._bloqueado = false;
    this._limpiarTimers();
    this.vtRuntime = {};
    this.ui.setTemaCaso(temaParaCaso(caso));
    this.ui.setModoLab(this.lab, this.tutorial);

    // Splash de incidente → briefing de Jimmy → arranque
    this.ui.mostrarSplash(caso, () => {
      this.ui.mostrarBriefing(caso, () => this._arrancarCaso());
    });
  }

  _arrancarCaso() {
    const caso = this.caso;
    this.term.clear();
    this.term.separator("C A S O  " + numCaso(caso.id) + " / 6");
    this.term.printHi(`📨 Nuevo caso asignado: ${caso.titulo}`);
    this.term.printInfo(`Severidad: ${caso.severidad}  |  SLA: ${caso.sla}s  |  XP posible: ${caso.xp}`);
    this.term.print("");
    this.term.print("Usa `ver_caso` para leer el briefing y `mail` / `alertas` para empezar.", "t-out-dim");
    this.term.print("`ayuda` muestra todos los comandos. ¡A por ello, analista!", "t-out-dim");
    this.term.print("");

    this.ui.mostrarCaso(caso, this.hecho);
    this.ui.feed(`Caso #${caso.id} asignado (${caso.severidad})${this.lab ? " · LAB" : this.tutorial ? " · TUTORIAL" : ""}`, "new-msg");
    if (this.lab) {
      this.ui.jimmyDice("Modo Laboratorio activo: sin SLA, sin penalizaciones, pistas gratis. Practica con fluidez.");
    } else if (this.tutorial) {
      this.ui.jimmyDice("Modo tutorial: te guío paso a paso. Empieza escribiendo `mail`.");
    }

    // Reloj + SLA (en laboratorio/tutorial no hay SLA)
    this._intervalo = setInterval(() => this._tick(), 1000);

    // Eventos temporizados (en laboratorio, más tranquilos)
    for (const ev of (caso.eventos || [])) {
      const t = setTimeout(() => this._dispararEvento(ev), ev.en * 1000 * (this.lab ? 2 : 1));
      this._timers.push(t);
    }
  }

  _tick() {
    if (GAME.pausado || !this.caso) return;
    GAME.reloj++;
    if (this.lab || this.tutorial) {
      // En laboratorio/tutorial el SLA se muestra pero no hace fallar el caso
      this.ui.actualizarReloj(GAME.reloj, this.caso.sla * 10);
      return;
    }
    this.ui.actualizarReloj(GAME.reloj, this.caso.sla);
    if (GAME.reloj >= this.caso.sla) {
      this.fracasarCaso("⏱ SLA superado: el incidente se escaló solo a CSIRT sin tu intervención. La organización pierde la confianza en ti.");
    }
  }

  _dispararEvento(ev) {
    if (!this.caso || this._bloqueado) return;
    if (GAME.casosCompletados.includes(this.caso.id)) return;
    if (ev.tipo === "alerta") {
      this.caso.alertas.push({
        id: "ALT-EV" + Math.floor(Math.random() * 900 + 100),
        sev: ev.sev,
        fuente: "sistema",
        titulo: ev.titulo,
      });
      this.ui.feed(`ALERTA: ${ev.titulo}`, "new-alert");
      this.ui.notificar(ev.titulo, ev.detalle, "crit");
      this.term.printWarn(`🔴 ALERTA EN VIVO: ${ev.titulo}`);
      this.term.print(ev.detalle, "t-out-dim");
      this.ui.pulsoTema(ev.sev === "CRITICAL" || ev.sev === "HIGH" ? 1.5 : 1);
    } else if (ev.tipo === "msg") {
      this.ui.feed(`Mensaje: ${ev.titulo}`, "new-msg");
      this.ui.notificar(ev.titulo, ev.detalle, "warn");
      this.term.printWarn(`💬 ${ev.titulo}`);
      this.term.print(ev.detalle, "t-out-dim");
    } else if (ev.tipo === "mail") {
      this.caso.correos.push(ev.correo);
      this.ui.feed(`Correo nuevo: ${ev.correo.asunto}`, "new-mail");
      this.ui.notificar("Correo nuevo", ev.correo.asunto, "");
      this.term.printInfo(`📧 Correo nuevo de ${ev.correo.de}: ${ev.correo.asunto}`);
    }
    this.ui.actualizarEventos(this.caso.alertas.length);
  }

  _limpiarTimers() {
    if (this._intervalo) clearInterval(this._intervalo);
    this._intervalo = null;
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }

  // ---------- Utilidades ----------
  archivo(path) {
    const fs = this.caso.fs || {};
    return fs[path] !== undefined ? fs[path] : null;
  }

  hashArchivo(path) {
    const contenido = this.archivo(path);
    if (contenido === null) return null;
    if (!this._hashCache.has(path)) {
      this._hashCache.set(path, { md5: md5(contenido), sha256: sha256(contenido) });
    }
    return this._hashCache.get(path);
  }

  // Registra el hash de un archivo local para poder consultarlo en `vt`
  registrarHashVt(ruta, hash) {
    const info = this.caso?.archivosVt?.[ruta];
    if (info && !this.vtRuntime[hash]) {
      this.vtRuntime[hash] = {
        nombre: info.nombre,
        tipo: hash.length === 32 ? "MD5" : "SHA-256",
        vt: {
          repos: 62,
          maliciosos: 38,
          deteccion: info.deteccion || "MALICIOSO",
          familia: info.familia || "desconocida",
          comentarios: "Análisis simulado del caso.",
        },
        nota: info.nota || "",
      };
    }
  }

  // Normaliza un objetivo de acción a "tipo:valor" canónico.
  // tipoPorDefecto se usa en comandos como aislar (host) o deshabilitar (usuario).
  normalizarObjetivo(arg, tipoPorDefecto) {
    let a = String(arg || "").trim().toLowerCase();
    if (!a) return null;
    if (a.startsWith("http://") || a.startsWith("https://")) return { tipo: "url", valor: a };
    if (a.includes(":")) {
      const idx = a.indexOf(":");
      return { tipo: a.slice(0, idx).trim(), valor: a.slice(idx + 1).trim() };
    }
    if (tipoPorDefecto) return { tipo: tipoPorDefecto, valor: a };
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(a)) return { tipo: "ip", valor: a };
    return { tipo: "dominio", valor: a };
  }

  _clave(tipo, valor) {
    return `${tipo}:${valor}`;
  }

  // correctas[accion] = ["tipo:valor", ...]; incorrectas = ["accion|tipo:valor", ...]
  _buscarCorrecta(accion, tipo, valor) {
    const correctas = this.caso.correctas[accion] || [];
    for (const c of correctas) {
      const idx = c.indexOf(":");
      const ct = c.slice(0, idx);
      const cv = c.slice(idx + 1);
      if (ct === tipo && cv.toLowerCase() === valor.toLowerCase()) return c;
    }
    return null;
  }

  _buscarIncorrecta(accion, tipo, valor) {
    for (const inc of this.caso.incorrectas || []) {
      const [ia, resto] = inc.split("|");
      if (ia !== accion) continue;
      const idx = resto.indexOf(":");
      const it = resto.slice(0, idx);
      const iv = resto.slice(idx + 1);
      if (it === tipo && iv.toLowerCase() === valor.toLowerCase()) return inc;
    }
    return null;
  }

  // ---------- Acciones del analista ----------
  bloquear(arg) {
    const obj = this.normalizarObjetivo(arg);
    if (!obj) return this.term.printErr("Uso: bloquear <dominio|ip|url>:<valor>  (ej: bloquear dominio:malo.example)");
    const clave = this._clave(obj.tipo, obj.valor);
    const correcta = this._buscarCorrecta("bloquear", obj.tipo, obj.valor);
    const incorrecta = this._buscarIncorrecta("bloquear", obj.tipo, obj.valor);

    if (correcta) {
      if (this.hecho.has("bloquear:" + correcta)) {
        this.term.printInfo(`Ya has bloqueado ${obj.valor}.`);
        return;
      }
      this.hecho.add("bloquear:" + correcta);
      addPuntos(PUNTOS.accionCorrecta);
      registrarAccion("bloquear", `${obj.tipo}:${obj.valor}`, true, PUNTOS.accionCorrecta);
      this.term.printOk(`Bloqueado en firewall/pasarela: ${obj.tipo} ${obj.valor}. Indicador neutralizado.`);
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._gratis() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("bloquear", `${obj.tipo}:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ ¡Cuidado! ${obj.valor} es un indicador LEGÍTIMO o no relacionado. Bloquearlo dañaría la operación${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      this.ui.mostrarCaso(this.caso, this.hecho);
      return;
    }
    const pts = this._gratis() ? 0 : PUNTOS.accionNoProcede;
    addPuntos(pts);
    registrarAccion("bloquear", `${obj.tipo}:${obj.valor}`, false, pts);
    this.term.printWarn(`No se identifica ${obj.valor} como indicador de este incidente. Revisa las evidencias antes de bloquear${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionNoProcede)} pts)`}.`);
  }

  aislar(arg) {
    const obj = this.normalizarObjetivo(arg, "host");
    if (!obj) return this.term.printErr("Uso: aislar <host>  (ej: aislar HOST-104)");
    const correcta = this._buscarCorrecta("aislar", obj.tipo, obj.valor);
    const incorrecta = this._buscarIncorrecta("aislar", obj.tipo, obj.valor);
    if (correcta) {
      if (this.hecho.has("aislar:" + correcta)) return this.term.printInfo(`El host ${obj.valor} ya está aislado.`);
      this.hecho.add("aislar:" + correcta);
      addPuntos(PUNTOS.accionCorrecta);
      registrarAccion("aislar", `host:${obj.valor}`, true, PUNTOS.accionCorrecta);
      this.term.printOk(`Host ${obj.valor.toUpperCase()} aislado de la red (segmento de cuarentena). Evidencias preservadas.`);
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._gratis() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("aislar", `host:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ Aislar ${obj.valor} no está justificado por las evidencias y cortaría servicios legítimos${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      return;
    }
    const pts = this._gratis() ? 0 : PUNTOS.accionNoProcede;
    addPuntos(pts);
    registrarAccion("aislar", `host:${obj.valor}`, false, pts);
    this.term.printWarn(`No hay evidencias de que ${obj.valor} esté implicado. No aísles sin justificación${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionNoProcede)} pts)`}.`);
  }

  deshabilitar(arg) {
    const obj = this.normalizarObjetivo(arg, "usuario");
    if (!obj) return this.term.printErr("Uso: deshabilitar <usuario>  (ej: deshabilitar m.garcia)");
    const correcta = this._buscarCorrecta("deshabilitar", obj.tipo, obj.valor);
    const incorrecta = this._buscarIncorrecta("deshabilitar", obj.tipo, obj.valor);
    if (correcta) {
      if (this.hecho.has("deshabilitar:" + correcta)) return this.term.printInfo(`La cuenta ${obj.valor} ya está deshabilitada.`);
      this.hecho.add("deshabilitar:" + correcta);
      addPuntos(PUNTOS.accionCorrecta);
      registrarAccion("deshabilitar", `usuario:${obj.valor}`, true, PUNTOS.accionCorrecta);
      this.term.printOk(`Cuenta ${obj.valor} deshabilitada y sesiones revocadas. Credenciales marcadas para rotación.`);
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._gratis() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("deshabilitar", `usuario:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ ${obj.valor} no es la cuenta comprometida. Deshabilitarla interrumpiría la operación${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      return;
    }
    const pts = this._gratis() ? 0 : PUNTOS.accionNoProcede;
    addPuntos(pts);
    registrarAccion("deshabilitar", `usuario:${obj.valor}`, false, pts);
    this.term.printWarn(`No hay indicios de que la cuenta ${obj.valor} esté comprometida${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionNoProcede)} pts)`}.`);
  }

  escalar() {
    if (this.caso.correctas.escalar) {
      if (this.hecho.has("escalar")) return this.term.printInfo("El incidente ya está escalado.");
      this.hecho.add("escalar");
      addPuntos(PUNTOS.escalar);
      registrarAccion("escalar", "a CSIRT / Nivel 2", true, PUNTOS.escalar);
      this.term.printOk("Incidente escalado a CSIRT con toda la información recopilada. Bien coordinado.");
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    this.errores++;
    const pts = this._gratis() ? 0 : -20;
    addPuntos(pts);
    registrarAccion("escalar", "a CSIRT / Nivel 2", false, pts);
    this.term.printErr(`⚠ Escalar sin necesidad satura al CSIRT y cuesta confianza. Revisa el contexto: ¿hay indicadores reales?${this._sinPenalizacion() || " (-20 pts)"}.`);
  }

  cerrarCaso(razon) {
    if (this.caso.correctas.cerrar) {
      if (this.hecho.has("cerrar")) return this.term.printInfo("Caso ya cerrado. Redacta el informe con `informe`.");
      this.hecho.add("cerrar");
      addPuntos(PUNTOS.cerrarCorrecto);
      registrarAccion("cerrar_caso", razon || "falso positivo justificado", true, PUNTOS.cerrarCorrecto);
      this.term.printOk(`Caso cerrado como FALSO POSITIVO${razon ? `: ${razon}` : ""}. Excelente triaje: has evitado interrumpir una operación legítima.`);
      this.term.printInfo("Completa la documentación con `informe`.");
      this.ui.mostrarCaso(this.caso, this.hecho);
      return;
    }
    this.errores++;
    const pts = this._gratis() ? 0 : PUNTOS.accionIncorrecta;
    addPuntos(pts);
    registrarAccion("cerrar_caso", razon || "sin justificación", false, pts);
    this.term.printErr(`⚠ NO se puede cerrar este caso: hay indicadores claros de compromiso (${this.caso.id}). Un incidente real quedaría sin respuesta${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
  }

  pista() {
    if (!this.caso.pistas || this.caso.pistas.length === 0) return this.term.printWarn("Este caso no tiene pistas.");
    if (this.pistasUsadas >= this.caso.pistas.length) return this.term.printInfo("Ya has usado todas las pistas.");
    const p = this.caso.pistas[this.pistasUsadas];
    this.pistasUsadas++;
    const pts = this._gratis() ? 0 : PUNTOS.pista;
    addPuntos(pts);
    registrarAccion("pista", `pista ${this.pistasUsadas}`, false, pts);
    this.ui.jimmyDice(JIMMY_PISTA[Math.min(this.pistasUsadas - 1, JIMMY_PISTA.length - 1)]);
    this.term.printWarn(`💡 Pista ${this.pistasUsadas}/${this.caso.pistas.length}${this._gratis() ? ` (gratis en ${this._gratisLabel()})` : ` (-${Math.abs(PUNTOS.pista)} pts)`}: ${p}`);
  }

  // ---------- Tutorial guiado ----------
  // Se llama tras cada comando: valida si el jugador ha completado el paso actual
  chequearTutorial(nombre, args) {
    if (!this.caso || !this.caso.tutorial || this.tutorialFin) return;
    const pasos = this.caso.tutorial.pasos || [];
    const paso = pasos[this.tutorialIdx];
    if (!paso) return;
    const nombreL = String(nombre || "").toLowerCase();
    const esComandoDePaso = pasos.some((p) => p.cmd === nombreL);

    const cumple = paso.tipo === "bloquear"
      ? this.hecho.has(`bloquear:dominio:${paso.objetivo}`)
      : nombreL === paso.cmd;

    if (cumple) {
      this.tutorialIdx++;
      this.term.printOk(paso.ok || "¡Bien hecho!");
      if (this.tutorialIdx >= pasos.length) {
        this.tutorialFin = true;
        this._limpiarTimers();
        this.ui.mostrarFinTutorial();
      } else {
        const siguiente = pasos[this.tutorialIdx];
        if (siguiente.msg) {
          this.ui.jimmyDice(siguiente.msg);
          this.term.print(`⬇ ${siguiente.msg}`, "t-out-dim");
        }
      }
    } else if (esComandoDePaso) {
      const fb = paso.fallback || `Prueba exactamente: ${paso.cmd}${paso.tipo === "bloquear" ? " " + paso.objetivo : ""}`;
      this.term.printWarn(fb);
      this.ui.jimmyDice(fb);
    }
  }

  // ---------- Informe ----------
  _sugerirInforme() {
    if (this.tutorial) return; // el tutorial guiado no necesita informe
    if (this._requisitosCumplidos() && !GAME.casosCompletados.includes(this.caso.id)) {
      this.term.printHi("✔ Has cubierto todos los requisitos de respuesta. Redacta el informe con `informe` para cerrar el caso.");
    }
  }

  _requisitosCumplidos() {
    const c = this.caso;
    const ok = (tipo, lista) => lista.every((target) => this.hecho.has(tipo + ":" + target));
    const bloqOk = ok("bloquear", c.correctas.bloquear);
    const aisOk = ok("aislar", c.correctas.aislar);
    const desOk = ok("deshabilitar", c.correctas.deshabilitar);
    const escOk = !c.correctas.escalar || this.hecho.has("escalar");
    const cerOk = !c.correctas.cerrar || this.hecho.has("cerrar");
    return bloqOk && aisOk && desOk && escOk && cerOk;
  }

  abrirInforme() {
    if (this._bloqueado) return;
    if (this.tutorial) {
      this.term.printInfo("Modo tutorial: aquí no hace falta informe. Sigue los pasos guiados de Jimmy.");
      return;
    }
    this._bloqueado = true;
    this.ui.abrirInforme(this);
  }

  evaluarInforme(texto) {
    this._bloqueado = false;
    const caso = this.caso;
    const t = (texto || "").toLowerCase();

    // Menciones requeridas (IOCs principales + acciones)
    const menciones = [];
    const iocs = [];
    for (const target of caso.correctas.bloquear) {
      const valor = target.slice(target.indexOf(":") + 1);
      iocs.push(valor);
      menciones.push({ texto: valor, ok: t.includes(valor.toLowerCase()) });
    }
    for (const target of caso.correctas.aislar) {
      const valor = target.slice(target.indexOf(":") + 1);
      menciones.push({ texto: `aislar ${valor.toLowerCase()}`, ok: t.includes(valor.toLowerCase()) });
    }
    for (const target of caso.correctas.deshabilitar) {
      const valor = target.slice(target.indexOf(":") + 1);
      menciones.push({ texto: `deshabilitar ${valor.toLowerCase()}`, ok: t.includes(valor.toLowerCase()) });
    }
    if (caso.correctas.escalar) menciones.push({ texto: "escalar", ok: t.includes("escal") || t.includes("csirt") });
    if (caso.correctas.cerrar) menciones.push({ texto: "falso positivo", ok: t.includes("falso") });

    const mencionesOk = menciones.filter((m) => m.ok).length;
    const cobertura = menciones.length ? mencionesOk / menciones.length : 1;

    // Requisitos de acción
    const requisitos = this._requisitosCumplidos();
    const pctAcciones = this._pctAcciones();

    // Tiempo
    const tUsado = GAME.reloj / caso.sla;

    // Calificación
    let rating, mult;
    if (!requisitos) {
      rating = "C";
      mult = 0.6;
    } else if (this.errores === 0 && cobertura >= 0.9 && tUsado <= 0.5 && this.pistasUsadas === 0) {
      rating = "S+";
      mult = 1.25;
    } else if (this.errores <= 1 && cobertura >= 0.8 && tUsado <= 0.75) {
      rating = "S";
      mult = 1.1;
    } else if (this.errores <= 2 && cobertura >= 0.6) {
      rating = "A";
      mult = 1.0;
    } else if (this.errores <= 4 || cobertura >= 0.4) {
      rating = "B";
      mult = 0.85;
    } else {
      rating = "C";
      mult = 0.6;
    }

    const xp = Math.round(caso.xp * mult);
    const resultado = {
      rating,
      xp,
      mult,
      pctAcciones,
      cobertura,
      menciones,
      tUsado,
      errores: this.errores,
      pistas: this.pistasUsadas,
      caso,
    };

    // Aplicar (en laboratorio no se suma XP: práctica libre sin impacto en la carrera)
    if (!this.lab) addXP(xp);
    if (this.lab) {
      GAME.lecciones.push(caso.id);
      this._limpiarTimers();
      this.ui.mostrarResultado(resultado, () =>
        this.ui.mostrarLeccion(caso, () => this.ui.mostrarLaboratorio())
      );
      return;
    }
    GAME.casosResueltos++;
    GAME.casosCompletados.push(caso.id);
    GAME.lecciones.push(caso.id);
    this._limpiarTimers();
    this.ui.mostrarResultado(resultado, () =>
      this.ui.mostrarLeccion(caso, () => this._siguienteCaso())
    );
  }

  _pctAcciones() {
    let total = 0, ok = 0;
    const c = this.caso;
    total += c.correctas.bloquear.length; ok += c.correctas.bloquear.filter((x) => this.hecho.has("bloquear:" + x)).length;
    total += c.correctas.aislar.length; ok += c.correctas.aislar.filter((x) => this.hecho.has("aislar:" + x)).length;
    total += c.correctas.deshabilitar.length; ok += c.correctas.deshabilitar.filter((x) => this.hecho.has("deshabilitar:" + x)).length;
    if (c.correctas.escalar) { total++; if (this.hecho.has("escalar")) ok++; }
    if (c.correctas.cerrar) { total++; if (this.hecho.has("cerrar")) ok++; }
    return total ? ok / total : 1;
  }

  _siguienteCaso() {
    this.ui.siguienteCasoDisponible(GAME.casosCompletados);
  }

  fracasarCaso(motivo) {
    this._limpiarTimers();
    addPuntos(PUNTOS.slaSuperado);
    this.term.printErr("🔴 " + motivo);
    this.ui.fracasarCaso(motivo, () => this._reintentar(), () => this._saltarCaso());
  }

  _reintentar() {
    if (this.caso) this.iniciarCaso(this.caso);
  }

  _saltarCaso() {
    this._limpiarTimers();
    this.ui.siguienteCasoDisponible(GAME.casosCompletados, true);
  }
}
