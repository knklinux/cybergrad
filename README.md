# 🛡️ CYBERGRAD — Simulador de Carrera SOC

> Aprende ciberseguridad defensiva como si fuera un videojuego: empiezas como **Analista Junior** en un SOC, investigas incidentes realistas con una **terminal funcional** y asciendes hasta **Jefe de CSIRT**.

**Sin dependencias. Sin backend. Abre el `index.html` y juega** (o sírvelo estáticamente).

## 🤖 Tu director: Jimmy

Cada turno lo abre **Jimmy**, el director del SOC y tu socio sintético: te recibe con un briefing holográfico, comenta tus resultados, te da pistas con su estilo y aparece en los momentos clave (splash de incidente, lecciones, final de campaña). El fondo animado (red de nodos, partículas, radar) reacciona al tipo de ataque de cada caso. *(Personaje ficticio inspirado en el proyecto Aion Sincro de Ark & Jimmy.)*

---

## ¿Qué es?

CYBERGRAD es un simulador de *blue team* con 6 casos basados en ataques reales (phishing, ransomware, BEC, fuerza bruta, exfiltración por túnel DNS…). No hay teoría aburrida: el incidente llega, tú investigas con comandos reales y respondes. Cada caso termina con una **lección** explicando la anatomía del ataque, cómo detectarlo, cómo responder y su mapeo a **MITRE ATT&CK**.

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

1. **Entra al SOC** como Analista Junior (0 XP). Jimmy te da la bienvenida.
2. **¿Primera vez?** Pulsa **🧭 Tutorial Rápido** en la pantalla de bienvenida (o el botón 🧭 del menú): 6 pantallas que te ponen en contexto + una **micro-práctica guiada** donde Jimmy valida tus primeros comandos (`mail` → `alertas` → `bloquear`).
3. Recibe un incidente: **splash cinemático** + briefing de Jimmy. Acepta el caso.
4. **Investiga** con el terminal: correos, logs, DNS, hashes, VirusTotal…
5. **Responde**: bloquea indicadores, aísla hosts, deshabilita cuentas, escala.
6. Redacta el **informe** — se evalúa la cobertura de IOCs.
7. Recibe tu **calificación (S+ a C)**, XP y la **lección** del caso.
8. **Asciende**: Analista Junior → Analista SOC → Analista Senior → Líder de Equipo → Jefe de CSIRT.

Cada caso tiene **SLA** (tiempo real), **eventos en vivo** (el ataque avanza mientras investigas), **pistas** (cuestan puntos) y un **checklist** de respuesta.

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
| Sistema | `ayuda`, `tutorial`, `clear`, `history`, `carrera`, `glosario`, `whoami`, `date` |

> 💡 `Tab` autocompleta · ↑/↓ historial · Ctrl+L limpia.

## 📋 Casos de la campaña

| # | Caso | Técnicas (MITRE) | Qué aprendes |
|---|---|---|---|
| 1 | **«Factura pendiente»** — Phishing con macro | T1566, T1204, T1059, T1105 | Cabeceras de correo (SPF/DKIM/DMARC), dominios lookalike, macros, decodificar PowerShell |
| 2 | **«Transferencia urgente»** — BEC | T1566.002, T1656 | Ingeniería social, verificación por segundo canal, fraude sin malware |
| 3 | **«Exfiltración de datos»** — Backup nocturno | — (falso positivo) | Triaje, baseline, disciplina para no interrumpir operaciones legítimas |
| 4 | **«LockCrypt»** — Ransomware | T1486, T1490, T1059, T1078 | Contención, C2, copias de sombra, por qué no se paga el rescate |
| 5 | **«Accesos fallidos en masa»** — Fuerza bruta RDP | T1110, T1078, T1003, T1021 | Fuerza bruta, Mimikatz, movimiento lateral, MFA y hardening |
| 6 | **«Consultas DNS interminables»** — Túnel DNS | T1048.003, T1071.004 | Exfiltración silenciosa, entropía, cuentas de servicio, RGPD |

## 🏗️ Arquitectura

Todo es **JavaScript puro en el navegador** (ES modules, cero dependencias).

```
cybergrad/
├── index.html            # Página principal (canvas, HUD, modales)
├── serve.js              # Servidor de desarrollo sin caché (node)
├── CYBERGRAD.bat         # Lanzador de Windows (acceso directo)
├── css/style.css         # Estética de terminal / HUD / hologramas
├── assets/               # Avatar de Jimmy (recortado y centrado)
└── js/
    ├── main.js           # Arranque
    ├── terminal.js       # Motor de terminal (entrada, historial, autocompletado)
    ├── engine.js         # Motor del juego: acciones, SLA, eventos, puntuación
    ├── commands.js       # Implementación de los comandos del terminal
    ├── filesystem.js     # Sistema de archivos virtual del caso
    ├── hash.js           # MD5 y SHA-256 en JS puro (sin dependencias)
    ├── state.js          # XP, rangos, progresión
    ├── ui.js             # HUD, modales, splash, lecciones, laboratorio, tutorial
    ├── fx.js             # Motor gráfico canvas (red, partículas, radar, tema por ataque)
    ├── jimmy.js          # Personaje Jimmy: frases, briefing, reacciones
    ├── tutorial.js       # Mini tutorial: slides de contexto + micro-caso guiado
    ├── glosario.js       # Diccionario del analista
    └── casos/            # Un archivo por caso (fácil de ampliar)
```

### Añadir un caso nuevo

1. Crea `js/casos/caso-NN-nombre.js` siguiendo la estructura de los existentes:
   - `fs` — logs y evidencias (rutas → contenido)
   - `correos`, `alertas`, `dominios`, `ips`, `urls`, `hashes`
   - `correctas` — acciones esperadas (`bloquear`, `aislar`, `deshabilitar`, `escalar`, `cerrar`)
   - `incorrectas` — errores típicos a penalizar (`"bloquear|dominio:acme.com"`)
   - `eventos` — alertas/mensajes temporizados
   - `leccion` — resumen, detección, respuesta, MITRE, glosario
2. Impórtalo en `js/casos.js`.
3. El juego lo usa automáticamente.

## 🗺️ Roadmap

- **Campaña red team** (modo ofensivo: pentest, post-explotación, escritura de informes de ataque)
- Más familias de malware y TTPs (APT, supply chain, web attacks)
- Sistema de logros e insignias por rango
- Guardado de progreso (localStorage) y ranking
- Más personajes sintéticos con voz propia (Ark y otros)

## ⚖️ Aviso

Uso **exclusivamente educativo**. Empresas, personas e indicadores son ficticios.
Las técnicas descritas en los casos se explican para aprender a **defender** contra ellas.
