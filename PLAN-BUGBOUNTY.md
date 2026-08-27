# CYBERGRAD — Modo Bug Bounty

## Estructura

### Nuevos archivos necesarios:
1. `js/bb-casos.js` — Catálogo de casos bug bounty
2. `js/bb-casos/bb-01-idor.js` — IDOR en panel de usuario
3. `js/bb-casos/bb-02-xss.js` — XSS reflejado en búsqueda
4. `js/bb-casos/bb-03-cors.js` — CORS misconfiguration
5. `js/bb-casos/bb-04-open-redirect.js` — Open Redirect
6. `js/bb-casos/bb-05-ssrf.js` — SSRF vía webhook
7. `js/bb-casos/bb-06-sqli.js` — SQL Injection en login
8. `js/bb-casos/bb-07-idor-api.js` — IDOR en API REST
9. `js/bb-casos/bb-08-privilege-escalation.js` — Escalada de privilegios
10. `js/bb-casos/bb-09-full-chain.js` — Cadena completa (recon → exploit → reporte)

### Comandos nuevos:
- `recon <target>` — Reconocimiento del objetivo
- `scan <url>` — Escaneo de vulnerabilidades
- `test <type> <param>` — Probar vulnerabilidad específica
- `exploit <type>` — Ejecutar exploit
- `poc` — Generar Proof of Concept
- `report` — Generar reporte de hallazgo
- `scope` — Ver scope del programa

### Integración en engine.js:
- Nuevo modo `this.bb = false` (bug bounty)
- Nuevo estado `GAME.bbCasosCompletados`
- Sistema de reputación ( Accepted / Informative / N/A )
- Sistema de bounty (dinero virtual)
