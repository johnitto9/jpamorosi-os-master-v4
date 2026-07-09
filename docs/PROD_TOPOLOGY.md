# PROD TOPOLOGY — Vercel front + Dokploy backend (2026-07-09)

## El split-brain que existía (causa raíz)

jpamorosi.dev corre en Vercel **con cero env vars**. Como este repo contiene
los route handlers, TODAS las rutas `/api/*` y las páginas `/admin` ejecutaban
como funciones de Vercel — sin DB, sin secrets: chat determinístico y sin
memoria, `/admin` → "Admin not configured", leads perdidos. El backend Dokploy
estaba perfecto pero **nada lo enrutaba**: no existía rewrite, proxy,
middleware ni vercel.json (verificado en código).

## Topología final

```
browser ── https://jpamorosi.dev ───────────────► VERCEL
   │            páginas públicas (SSR/estático, seed compilado)
   │
   ├─ /api/*  /admin*  /preview*  ── beforeFiles rewrite (same-origin) ──►
   │                                   $BACKEND_PUBLIC_ORIGIN (Dokploy)
   │                                        │
   │                                   amorosi-backend:3000
   │                                    ├─ postgres:5432   (fuente de verdad)
   │                                    ├─ searxng:8080 ── valkey
   │                                    └─ worker (cron scout/heartbeat)
   └─ media ── https://media.jpamorosi.dev (R2, directo, sin proxy)
```

- El cable vive en `frontend-app/next.config.js` → `rewrites().beforeFiles`,
  activo SOLO cuando `BACKEND_PUBLIC_ORIGIN` está seteada (Vercel, **build
  time**). `beforeFiles` es obligatorio: con rewrites normales las rutas
  locales del propio repo ganarían y la request nunca saldría de Vercel.
- Local / Docker / **Dokploy**: la var queda SIN setear → cero rewrites, cada
  runtime sirve sus propias rutas igual que siempre. **No setear
  BACKEND_PUBLIC_ORIGIN en Dokploy** (se proxiaría a sí mismo).
- Cookies (`al_sid`, sesión admin): el proxy es same-origin para el browser y
  Vercel reenvía `Set-Cookie` — dominio jpamorosi.dev, `SameSite=Lax` intacto.
- ⚠ Límite conocido: el proxy de rewrites de Vercel corta upstreams lentos
  (~30s). El chat (≤25s LLM) entra; la GENERACIÓN de imágenes (60–85s) puede
  cortarse vía dominio público — mitigación futura: job async o subdominio
  directo del backend para `/api/assistant/generate|branding`.

## Qué vive dónde (rutas)

| Ruta | Runtime real | Necesita |
|---|---|---|
| `/`, `/projects*`, `/cv`, `/os` (páginas) | Vercel | seed compilado |
| `/api/*` (assistant, sessions, media, admin, leads, track, contact, status, projects, cron, internal) | **Dokploy** vía proxy | DB, secrets, R2, LLM |
| `/admin*`, `/preview*` (páginas SSR) | **Dokploy** vía proxy | ADMIN_*, DB |
| media estática | R2/CDN directo | — |

## Envs

**Vercel** (plantilla: `secrets/vercel-prod.env`): REQUIRED
`BACKEND_PUBLIC_ORIGIN` (el dominio que asignes al backend en Dokploy →
Domains, port 3000 — p.ej. `https://api.jpamorosi.dev`; requiere redeploy de
Vercel al setearla), `NEXT_PUBLIC_SITE_URL`, `APP_ENV=production`,
`PROJECT_STORAGE_DRIVER=static`, `PROJECT_PUBLIC_CONTENT_MODE=static`,
`ADMIN_ENABLED=false`. RECOMMENDED `NEXT_PUBLIC_MEDIA_CDN_BASE`. **PROHIBIDO**:
OPENROUTER/RESEND/R2 secrets/ADMIN_HASH/SESSION_SECRET/INTERNAL_API_TOKEN/
DATABASE_URL — con el proxy, Vercel no necesita ningún secreto del backend.

**Dokploy**: sin cambios (ver `secrets/dokploy-prod.env`). NO agregar
`BACKEND_PUBLIC_ORIGIN`.

## Robustez env (fix 2026-07-09)

`lib/env.ts`: una var opcional inválida (p.ej. `UPSTASH_REDIS_REST_URL=""`)
colapsaba TODA la config a defaults (driver→static, email/R2/search muertos con
valores correctos en process.env). Ahora la recuperación es **por campo**: se
dropean solo las keys inválidas (log por NOMBRE, jamás valores) y el resto
sobrevive. Regresión: `tests/env_recovery.spec.ts`.

## Observabilidad LLM

`lib/agent/llm.ts` emite una línea `[agent:llm] outcome=<tag>` sin PII:
`http_<status>`, `timeout`, `network`, `finish_length_content_null`,
`content_null`, `empty_content`, `retry_length_recovered/failed`. El edge
verificado de GLM (HTTP 200, `finish_reason=length`, content null porque el
*reasoning* comió el presupuesto) dispara **un único retry** con el doble de
`max_tokens` (cap 1600). Grepear en prod: `docker logs <backend> | grep outcome=`.
Nota: si `docker logs` parece vacío tras una request conocida, revisar que se
mira el contenedor correcto del project (`docker ps -qf name=<project>-amorosi-backend`)
— Dokploy también duplica logs en su UI.

## Valkey — nota operativa (host-level, NO compose)

`searxng-valkey` avisa `Memory overcommit must be enabled`. Es tuning del
kernel del VPS (una vez, como root):
```bash
sysctl vm.overcommit_memory=1
echo "vm.overcommit_memory=1" >> /etc/sysctl.conf   # persistir
```
Sin esto valkey funciona igual; solo arriesga fallos de BGSAVE bajo presión de
memoria. No meter `privileged`/sysctls en el compose por esto.

## Pasos de deploy del cable

1. Dokploy → servicio `amorosi-backend` → Domains → crear dominio backend
   (DNS A/CNAME al VPS; Traefik emite TLS; container port **3000**).
2. Smoke directo: `curl https://<backend-domain>/api/status` → `storageDriver:"postgres"`.
3. Vercel → Environment → pegar `secrets/vercel-prod.env` (con el dominio real
   en `BACKEND_PUBLIC_ORIGIN`).
4. **Redeploy Vercel** (los rewrites se compilan en build).
5. Smoke same-origin: `https://jpamorosi.dev/api/status` debe devolver el
   status del BACKEND (database=true) · `/admin` debe pedir login (no
   "not configured") · chat responde con memoria (crear proyecto, recargar).
6. Cutover completo.
