// ============================================================
// main.js — Arranque de CYBERGRAD
// ============================================================

import { Terminal } from "./terminal.js";
import { Engine } from "./engine.js";
import { UI } from "./ui.js";
import { crearComandos } from "./commands.js";
import { FX } from "./fx.js";
import { GAME } from "./state.js";
import { CASOS } from "./casos.js";

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
term.print(BANNER, "t-out-hi");
term.print("");
term.print("Simulador de carrera SOC — aprende ciberseguridad defensiva resolviendo incidentes realistas.", "t-out-info");
term.print("© CYBERGRAD · Uso educativo · Personajes y empresas ficticios", "t-out-dim");
term.print("");

ui.onboarding((nombre) => {
  term.printSec(`Bienvenido al turno, ${nombre}.`);
  term.printSec("Estado del SOC: monitorizando 4.200 endpoints · 1 incidente pendiente de asignación.");
  term.print("");
  // Asignar el primer caso no completado
  const siguiente = CASOS.find((c) => !GAME.casosCompletados.includes(c.id)) || CASOS[0];
  engine.iniciarCaso(siguiente);
});
