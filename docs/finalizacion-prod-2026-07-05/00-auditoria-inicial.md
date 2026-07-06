# Auditoria Inicial

Fecha: 2026-07-05.

## Docker actual

Comando usado desde WSL:

```bash
docker.exe ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```

Estado verificado:

- `jpamorosi-os-master-v4-amorosi-backend-1`: imagen `amorosi-labs-backend`, puerto host `3001 -> 3000`, `healthy`.
- `jpamorosi-os-master-v4-worker-1`: imagen `node:20-alpine`, sidecar worker, sin puerto publicado.
- `jpamorosi-os-master-v4-postgres-1`: imagen `pgvector/pgvector:pg16`, host `127.0.0.1:5433 -> 5432`, `healthy`.
- `jpamorosi-os-master-v4-autoheal-1`: imagen `willfarrell/autoheal`, `healthy`.

Hallazgo importante: el servicio `web` existe en `docker-compose.yml`, pero no esta corriendo ahora. El stack fue levantado como backend/admin emulator, probablemente con:

```bash
docker.exe compose --profile backend up --build -d amorosi-backend worker postgres autoheal
```

o equivalente. `docker.exe compose --profile backend config --services` lista `postgres`, `amorosi-backend`, `autoheal`, `web`, `worker`, pero `ps` no muestra `web`.

Interpretacion:

- `web` es el mirror publico de Vercel: `PROJECT_STORAGE_DRIVER=static`, `ADMIN_ENABLED=false`, puerto `3000`.
- `amorosi-backend` es el backend/admin durable: `PROJECT_STORAGE_DRIVER=local-json`, `PROJECT_PUBLIC_CONTENT_MODE=live`, `DATABASE_URL=postgres://amorosi:amorosi@postgres:5432/amorosi`, puerto host `3001`.
- Para produccion desacoplada, Vercel debe alojar el front publico y Dokploy/VPS debe alojar backend/admin/worker/postgres/searxng. No hace falta que el contenedor `web` corra en VPS salvo como smoke/prod mirror.

## Estructura principal

App principal: `frontend-app`, Next.js 15.5.18, React 18.3.1, TypeScript, Tailwind, GSAP, Lenis.

Servicios relevantes:

- `frontend-app/app/api/assistant/route.ts`: endpoint publico del agente conversacional; emite cookie `al_sid`.
- `frontend-app/lib/agent/orchestrator.ts`: cerebro del agente.
- `frontend-app/lib/agent/tools-server.ts`: herramientas server-side; Serper esta acoplado como `runWebSearchRaw`.
- `frontend-app/app/api/cron/daily-scout/route.ts`: scout diario, usa Serper y pipeline de prospects.
- `frontend-app/lib/agent/prospects.ts`: funnel `ingest -> filter -> enrich -> qualify -> contact`.
- `frontend-app/scripts/worker.mjs`: health observer + cron diario.
- `frontend-app/lib/db/bootstrap.ts`: bootstrap idempotente de tablas.
- `frontend-app/lib/media/storage.ts`: storage R2/local con fallback.
- `frontend-app/app/api/admin/media/route.ts`: upload/transcode de hero video con ffmpeg.
- `frontend-app/components/hall/Interludes.tsx`: interludios GSAP desktop/mobile.
- `frontend-app/components/ui/chapter-nav.tsx`: rail lateral de secciones.

## Secretos y variables actuales

Fuentes: `frontend-app/.env.example`, `.env.docker.local.example`, `.env.production.example`, `lib/env.ts`, `docker-compose.yml`.

Variables server-side principales:

- `DATABASE_URL`
- `ADMIN_ENABLED`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_ADMIN_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_IMAGE_MODEL`
- `WEB_SEARCH_API_KEY` (Serper)
- `INTERNAL_API_TOKEN` o `SERVICE_API_TOKEN`
- `PROJECT_STORAGE_DRIVER`
- `PROJECTS_JSON_PATH`
- `PROJECT_PUBLIC_CONTENT_MODE`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`

Variables publicas:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_MEDIA_CDN_BASE`
- `NEXT_PUBLIC_VIDEO_CDN_BASE`

Nota de seguridad: no exponer `DATABASE_URL`, `ADMIN_*`, `OPENROUTER_API_KEY`, `WEB_SEARCH_API_KEY`, `R2_*`, `RESEND_*`, `INTERNAL_API_TOKEN` al frontend. Solo `NEXT_PUBLIC_*` va al cliente.

## Sesiones, email y recuperacion

El sistema ya tiene una base razonable:

- Cookie anonima `al_sid`, `httpOnly`, `sameSite=lax`, 180 dias.
- Rebind por `deviceId` en `visitor_sessions.meta`.
- `leads` con indice unico parcial por `session_id`.
- `upsertLead` mergea datos sin pisar campos existentes con vacios.
- `SessionRecoveryCard` llama `POST /api/session/recover-request`.
- `recover-request` guarda/actualiza email en lead si hay cookie actual, busca lead por email y emite link firmado.
- `recover` valida HMAC/expiracion y reemite `al_sid`.

Riesgos detectados:

- El link de recuperacion no es single-use; expira por tiempo, pero puede reusarse durante 30 dias.
- Usa `ADMIN_SESSION_SECRET` como secreto de recuperacion de visitantes; funcional, pero semanticamente conviene separar `SESSION_RECOVERY_SECRET`.
- El boton/card de guardado esta montado abajo del transcript y consume alto vertical.
- El agente no parece tener una herramienta explicita para "mostrar card de captura/recuperacion" cuando la conversacion lo pide. Hoy la card esta siempre fija.

## Serper, prospecting y costo

Estado actual:

- `WEB_SEARCH_API_KEY` habilita Serper.
- `runWebSearchRaw(query, num)` hace `POST https://google.serper.dev/search`.
- `daily-scout` corre dos queries diarias rotativas y llama `ingestSearchHits`.
- `processPipelineBatch` vuelve a usar Serper en `filter -> enrich` para una busqueda fina.
- `harvestContact` ya fetches pagina/contact/about para extraer email y company, con timeouts y limites.
- Hay dedupe por URL cruda en `prospects_url_uidx`.
- Hay tracking de outreach por `tracked_links`.

Problemas:

- Serper es provider directo, no implementacion de una interfaz.
- No hay `SearchProvider`, `SearchRouter`, cache, canonical URL ni normalizacion comun.
- Dedupe por URL cruda no elimina tracking params ni variantes.
- No hay persistencia longitudinal de senales separada de `prospects`.
- No hay politicas por intencion: discovery amplio, verification, enrichment, job discovery.

## SearXNG local

Repo local inspeccionado: `searxng-master`.

Hallazgos verificados:

- Documentacion de API: `searxng-master/docs/dev/search_api.rst`.
- Endpoints soportados: `GET /`, `GET /search`, `POST /`, `POST /search`.
- `GET` usa query params; `POST` usa `application/x-www-form-urlencoded`.
- Para JSON hay que pedir `format=json`.
- JSON/CSV/RSS deben estar habilitados en `settings.yml`; si el formato no esta activo responde `403 Forbidden`.
- Compose upstream: `searxng-master/container/docker-compose.yml` define `core` (`searxng/searxng`) y `valkey`.
- Template upstream: `searxng-master/container/settings.template.yml` usa `use_default_settings: true`, `server.secret_key`, `image_proxy`.

Conclusion: no modificar upstream indiscriminadamente. Integrar SearXNG como servicio propio en nuestro compose/Dokploy usando config externa reproducible.

## Media y Home Media

Estado:

- `app/api/admin/media/route.ts` permite subir/transcodificar video hero global a `hero.mp4` y poster.
- `lib/media/store.ts` persiste `SiteSettings` con `heroVideo` e `interludes`.
- `InterludeImages` soporta `before1`, `before2`, `proof1`, `living1`.
- `Interludes.tsx` usa esos assets para imagenes de interludios.
- `storage.ts` ya admite `.mp4`, `.webm` y R2.

Limitacion:

- `InterludeImages` tipa solo strings de imagen; `InterludeImage` debe verificarse/adaptarse para video en `living1`.
- La imagen de perfil del hero viene de `profile.avatar`, no desde `SiteSettings`.

## UI/UX hallazgos pedidos

Chat:

- `ProjectStrip` muestra texto activo via `WIZARD[lang].stripActive` y fallback `—` cuando no hay stack.
- Cards de proyecto: `w-40`, alto por contenido, texto activo invisible cuando idle para evitar salto. Hay que compactar y hacerlas mas anchas/horizontales.
- `SessionRecoveryCard` esta fija abajo del transcript (`AssistantWidget.tsx`), con `border-t`, input y boton; buena idea, mala ubicacion/altura.
- `AssistantMessage` ya parsea markdown basico; hay margen para estilos mas ricos pero debe evitarse HTML inseguro.

Home:

- `HallHero` tiene CTAs: `Enter Proof Rooms`, `Explore Project Rooms`, `/os`.
- `Enter Proof Rooms` va a `#hall-of-fame`; se pide cambiar a `Let's started` y llevar al primer frame del interlude `before-the-systems` con `commerce` displayado.
- Contact band tiene `Email`, `Explore Projects`, `GitHub`.
- `ChapterNav` solo cubre secciones mayores, no interludios.
- Interludios mobile tienen timelines dedicadas, con `end: "bottom bottom"` y `scrub: 0.5`.
- Shimmer de nombre esta en `.lab-shimmer-text`.

Git:

- Worktree con no trackeados previos: `mediatest/`, `searxng-master/`.
- Esta carpeta de docs es nueva. No revertir ni tocar no trackeados existentes.

