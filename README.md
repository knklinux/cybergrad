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

- **🔥 Reto diario** (botón 🔥 o comando `reto`): cada día el juego elige un caso (SOC o Red Team) y le cambia los **indicadores con una semilla basada en la fecha** — las IPs, los **hosts**, los **dominios** y los **correos** son distintos cada día. La sustitución es **reversible y conserva la longitud exacta** de cada cadena (incluidas claves de objetos): un whitelist de TLDs evita tocar falsos positivos (`payment.exe`, `alerts.json`, usuarios con punto…), el usuario de cada correo se conserva, las variantes nunca vuelven a casar (idempotencia) y los mapas de variación permiten reconstruir el caso original (`desvariarCaso`). Nada se rompe: base64 de PowerShell, hashes y consultas `whois`/`dig` siguen funcionando con los indicadores variados. La variación cubre también **las RUTAS de archivo** (`/data/crown.db`, `/home/admin/credenciales.txt`... varían por segmento con mapa compartido, conservando longitud y extensión, y las claves del `fs`, las pistas y los canons del informe casan entre sí; las rutas fijas del motor como `/opt/exploitdb/` y los directorios systemd con puntos como `multi-user.target.wants` quedan intactos) y **los USUARIOS con punto** (`m.garcia`, `l.fuentes` → `q.riv3ra`; el usuario de cada correo comparte variante con el usuario suelto, para que `deshabilitar q.riv3ra` y `q.riv3ra@...` casen). Sin pistas y con el SLA real. El panel 🔥 incluye la ficha **🔎 INDICADORES DE HOY**: la lista de variantes generadas por la semilla del día (`original → variante` de IPs, hosts, dominios, correos, **rutas y usuarios**) para verlas **antes de jugar** (`resumenIndicadores` es puro y determinista). Cada resultado se registra en un **ranking local de retos** (comando `ranking` o sección del panel 🔥): **hasta 30 marcas**, una por día con tu **mejor rating** (S+ a C) y tu **mejor tiempo** si repites. Aprender el patrón, no memorizar respuestas.
- **🎓 Modo examen** (botón 🎓 o comando `examen`): un caso al azar, sin pistas y a contrarreloj. Tu informe se califica igual (S+ a C) y, si apruebas con **A o mejor**, se desbloquea tu **certificado en dos formatos**: **PNG** (imagen para compartir) y **PDF por impresión del navegador** (texto real seleccionable/editable, apto para carreras oficiales), con tu nombre, tu calificación y la firma de Jimmy. Cada certificado lleva un **código de verificación** (`CG-…`) que firma nombre, fecha y nota con SHA-256: cualquiera puede comprobarlo en el juego con el comando `verificar_certificado <código>`, que confirma que el certificado es auténtico y no ha sido alterado. El examen **no toca tu carrera** (ni XP ni casos completados): es una certificación independiente que sí guarda tu mejor nota.
- **🎬 Modo presentador** (botón 🎬 o comando `demo`): carga en **memoria** un estado avanzado (rangos máximos, casos completados, logros) para enseñar CYBERGRAD en entrevistas o demos sin grindear. **Nunca se guarda**: en modo demo `guardar()` es un no-op, tu progreso real queda intacto.
- **🧠 Jimmy responde preguntas libres** (comando `preguntar` o `jimmy`): pregúntale en lenguaje natural sobre el caso actual — «¿qué hago?» (objetivos pendientes con el comando exacto), «¿qué es T1566?» (técnica MITRE con su táctica), un término del glosario o un archivo del caso (busca y te cita las líneas de evidencia). **🎙 También por voz**: escribe `preguntar` (o `voz`) sin texto y el navegador escucha tu pregunta con `webkitSpeechRecognition` (idioma español, resultado final limpio); `preguntar off` cancela, y si el navegador no lo soporta avisa sin romper. Requisitos: **Chrome/Edge con permiso de micrófono e internet** (el reconocimiento lo procesa el servicio de voz del navegador); en otros navegadores o sin servicio, el juego degrada con un mensaje claro y puedes seguir escribiendo. Los errores se traducen (permiso denegado, sin micrófono, red…), una sesión cancelada no imprime ruido posterior y los callbacks asíncronos están aislados para no romper el terminal. 100 % local y determinista, sin backend.
- **🧭 Árbol de habilidades MITRE** (botón 🧭 o comando `habilidades`): el mapa de tácticas y técnicas del juego. Cada técnica se desbloquea al completar el caso que la enseña; el árbol muestra cuántas dominas por táctica y qué caso te falta para desbloquear cada una.
- **🔊 Sonido y vibración** (botón 🔊 o comando `sonido on|off|estado`): efectos sintetizados con Web Audio (correcto, error, alerta, caso resuelto) y vibración en móvil. El estado se persiste en el navegador.
- **🔄 Ataque adaptativo** (en 3 casos blue team: phishing, ransomware y fuerza bruta): si **no contienes a tiempo** el objetivo origen (no aíslas el host, no bloqueas la IP/C2), el atacante **pivota** — se mueve a otro host/cuenta, el checklist gana objetivos **nuevos que también exige el informe**, salta una alerta crítica, Jimmy te avisa y pierdes puntos. Contener a tiempo lo evita del todo: es la diferencia entre un incidente y una brecha. `pivot.js` decide de forma pura y determinista; los pivots sobreviven a la variación del reto diario.
- **🧠 Repaso MITRE al cerrar cada caso** (quiz de 3 preguntas): entre el resultado y la lección, el juego te hace un mini-examen de la lección del caso (técnica protagonista, por qué importa y cómo responder) con explicación tras cada respuesta y marcador final. Los 15 casos de campaña (9 SOC + 6 red team) tienen quiz propio anclado a sus técnicas reales; el reto diario reutiliza el del caso original (`retoBaseId`) y cualquier caso sin quiz propio recibe uno generado de su lección. Los aciertos se acumulan en las estadísticas globales (panel Carrera, «Repasos MITRE X/Y») y se persisten con el guardado. `quiz.js` es puro (sin DOM) y testeable en Node.
- **📱 Instalable (PWA) con modo offline**: CYBERGRAD es una **PWA instalable** — `manifest.webmanifest` (iconos 192/512 generados desde el avatar de Jimmy, `display: standalone`, colores del juego) y un **service worker** (`sw.js`) que precachea todo el juego en la primera visita. Estrategia **network-first**: online siempre fresco, sin conexión todo sigue funcionando (casos, terminal, lecciones, retos y guardado incluidos). En Chrome/Edge aparece el botón de instalar; también se puede añadir a la pantalla de inicio en móvil. El registro respeta la CSP (`script-src 'self'`, sin inline) y se hace desde `js/pwa.js`. `sw.js` y los iconos son **generados** por `npm run build:pwa` (`ci/build-sw.mjs` escanea los archivos reales y calcula la versión por hash; `ci/build-icons.mjs` decodifica y redimensiona el PNG con Node puro), y el CI verifica que están siempre al día.
- **⚔️ Modo duelo SOC vs Red Team** (comando `duelo`): dos jugadores, un mismo escenario y **turnos alternos**. El **ROJO** ataca con su kit ofensivo real (nmap, hydra, sqlmap, mimikatz, exfiltrar…) y el **AZUL** defiende (bloquear, aislar, deshabilitar, escalar…). Cada jugada consume el turno — acierte o falle, el turno pasa; los comandos de investigación (`ls`, `cat`, `ayuda`…) no consumen turno, y el kit del otro bando se rechaza. El HUD muestra en directo los **objetivos de cada bando con sus checkmarks, la puntuación (25 pts/objetivo) y de quién es el turno** (el prompt cambia a `rojo@pentest` / `azul@soc`). Gana quien complete todos sus objetivos primero; si se agotan los turnos decide el que más tenga (desempate por puntos). Dos escenarios: «Brecha en la VPN corporativa» (SSH force + mimikatz vs contención) y «La tienda web a la vista» (msf RCE vs bloqueo del vector). `duelo.js` es puro y determinista; no toca tu carrera (XP/puntos intactos) y `salir_duelo` te devuelve a tu caso.

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
├── ci/                   # Tests del CI: unit, serve, smoke, XSS, whoami, banner, visual, meta, reto, examen, jimmy-ia, presentador, sonido, habilidades (+ prod-test de integración en producción)
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
    ├── pivot.js          # Ataque adaptativo: decisión pura de si el atacante pivota (sin efectos)
    ├── duelo.js          # Modo enfrentamiento SOC vs Red Team: turnos, kits y escenarios (puro)
    ├── quiz.js           # Repaso MITRE: quizzes de los 15 casos + fallback + corrección (puro)
    ├── pwa.js            # Registro del service worker (instalable + offline, respeta la CSP)
    ├── casos/            # Un archivo por caso blue team (fácil de ampliar)
    ├── rt-casos.js       # Catálogo de la campaña red team
    └── rt-casos/         # Un archivo por pentest red team (fácil de ampliar)
```

PWA: `manifest.webmanifest` (instalación) · `sw.js` (offline, **generado** por `ci/build-sw.mjs`) · `assets/icon-192.png` y `icon-512.png` (**generados** por `ci/build-icons.mjs` desde `apple-touch-icon.png` con Node puro) · `assets/cybergrad.ico` (icono del acceso directo del escritorio, 16→256 px, **generado** por `ci/build-ico.mjs` reutilizando el mismo motor PNG).

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

- **`checks`** — la cadena completa de **21 tests** (`npm test`):
  1. **Sintaxis** (`check`) — `node --check` sobre todos los `.js` del repo.
  2. **Lint** (`lint`) — ESLint básico sobre `js/`, `serve.js` y `ci/`.
  3. **Unit · `esc()`** (`test:unit`) — el helper de escape HTML contra XSS funciona.
  4. **Serve** (`test:serve`) — `serve.js` responde **400 ante una URL malformada** sin caerse.
  5. **Smoke E2E** (`test:smoke`) — el juego carga sin errores de consola, el onboarding funciona y la terminal arranca.
  6. **XSS E2E** (`test:xss`) — un nombre de jugador con HTML malicioso **nunca se ejecuta ni se renderiza**.
  7. **Whoami E2E** (`test:whoami`) — el comando `whoami` distingue "del SOC de ACME Corp" (blue team) de "de la Unidad Red Team de ACME Corp" (pentests).
  8. **Banner** (`test:banner`) — las 9 letras del banner ASCII (**CYBERGRAD**) están completas y ninguna es el glifo de otra letra (regresión golden contra figlet Standard: cazó la G que era una O y la C sin su interior).
  9. **Artefactos visuales** (`test:visual`) — regresión golden del **subtítulo del banner**, el **pie de arranque** (`© CYBERGRAD · Uso educativo …`), el **separador ASCII de la terminal** (52 guiones `─` con formato línea/título/línea) y las **escalas de rango del tutorial** (emojis y orden exactos de SOC y Red Team), con prueba de mutación: las regresiones se cazan y se restauran.
  10. **Metadatos** (`test:meta`) — regresión golden de la cabecera que decide cómo se comparte CYBERGRAD: **título de pestaña**, **Open Graph** (og:title/description/url e **imágenes** ×2) y **Twitter Card** (card e imagen), más `description`, `canonical`, `lang` y la **meta CSP** con sus directivas clave. Las og:image apuntan a archivos que existen en `assets/`, y la **prueba de mutación** caza un título roto (GYBERGRAD), una description mutada, una og:image rota, una twitter:card degradada, un lang cambiado y un meta CSP eliminado.
  11. **Reto diario** (`test:reto`) — la variación por semilla es **determinista** (misma fecha → mismo caso y mismos mapas; fecha distinta → indicadores distintos), varía **IPs, hosts, dominios, correos, RUTAS de archivo y USUARIOS con punto**: las rutas se varían por **segmento con mapa compartido** (el directorio y sus archivos casan), conservando **longitud y extensión**, dejando intactas las **rutas fijas del motor** (`/opt/exploitdb/searchsploit.txt`) y los **directorios con puntos** de systemd (`multi-user.target.wants`), y sus variantes llevan un dígito en cada segmento (no re-casan). El usuario con punto varía y **comparte variante con el del correo** (`m.garcia@acme.com` y `deshabilitar m.garcia` casan); `update.exe`/`payment.exe`/`powershell.exe` (archivos sin ruta) siguen intactos. El **invariante de longitud** se cumple en todas las cadenas y claves de TODOS los casos (SOC + RT), la variación es **reversible** (`desvariarCaso` reconstruye el original byte a byte) y los mapas son biyectivos. Además, el **ranking local** (`registrarMarcaReto`) guarda una marca por día con el **mejor rating** (empate → mejor tiempo), ordena de más reciente a más antigua, limita a **30 marcas** y sobrevive al round-trip del guardado, y la ficha **`resumenIndicadores`** lista solo los tokens que de verdad cambiaron (tipos IP/Host/Dominio/Correo/**Ruta/Usuario**, determinista, tolera mapas vacíos). E2E: el panel muestra el ranking (y su estado vacío) y la **ficha INDICADORES DE HOY** con sus variantes, el reto muestra su cabecera, **bloquea `pista`** y el comando `ranking` funciona.
  12. **Modo examen** (`test:examen`) — E2E del examen (cabecera, `pista` bloqueado) y del **certificado**: el generador de canvas produce un **PNG real** (>10 KB) con nombre de archivo **saneado** (slug); el **PDF imprimible** se renderiza como HTML real con texto seleccionable, **escapa el nombre** (XSS), sustituye la zona sin duplicarla, y `page.pdf()` (Chromium headless) produce un **PDF válido con contenido** (>8 KB). Además, una **Parte 3 E2E completa un examen real** (forzando el caso con un stub de `Math.random`), pulsa los botones 📜 PNG / 🖨️ PDF del modal y valida el **código de verificación**: unidad en Node (determinista, cambia con nombre/fecha/rating, rechaza payload alterado y formato inválido) + el comando `verificar_certificado` de Jimmy acepta el código íntegro y **rechaza uno con la firma rota**.
  13. **Jimmy-IA** (`test:jimmy-ia`) — respuestas deterministas en Node («qué hago» lista pendientes con su comando, «qué es T1566» describe la técnica, búsqueda en evidencias cita la línea) + E2E del comando `preguntar` en la terminal.
  14. **Voz** (`test:voz`) — `preguntar` sin texto arranca el reconocimiento del navegador con un **mock** (configura es-ES, resultado final y 1 alternativa), un resultado reconocido se encadena a la respuesta de Jimmy, `preguntar off` cancela la sesión, y **sin API de voz el juego avisa y no rompe**.
  15. **Modo presentador** (`test:presentador`) — el demo carga rangos máximos y casos completados, y **no se guarda**: el localStorage conserva la partida real del jugador.
  16. **Sonido** (`test:sonido`) — el toggle del botón y el comando `sonido on|off|estado` **persisten** el estado, y activar Web Audio en headless **no produce errores de consola**.
  17. **Árbol de habilidades** (`test:habilidades`) — **integridad de datos**: toda técnica citada en las lecciones de los casos existe en la KB de `mitre.js`; el estado del árbol (0 dominadas → todas dominadas) y el panel E2E.
  18. **Ataque adaptativo** (`test:pivot`) — los pivots declarados en los casos son estructuralmente válidos y la decisión pura de `prepararPivot` es correcta (contenido a tiempo → no pivota; sin contener → pivota con objetivos nuevos; ya pivotado → no repite). E2E con el hook `?pivotEn=N`: si NO contienes, el atacante pivota (terminal + checklist ganan el host nuevo, sin errores de consola); si contienes a tiempo, el pivote NO salta y el checklist no se complica.
  19. **Quiz de repaso MITRE** (`test:quiz`) — los 15 quizzes de campaña son estructuralmente válidos (3 preguntas, 4 opciones únicas, índice y explicación), el reto diario resuelve al quiz del caso original, el fallback ancla la técnica y la señal de la lección, y `corregirQuiz` puntúa bien. E2E: completa el caso-01 de verdad (7 acciones + informe), responde el quiz 3/3, llega a la lección y verifica que las estadísticas quedan persistidas (localStorage) y visibles en el panel Carrera, sin errores de consola.
  20. **PWA** (`test:pwa`) — el `manifest.webmanifest` es válido e instalable (campos obligatorios, `display: standalone`, iconos **192 y 512 reales** en disco y PNG válidos, `purpose: maskable`), y `sw.js` es un service worker clásico correcto (sin módulos ES, versión con hash, precache con TODOS los `.js` de `js/`, el css y los assets, sin rutas absolutas). E2E con **modo offline real** (Playwright): instala el SW (registro → activación → control), verifica que la caché tiene el shell completo, **corta la red** (`context.setOffline(true)`) y comprueba que el juego recarga entero (banner + UI) sin un solo error de consola.
  21. **Duelo SOC vs Red Team** (`test:duelo`) — la lógica pura de `duelo.js` decide bien: turnos alternos, puntuación (25 pts/objetivo), victoria al completar los 4 objetivos de un bando (rojo y azul), límite de turnos con desempate, objetivos que comparten canon (`recon` y `acceso` sobre el mismo host) y el caso sintetizado que mezcla los objetivos de ambos bandos sin tocar la carrera. E2E con el hook `?dueloEn=0`: juega un **duelo completo de verdad** — nmap → aislar → hydra/ssh → bloquear → exfiltrar → deshabilitar → mimikatz — y verifica que el HUD marca objetivos y turnos, que el marcador acaba 100-75 y que el ROJO gana, sin errores de consola.
- **`integracion`** — check de integración real: `test:prod` carga la **versión desplegada en GitHub Pages** con Playwright y verifica los **seis artefactos de arranque** que sirve producción contra los mismos canónicos de los tests locales: el **banner** (golden + glifos, vía `banner-core.mjs`), el **subtítulo**, el **pie de arranque** y el **separador ASCII** (vía `visual-core.mjs`, completando el onboarding y ejecutando `ayuda` para generar un separador real), los **metadatos** (vía `meta-core.mjs`: título de pestaña, Open Graph y Twitter Card leídos del DOM, con las **og:image comprobadas con HTTP real** — un archivo roto o desaparecido rompería la tarjeta de LinkedIn — y la **meta CSP** con sus directivas clave; GitHub Pages ignora `_headers`, así que la meta es la política realmente aplicada) y la **PWA** (manifest instalable servido como `manifest+json`, iconos 192/512 con HTTP real y `sw.js` con su precache y estrategia offline). Solo corre en push a `main` (y manual vía `workflow_dispatch`), reintentando hasta 5 min por si el deploy de Pages está en curso.
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
