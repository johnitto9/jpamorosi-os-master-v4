# Secrets & deploy — cómo pasar credenciales sin quemarlas

## Regla de oro
**Nada sensible entra a git.** El `.gitignore` raíz excluye `secrets/`,
`.secrets/`, `*.secret`, `credentials.txt`, `.env*` (menos `*.example`) y los
repos de referencia (`proyecto_buen_pick/`, `BBNfinprod/`, `delibot/`).
Verificá siempre con `git check-ignore -v secrets/` antes de commitear.

## Dónde viven los valores reales
- **Local (humano):** `secrets/` en la raíz — material sensible LOCAL, jamás
  versionado, jamás copiado a archivos del repo.
- **Local (runtime dev):** `frontend-app/.env.local` (pnpm dev) — copiá las
  claves DESDE `secrets/` a mano. Este archivo está ignorado.
- **Docker backend:** `frontend-app/.env.docker.local` (lo consume el
  `env_file` del compose). Ignorado.
- **Vercel:** Project Settings → Environment Variables (UI o `vercel env`).
- **VPS/Dokploy futuro:** variables del panel o `.env` del servidor con
  permisos 600 — nunca en la imagen.

## Variables por integración
| Integración | Variables | Sin ellas |
|---|---|---|
| Postgres | `DATABASE_URL` | agente memory-lite, sin leads/eventos |
| LLM (OpenRouter) | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_IMAGE_MODEL` | asistente determinista, sin mockups |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ADMIN_TO_EMAIL`, `OUTBOUND_LEAD_EMAILS_ENABLED` | sin key se loguea; con gate `false` solo se bloquea outbound a leads/prospects |
| Admin | `ADMIN_ENABLED=true`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAIL` | admin apagado (401/redirect) |
| Cloudflare R2 | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` | uploads al volumen local durable |
| Cloudflare (gral) | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | reservadas (purge/cdn futuro) |
| Media CDN | `NEXT_PUBLIC_MEDIA_CDN_BASE` | assets servidos locales |
| Internal APIs | `INTERNAL_API_TOKEN` (o `SERVICE_API_TOKEN`) | `/api/internal/*` responde 503 |
| Web search | `WEB_SEARCH_API_KEY` (serper.dev) | tool oculta al modelo |
| Rate limit distribuido | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | fallback in-memory; no alcanza para Vercel/serverless serio |

## Reglas operativas
1. Nunca commitear credenciales ni copiarlas a archivos versionados.
2. Nunca mostrar tokens completos en logs (los servicios ya truncan errores).
3. Generar `ADMIN_PASSWORD_HASH` con `node scripts/generate-admin-hash.mjs`.
4. `ADMIN_SESSION_SECRET`: 32+ chars random (`openssl rand -base64 32`).
5. Rotación: cambiar el valor en el entorno correspondiente y redeployar;
   ningún secreto está cacheado en build (se leen en runtime).

## Pasar de local a producción (checklist)
1. Crear las env vars en Vercel/VPS copiando desde `secrets/` (a mano o con
   `vercel env add NOMBRE`). No pegar valores en terminal compartida/CI logs.
2. `RESEND_FROM_EMAIL` debe ser de un dominio verificado en Resend.
3. `NEXT_PUBLIC_SITE_URL` = URL pública real (los magic links la usan).
4. Verificar `GET /api/status` en prod: flags esperados en `true`.
5. Confirmar que `GET /api/health` responde 200 y `db: "ok"`.

## Compuerta outbound a leads/prospects

`OUTBOUND_LEAD_EMAILS_ENABLED` es una compuerta separada de Resend:

- `false`: permite emails internos/admin (`scout_digest`, `daily_pulse`,
  `lead_received`, magic links), pero bloquea templates customer-facing como
  `lead_followup` y `prospect_outreach`.
- `true`: permite que esos templates salgan realmente, siempre que Resend este
  configurado.

Valor recomendado para staging y primeros deploys:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Levantar la compuerta solo despues de:

1. Dominio Resend verificado (`RESEND_FROM_EMAIL` real).
2. `GET /api/admin/email-logs` revisado sin errores raros.
3. `/admin/prospects` con candidatos revisados manualmente.
4. CSV/export de mailing candidates verificado.
5. Prueba con un solo prospect de bajo riesgo.

Rollback inmediato:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Redeploy/restart backend y worker. Esto no apaga admin alerts ni magic links.

## Rate limit en producción

Los endpoints públicos que pueden consumir LLM/tools (`/api/assistant` y
`/api/ai/chat`) tienen rate limit. En Docker/local funciona con memoria de
proceso. En Vercel/serverless eso no alcanza porque el proceso puede reiniciar.

Para prod serio configurar Upstash Redis REST:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Sin esas variables, el limiter sigue activo pero solo como defensa local.
