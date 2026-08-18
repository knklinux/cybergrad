// ============================================================
// helpers.js — Utilidades para construir casos realistas
// ============================================================

// Codifica un comando PowerShell como lo haría un atacante:
// base64 de la cadena en UTF-16LE (formato -enc de PowerShell)
export function psEnc(cmd) {
  const bytes = [];
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd.charCodeAt(i);
    bytes.push(c & 0xff, (c >> 8) & 0xff);
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Decodifica una cadena -enc de PowerShell (para el comando `decode`)
export function psDec(b64) {
  try {
    const bin = atob(b64.replace(/\s+/g, ""));
    let out = "";
    for (let i = 0; i + 1 < bin.length; i += 2) {
      const c = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
      out += String.fromCharCode(c);
    }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(out)) return null; // no parece texto
    return out;
  } catch {
    return null;
  }
}

// Genera un auth.log con fuerza bruta: muchos intentos fallidos del atacante
// mezclados con ruido legítimo, terminando en un login con éxito.
export function authLogFuerzaBruta(opts = {}) {
  const {
    atacante = "45.155.205.33",
    usuario = "Administrator",
    duracion = 4,
    conn = 120,
  } = opts;
  const lineas = [];
  const horaBase = 21; // empieza a las 21:00
  let idx = 0;
  for (let d = 0; d < duracion; d++) {
    const hh = String(horaBase + d).padStart(2, "0");
    for (let i = 0; i < conn; i++) {
      idx++;
      const mm = String(Math.floor(Math.random() * 60)).padStart(2, "0");
      const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
      const ruido = Math.random() < 0.08;
      if (ruido) {
        // tráfico legítimo ocasional
        lineas.push(`Feb 12 ${hh}:${mm}:${ss} srv-fin-01 sshd[${12000 + idx}]: Failed password for svc_backup from 10.0.0.18 port 51234 ssh2`);
      } else {
        lineas.push(`Feb 12 ${hh}:${mm}:${ss} srv-fin-01 sshd[${12000 + idx}]: Failed password for ${usuario} from ${atacante} port ${51000 + idx} ssh2`);
      }
    }
  }
  // El éxito final
  lineas.push(`Feb 12 ${String(horaBase + duracion).padStart(2, "0")}:02:14 srv-fin-01 sshd[${13000 + idx}]: Accepted password for ${usuario} from ${atacante} port 53117 ssh2`);
  lineas.push(`Feb 12 ${String(horaBase + duracion).padStart(2, "0")}:02:16 srv-fin-01 systemd-logind[801]: New session 412 of user ${usuario}.`);
  lineas.push(`Feb 12 ${String(horaBase + duracion).padStart(2, "0")}:03:41 srv-fin-01 sudo: ${usuario} : TTY=pts/0 ; PWD=/home/${usuario} ; USER=root ; COMMAND=/usr/sbin/useradd -u 2005 svc_support`);
  lineas.push(`Feb 12 ${String(horaBase + duracion).padStart(2, "0")}:03:52 srv-fin-01 sudo: ${usuario} : TTY=pts/0 ; PWD=/home/${usuario} ; USER=root ; COMMAND=/usr/bin/passwd svc_support`);
  lineas.push(`Feb 12 ${String(horaBase + duracion).padStart(2, "0")}:04:05 srv-fin-01 sudo: ${usuario} : TTY=pts/0 ; PWD=/home/${usuario} ; USER=root ; COMMAND=/bin/systemctl enable svc_scan.timer`);
  return lineas.join("\n");
}

// Genera un log de DNS con subdominios largos (posible túnel DNS)
export function dnsLogTunel(dominio, consultas = 24, cliente = "10.1.3.42") {
  const lineas = [];
  for (let i = 0; i < consultas; i++) {
    const hex = Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    lineas.push(`Feb 14 02:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")} dns01 queries: info: client ${cliente}#53000: query: ${hex}.${dominio} IN TXT + (10.0.0.53)`);
  }
  return lineas.join("\n");
}

// Genera eventos EDR para el caso de ransomware
export function edrRansomware(hosts) {
  const ev = [];
  for (const h of hosts) {
    ev.push(`{"ts":"2026-02-11T03:${Math.floor(Math.random() * 59)}:12Z","host":"${h}","event":"process_start","proc":"C:\\\\Windows\\\\Temp\\\\svch0st.exe","parent":"\\\\Device\\\\HarddiskVolume2\\\\Windows\\\\System32\\\\cmd.exe","hash":"a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef"}`);
    ev.push(`{"ts":"2026-02-11T03:${Math.floor(Math.random() * 59)}:40Z","host":"${h}","event":"file_write","path":"C:\\\\Users\\\\Public\\\\Documents\\\\nómina_Q1.xlsx.lcrypt","size":184320}`);
    ev.push(`{"ts":"2026-02-11T03:${Math.floor(Math.random() * 59)}:55Z","host":"${h}","event":"process_start","proc":"vssadmin.exe delete shadows /all /quiet","parent":"powershell.exe"}`);
  }
  ev.push(`{"ts":"2026-02-11T03:41:07Z","host":"${hosts[0]}","event":"network_out","proc":"svch0st.exe","dst":"91.240.118.77:443","proto":"TCP","bytes":24821}`);
  ev.push(`{"ts":"2026-02-11T03:44:31Z","host":"${hosts[1]}","event":"file_write","path":"C:\\\\Users\\\\Public\\\\README_LOCKCRYPT.txt","size":3124}`);
  return ev.join("\n");
}

// Nota de rescate típica
export function notaRescate() {
  return [
    "========================================================================",
    "  LOCKCRYPT RANSOMWARE - SUS ARCHIVOS HAN SIDO CIFRADOS",
    "========================================================================",
    "",
    "Todos sus documentos, bases de datos y copias de seguridad han sido",
    "cifrados con AES-256. No intente recuperarlos usted mismo: los borrará.",
    "",
    "Para recuperar sus datos debe pagar 3,5 BTC (aprox. 245.000 EUR) en un",
    "plazo de 72 horas. Pasado ese plazo, el precio se duplica y, a los 7 días,",
    "la clave de descifrado se destruye.",
    "",
    "Puede contactar con nosotros en el mercado TOR:",
    "   http://lockcrypt[.]onion/chat/9f2c1a7e",
    "",
    "IMPORTANTE: no contacte con la policía ni con empresas de recuperación.",
    "No pague hasta recibir confirmación de que disponemos de su clave.",
    "",
    "Su identificador de víctima: CIBERCORP-2026-8842",
    "========================================================================",
  ].join("\n");
}
