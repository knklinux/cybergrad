# 🛡️ CYBERGRAD — Simulador de Carrera SOC + Red Team

> Aprende ciberseguridad como si fuera un videojuego: por un lado, entras como **Analista Junior** en un SOC, investigas incidentes realistas con una **terminal funcional** y asciendes hasta **Jefe de CSIRT**. Por el otro, lanzas la campaña **red team**: seis pentests ofensivos con herramientas reales (`nmap`, `hydra`, `sqlmap`, `metasploit`, `mimikatz`) y asciendes de **Aprendiz de Pentester** a **CISO**.

**Sin dependencias. Sin backend.** Juega online en **[knklinux.github.io/cybergrad](https://knklinux.github.io/cybergrad/)** o en local con un pequeño servidor (ver *Arranque rápido*). Dentro del juego, el botón **🔗 Compartir** copia el enlace del juego, el del repo o un mensaje listo para redes.

[![CI](https://github.com/knklinux/cybergrad/actions/workflows/ci.yml/badge.svg)](https://github.com/knklinux/cybergrad/actions) [![GitHub Pages](https://img.shields.io/github/deployments/knklinux/cybergrad/github-pages?label=GitHub%20Pages&logo=github)](https://github.com/knklinux/cybergrad/deployments)

## 🤖 Tu director: Jimmy

Cada turno lo abre **Jimmy**, el director del SOC y tu socio sintético: te recibe con un briefing holográfico, comenta tus resultados, te da pistas con su estilo y aparece en los momentos clave (splash de incidente, lecciones, final de campaña). El fondo animado (red de nodos, partículas, radar) reacciona al tipo de ataque de cada caso. *(Personaje ficticio inspirado en el proyecto Aion Sincro de Ark & Jimmy.)*

---

## ¿Qué es?

CYBERGRAD tiene **dos campañas completas**:

- **🛡️ Blue team (SOC):** 9 casos basados en ataques reales (phishing, ransomware, BEC, fuerza bruta, exfiltración por túnel DNS, **APT con beaconing y movimiento lateral**, **insider que exfiltra RRHH**, **spear phishing avanzado con robo de sesión**…). El incidente llega, tú investigas con comandos reales y respondes.
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

**💾 Tu progreso se guarda automáticamente** en el navegador (localStorage): nombre, XP de ambas carreras, puntos, casos y pentests resueltos, lecciones vistas y **prácticas de becario superadas** (se marcan con ✔ en el selector).

**🎮 Selector de partida al arranque**: si hay partidas guardadas, al abrir el juego se muestra un selector con cada partida (nombre, XP, casos y logros) y dos caminos: **▶ CONTINUAR** (cualquiera de las partidas, con "Bienvenido de vuelta" y el siguiente caso pendiente) o **✨ EMPEZAR DE CERO** (partida nueva **sin borrar las existentes**: se guarda en la segunda ranura; si ambas están llenas, sustituye a la menos reciente en cuanto hagas tu primer progreso). Puedes **reiniciar el progreso** desde el panel de Carrera (botón 🎖 → sección ♻): **🛡️ SOLO CAMPAÑA SOC**, **🎯 SOLO RED TEAM** o **🔄 TODO**, cada uno con doble confirmación. Reiniciar una campaña conserva la otra intacta (nombre, puntos, becario y logros que sigan vigentes se mantienen; los logros de la campaña reiniciada se retiran). El caso en curso no se guarda a medias: el progreso se consolida al cerrar cada caso.

**🏅 Sistema de logros e insignias**: se desbloquean automáticamente por **rango** (Analista SOC, Cazador de amenazas, Jefe de CSIRT, CISO…) y por **hitos** (primer caso, primer pentest, calificación S+, caso sin pistas, campañas completadas, prácticas de becario…). Al ganar uno aparece una **notificación dorada** en pantalla y el botón **🏅 Logros** del HUD muestra un **contador** con los desbloqueados; el panel lista los logros ganados (✔) y los pendientes (🔒). Todo se persiste con tu guardado y se limpia con el reinicio de progreso.

**📊 Estadísticas globales** en el panel Carrera (persistidas con tu guardado): **tiempo total jugado**, **acciones correctas/errores**, **pistas usadas**, la **calificación de cada caso completado** (chips S+ a C con su campaña) y dos **barras de progreso de XP** (SOC y Red Team). Además, la sección **📤 EXPORTAR / COMPARTIR** ofrece cuatro opciones: **📥 MD** (descarga el informe en Markdown), **🧾 JSON** (descarga los datos estructurados: jugador, resumen, campañas, becario, logros, secretos y estadísticas), **📋 COPIAR** (pone el resumen Markdown en el portapapeles) y **💼 LINKEDIN** (abre el diálogo de compartir de LinkedIn con la tarjeta del juego y copia un mensaje **adaptado a tu progreso** — rangos, XP, tu **mejor calificación S+/S** y el **nº de logros** desbloqueados cuando existan, o un **resumen corto** si aún no has completado ningún caso — listo para pegar con Ctrl+V).

**🥚 Huevo de pascua**: hay un **logro oculto** que no aparece en la lista de pendientes… pero la curiosidad tiene premio. Pulsa **3 veces seguidas el avatar de Jimmy** (en el HUD o en cualquier panel) y verás qué pasa. (Pista: Jimmy aprecia a los que investigan.)

## 🔥 Reto diario, 🎓 Examen, 🎬 Presentador y más

- **🔥 Reto diario** (botón 🔥 o comando `reto`): cada día el juego elige un caso (SOC o Red Team) y le cambia los **indicadores con una semilla basada en la fecha** — las IPs, los **hosts**, los **dominios** y los **correos** son distintos cada día. La sustitución es **reversible y conserva la longitud exacta** de cada cadena (incluidas claves de objetos): un whitelist de TLDs evita tocar falsos positivos (`payment.exe`, `alerts.json`, usuarios con punto…), el usuario de cada correo se conserva, las variantes nunca vuelven a casar (idempotencia) y los mapas de variación permiten reconstruir el caso original (`desvariarCaso`). Nada se rompe: base64 de PowerShell, hashes y consultas `whois`/`dig` siguen funcionando con los indicadores variados. Sin pistas y con el SLA real. Cada resultado se registra en un **ranking local de retos** (comando `ranking` o sección del panel 🔥): **hasta 30 marcas**, una por día con tu **mejor rating** (S+ a C) y tu **mejor tiempo** si repites. Aprender el patrón, no memorizar respuestas.
- **🎓 Modo examen** (botón 🎓 o comando `examen`): un caso al azar, sin pistas y a contrarreloj. Tu informe se califica igual (S+ a C) y, si apruebas con **A o mejor**, se desbloquea tu **certificado en dos formatos**: **PNG** (imagen para compartir) y **PDF por impresión del navegador** (texto real seleccionable/editable, apto para carreras oficiales), con tu nombre, tu calificación y la firma de Jimmy. El examen **no toca tu carrera** (ni XP ni casos completados): es una certificación independiente que sí guarda tu mejor nota.
- **🎬 Modo presentador** (botón 🎬 o comando `demo`): carga en **memoria** un estado avanzado (rangos máximos, casos completados, logros) para enseñar CYBERGRAD en entrevistas o demos sin grindear. **Nunca se guarda**: en modo demo `guardar()` es un no-op, tu progreso real queda intacto.
- **🧠 Jimmy responde preguntas libres** (comando `preguntar` o `jimmy`): pregúntale en lenguaje natural sobre el caso actual — «¿qué hago?» (objetivos pendientes con el comando exacto), «¿qué es T1566?» (técnica MITRE con su táctica), un término del glosario o un archivo del caso (busca y te cita las líneas de evidencia). **🎙 También por voz**: escribe `preguntar` (o `voz`) sin texto y el navegador escucha tu pregunta con `webkitSpeechRecognition` (idioma español, resultado final limpio); `preguntar off` cancela, y si el navegador no lo soporta avisa sin romper. Requisitos: **Chrome/Edge con permiso de micrófono e internet** (el reconocimiento lo procesa el servicio de voz del navegador); en otros navegadores o sin servicio, el juego degrada con un mensaje claro y puedes seguir escribiendo. Los errores se traducen (permiso denegado, sin micrófono, red…), una sesión cancelada no imprime ruido posterior y los callbacks asíncronos están aislados para no romper el terminal. 100 % local y determinista, sin backend.
- **🧭 Árbol de habilidades MITRE** (botón 🧭 o comando `habilidades`): el mapa de tácticas y técnicas del juego. Cada técnica se desbloquea al completar el caso que la enseña; el árbol muestra cuántas dominas por táctica y qué caso te falta para desbloquear cada una.
- **🔊 Sonido y vibración** (botón 🔊 o comando `sonido on|off|estado`): efectos sintetizados con Web Audio (correcto, error, alerta, caso resuelto) y vibración en móvil. El estado se persiste en el navegador.

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

## 🎓 Modo Tutor

¿Por qué esa evidencia importa? El comando **`explicar`** es tu tutor bajo demanda: explica **qué es, por qué importa y qué señales mirar** en cualquier evidencia del caso actual.

- `explicar` — menú de todo lo que puedes pedir que te explique
- `explicar caso` — la historia del ataque, las técnicas MITRE y qué se espera de ti
- `explicar <ruta>` — un archivo del filesystem (dns.log, proxy.log, edr.json, cabeceras…): tipo, relevancia y **señales detectadas en su contenido** (periodicidad, entropía, IOCs cruzados con la base del caso)
- `explicar mail <n>` — análisis del correo: dominio del remitente, urgencia, enlaces, ingeniería social
- `explicar alerta <id>` — la alerta del SIEM: qué fuente la generó y cómo interpretarla
- `explicar <dominio|ip|url|hash>` — el indicador: whois, VirusTotal, familia y la **acción esperada**
- `explicar comando <nombre>` — qué hace el comando y **por qué importa en un incidente real** (con ejemplo y lado del juego: defensa/ataque); `explicar comando` lista todos los explicables
- En red team además: `explicar <ip>` traduce los **puertos** a superficie de ataque y `explicar <url>` desglosa el servidor web (directorios, hallazgos de nikto, login)

El tutor **no juega por ti**: te enseña el porqué para que aprendas a razonarlo tú. Pensado para estudiar con el juego, caso a caso.

## 🔬 Modo Laboratorio

El botón **Laboratorio** del HUD abre un modo de práctica libre (la idea del laboratorio que plantea Jimmy): elige cualquiera de los 9 casos y repítelo tantas veces como quieras.

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
| Sistema | `ayuda`, `tutorial`, `explicar`, `preguntar`/`jimmy`, `reto`, `ranking`, `examen`, `sonido`, `habilidades`, `demo`, `clear`, `history`, `carrera`, `glosario`, `whoami`, `date` |

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
├── ci/                   # Tests del CI: unit, serve, smoke, XSS, whoami, banner, visual, reto, examen, jimmy-ia, presentador, sonido, habilidades (+ prod-test de integración en producción)
└── js/
    ├── main.js           # Arranque (restaura la partida guardada si existe)
    ├── terminal.js       # Motor de terminal (entrada, historial, autocompletado)
    ├── engine.js         # Motor del juego: acciones, SLA, eventos, puntuación (ambos modos)
    ├── commands.js       # Implementación de los comandos del terminal
    ├── filesystem.js     # Sistema de archivos virtual del caso
    ├── hash.js           # MD5 y SHA-256 en JS puro (sin dependencias)
    ├── state.js          # XP, rangos y progresión (blue team y red team)
    ├── save.js           # Persistencia del progreso con localStorage: 2 ranuras de partida + reinicio por campaña
    ├── logros.js         # Sistema de logros e insignias (rango + hitos)
    ├── ui.js             # HUD, modales, splash, lecciones, laboratorio, tutorial, panel RT, logros
    ├── fx.js             # Motor gráfico canvas (red, partículas, radar, tema por ataque)
    ├── jimmy.js          # Personaje Jimmy: frases, briefing, reacciones
    ├── tutorial.js       # Mini tutorial: slides de contexto + micro-caso guiado
    ├── becario.js        # Modo Becario: 3 prácticas blue team + 1 pentest guiado
    ├── glosario.js       # Diccionario del analista
    ├── mitre.js          # Base de conocimiento MITRE ATT&CK (tácticas y técnicas del juego)
    ├── reto.js           # Reto diario: variación reversible de IPs, hosts, dominios y correos + ranking local (30 marcas)
    ├── examen.js         # Modo examen: caso aleatorio sin pistas y certificación
    ├── certificado.js    # Certificado del examen: PNG (canvas) + PDF (HTML imprimible con window.print)
    ├── jimmy-ia.js       # Jimmy-IA: respuestas en lenguaje natural sobre el caso actual
    ├── voz.js            # Reconocimiento de voz del navegador (webkitSpeechRecognition) para preguntar
    ├── presentador.js    # Modo presentador: estado demo en memoria (nunca se guarda)
    ├── sonido.js         # Sonido sintetizado (Web Audio) y vibración, con toggle persistido
    ├── habilidades.js    # Árbol de habilidades MITRE (técnicas desbloqueadas por caso)
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

## 🧪 Pruebas y CI

Cada push o PR ejecuta el workflow `ci.yml` con tres jobs:

- **`checks`** — la cadena completa de **16 tests** (`npm test`):
  1. **Sintaxis** (`check`) — `node --check` sobre todos los `.js` del repo.
  2. **Lint** (`lint`) — ESLint básico sobre `js/`, `serve.js` y `ci/`.
  3. **Unit · `esc()`** (`test:unit`) — el helper de escape HTML contra XSS funciona.
  4. **Serve** (`test:serve`) — `serve.js` responde **400 ante una URL malformada** sin caerse.
  5. **Smoke E2E** (`test:smoke`) — el juego carga sin errores de consola, el onboarding funciona y la terminal arranca.
  6. **XSS E2E** (`test:xss`) — un nombre de jugador con HTML malicioso **nunca se ejecuta ni se renderiza**.
  7. **Whoami E2E** (`test:whoami`) — el comando `whoami` distingue "del SOC de ACME Corp" (blue team) de "de la Unidad Red Team de ACME Corp" (pentests).
  8. **Banner** (`test:banner`) — las 9 letras del banner ASCII (**CYBERGRAD**) están completas y ninguna es el glifo de otra letra (regresión golden contra figlet Standard: cazó la G que era una O y la C sin su interior).
  9. **Artefactos visuales** (`test:visual`) — regresión golden del **subtítulo del banner**, el **pie de arranque** (`© CYBERGRAD · Uso educativo …`), el **separador ASCII de la terminal** (52 guiones `─` con formato línea/título/línea) y las **escalas de rango del tutorial** (emojis y orden exactos de SOC y Red Team), con prueba de mutación: las regresiones se cazan y se restauran.
  10. **Reto diario** (`test:reto`) — la variación por semilla es **determinista** (misma fecha → mismo caso y mismos mapas; fecha distinta → indicadores distintos), varía **IPs, hosts, dominios y correos** (el usuario del correo se conserva, el whitelist de TLDs protege `payment.exe`/`alerts.json`/usuarios con punto), el **invariante de longitud** se cumple en todas las cadenas y claves de TODOS los casos (SOC + RT), y la variación es **reversible**: `desvariarCaso` reconstruye el original byte a byte. Además, el **ranking local** (`registrarMarcaReto`) guarda una marca por día con el **mejor rating** (empate → mejor tiempo), ordena de más reciente a más antigua, limita a **30 marcas** y sobrevive al round-trip del guardado. E2E: el panel muestra el ranking (y su estado vacío), el reto muestra su cabecera, **bloquea `pista`** y el comando `ranking` funciona.
  11. **Modo examen** (`test:examen`) — E2E del examen (cabecera, `pista` bloqueado) y del **certificado**: el generador de canvas produce un **PNG real** (>10 KB) con nombre de archivo **saneado** (slug); el **PDF imprimible** se renderiza como HTML real con texto seleccionable, **escapa el nombre** (XSS), sustituye la zona sin duplicarla, y `page.pdf()` (Chromium headless) produce un **PDF válido con contenido** (>8 KB).
  12. **Jimmy-IA** (`test:jimmy-ia`) — respuestas deterministas en Node («qué hago» lista pendientes con su comando, «qué es T1566» describe la técnica, búsqueda en evidencias cita la línea) + E2E del comando `preguntar` en la terminal.
  13. **Voz** (`test:voz`) — `preguntar` sin texto arranca el reconocimiento del navegador con un **mock** (configura es-ES, resultado final y 1 alternativa), un resultado reconocido se encadena a la respuesta de Jimmy, `preguntar off` cancela la sesión, y **sin API de voz el juego avisa y no rompe**.
  14. **Modo presentador** (`test:presentador`) — el demo carga rangos máximos y casos completados, y **no se guarda**: el localStorage conserva la partida real del jugador.
  15. **Sonido** (`test:sonido`) — el toggle del botón y el comando `sonido on|off|estado` **persisten** el estado, y activar Web Audio en headless **no produce errores de consola**.
  16. **Árbol de habilidades** (`test:habilidades`) — **integridad de datos**: toda técnica citada en las lecciones de los casos existe en la KB de `mitre.js`; el estado del árbol (0 dominadas → todas dominadas) y el panel E2E.
- **`integracion`** — check de integración real: `test:prod` carga la **versión desplegada en GitHub Pages** con Playwright y verifica los **cuatro artefactos visuales** que sirve producción contra los mismos canónicos de los tests locales: el **banner** (golden + glifos, vía `banner-core.mjs`), el **subtítulo**, el **pie de arranque** y el **separador ASCII** (vía `visual-core.mjs`, completando el onboarding y ejecutando `ayuda` para generar un separador real). Solo corre en push a `main` (y manual vía `workflow_dispatch`), reintentando hasta 5 min por si el deploy de Pages está en curso.
- **`gitleaks`** — escaneo de secretos sobre el **historial completo** (más detalle en `SECURITY.md`).

Ejecuta todo en local con `npm test` (necesita Chromium: `npx playwright install chromium`). El check de producción se lanza aparte con `npm run test:prod`.

## 🗺️ Roadmap

- Más familias de malware y TTPs (APT, supply chain, web attacks)
- Más pentests red team (active directory, phishing ofensivo, movimiento lateral en dominio)
- Más prácticas guiadas de becario (más escenarios paso a paso: BEC, web attacks, respuesta a incidentes)
- Ranking entre jugadores
- Más personajes sintéticos con voz propia (Ark y otros)

## ⚖️ Aviso

Uso **exclusivamente educativo**. Empresas, personas, redes e indicadores son ficticios (ACME Corp y su infraestructura no existen).
Las técnicas descritas en los casos se explican para aprender a **defender** contra ellas y a **probar** únicamente sistemas propios o con autorización explícita.
