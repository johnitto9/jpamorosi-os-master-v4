# AGENT OPS HARNESS — jpamorosi.dev en producción

> Conocimiento operativo destilado para un agente de desarrollo autónomo:
> acceso, topología, deploys, datos, máquinas autónomas, playbook de fallas.
> Todo lo de acá fue verificado en producción el 2026-07-09.

## 1. Acceso

```bash
ssh -i ~/.ssh/buenpick_vps root@76.13.230.238        # VPS (Dokploy host)
# Repo local (WSL): /mnt/c/Users/jamor/Downloads/jpamorosi-os-master-v4
# Clone que Dokploy deploya: /etc/dokploy/compose/jpamorosiprod-system-scxxge/code
```

- GitHub: `gh` en `~/.local/bin/gh`, autenticado (repo `johnitto9/jpamorosi-os-master-v4`).
- El token embebido en el clone del VPS es del bot de Dokploy y es **read-only**.

## 2. Topología (el mapa que explica todos los bugs)

```
Browser ── Cloudflare ── Vercel (www.jpamorosi.dev)
                          │  SSR de la home/páginas públicas — SIN DB, SIN LLM
                          │  rewrites beforeFiles: /api/* /admin* /preview* ──┐
                          ▼                                                  ▼
                    (páginas estáticas propias)          Traefik ── api.jpamorosi.dev
                                                                  │
                     VPS Dokploy: compose jpamorosiprod-system-scxxge
                     ├─ amorosi-backend  (Next standalone, TODA la lógica real)
                     ├─ postgres         (pgvector/pgvector:pg16, datos de todo)
                     ├─ worker           (node worker.mjs: health + crons diarios)
                     ├─ searxng + searxng-valkey (búsqueda soberana del scout)
                     └─ autoheal         (reinicia containers unhealthy)
```

**Ramas**: Vercel Production = `v4final`; `main` genera Previews; Dokploy
auto-deploya `main` (webhook, rebuild Docker completo ~5-8 min). El flujo es:
push a `main` y luego fast-forward `git push origin main:v4final`. Mantenerlas
idénticas.

**Lecciones de red (costaron un outage)**:
- Dokploy REESCRIBE el compose al deployar: inyecta labels Traefik y
  `networks: [dokploy-network]` al servicio con dominio. Un servicio con
  `networks:` explícito PIERDE la red `default` → por eso el compose del repo
  declara `networks: [default]` en `amorosi-backend` (Dokploy appendea, no
  reemplaza — verificado en su código).
- En `dokploy-network` vive el postgres DE DOKPLOY: el hostname `postgres`
  puede resolver mal si el backend no está en la red `default` del stack.
- Puertos: backend `127.0.0.1:3001->3000`, postgres `127.0.0.1:5433->5432`.
  **Nunca publicar en 0.0.0.0** — el tráfico público entra sólo por Traefik.

## 3. Envs y build args (dónde viven de verdad)

- **Vercel**: `BACKEND_PUBLIC_ORIGIN=https://api.jpamorosi.dev` (¡en BUILD
  time — los rewrites y la CSP se compilan!), `NEXT_PUBLIC_SITE_URL`, etc.
  Sin secretos de backend en Vercel, nunca.
- **Dokploy**: la UI "Environment" persiste en SU postgres
  (`docker exec $(docker ps -q -f name=dokploy-postgres) psql -U dokploy -d dokploy`,
  tabla `compose`, columna `env`, filtrar `"appName"='jpamorosiprod-system-scxxge'`).
  En cada deploy Dokploy escribe ese env a `./.env` junto al compose.
  Editable por SQL (UPDATE ... replace/append) — el próximo deploy lo aplica.
- **Layering del backend** (compose `env_file`, el último gana):
  `frontend-app/.env.docker.local` (lab local) → `./.env` (Dokploy, prod).
- **Build args**: `BACKEND_ASSET_PREFIX=https://api.jpamorosi.dev` (Dokploy
  env → compose build arg → Dockerfile ARG). Hace que el HTML del backend
  referencie assets absolutos: Vercel 404ea estáticos ajenos ANTES de los
  rewrites (`x-matched-path: /_next/static/not-found.txt`), por eso el admin
  proxied necesita esto. La CSP de Vercel permite ese origin vía
  `BACKEND_PUBLIC_ORIGIN` (script/style/font/connect-src en next.config.js).

**Cambio de env sin rebuild** (rápido, para flags):
```bash
cd /etc/dokploy/compose/jpamorosiprod-system-scxxge/code
# editar .env  +  reflejar el cambio en la DB de dokploy para persistirlo
docker compose -p jpamorosiprod-system-scxxge --profile backend --profile search \
  up -d --no-build amorosi-backend worker
```

## 4. Datos (postgres del stack — fuente de verdad)

```bash
docker exec jpamorosiprod-system-scxxge-postgres-1 psql -U amorosi -d amorosi
```

| Tabla | Qué es |
|---|---|
| `projects` | contenido vivo del portfolio (source of truth, admin edita acá) |
| `prospects` | funnel outbound: ingest→filter→enrich→contact→contacted / discarded |
| `leads` | inbound del Orbe (email/tel capturados), `followed_up_at` |
| `email_logs` | TODO envío (ok/error/provider_id) — auditar acá SIEMPRE |
| `ai_logs` | cada llamada LLM (ok, error, latency_ms) — debug del Orbe |
| `content_translations` | cache de traducciones (cache_key, lang, source_hash) |
| `sessions/events/...` | memoria del asistente y telemetría |

## 5. Máquinas autónomas y compuertas

- **Worker** (`frontend-app/scripts/worker.mjs`): health-probe cada 60s;
  1×/día dispara `POST /api/cron/daily-scout` (scout) y
  `POST /api/cron/heartbeat` (pulso: followups + outreach + digest).
- **Heartbeat manual** (desde dentro del backend, token sin imprimir):
```bash
docker exec jpamorosiprod-system-scxxge-amorosi-backend-1 sh -c \
 'wget -qO- --header="Authorization: Bearer $INTERNAL_API_TOKEN" \
  --post-data="{}" --header="Content-Type: application/json" \
  http://127.0.0.1:3000/api/cron/heartbeat'
```
- **Compuertas** (abiertas el 2026-07-09, en Dokploy env):
  - `OUTBOUND_LEAD_EMAILS_ENABLED=true` — master gate en `sendEmail()`
    (bloquea sólo `lead_followup` y `prospect_outreach`).
  - `AGENT_FOLLOWUP_ENABLED=true` — followups a leads (3/ciclo).
  - `AGENT_PROSPECT_OUTREACH_ENABLED=true` — outreach frío (default 4/ciclo,
    sólo stage=contact con email válido, dedupe por email vía stage
    `contacted`).
  - `PROSPECT_OUTREACH_PER_CYCLE` (opcional, default 4) — cap por ciclo,
    dial-eable desde el `.env` de Dokploy SIN rebuild (`up -d --no-build`).
    Subir gradual sólo si el funnel tiene contactos accionables reales;
    `isActionableEmail` acota lo que efectivamente sale.
- ⚠️ **Sin lock de idempotencia entre heartbeats concurrentes**: dos ciclos
  simultáneos (p.ej. trigger manual + catch-up del worker recién reiniciado)
  duplicaron followups una vez. No dispares heartbeat justo tras reiniciar
  el worker; espaciar y verificar `email_logs` después.
- LLM: OpenRouter `z-ai/glm-5.2`, `reasoning:{effort:"low"}` (13s→5s medido),
  timeout 25s, retry único con presupuesto doble si `finish=length`.

## 6. Smoke tests canónicos

```bash
curl -s https://api.jpamorosi.dev/api/status          # backend directo
curl -s https://www.jpamorosi.dev/api/status          # vía rewrite (igual)
# TODO true + storageDriver=postgres. pgvector:false o latencia ~4s
# = backend sin DB (ver playbook).
curl -s -H "Cookie: al_lang=es" https://www.jpamorosi.dev/ | grep -c sobrevivieron  # i18n SSR
curl -s "https://www.jpamorosi.dev/api/i18n/content?lang=es" | head -c 200          # cache traducciones
# Assistant (cookie al_sid debe setearse):
curl -si -X POST https://www.jpamorosi.dev/api/assistant -H 'Content-Type: application/json' \
  -d '{"message":"hola","history":[],"attachments":[],"page":"/","thread":0,"lang":"es","projectIds":[]}' | grep -i "al_sid\|HTTP"
```

## 7. Playbook de fallas (síntoma → causa probable → verificación)

| Síntoma | Causa probable | Verificar |
|---|---|---|
| `/api/status` tarda ~4s o `pgvector:false` | backend sin ruta/DNS a postgres (red default perdida) | `docker exec ...backend-1 getent hosts postgres searxng`; `docker inspect` networks — debe tener AMBAS redes |
| Admin sin estilos | assetPrefix ausente en build o CSP sin el origin | ver `<link href=` en el HTML del admin (debe ser absoluto a api.*) y header CSP de www |
| Magic link "no llega" | (1) JS del form muerto (2) email fuera de la allowlist `ADMIN_EMAIL` (lista con comas) (3) spam | `email_logs` template=magic_link — si ok=t, ES spam/entrega, no código |
| Orbe cae a fallback ("se me trabó") | timeout / JSON truncado / blank | `ai_logs` (error: no_response=timeout, bad_output=parse) y `docker logs \| grep outcome=` |
| Cards en inglés con chrome traducido | Vercel no alcanza `/api/i18n/content` | curl al endpoint; `content_translations` en DB |
| Contenedor flapping | healthcheck + autoheal | `docker logs ...backend-1`, healthcheck usa `127.0.0.1` (no localhost/IPv6) |
| Deploy Dokploy no arranca | webhook/auto-deploy | `git log -1` del clone en `/etc/dokploy/compose/.../code` vs origin/main |

## 8. Invariantes de seguridad (NO romper)

1. Jamás publicar 3001/5432 en interfaz pública (loopback only).
2. Jamás copiar secretos de backend a Vercel ni imprimirlos en logs/chat
   (`OPENROUTER_API_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `R2_*`,
   `ADMIN_*`, `INTERNAL_API_TOKEN`).
3. Promoción a prod SIEMPRE fast-forward `main:v4final` (nada de force/rebase).
4. `vm.overcommit_memory=1` pendiente en el host (warning de Valkey) —
   cambio host-level, no del repo.
5. Antes de tocar la DB de Dokploy: `SELECT` primero, `UPDATE` quirúrgico
   con `WHERE "appName"=...`, y verificar con otro `SELECT`.

## 9. Docs hermanos

- `docs/resend-email-system.md` — sistema de emails y compuertas en detalle.
- `docs/secrets-and-deploy.md`, `docs/deploy-vps.md` — deploy base.
- `develop-history/` — bitácora histórica de fases.
