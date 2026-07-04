# SECURITY STATUS — ¿ya quedó la ciberseguridad?

**Updated:** 2026-07-04 · maps to `specs/17_SECURITY_BASELINE.md`

## Respuesta corta

- **Seguridad de la APLICACIÓN (código): esencialmente COMPLETA ✅.** Auth admin,
  cookies, CSRF, rate limiting, uploads, boundary del LLM, APIs internas, health,
  binding de Postgres — todo hecho y validado por build.
- **Seguridad de INFRAESTRUCTURA (VPS/Cloudflare): NO hecha 👤.** Es acción tuya
  sobre tu servidor y tu panel de Cloudflare, y **es el riesgo más grande que
  queda antes de exponer el sitio a internet.** No es código.

En una frase: **el código está blindado; falta blindar la caja donde corre.**

---

## Detalle por criterio (spec 17 acceptance)

| Criterio | Estado | Qué se hizo / qué falta |
|---|:--:|---|
| Postgres no público | ✅ | Compose bindea `127.0.0.1:5433` (verificado en el contenedor corriendo). En prod: sin `ports`, solo red interna. |
| Sin puertos backend crudos innecesarios | 🟡 👤 | `3000/3001` se publican local. En VPS: bindear a loopback + reverse proxy detrás de Cloudflare. |
| Admin defense-in-depth | ✅ | scrypt hash (nunca plaintext) · cookie `HttpOnly`+`Secure(prod)`+`SameSite=Lax`+TTL · **rate limit** 8/10min · **validación de origin/CSRF** en mutaciones. 👤 recomendado: Cloudflare Access sobre `/admin/*`. |
| Uploads validados | ✅ | Allowlist de extensiones + caps de tamaño + **sniff de magic-bytes** (rechaza contenido que no coincide) + **SVG bloqueado** (XSS). |
| APIs internas/cron protegidas | ✅ | `guardInternal` bearer (`INTERNAL_API_TOKEN`); OFF (503) si no hay token. |
| Secretos ausentes del contexto del LLM | ✅ | Auditado: `buildContext` no incluye env/tokens/cookies/secretos. Tools whitelisted + args validados con zod. |
| Health endpoint mínimo | ✅ | Público devuelve solo `{"ok":true}`; el detalle (db/uptime) requiere bearer interno. |
| Cloudflare SSL Full(strict) + WAF + rate limit edge | ❌ 👤 | En tu panel de Cloudflare. No es código. |
| Origin bypass / Authenticated Origin Pulls | ❌ 👤 | Evitar acceso directo a la IP del VPS salteando Cloudflare. |
| Docker socket / autoheal | ⚠️ 👤 | `autoheal` monta `/var/run/docker.sock` (superficie de escape). En prod: quitarlo (Dokploy ya reinicia) o socket-proxy. Documentado, decisión pendiente. |
| VPS hardening (firewall/SSH keys/Fail2Ban/updates) | ❌ 👤 | Default-deny inbound, solo puertos necesarios, SSH keys, sin root directo, updates automáticos. |
| Backups + restore drill | 🟡 👤 | Procedimiento documentado en `RELEASE_PROD_READINESS.md`; falta correr el drill (snapshot + dump encriptado off-host + restore test). |

Extra fixes de esta ronda (no en el checklist pero reales):
- ✅ **Bug del healthcheck Docker** (IPv6 `localhost` → `127.0.0.1`) que causaba un
  loop de reinicio cada ~99s. Arreglado.
- ✅ **Secretos NO en git** (verificado: `secrets/` + `.env*` gitignored).

---

## Veredicto

**¿Ya quedó la ciberseguridad?**

- Para **desarrollo / uso local / la versión de Vercel estática (admin OFF)**:
  **sí, alcanza.** No hay superficie sensible expuesta.
- Para **exponer el backend/admin en el VPS a internet**: **todavía NO.** Falta la
  capa de infra (Cloudflare edge, firewall del VPS, decisión del docker.sock,
  drill de backup). Ninguno es código — son pasos de ops en tu servidor.

### Checklist mínimo antes de deploy público del backend (👤 tu acción)
1. Cloudflare: SSL/TLS **Full (strict)**, WAF on, rate-limit en `/api/assistant`,
   `/api/admin/login`, `/api/contact`.
2. Cloudflare Access delante de `/admin/*` (segunda capa sobre el login).
3. Firewall del VPS default-deny; publicar solo 80/443; app en loopback + proxy.
4. Postgres: quitar el mapeo de puerto en el compose de prod (solo red interna).
5. `autoheal`: quitarlo o ponerle un socket-proxy restringido.
6. SSH: keys only, sin password, sin root directo, Fail2Ban, updates automáticos.
7. Backup: snapshot antes de deploy + dump diario encriptado off-host + probar un
   restore una vez.

Hasta que 1–7 estén, el sitio público conviene que sea **solo Vercel estático
(admin OFF)** — que no tiene DB ni admin y por lo tanto no tiene esa superficie.
