// ============================================================
// engine.js — Motor del juego
// Gestión del caso activo, acciones del analista, SLA, eventos
// temporizados, puntuación y evaluación del informe.
// ============================================================

import { GAME, addXP, addRTXP, addPuntos, registrarAccion, resetAccionesCaso } from "./state.js";
import { numCaso } from "./casos.js";
import { numCasoRT, siguienteCasoRT } from "./rt-casos.js";

// Cómo se construye la clave en `hecho` y la etiqueta de cada tipo de objetivo
const TIPOS_OBJETIVO = {
  // Azul: acciones de respuesta (clave: "tipo:target")
  bloquear: { clave: (t) => "bloquear:" + t, etiqueta: (v) => `Bloquear ${v}` },
  aislar: { clave: (t) => "aislar:" + t, etiqueta: (v) => `Aislar ${v}` },
  deshabilitar: { clave: (t) => "deshabilitar:" + t, etiqueta: (v) => `Deshabilitar ${v}` },
  // Rojo: objetivos de pentest (clave: "objetivo:tipo:target" — el tipo evita colisiones)
  recon: { clave: (t, tipo) => `objetivo:${tipo}:${t}`, etiqueta: (v) => `Reconocer ${v}` },
  acceso: { clave: (t, tipo) => `objetivo:${tipo}:${t}`, etiqueta: (v) => `Acceso ${v}` },
  escalada: { clave: (t, tipo) => `objetivo:${tipo}:${t}`, etiqueta: (v) => `Escalar privilegios ${v}` },
  exfiltracion: { clave: (t, tipo) => `objetivo:${tipo}:${t}`, etiqueta: (v) => `Exfiltrar ${v}` },
};
import { md5, sha256 } from "./hash.js";
import { temaParaCaso } from "./fx.js";
import { JIMMY_PISTA } from "./jimmy.js";
import { guardar } from "./save.js";
import { evaluarLogros } from "./logros.js";
import { sonido } from "./sonido.js";

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
    this.becario = false;         // modo becario (práctica guiada paso a paso)
    this.reto = false;            // reto diario (indicadores distintos por semilla)
    this.examen = false;          // modo examen (certificación, sin pistas)
    this._modoPrevio = null;      // campaña del jugador antes de reto/examen (se restaura)
    this._opciones = {};          // opciones del caso en curso (para reintentar)
    this.tutorialIdx = 0;
    this.tutorialFin = false;
  }

  _gratis() { return this.lab || this.tutorial || this.becario; }
  _gratisLabel() { return this.lab ? "laboratorio" : this.becario ? "becario" : "tutorial"; }
  _guiado() { return this.tutorial || this.becario; }
  // Modos especiales (reto diario / examen): SLA real pero sin tocar la carrera
  _especial() { return this.reto || this.examen; }
  _especialLabel() { return this.reto ? "reto diario" : "examen"; }
  // Sin puntos en práctica libre Y en modos especiales (la carrera no se ensucia)
  _sinPuntos() { return this._gratis() || this._especial(); }
  // Sufijo de mensaje: sin penalización en modos de práctica
  _sinPenalizacion() {
    if (this.lab) return " (sin penalización: laboratorio)";
    if (this._guiado()) return " (sin penalización: " + this._gratisLabel() + ")";
    if (this._especial()) return " (sin penalización: " + this._especialLabel() + ")";
    return "";
  }
  // Nombre del paso guiado según el modo
  _pasosGuiados() {
    if (!this.caso) return [];
    return this.caso.becario?.pasos || this.caso.tutorial?.pasos || [];
  }

  // ---------- Ciclo de vida ----------
  iniciarCaso(caso, opciones = {}) {
    this.caso = caso;
    this.modoRT = caso.modo === "rt";
    // Reto/examen pueden usar casos de la otra campaña: se recuerda la
    // campaña real del jugador para restaurarla al terminar.
    if (opciones.reto || opciones.examen) {
      if (!this._especial()) this._modoPrevio = GAME.modo;
    }
    GAME.modo = this.modoRT ? "rt" : "soc";
    this.lab = !!opciones.lab;
    this.tutorial = !!opciones.tutorial;
    this.becario = !!opciones.becario;
    this.reto = !!opciones.reto;
    this.examen = !!opciones.examen;
    this._opciones = { ...opciones };
    this.tutorialIdx = 0;
    this.tutorialFin = false;
    GAME.casoActual = caso.id;
    GAME.reloj = 0;
    GAME.casoSinPistas = false;
    resetAccionesCaso();
    this.hecho = new Set();
    this.errores = 0;
    this.pistasUsadas = 0;
    this._bloqueado = false;
    this._limpiarTimers();
    this.vtRuntime = {};
    this.ui.setTemaCaso(temaParaCaso(caso));
    this.ui.setModoLab(this.lab, this.tutorial, this.becario);

    // Splash de incidente → briefing de Jimmy → arranque
    this.ui.mostrarSplash(caso, () => {
      this.ui.mostrarBriefing(caso, () => this._arrancarCaso());
    });
  }

  _arrancarCaso() {
    const caso = this.caso;
    this.term.clear();
    const num = this.modoRT ? numCasoRT(caso.id) : numCaso(caso.id);
    const cabecera = this.examen ? "E X A M E N"
      : this.reto ? "R E T O  D I A R I O"
      : this.modoRT ? "P E N T E S T" : "C A S O";
    const sufijo = this._especial() ? `  ·  ${caso.titulo}` : `  ${num} / 6`;
    this.term.separator(cabecera + sufijo);
    this.term.printHi(`📨 ${this.examen ? "🎓 EXAMEN: " : this.reto ? "🔥 RETO DIARIO: " : "Nuevo caso asignado: "}${caso.titulo}`);
    this.term.printInfo(`Severidad: ${caso.severidad}  |  SLA: ${caso.sla}s  |  XP posible: ${caso.xp}`);
    this.term.print("");
    if (this.reto) {
      this.term.print("🔥 Mismo incidente, indicadores distintos cada día. Sin pistas: aquí se prueba tu criterio.", "t-out-warn");
    } else if (this.examen) {
      this.term.print("🎓 Examen de certificación: sin pistas, sin ayuda. Aprobar (A o mejor) desbloquea tu certificado.", "t-out-warn");
    } else {
      this.term.print(this.modoRT
        ? "Usa `ver_caso` para el briefing y `nmap` / `gobuster` para empezar."
        : "Usa `ver_caso` para leer el briefing y `mail` / `alertas` para empezar.", "t-out-dim");
    }
    this.term.print("`ayuda` muestra todos los comandos. ¡A por ello, " + (this.modoRT ? "pentester" : "analista") + "!", "t-out-dim");
    this.term.print("");

    this.ui.mostrarCaso(caso, this.hecho);
    this.ui.actualizarPerfil();
    this.ui.feed(`Caso #${caso.id} asignado (${caso.severidad})${this.lab ? " · LAB" : this.tutorial ? " · TUTORIAL" : this.becario ? " · BECARIO" : this.reto ? " · RETO DIARIO" : this.examen ? " · EXAMEN" : this.modoRT ? " · PENTEST" : ""}`, "new-msg");
    if (this.reto) {
      this.ui.jimmyDice("Reto diario: los indicadores cambian cada día. Demuestra que entiendes el patrón, no que memorizas.");
    } else if (this.examen) {
      this.ui.jimmyDice("Examen: sin pistas y con el reloj en contra. Si apruebas con A o mejor, te ganas el certificado.");
    } else if (this.lab) {
      this.ui.jimmyDice("Modo Laboratorio activo: sin SLA, sin penalizaciones, pistas gratis. Practica con fluidez.");
    } else if (this.becario) {
      this.ui.jimmyDice("Modo Becario: te explico cada paso y el porqué. Sin prisa, sin penalizaciones. Sigue la guía.");
    } else if (this.tutorial) {
      this.ui.jimmyDice("Modo tutorial: te guío paso a paso. Empieza escribiendo `mail`.");
    } else if (this.modoRT) {
      this.ui.jimmyDice("Contrato de pentest activo. Entra antes de que lo haga un atacante real.");
    }

    // Panel de guía (tutorial / becario)
    if (this._guiado()) {
      const pasos = this._pasosGuiados();
      if (pasos.length) this.ui.mostrarGuia(pasos[0], 0, pasos.length, this._gratisLabel());
    } else {
      this.ui.ocultarGuia();
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
    if (this._gratis()) {
      // En laboratorio/tutorial/becario el SLA se muestra pero no hace fallar el caso
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
      sonido.alerta();
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
      sonido.ok();
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._sinPuntos() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("bloquear", `${obj.tipo}:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ ¡Cuidado! ${obj.valor} es un indicador LEGÍTIMO o no relacionado. Bloquearlo dañaría la operación${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      sonido.err();
      this.ui.mostrarCaso(this.caso, this.hecho);
      return;
    }
    const pts = this._sinPuntos() ? 0 : PUNTOS.accionNoProcede;
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
      sonido.ok();
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._sinPuntos() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("aislar", `host:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ Aislar ${obj.valor} no está justificado por las evidencias y cortaría servicios legítimos${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      sonido.err();
      return;
    }
    const pts = this._sinPuntos() ? 0 : PUNTOS.accionNoProcede;
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
      sonido.ok();
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    if (incorrecta) {
      this.errores++;
      const pts = this._sinPuntos() ? 0 : PUNTOS.accionIncorrecta;
      addPuntos(pts);
      registrarAccion("deshabilitar", `usuario:${obj.valor}`, false, pts);
      this.term.printErr(`⚠ ${obj.valor} no es la cuenta comprometida. Deshabilitarla interrumpiría la operación${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      sonido.err();
      return;
    }
    const pts = this._sinPuntos() ? 0 : PUNTOS.accionNoProcede;
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
      sonido.ok();
      this.ui.mostrarCaso(this.caso, this.hecho);
      this._sugerirInforme();
      return;
    }
    this.errores++;
    const pts = this._sinPuntos() ? 0 : -20;
    addPuntos(pts);
    registrarAccion("escalar", "a CSIRT / Nivel 2", false, pts);
    this.term.printErr(`⚠ Escalar sin necesidad satura al CSIRT y cuesta confianza. Revisa el contexto: ¿hay indicadores reales?${this._sinPenalizacion() || " (-20 pts)"}.`);
    sonido.err();
  }

  cerrarCaso(razon) {
    if (this.caso.correctas.cerrar) {
      if (this.hecho.has("cerrar")) return this.term.printInfo("Caso ya cerrado. Redacta el informe con `informe`.");
      this.hecho.add("cerrar");
      addPuntos(PUNTOS.cerrarCorrecto);
      registrarAccion("cerrar_caso", razon || "falso positivo justificado", true, PUNTOS.cerrarCorrecto);
      this.term.printOk(`Caso cerrado como FALSO POSITIVO${razon ? `: ${razon}` : ""}. Excelente triaje: has evitado interrumpir una operación legítima.`);
      sonido.ok();
      this.term.printInfo("Completa la documentación con `informe`.");
      this.ui.mostrarCaso(this.caso, this.hecho);
      return;
    }
    this.errores++;
    const pts = this._gratis() ? 0 : PUNTOS.accionIncorrecta;
    addPuntos(pts);
    registrarAccion("cerrar_caso", razon || "sin justificación", false, pts);      this.term.printErr(`⚠ NO se puede cerrar este caso: hay indicadores claros de compromiso (${this.caso.id}). Un incidente real quedaría sin respuesta${this._sinPenalizacion() || ` (-${Math.abs(PUNTOS.accionIncorrecta)} pts)`}.`);
      sonido.err();
  }

  pista() {
    if (this._especial()) {
      return this.term.printErr("No hay pistas en el " + this._especialLabel() + ". Este modo pone a prueba tu criterio, no tu memoria.");
    }
    if (!this.caso.pistas || this.caso.pistas.length === 0) return this.term.printWarn("Este caso no tiene pistas.");
    if (this.pistasUsadas >= this.caso.pistas.length) return this.term.printInfo("Ya has usado todas las pistas.");
    const p = this.caso.pistas[this.pistasUsadas];
    this.pistasUsadas++;
    const pts = this._sinPuntos() ? 0 : PUNTOS.pista;
    addPuntos(pts);
    registrarAccion("pista", `pista ${this.pistasUsadas}`, false, pts);
    this.ui.jimmyDice(JIMMY_PISTA[Math.min(this.pistasUsadas - 1, JIMMY_PISTA.length - 1)]);
    this.term.printWarn(`💡 Pista ${this.pistasUsadas}/${this.caso.pistas.length}${this._gratis() ? ` (gratis en ${this._gratisLabel()})` : ` (-${Math.abs(PUNTOS.pista)} pts)`}: ${p}`);
  }

  // ---------- Práctica guiada (tutorial / becario) ----------
  // Se llama tras cada comando: valida si el jugador ha completado el paso actual
  chequearTutorial(nombre, _args) {
    if (!this.caso || !this._guiado() || this.tutorialFin) return;
    const pasos = this._pasosGuiados();
    const paso = pasos[this.tutorialIdx];
    if (!paso) return;
    const nombreL = String(nombre || "").toLowerCase();
    const esComandoDePaso = pasos.some((p) => p.cmd === nombreL);

    const cumple = this._pasoCumplido(paso, nombreL);

    if (cumple) {
      this.tutorialIdx++;
      this.term.printOk(paso.ok || "¡Bien hecho!");
      if (this.tutorialIdx >= pasos.length) {
        this.tutorialFin = true;
        this._limpiarTimers();
        this.ui.ocultarGuia();
        if (this.becario) {
          // Registra la práctica superada (persistida con el guardado)
          if (this.caso?.id && !GAME.becarioCompletadas.includes(this.caso.id)) {
            GAME.becarioCompletadas.push(this.caso.id);
            this._notificarLogros();
            guardar();
          }
          this.ui.mostrarFinBecario();
        } else this.ui.mostrarFinTutorial();
      } else {
        const siguiente = pasos[this.tutorialIdx];
        this.ui.mostrarGuia(siguiente, this.tutorialIdx, pasos.length, this._gratisLabel());
        if (siguiente.msg) {
          this.ui.jimmyDice(siguiente.msg);
          this.term.print(`⬇ ${siguiente.msg}`, "t-out-dim");
        }
      }
    } else if (esComandoDePaso) {
      const fb = paso.fallback || `Prueba exactamente: ${paso.cmd}${paso.tipo !== "comando" ? " " + paso.objetivo : ""}`;
      this.term.printWarn(fb);
      this.ui.jimmyDice(fb);
    }
  }

  // ¿Se ha completado el paso actual? (tipo comando = el nombre coincide;
  // acciones = la acción correcta ya está en `hecho`)
  _pasoCumplido(paso, nombreL) {
    switch (paso.tipo) {
      case "bloquear":
      case "aislar":
      case "deshabilitar": {
        // Las claves de `hecho` preservan mayúsculas (ej: aislar:host:HOST-104)
        const prefijo = paso.tipo + ":";
        const obj = String(paso.objetivo || "").toLowerCase();
        for (const k of this.hecho) {
          if (k.startsWith(prefijo) && k.toLowerCase().endsWith(":" + obj)) return true;
        }
        return false;
      }
      case "cerrar": return this.hecho.has("cerrar");
      case "escalar": return this.hecho.has("escalar");
      // Los comandos que completan objetivos (nmap, gobuster, hydra, ssh, exfiltrar...)
      // se consideran cumplidos si el comando se ejecutó (nombre coincide).
      default: return nombreL === paso.cmd;
    }
  }

  // ---------- Objetivos red team ----------
  // Un comando ofensivo exitoso marca un objetivo cumplido (recon, acceso...)
  completar(tipo, valor) {
    const c = this.caso?.correctas;
    if (!c || !c[tipo]) return false;
    const valorL = String(valor).toLowerCase();
    const canon = c[tipo].find((x) => x.slice(x.indexOf(":") + 1).toLowerCase() === valorL);
    if (!canon) return false;
    const clave = this._claveObjetivo(tipo, canon);
    if (this.hecho.has(clave)) return true;
    this.hecho.add(clave);
    const pts = this._sinPuntos() ? 0 : 25;
    addPuntos(pts);
    registrarAccion(tipo, canon, true, pts);
    this.term.printOk(this._etiquetaObjetivo(tipo, canon));
    sonido.ok();
    this.ui.mostrarCaso(this.caso, this.hecho);
    this._sugerirInforme();
    return true;
  }

  _claveObjetivo(tipo, target) {
    const T = TIPOS_OBJETIVO[tipo];
    return T ? T.clave(target, tipo) : `objetivo:${tipo}:${target}`;
  }

  _etiquetaObjetivo(tipo, canon) {
    const valor = canon.slice(canon.indexOf(":") + 1);
    const T = TIPOS_OBJETIVO[tipo];
    return T ? T.etiqueta(valor) : `${tipo}: ${valor}`;
  }

  // ---------- Logros ----------
  // Evalúa los logros pendientes, notifica los nuevos y refresca el HUD
  _notificarLogros() {
    const nuevos = evaluarLogros();
    for (const l of nuevos) {
      this.ui.notificar("🏅 NUEVO LOGRO", `${l.icono} ${l.nombre} — ${l.desc}`, "logro");
    }
    if (nuevos.length && this.ui.actualizarPerfil) this.ui.actualizarPerfil();
    return nuevos;
  }

  // ---------- Informe ----------
  _sugerirInforme() {
    if (this._guiado()) return; // tutorial/becario guiado no necesita informe
    const completados = this.modoRT ? GAME.rtCasosCompletados : GAME.casosCompletados;
    if (this._requisitosCumplidos() && !completados.includes(this.caso.id)) {
      this.term.printHi("✔ Has cubierto todos los requisitos. Redacta el informe con `informe` para cerrar el caso.");
    }
  }

  _requisitosCumplidos() {
    const c = this.caso.correctas || {};
    let ok = true;
    for (const [tipo, lista] of Object.entries(c)) {
      if (tipo === "escalar" || tipo === "cerrar") continue;
      if (!lista || lista.length === 0) continue;
      for (const target of lista) {
        if (!this.hecho.has(this._claveObjetivo(tipo, target))) ok = false;
      }
    }
    if (c.escalar && !this.hecho.has("escalar")) ok = false;
    if (c.cerrar && !this.hecho.has("cerrar")) ok = false;
    return ok;
  }

  abrirInforme() {
    if (this._bloqueado) return;
    if (this._guiado()) {
      this.term.printInfo("Modo " + this._gratisLabel() + ": aquí no hace falta informe. Sigue los pasos guiados de Jimmy.");
      return;
    }
    this._bloqueado = true;
    this.ui.abrirInforme(this);
  }

  evaluarInforme(texto) {
    this._bloqueado = false;
    const caso = this.caso;
    const t = (texto || "").toLowerCase();

    // Menciones requeridas (IOCs/objetivos + acciones)
    const menciones = [];
    const iocs = [];
    for (const [tipo, lista] of Object.entries(caso.correctas || {})) {
      if (tipo === "escalar") { menciones.push({ texto: "escalar", ok: t.includes("escal") || t.includes("csirt") }); continue; }
      if (tipo === "cerrar") { menciones.push({ texto: "falso positivo", ok: t.includes("falso") }); continue; }
      if (!lista) continue;
      for (const target of lista) {
        const valor = target.slice(target.indexOf(":") + 1);
        iocs.push(valor);
        menciones.push({ texto: valor, ok: t.includes(valor.toLowerCase()) });
      }
    }

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

    // Registro de hitos para logros (mejor calificación y caso sin pistas).
    // En reto/examen NO se tocan los hitos de la carrera: son certificaciones aparte.
    const esEspecial = this._especial();
    const ORDEN_RATING = ["C", "B", "A", "S", "S+"];
    if (!esEspecial) {
      if (ORDEN_RATING.indexOf(rating) > ORDEN_RATING.indexOf(GAME.mejorRating || "C")) {
        GAME.mejorRating = rating;
      }
      GAME.casoSinPistas = this.pistasUsadas === 0;
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
      reto: this.reto,
      examen: this.examen,
    };

    // Acumular estadísticas globales
    this._acumularStats(rating);

    // ---- Modos especiales (reto diario / examen): no tocan la carrera ----
    if (esEspecial) {
      const fecha = this.reto ? (caso.retoSemilla || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
      if (!GAME.estadisticas) GAME.estadisticas = {};
      if (this.reto) {
        GAME.estadisticas.reto = { fecha, casoId: caso.retoBaseId || caso.id, rating, segundos: GAME.reloj };
      } else {
        if (!Array.isArray(GAME.estadisticas.examenes)) GAME.estadisticas.examenes = [];
        GAME.estadisticas.examenes.push({ fecha, casoId: caso.id, rating, segundos: GAME.reloj });
        const mejor = Math.max(
          ORDEN_RATING.indexOf(GAME.mejorExamen || "C"),
          ORDEN_RATING.indexOf(rating)
        );
        GAME.mejorExamen = ORDEN_RATING[mejor];
      }
      const modoEspecial = this.reto ? "reto" : "examen";
      this._restaurarModo();
      this._limpiarTimers();
      guardar();
      sonido.exito();
      this.ui.mostrarResultado(resultado, () =>
        this.ui.mostrarLeccion(caso, () => this.ui.mostrarFinModoEspecial(modoEspecial))
      );
      return;
    }

    // Aplicar (en laboratorio no se suma XP: práctica libre sin impacto en la carrera)
    if (!this.lab) {
      if (this.modoRT) addRTXP(xp); else addXP(xp);
    }
    if (this.lab) {
      GAME.lecciones.push(caso.id);
      this._limpiarTimers();
      guardar();
      sonido.exito();
      this.ui.mostrarResultado(resultado, () =>
        this.ui.mostrarLeccion(caso, () => this.ui.mostrarLaboratorio())
      );
      return;
    }
    if (this.modoRT) {
      GAME.rtCasosResueltos++;
      GAME.rtCasosCompletados.push(caso.id);
      GAME.rtLecciones.push(caso.id);
    } else {
      GAME.casosResueltos++;
      GAME.casosCompletados.push(caso.id);
      GAME.lecciones.push(caso.id);
    }
    this._limpiarTimers();
    this._notificarLogros();
    guardar();
    sonido.exito();
    this.ui.mostrarResultado(resultado, () =>
      this.ui.mostrarLeccion(caso, () => this._siguienteCaso())
    );
  }

  // Restaura la campaña real del jugador tras un reto/examen (que pueden
  // usar casos de la otra campaña) y limpia los flags de modo especial.
  _restaurarModo() {
    if (this._modoPrevio) {
      GAME.modo = this._modoPrevio;
      this._modoPrevio = null;
    }
    this.reto = false;
    this.examen = false;
  }

  _pctAcciones() {
    const c = this.caso.correctas || {};
    let total = 0, ok = 0;
    for (const [tipo, lista] of Object.entries(c)) {
      if (tipo === "escalar" || tipo === "cerrar") {
        if (lista) { total++; if (this.hecho.has(tipo)) ok++; }
        continue;
      }
      if (!lista) continue;
      for (const target of lista) {
        total++;
        if (this.hecho.has(this._claveObjetivo(tipo, target))) ok++;
      }
    }
    return total ? ok / total : 1;
  }

  _siguienteCaso() {
    if (this.modoRT) {
      const siguiente = siguienteCasoRT(GAME.rtCasosCompletados);
      if (!siguiente) {
        this.ui.mostrarFinRT();
        return;
      }
      this.ui.siguienteCasoRTDisponible(siguiente, GAME.rtCasosCompletados);
      return;
    }
    this.ui.siguienteCasoDisponible(GAME.casosCompletados);
  }

  _acumularStats(rating) {
    if (!GAME.estadisticas) {
      GAME.estadisticas = { tiempoJugado: 0, accionesOk: 0, accionesErr: 0, pistasUsadas: 0, ratings: [] };
    }
    GAME.estadisticas.tiempoJugado += GAME.reloj || 0;
    GAME.estadisticas.accionesOk += GAME.acciones.filter((a) => a.ok).length;
    GAME.estadisticas.accionesErr += this.errores || 0;
    GAME.estadisticas.pistasUsadas += this.pistasUsadas || 0;
    if (rating) {
      GAME.estadisticas.ratings.push({ casoId: this.caso?.id, rating, modo: this.modoRT ? "rt" : "soc" });
    }
  }

  fracasarCaso(motivo) {
    this._acumularStats(null);
    this._limpiarTimers();
    sonido.err();
    // En modos especiales el fallo no penaliza la carrera
    if (!this._sinPuntos()) addPuntos(PUNTOS.slaSuperado);
    this.term.printErr("🔴 " + motivo);
    if (this._especial()) {
      const modo = this.reto ? "reto" : "examen";
      this._restaurarModo();
      guardar();
      this.ui.mostrarFinModoEspecial(modo, true);
      return;
    }
    guardar();
    this.ui.fracasarCaso(motivo, () => this._reintentar(), () => this._saltarCaso());
  }

  _reintentar() {
    if (this.caso) this.iniciarCaso(this.caso, this._opciones);
  }

  _saltarCaso() {
    this._limpiarTimers();
    if (this.modoRT) {
      const siguiente = siguienteCasoRT(GAME.rtCasosCompletados);
      if (siguiente) this.ui.siguienteCasoRTDisponible(siguiente, GAME.rtCasosCompletados, true);
      else this.ui.mostrarFinRT();
      return;
    }
    this.ui.siguienteCasoDisponible(GAME.casosCompletados, true);
  }
}
