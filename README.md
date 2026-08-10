# 🛡️ CYBERGRAD — Simulador de Carrera SOC + Red Team

> Aprende ciberseguridad como si fuera un videojuego: por un lado, entras como **Analista Junior** en un SOC, investigas incidentes realistas con una **terminal funcional** y asciendes hasta **Jefe de CSIRT**. Por el otro, lanzas la campaña **red team**: seis pentests ofensivos con herramientas reales (`nmap`, `hydra`, `sqlmap`, `metasploit`, `mimikatz`) y asciendes de **Aprendiz de Pentester** a **CISO**.

**Sin dependencias. Sin backend.** Juega online en **[knklinux.github.io/cybergrad](https://knklinux.github.io/cybergrad/)** o en local con un pequeño servidor (ver *Arranque rápido*). Dentro del juego, el botón **🔗 Compartir** copia el enlace del juego, el del repo o un mensaje listo para redes.

## 🤖 Tu director: Jimmy

Cada turno lo abre **Jimmy**, el director del SOC y tu socio sintético: te recibe con un briefing holográfico, comenta tus resultados, te da pistas con su estilo y aparece en los momentos clave (splash de incidente, lecciones, final de campaña). El fondo animado (red de nodos, partículas, radar) reacciona al tipo de ataque de cada caso. *(Personaje ficticio inspirado en el proyecto Aion Sincro de Ark & Jimmy.)*

---

## ¿Qué es?

CYBERGRAD tiene **dos campañas completas**:

- **🛡️ Blue team (SOC):** 6 casos basados en ataques reales (phishing, ransomware, BEC, fuerza bruta, exfiltración por túnel DNS…). El incidente llega, tú investigas con comandos reales y respondes.
- **🎯 Red team:** 6 pentests ofensivos con contrato firmado. Enumeras, ganas acceso, escalas privilegios y exfiltas datos con herramientas reales simuladas, y entregas un **informe de pentest** ejecutivo.

Cada caso de ambas campañas termina con una **lección** explicando la anatomía del ataque, cómo detectarlo, cómo responder y su mapeo a **MITRE ATT&CK**.

Está pensado como **guía de aprendizaje** para ti y para cualquiera que quiera entrar en el mundo SOC, y como **pieza de portfolio** que demuestra conocimientos de seguridad + capacidad de construir herramientas.

## ⚡ Arranque rápido

> **Importante:** el juego necesita un pequeño servidor local — los navegadores bloquean los módulos ES al abrir `index.html` directamente desde el explorador (`file://`).

**En Windows — acceso directo:** doble clic en `CYBERGRAD.bat` (o la copia que dejamos en tu escritorio). Arranca el servidor, espera 2 segundos y abre el juego en `http://127.0.0.1:8000`. Cierra la ventana negra para salir.

**O manualmente:**

```bash
# Opción 1: servidor de desarrollo sin caché (ideal para iterar)
node serve.js 8000
# → http://127.0.0.1:8000  (Cache-Control: no-store)

# Opción 2: servidor estático
python -m http.server 8000
# → http://127.0.0.1:8000
```

## 🎮 Cómo se juega

**Campaña blue team (SOC):**

1. **Entra al SOC** como Analista Junior (0 XP). Jimmy te da la bienvenida.
2. **¿Primera vez?** Tienes dos puertas de entrada:
   - **🧭 Tutorial Rápido** (pantalla de bienvenida o botón 🧭 del menú): 6 pantallas de contexto + una micro-práctica guiada (`mail` → `alertas` → `bloquear`).
   - **🎓 Modo Becario** (pantalla de bienvenida o botón 🎓 del menú): **3 prácticas blue team + 1 pentest guiado** donde Jimmy te lleva de la mano y en cada paso te explica **qué escribir y, sobre todo, POR QUÉ** — pensado para quien llega sin haber tocado un SOC ni un pentest en su vida. Sin SLA, sin penalizaciones, sin XP.
3. Recibe un incidente: **splash cinemático** + briefing de Jimmy. Acepta el caso.
4. **Investiga** con el terminal: correos, logs, DNS, hashes, VirusTotal…
5. **Responde**: bloquea indicadores, aísla hosts, deshabilita cuentas, escala.
6. Redacta el **informe** — se evalúa la cobertura de IOCs.
7. Recibe tu **calificación (S+ a C)**, XP y la **lección** del caso.
8. **Asciende**: Analista Junior → Analista SOC → Analista Senior → Líder de Equipo → Jefe de CSIRT.

Cada caso tiene **SLA** (tiempo real), **eventos en vivo** (el ataque avanza mientras investigas), **pistas** (cuestan puntos) y un **checklist** de respuesta.

**🎯 Campaña red team (pentest):**

1. Abre el **panel Red Team** desde el botón **🎯 Red Team** del HUD.
2. Los casos se desbloquean en orden: debes completar un pentest para abrir el siguiente.
3. Recibe el **contrato** con el alcance autorizado, acepta y despliega tu terminal de ataque.
4. Sigue la metodología: **Reconocimiento → Acceso → Escalada de privilegios → Exfiltración**.
5. Entrega el **informe de pentest**: se evalúa la cobertura de hallazgos y objetivos.
6. Recibe tu **calificación (S+ a C)**, XP de pentest y la **lección** del caso.
7. **Asciende**: Aprendiz de Pentester → Pentester Junior → Pentester → Pentester Senior → Líder Red Team → **CISO**.

El progreso red team es independiente del blue team: XP, rango y campaña propios.

**💾 Tu progreso se guarda automáticamente** en el navegador (localStorage): nombre, XP de ambas carreras, puntos, casos y pentests resueltos, lecciones vistas y **prácticas de becario superadas** (se marcan con ✔ en el selector). Al volver, el juego te recibe con "Bienvenido de vuelta" y te asigna el siguiente caso pendiente. Puedes **reiniciar el progreso** desde el panel de Carrera (botón 🎖 → sección ♻): **🛡️ SOLO CAMPAÑA SOC**, **🎯 SOLO RED TEAM** o **🔄 TODO**, cada uno con doble confirmación. Reiniciar una campaña conserva la otra intacta (nombre, puntos, becario y logros que sigan vigentes se mantienen; los logros de la campaña reiniciada se retiran). El caso en curso no se guarda a medias: el progreso se consolida al cerrar cada caso.

**🏅 Sistema de logros e insignias**: se desbloquean automáticamente por **rango** (Analista SOC, Cazador de amenazas, Jefe de CSIRT, CISO…) y por **hitos** (primer caso, primer pentest, calificación S+, caso sin pistas, campañas completadas, prácticas de becario…). Al ganar uno aparece una **notificación dorada** en pantalla y el botón **🏅 Logros** del HUD muestra un **contador** con los desbloqueados; el panel lista los logros ganados (✔) y los pendientes (🔒). Todo se persiste con tu guardado y se limpia con el reinicio de progreso.

## 🎓 Modo Becario

¿Nunca has tocado un SOC? El **Modo Becario** es tu rampa de entrada: tres prácticas guiadas de blue team y un **pentest guiado** de red team, donde Jimmy valida comando a comando y un **panel de guía** muestra el paso actual (N/M), el comando exacto y la explicación del **porqué** de cada acción:

**🛡️ Blue team (SOC)**
1. **«El correo que huele mal»** — phishing: `mail` → `alertas` → `whois` → `bloquear` → `aislar` → `deshabilitar`. Aprendes el ciclo completo de respuesta: identificar, contener y neutralizar.
2. **«La alerta que gritaba lobo»** — triaje de un falso positivo: `alertas` → `ls`/`cat` de logs → `cat /etc/crontab` → `whois` → `cerrar_caso`. Aprendes la habilidad nº1 del analista: **investigar antes de actuar**.
3. **«LockCrypt»** — ransomware paso a paso: `alertas` → `cat` de la nota del rescate → `vssadmin list shadows` → `aislar` → `bloquear` el C2 → `deshabilitar` la cuenta → `pagar`. Aprendes la secuencia de oro: **contener sin pánico**, por qué el ransomware borra las copias de sombra y por qué **NO se paga el rescate**.

**🎯 Red team (pentest)**
4. **Pentest guiado 1/1: reconoce, entra y documenta** — `ver_caso` (contrato) → `nmap` (reconocimiento) → `gobuster` (enumeración web) → `hydra` (fuerza bruta SSH) → `ssh` (acceso) → `cat` (hallazgo de credenciales) → `exfiltrar` (evidencia). Aprendes el ciclo ofensivo completo: **autorización → reconocer → atacar → acceder → documentar**.

- **Sin SLA, sin penalizaciones y sin XP**: es práctica pura para equivocarte a gusto.
- Si te saltas un paso o te equivocas, Jimmy te reencamina con calma.
- Al terminar, te lanza directo a la campaña que corresponda (SOC o Red Team).

## 🔬 Modo Laboratorio

El botón **Laboratorio** del HUD abre un modo de práctica libre (la idea del laboratorio que plantea Jimmy): elige cualquiera de los 6 casos y repítelo tantas veces como quieras.

- **Sin SLA**, **sin penalizaciones** y **pistas gratis**.
- La calificación y la lección se muestran igual, pero **no suma XP ni avanza la campaña**: es para experimentar sin consecuencias.
- Perfecto para practicar comandos, triaje o probar rutas de respuesta alternativas.

### Comandos del terminal

| Categoría | Comandos |
|---|---|
| Caso | `ver_caso`, `pista`, `estado` |
| Fuentes | `mail`, `alertas`, `siem` |
| Archivos | `ls`, `cat`, `head`, `tail`, `grep`, `wc`, `less`, `find`, `strings`, `file` |
| Hash / malware | `md5sum`, `sha256sum`, `decode`, `base64`, `vt` |
| Red | `whois`, `dig`, `host`, `nslookup`, `curl` |
| Respuesta | `bloquear`, `aislar`, `deshabilitar`, `escalar`, `cerrar_caso`, `informe` |
| **Red team** | `nmap`, `gobuster`, `nikto`, `searchsploit`, `hydra`, `ssh`, `sqlmap`, `msf`, `mimikatz`, `john`/`hashcat`, `nc`, `exfiltrar`, `escalar_priv` |
| Sistema | `ayuda`, `tutorial`, `clear`, `history`, `carrera`, `glosario`, `whoami`, `date` |

> 💡 `Tab` autocompleta · ↑/↓ historial · Ctrl+L limpia.

## 📋 Casos de la campaña blue team

| # | Caso | Técnicas (MITRE) | Qué aprendes |
|---|---|---|---|
| 1 | **«Factura pendiente»** — Phishing con macro | T1566, T1204, T1059, T1105 | Cabeceras de correo (SPF/DKIM/DMARC), dominios lookalike, macros, decodificar PowerShell |
| 2 | **«Transferencia urgente»** — BEC | T1566.002, T1656 | Ingeniería social, verificación por segundo canal, fraude sin malware |
| 3 | **«Exfiltración de datos»** — Backup nocturno | — (falso positivo) | Triaje, baseline, disciplina para no interrumpir operaciones legítimas |
| 4 | **«LockCrypt»** — Ransomware | T1486, T1490, T1059, T1078 | Contención, C2, copias de sombra, por qué no se paga el rescate |
| 5 | **«Accesos fallidos en masa»** — Fuerza bruta RDP | T1110, T1078, T1003, T1021 | Fuerza bruta, Mimikatz, movimiento lateral, MFA y hardening |
| 6 | **«Consultas DNS interminables»** — Túnel DNS | T1048.003, T1071.004 | Exfiltración silenciosa, entropía, cuentas de servicio, RGPD |

## 🎯 Campaña red team: 6 pentests ofensivos

Contrato firmado, alcance autorizado y herramientas reales simuladas en tu terminal de ataque. Cada pentest sigue la metodología **Reconocimiento → Acceso → Escalada → Exfiltración**, con objetivo propio, checklist en vivo y un **informe de pentest** que se califica como en un engagement real.

| # | Pentest | Técnicas (MITRE) | Qué aprendes |
|---|---|---|---|
| 1 | **Reconocimiento: mapeando la superficie de ataque** | T1595, T1590, T1046 | `nmap` (escaneo de puertos/versiones), `gobuster` y `nikto` (enumeración web), footprinting |
| 2 | **Fuerza bruta SSH: la puerta con la cerradura mala** | T1110, T1110.002 | `hydra` con diccionarios, políticas de contraseñas, por qué el SSH expuesto es un riesgo |
| 3 | **Inyección SQL: la tienda que habla SQL** | T1190, T1505.003 | `sqlmap`, inyección basada en error, extracción de credenciales de la base de datos |
| 4 | **De la web al sistema: Metasploit y escalada de privilegios** | T1190, T1068, T1078 | `msf`/`msfconsole`, explotación de un servicio web vulnerable, `escalar_priv` con kernel exploit |
| 5 | **Mimikatz: la memoria lo recuerda todo** | T1003.001, T1552.001, T1021.001 | `mimikatz` (credenciales en memoria), movimiento lateral con credenciales robadas |
| 6 | **La joya de la corona: exfiltración y entrega del informe** | T1213, T1041, T1020 | `find` de datos sensibles, `nc`/`exfiltrar`, y redacción del informe ejecutivo final |

> ⚖️ Todo ocurre en un entorno ficticio autorizado (ACME Corp). Las técnicas se explican para aprender a **defender** y a **probar** sistemas propios.

## 🏗️ Arquitectura

Todo es **JavaScript puro en el navegador** (ES modules, cero dependencias).

```
cybergrad/
├── index.html            # Página principal (canvas, HUD, modales)
├── serve.js              # Servidor de desarrollo sin caché (node)
├── CYBERGRAD.bat         # Lanzador de Windows (acceso directo)
├── make-cover.ps1        # Genera la portada Open Graph (1200x630)
├── make-icons.ps1        # Genera favicon, apple-touch-icon y portada cuadrada
├── css/style.css         # Estética de terminal / HUD / hologramas
├── assets/               # Avatar de Jimmy, favicon, iconos y portadas
└── js/
    ├── main.js           # Arranque (restaura la partida guardada si existe)
    ├── terminal.js       # Motor de terminal (entrada, historial, autocompletado)
    ├── engine.js         # Motor del juego: acciones, SLA, eventos, puntuación (ambos modos)
    ├── commands.js       # Implementación de los comandos del terminal
    ├── filesystem.js     # Sistema de archivos virtual del caso
    ├── hash.js           # MD5 y SHA-256 en JS puro (sin dependencias)
    ├── state.js          # XP, rangos y progresión (blue team y red team)
    ├── save.js           # Persistencia del progreso con localStorage + reinicio por campaña
    ├── logros.js         # Sistema de logros e insignias (rango + hitos)
    ├── ui.js             # HUD, modales, splash, lecciones, laboratorio, tutorial, panel RT, logros
    ├── fx.js             # Motor gráfico canvas (red, partículas, radar, tema por ataque)
    ├── jimmy.js          # Personaje Jimmy: frases, briefing, reacciones
    ├── tutorial.js       # Mini tutorial: slides de contexto + micro-caso guiado
    ├── becario.js        # Modo Becario: 3 prácticas blue team + 1 pentest guiado
    ├── glosario.js       # Diccionario del analista
    ├── casos/            # Un archivo por caso blue team (fácil de ampliar)
    ├── rt-casos.js       # Catálogo de la campaña red team
    └── rt-casos/         # Un archivo por pentest red team (fácil de ampliar)
```

### Añadir un caso nuevo (blue team)

1. Crea `js/casos/caso-NN-nombre.js` siguiendo la estructura de los existentes:
   - `fs` — logs y evidencias (rutas → contenido)
   - `correos`, `alertas`, `dominios`, `ips`, `urls`, `hashes`
   - `correctas` — acciones esperadas (`bloquear`, `aislar`, `deshabilitar`, `escalar`, `cerrar`)
   - `incorrectas` — errores típicos a penalizar (`"bloquear|dominio:acme.com"`)
   - `eventos` — alertas/mensajes temporizados
   - `leccion` — resumen, detección, respuesta, MITRE, glosario
2. Impórtalo en `js/casos.js`.
3. El juego lo usa automáticamente.

### Añadir un pentest nuevo (red team)

1. Crea `js/rt-casos/rt-NN-nombre.js` con la estructura de los existentes:
   - `red` — red simulada (subredes, hosts, puertos, SO)
   - `web` — servidores web (páginas, rutas, directorios, hallazgos de `nikto`)
   - `correctas` — objetivos por fase: `recon` (hosts/URLs), `acceso` (credenciales), `escalada`, `exfiltracion`
   - `pistas`, `eventos`, `incorrectas`
   - `leccion` — resumen, detección, respuesta, MITRE, glosario
2. Impórtalo en `js/rt-casos.js`.
3. El panel Red Team lo usa automáticamente.

## 🗺️ Roadmap

- Más familias de malware y TTPs (APT, supply chain, web attacks)
- Más pentests red team (active directory, phishing ofensivo, movimiento lateral en dominio)
- Más prácticas guiadas de becario (más escenarios paso a paso: BEC, web attacks, respuesta a incidentes)
- Ranking entre jugadores
- Más personajes sintéticos con voz propia (Ark y otros)

## ⚖️ Aviso

Uso **exclusivamente educativo**. Empresas, personas, redes e indicadores son ficticios (ACME Corp y su infraestructura no existen).
Las técnicas descritas en los casos se explican para aprender a **defender** contra ellas y a **probar** únicamente sistemas propios o con autorización explícita.
