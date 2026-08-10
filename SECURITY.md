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
| **`_headers`** | Cloudflare Pages / Netlify | ✅ lista (ver nota) |

- **GitHub Pages ignora `_headers`**: el fichero es una convención de Netlify y
  Cloudflare Pages. El staff de GitHub lo confirma en la discusión oficial
  (orgs/community #54257 y #157852): no hay mecanismo de cabeceras propias en
  Pages; la `<meta http-equiv="Content-Security-Policy">` es el único camino.
- En GitHub Pages la capa efectiva es la **meta CSP** de `index.html`. Cubre
  `default-src/script-src/style-src/font-src/img-src/connect-src/base-uri/form-action/object-src`.
  Único matiz: `frame-ancestors` **no funciona en `<meta>`** (el navegador lo ignora).
- El fichero `_headers` de la raíz activa la **CSP completa como cabecera HTTP**
  (incluido `frame-ancestors 'none'` + `X-Frame-Options: DENY` + `nosniff` +
  `Referrer-Policy`) si se despliega a **Cloudflare Pages o Netlify** — mismos
  ficheros estáticos, sin tocar nada más. Si algún día CYBERGRAD sale de GitHub
  Pages, esa es la vía para la cabecera real.
