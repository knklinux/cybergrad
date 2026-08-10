// ============================================================
// fx.js — Motor gráfico del simulador (canvas 2D, sin dependencias)
// Fondo vivo: red de nodos, paquetes de datos, partículas y radar.
// El tema cromático cambia según el tipo de ataque del caso activo.
// ============================================================

// Paletas por tipo de ataque
export const TEMAS = {
  default: { fg: "#33ff66", glow: "rgba(51,255,102,", dim: "rgba(51,255,102,0.12)" },
  phishing: { fg: "#35e0ff", glow: "rgba(53,224,255,", dim: "rgba(53,224,255,0.12)" },
  bec: { fg: "#ffb000", glow: "rgba(255,176,0,", dim: "rgba(255,176,0,0.12)" },
  calm: { fg: "#4dffb8", glow: "rgba(77,255,184,", dim: "rgba(77,255,184,0.10)" },
  ransomware: { fg: "#ff4444", glow: "rgba(255,68,68,", dim: "rgba(255,68,68,0.12)" },
  bruteforce: { fg: "#ff8c42", glow: "rgba(255,140,66,", dim: "rgba(255,140,66,0.12)" },
  dns: { fg: "#ff6ad5", glow: "rgba(255,106,213,", dim: "rgba(255,106,213,0.12)" },
};

export function temaParaCaso(caso) {
  if (!caso) return TEMAS.default;
  const id = caso.id || "";
  if (id.includes("ransomware")) return TEMAS.ransomware;
  if (id.includes("bruteforce")) return TEMAS.bruteforce;
  if (id.includes("dns")) return TEMAS.dns;
  if (id.includes("bec")) return TEMAS.bec;
  if (id.includes("fp-") || id.includes("falso")) return TEMAS.calm;
  if (id.includes("phishing")) return TEMAS.phishing;
  return TEMAS.default;
}

export class FX {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.tema = TEMAS.default;
    this.nodos = [];
    this.paquetes = [];
    this.particulas = [];
    this.pulso = 0;          // pico de intensidad al llegar alertas
    this._raf = null;
    this._corriendo = false;
    this._onResize = () => this._redimensionar();
    window.addEventListener("resize", this._onResize);
    this._redimensionar();
    this._inicializarNodos();
  }

  _redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = window.innerWidth * dpr;
    this.cv.height = window.innerHeight * dpr;
    this.cv.style.width = window.innerWidth + "px";
    this.cv.style.height = window.innerHeight + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _inicializarNodos() {
    const n = Math.min(70, Math.max(40, Math.floor(window.innerWidth / 24)));
    this.nodos = [];
    for (let i = 0; i < n; i++) {
      this.nodos.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
      });
    }
  }

  setTema(tema) {
    this.tema = tema || TEMAS.default;
  }

  // Pequeño estallido visual (al llegar una alerta)
  pulsoAlerta(intensidad = 1) {
    this.pulso = Math.max(this.pulso, intensidad);
    for (let i = 0; i < 14 * intensidad; i++) {
      this.particulas.push({
        x: Math.random() * this.cv.width,
        y: Math.random() * this.cv.height,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.5) * 1.4 - 0.4,
        vida: 60 + Math.random() * 40,
        max: 100,
      });
    }
  }

  start() {
    if (this._corriendo) return;
    this._corriendo = true;
    const loop = () => {
      if (!this._corriendo) return;
      this._dibujar();
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this._corriendo = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _dibujar() {
    const { ctx, cv, tema } = this;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);

    const t = performance.now() / 1000;

    // --- Red de nodos ---
    const distMax = 140;
    ctx.lineWidth = 1;
    for (let i = 0; i < this.nodos.length; i++) {
      const n = this.nodos[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;
    }
    // conexiones
    for (let i = 0; i < this.nodos.length; i++) {
      const a = this.nodos[i];
      for (let j = i + 1; j < this.nodos.length; j++) {
        const b = this.nodos[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < distMax * distMax) {
          const alpha = (1 - Math.sqrt(d2) / distMax) * 0.35;
          ctx.strokeStyle = tema.glow + alpha + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // nodos
    for (const n of this.nodos) {
      ctx.fillStyle = tema.glow + "0.9)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Paquetes de datos viajando ---
    if (this.paquetes.length < 8 && Math.random() < 0.08) {
      const a = this.nodos[Math.floor(Math.random() * this.nodos.length)];
      const b = this.nodos[Math.floor(Math.random() * this.nodos.length)];
      if (a !== b) this.paquetes.push({ a, b, p: 0, vel: 0.004 + Math.random() * 0.006, tam: Math.random() * 2 + 1 });
    }
    this.paquetes = this.paquetes.filter((pk) => pk.p <= 1);
    for (const pk of this.paquetes) {
      pk.p += pk.vel;
      const x = pk.a.x + (pk.b.x - pk.a.x) * pk.p;
      const y = pk.a.y + (pk.b.y - pk.a.y) * pk.p;
      ctx.fillStyle = tema.glow + "1)";
      ctx.shadowColor = tema.fg;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, pk.tam, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // --- Partículas de alerta ---
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    for (const p of this.particulas) {
      p.x += p.vx; p.y += p.vy; p.vida--;
      const alpha = p.vida / p.max;
      ctx.fillStyle = tema.glow + alpha + ")";
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    if (this.pulso > 0) this.pulso *= 0.94;

    // --- Radar inferior izquierdo ---
    const rx = 70, ry = h - 60, rr = 44;
    ctx.strokeStyle = tema.glow + "0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, rr * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry);
    ctx.moveTo(rx, ry - rr); ctx.lineTo(rx, ry + rr);
    ctx.stroke();
    // barrido
    const ang = t * 1.6;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
    grad.addColorStop(0, tema.glow + "0.5)");
    grad.addColorStop(1, tema.glow + "0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.arc(rx, ry, rr, ang, ang + 0.9);
    ctx.closePath();
    ctx.fill();
    // blips
    for (let i = 0; i < 5; i++) {
      const ba = Math.sin(t * 0.8 + i * 2.1) * Math.PI * 2;
      const br = (Math.sin(t * 1.3 + i * 3.7) * 0.5 + 0.5) * rr * 0.8 + 6;
      const bx = rx + Math.cos(ba) * br, by = ry + Math.sin(ba) * br;
      ctx.fillStyle = tema.glow + "0.8)";
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
