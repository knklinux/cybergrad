# Seguridad — protección de secretos

Este repositorio participa del esquema de protección de secretos de la cuenta
**knklinux**. Hay 4 capas: cuanto más abajo, antes se bloquea el secreto.

| Nivel | Mecanismo | Estado |
|-------|-----------|--------|
| 1 · Local | Hook pre-commit con Gitleaks | ✅ activo |
| 2 · CI | Workflow de Gitleaks (historial completo) | ✅ activo (job en `ci.yml`) |
| 3 · Servidor | Secret scanning nativo de GitHub | ✅ activo (repo público) |
| 4 · Config | `.gitleaks.toml` compartido (allowlist de falsos positivos) | ✅ |

> 🎮 Simulador de ciberseguridad: los casos del juego contienen credenciales **ficticias**
> a propósito (contenido educativo); están allowlistadas en el `.gitleaks.toml`.

## Cómo funciona cada capa

1. **Hook local** — `hooks/pre-commit` (activado con `core.hooksPath=hooks`) ejecuta
   `gitleaks protect --staged` antes de cada `git commit`: si detecta un secreto,
   aborta el commit. Incluye bootstrap automático del binario (release oficial de
   Gitleaks). Salto puntual documentado: `git commit --no-verify` (solo si sabes
   lo que haces).
2. **CI** — el job `gitleaks` del workflow `ci.yml` ejecuta Gitleaks con `fetch-depth: 0`, que escanea **todo el
   historial** (no solo el último commit): un secreto subido hace tiempo se detecta
   y bloquea el push/PR.
3. **Secret scanning nativo** — en los repos públicos,  GitHub revisa cada push y alerta
   sobre patrones de credenciales conocidos.
4. **Configuración compartida** — `.gitleaks.toml` en la raíz: allowlist de
   ejemplos de documentación, placeholders y credenciales **ficticias de tests**.
   Los falsos positivos nuevos se añaden ahí (con comentario), nunca desactivando
   Gitleaks.

## Si encuentras una fuga

- **No la subas**: pausa, borra la credencial del archivo y usa un secret/var de entorno.
- Si ya está en el historial: revoca la credencial y contacta con el propietario
  de la cuenta para purgar el historial (`filter-branch`/`filter-repo` + force-push).
- Gitleaks también se puede ejecutar a mano: `gitleaks detect --source . --redact`.

## Aviso sobre repos privados

El secret scanning nativo de GitHub en repos **privados** requiere GitHub Advanced
Security (plan de pago); en los públicos es gratis. Donde no está disponible, la
cobertura la dan las capas 1, 2 y 4 (hook + CI + allowlist).

## Cabeceras HTTP / CSP

Hay dos capas de Content-Security-Policy, según el host:

| Capa | Dónde actúa | Estado |
|------|-------------|--------|
| **Meta CSP** | `index.html` — GitHub Pages | ✅ efectiva (ver nota) |
| **`_headers`** | Netlify, Cloudflare Pages, servidores que lean `_headers` | ✅ verificada (test `headers`) |

### Dónde aplica la CSP por cabecera (y dónde no)

| Host | ¿Lee `_headers`? | Cabecera CSP con `frame-ancestors` |
|------|------------------|-----------------------------------|
| **GitHub Pages** | ❌ ignora `_headers` | ❌ imposible (solo meta CSP) |
| **Netlify** | ✅ sí | ✅ completa, incluido `frame-ancestors 'none'` |
| **Cloudflare Pages** | ✅ sí | ✅ completa, incluido `frame-ancestors 'none'` |
| **Servidor propio (nginx/apache, etc.)** | ⚠️ solo si configuras las cabeceras a mano | ✅ si se declara la misma política |

- **GitHub Pages ignora `_headers`**: el fichero es una convención de Netlify y
  Cloudflare Pages. El staff de GitHub lo confirma en la discusión oficial
  (orgs/community #54257 y #157852): no hay mecanismo de cabeceras propias en
  Pages; la `<meta http-equiv="Content-Security-Policy">` es el único camino.
  El check de integración (`prod-test.mjs`) lo verifica con HTTP real cada push:
  Pages no sirve la CSP como cabecera, solo añade `Strict-Transport-Security`.
- En GitHub Pages la capa efectiva es la **meta CSP** de `index.html`. Cubre
  `default-src/script-src/style-src/font-src/img-src/connect-src/base-uri/form-action/object-src`.
  Único matiz: `frame-ancestors` **no funciona en `<meta>`** (el navegador lo ignora,
  y un test lo verifica: la meta NO debe llevarla).
- **Dónde SÍ aplica la cabecera**: si CYBERGRAD se despliega a **Netlify o
  Cloudflare Pages**, el fichero `_headers` de la raíz se aplica tal cual y la
  CSP completa (incluido `frame-ancestors 'none'` + `X-Frame-Options: DENY` +
  `nosniff` + `Referrer-Policy`) llega como cabecera HTTP real. Mismos ficheros
  estáticos, sin tocar nada más. **Está verificado**: el test `test:headers`
  levanta un CDN local que lee `_headers` con la sintaxis Netlify/Cloudflare
  (bloques de ruta + cabeceras indentadas) y comprueba con HTTP real que la
  cabecera CSP llega completa a `/` y a `/sw.js` (17 checks, en el CI).
  Para desplegar a Netlify/Cloudflare Pages basta subir la carpeta del juego
  (o conectar el repo) — no hay configuración adicional: `_headers` se detecta
  automáticamente.
- **Servidor propio**: `_headers` no se aplica solo; hay que declarar las mismas
  cabeceras en la configuración del servidor (p. ej. `add_header` en nginx o
  `Header set` en Apache). El contenido de referencia está en `_headers`.

> Resumen: la meta CSP protege siempre; la cabecera con `frame-ancestors`
> protege en Netlify/Cloudflare Pages (y servidores configurados). GitHub
> Pages es el único caso donde `frame-ancestors` no es alcanzable.
