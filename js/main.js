// ============================================================
// main.js — Arranque de CYBERGRAD
// ============================================================

import { Terminal } from "./terminal.js";
import { Engine } from "./engine.js";
import { UI } from "./ui.js";
import { crearComandos } from "./commands.js";
import { FX } from "./fx.js";
import { GAME } from "./state.js";
import { CASOS, siguienteCaso } from "./casos.js";
import { siguienteCasoRT } from "./rt-casos.js";
import { listarGuardados, cargar, nuevaPartida } from "./save.js";
import { sonido } from "./sonido.js";

const BANNER = [
  "  ██████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ██████╗  █████╗ ██████╗ ",
  " ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔══██╗",
  " ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║  ███╗██████╔╝███████║██║  ██║",
  " ██║   ██  ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║   ██║██╔══██╗██╔══██║██║  ██║",
  " ╚██████╔╝  ██║   ██████╔╝███████╗██║  ██║╚██████╔╝██║  ██║██║  ██║██████╔╝",
  "  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ",
].join("\n");

const term = new Terminal(
  document.getElementById("terminal"),
  (cmd) => procesar(cmd),
  () => '<span class="user">analista</span>@<span class="path">acme</span>:~$ '
);

// Motor gráfico (fondo animado)
const fx = new FX(document.getElementById("bg-fx"));
fx.start();

const ui = new UI(term, fx);
const engine = new Engine({ term, ui });

// El AudioContext se crea en el primer gesto del usuario (requisito de
// los navegadores para reproducir audio sin interacción previa).
document.addEventListener("pointerdown", () => sonido.iniciar(), { once: true });
document.addEventListener("keydown", () => sonido.iniciar(), { once: true });

const { cmds, lista } = crearComandos({ engine, term, ui });
term.setSugerencias(lista);

function procesar(linea) {
  const [nombre, ...resto] = linea.split(/\s+/);
  const args = resto.join(" ").trim();
  const fn = cmds[nombre?.toLowerCase()];
  if (!fn) {
    term.printErr(`Comando no reconocido: '${nombre}'. Escribe 'ayuda' para ver la lista.`);
    return;
  }
  try {
    fn(args);
    engine.chequearTutorial(nombre, args);
  } catch (e) {
    term.printErr("Error interno del terminal: " + e.message);
    console.error(e);
  }
}

// Hook de test (`?pivotEn=N`): comprime el tiempo del ataque adaptativo para
// que el E2E del CI pueda ver el pivote sin esperar minutos reales. Invisible
// para el jugador normal (sin el parámetro, el pivot usa su `en` del caso).
// Se aplica en TODAS las vías de entrada (partida nueva, continuar y paneles).
const PIVOT_EN_TEST = parseInt(new URLSearchParams(location.search).get("pivotEn") || "", 10);
const conHookPivot = (caso) => {
  if (Number.isFinite(PIVOT_EN_TEST) && caso && caso.pivot) caso.pivot.en = Math.max(1, PIVOT_EN_TEST);
  return caso;
};
ui.setNuevoCasoHandler((caso, opciones) => engine.iniciarCaso(conHookPivot(caso), opciones));

// ---- Arranque ----
ui.actualizarPerfil();
term.print(BANNER, "t-out-hi t-banner");
term.print("");
term.print("Simulador de carrera SOC + Red Team — defiende como analista y ataca como pentester.", "t-out-info");
term.print("© CYBERGRAD · Uso educativo · Personajes y empresas ficticios", "t-out-dim");
term.print("");

// Si hay partidas guardadas se muestra el selector (continuar / empezar de cero);
// si no, se entra directo al onboarding de una partida nueva.
const guardados = listarGuardados();
if (guardados.length > 0) {
  ui.mostrarSelectorPartida(guardados, {
    onContinuar: (slot) => {
      cargar(slot);
      continuarPartida();
    },
    onNueva: () => {
      nuevaPartida();
      empezarNueva();
    },
  });
} else {
  empezarNueva();
}

// Retoma una partida existente: sin onboarding, con bienvenida y el caso pendiente
function continuarPartida() {
  term.printSec(`Bienvenido de vuelta, ${GAME.nombre}. Progreso restaurado.`);
  term.printInfo(`${GAME.xp} XP (SOC) · ${GAME.rtXp} XP (Red Team) · ${GAME.puntos} puntos · ${GAME.casosResueltos + GAME.rtCasosResueltos} casos resueltos`);
  term.print("");
  const pendiente = casoInicialCargado();
  if (pendiente) {
    engine.iniciarCaso(conHookPivot(pendiente));
  } else {
    term.print("Ambas campañas completadas. Abre Carrera para repasar tu trayectoria o reiniciar el progreso.", "t-out-dim");
    ui.mostrarCarrera();
  }
}

// Partida nueva desde cero: onboarding y primer caso
function empezarNueva() {
  ui.onboarding((nombre) => {
    term.printSec(`Bienvenido al turno, ${nombre}.`);
    term.printSec("Estado del SOC: monitorizando 4.200 endpoints · 1 incidente pendiente de asignación.");
    term.print("");
    // Asignar el primer caso no completado
    const siguiente = CASOS.find((c) => !GAME.casosCompletados.includes(c.id)) || CASOS[0];
    engine.iniciarCaso(conHookPivot(siguiente));
  });
}

// Caso pendiente al cargar una partida: prioriza la campaña activa y
// cae a la otra si ya está completa
function casoInicialCargado() {
  const orden = GAME.modo === "rt" ? ["rt", "soc"] : ["soc", "rt"];
  for (const m of orden) {
    if (m === "rt") {
      const sig = siguienteCasoRT(GAME.rtCasosCompletados);
      if (sig) return sig;
    } else {
      const sig = siguienteCaso(GAME.casosCompletados);
      if (sig) return sig;
    }
  }
  return null;
}
