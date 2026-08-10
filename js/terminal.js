// ============================================================
// terminal.js — Motor de terminal interactiva
// Renderizado de salida, entrada con historial y autocompletado
// ============================================================

export class Terminal {
  /**
   * @param {HTMLElement} el Contenedor de la terminal
   * @param {(cmd: string) => void} onCommand Callback con la línea escrita
   * @param {() => string} promptProvider Devuelve el prompt actual (ej: "analista@acme:~$")
   */
  constructor(el, onCommand, promptProvider) {
    this.el = el;
    this.onCommand = onCommand;
    this.promptProvider = promptProvider;
    this.historial = [];
    this.histIdx = -1;
    this.sugerencias = []; // comandos disponibles para autocompletar
    this._input = null;
    this._promptSpan = null;

    el.addEventListener("keydown", (e) => this._onKey(e));
    el.addEventListener("click", () => this.focus());
  }

  // ---------- Render ----------
  print(texto, cls = "") {
    const div = document.createElement("div");
    div.className = "t-line";
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = texto;
    div.appendChild(span);
    this.el.appendChild(div);
    this._scrollBottom();
    return div;
  }

  printOk(msg)  { this.print("✔ " + msg, "t-ok"); }
  printErr(msg) { this.print("✘ " + msg, "t-out-err"); }
  printWarn(msg){ this.print("⚠ " + msg, "t-out-warn"); }
  printInfo(msg){ this.print("» " + msg, "t-out-info"); }
  printSec(msg) { this.print("▪ " + msg, "t-sec"); }
  printHi(msg)  { this.print(msg, "t-out-hi"); }

  separator(titulo = "") {
    const linea = "─".repeat(52);
    this.print(titulo ? `${linea}\n${titulo}\n${linea}` : linea, "t-out-dim");
  }

  clear() {
    this.el.innerHTML = "";
    this._crearLineaInput();
  }

  _scrollBottom() {
    this.el.scrollTop = this.el.scrollHeight;
  }

  // ---------- Línea de entrada ----------
  _crearLineaInput() {
    // Elimina cualquier línea de input previa
    const prev = this.el.querySelector(".t-input-line");
    if (prev) prev.remove();

    const line = document.createElement("div");
    line.className = "t-line t-input-line";
    line.style.display = "flex";
    line.style.alignItems = "center";
    line.style.gap = "6px";

    this._promptSpan = document.createElement("span");
    this._promptSpan.className = "t-prompt";
    this._promptSpan.innerHTML = this.promptProvider();

    this._input = document.createElement("input");
    this._input.type = "text";
    this._input.autocomplete = "off";
    this._input.autocapitalize = "off";
    this._input.spellcheck = false;
    this._input.style.cssText =
      "flex:1;background:transparent;border:none;outline:none;color:#eafff0;" +
      "font-family:inherit;font-size:inherit;caret-color:#33ff66;min-width:0;";

    line.appendChild(this._promptSpan);
    line.appendChild(this._input);
    this.el.appendChild(line);
    this._scrollBottom();
  }

  focus() {
    if (this._input) this._input.focus();
  }

  setSugerencias(lista) {
    this.sugerencias = lista;
  }

  // ---------- Entrada ----------
  _onKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const valor = this._input.value.trim();
      this._input.value = "";
      this._promptSpan.innerHTML = this.promptProvider();
      const cmdDiv = document.createElement("div");
      cmdDiv.className = "t-line t-cmd-line";
      cmdDiv.style.display = "flex";
      cmdDiv.style.gap = "6px";
      const p = document.createElement("span");
      p.className = "t-prompt";
      p.innerHTML = this.promptProvider();
      const c = document.createElement("span");
      c.className = "t-cmd";
      c.textContent = valor;
      cmdDiv.appendChild(p);
      cmdDiv.appendChild(c);
      // Insertar antes de la línea de input
      this._input.parentElement.parentElement.insertBefore(cmdDiv, this._input.parentElement);
      this._scrollBottom();

      if (valor) {
        this.historial.push(valor);
        this.histIdx = this.historial.length;
        this.onCommand(valor);
      }
      // Tras procesar, volver a crear la línea de input (puede haberse borrado con clear())
      if (!this.el.contains(this._input)) {
        this._crearLineaInput();
      } else {
        this._crearLineaInput();
      }
      this.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.historial.length === 0) return;
      this.histIdx = Math.max(0, this.histIdx - 1);
      this._input.value = this.historial[this.histIdx];
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.histIdx >= this.historial.length - 1) {
        this.histIdx = this.historial.length;
        this._input.value = "";
      } else {
        this.histIdx++;
        this._input.value = this.historial[this.histIdx];
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      this._autocompletar();
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      this.clear();
      return;
    }
  }

  _autocompletar() {
    const valor = this._input.value;
    const partes = valor.split(/\s+/);
    const ultima = partes[partes.length - 1] || "";
    const coincide = this.sugerencias.filter((s) => s.startsWith(ultima));
    if (coincide.length === 0) return;
    if (coincide.length === 1) {
      partes[partes.length - 1] = coincide[0];
      this._input.value = partes.join(" ") + " ";
    } else {
      // Mostrar candidatos
      const common = this._prefijoComun(coincide);
      partes[partes.length - 1] = common;
      this._input.value = partes.join(" ");
      this.printInfo(`Posibles: ${coincide.join("  ")}`);
    }
  }

  _prefijoComun(lista) {
    if (lista.length === 1) return lista[0];
    let pref = lista[0];
    for (const s of lista) {
      while (!s.startsWith(pref)) pref = pref.slice(0, -1);
      if (!pref) return "";
    }
    return pref;
  }
}
