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

const BANNER = [
  "  ██████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ██████╗  █████╗ ██████╗ ",
  " ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔══██╗",
  " ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝███████║██║  ██║",
  " ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║   ██║██╔═══╝ ██╔══██║██║  ██║",
  " ╚██████╗   ██║   ██████╔╝███████╗██║  ██║╚██████╔╝██║     ██║  ██║██████╔╝",
  "  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═════╝ ",
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

ui.setNuevoCasoHandler((caso, opciones) => engine.iniciarCaso(caso, opciones));

// ---- Arranque ----
ui.actualizarPerfil();
term.print(BANNER, "t-out-hi t-banner");
term.print("");
term.print("Simulador de carrera SOC — aprende ciberseguridad defensiva resolviendo incidentes realistas.", "t-out-info");
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
    engine.iniciarCaso(pendiente);
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
    engine.iniciarCaso(siguiente);
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
