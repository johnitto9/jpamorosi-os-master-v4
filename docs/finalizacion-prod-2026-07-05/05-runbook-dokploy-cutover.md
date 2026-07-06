# Runbook Dokploy / VPS Cutover

## Principio

Vercel sirve el front publico desacoplado. Dokploy/VPS sirve backend, admin, worker, Postgres y SearXNG privado. El servicio `web` del compose queda como mirror/smoke, no como front principal.

## Comandos seguros localmente

El servicio `web` esta detras de `--profile web`; no se levanta en el runtime normal de backend/admin. El puerto correcto de trabajo local es `localhost:3001`.

Backend vivo actual:

```bash
docker.exe compose --profile backend up --build -d amorosi-backend worker
curl -fsS http://localhost:3001/api/health
docker.exe compose ps
```

SearXNG solo:

```bash
docker.exe compose --profile search up -d searxng searxng-valkey
```

Mirror publico `web` solo si se necesita smoke puntual:

```bash
docker.exe compose --profile web up --build -d web
docker.exe compose stop web
```

## Secretos VPS/Dokploy

Configurar en Dokploy para `amorosi-backend` y `worker`:

```env
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev
ADMIN_ENABLED=true
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
ADMIN_EMAIL=
INTERNAL_API_TOKEN=
DATABASE_URL=postgres://amorosi:<password>@postgres:5432/amorosi
PROJECT_STORAGE_DRIVER=postgres
PROJECT_PUBLIC_CONTENT_MODE=live
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_ADMIN_TO_EMAIL=
OUTBOUND_LEAD_EMAILS_ENABLED=false
OPENROUTER_API_KEY=
OPENROUTER_MODEL=z-ai/glm-5.2
OPENROUTER_IMAGE_MODEL=bytedance-seed/seedream-4.5
WEB_SEARCH_API_KEY=
SEARXNG_ENABLED=true
SEARXNG_BASE_URL=http://searxng:8080
SEARXNG_TIMEOUT_MS=8000
SEARXNG_FALLBACK_TO_SERPER=true
SEARCH_PRIMARY_PROVIDER=searxng
SEARCH_PREMIUM_PROVIDER=serper
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=
NEXT_PUBLIC_MEDIA_CDN_BASE=
```

No poner secretos en Vercel salvo que se decida correr inteligencia desde Vercel. Recomendacion: Vercel solo publico; backend privado con secretos en VPS.

## Dump local

Crear carpeta:

```bash
mkdir -p backups
```

Dump Postgres:

```bash
docker.exe exec jpamorosi-os-master-v4-postgres-1 pg_dump -U amorosi -d amorosi -Fc -f /tmp/amorosi.dump
docker.exe cp jpamorosi-os-master-v4-postgres-1:/tmp/amorosi.dump ./backups/amorosi.dump
```

Backup media local si todavia hay datos fuera de R2:

```bash
docker.exe cp jpamorosi-os-master-v4-amorosi-backend-1:/app/data ./backups/app-data
```

## Restore VPS

1. Crear stack con `postgres` healthy.
2. Detener backend y worker.
3. Copiar dump:

```bash
docker cp amorosi.dump <postgres_container>:/tmp/amorosi.dump
```

4. Restaurar:

```bash
docker exec <postgres_container> pg_restore -U amorosi -d amorosi --clean --if-exists /tmp/amorosi.dump
```

5. Levantar backend y worker.

## Smoke

```bash
curl -fsS https://api.jpamorosi.dev/api/health
curl -fsS https://api.jpamorosi.dev/api/status
```

Validaciones manuales:

- Login admin.
- Home Media sube imagen y video.
- Assistant responde y crea cookie `al_sid`.
- Card `lead_capture` guarda email/company/need en dossier.
- Recovery email llega.
- Scout manual corre sin consumir Serper cuando SearXNG trae resultados suficientes.
- `/api/admin/prospects?format=jsonl&scope=all` descarga snapshot.

## SearXNG

Debe quedar sin `ports` publicos. Backend lo llama por red interna:

```env
SEARXNG_BASE_URL=http://searxng:8080
```

Verificar dentro de la red Dokploy:

```bash
curl -fsS http://searxng:8080/config
```

Si `/search?format=json` responde `403`, revisar `deploy/searxng/settings.yml`: `search.formats` debe incluir `json`.

## Cutover

1. Rotar secretos prod.
2. Restaurar dump en staging VPS.
3. Smoke staging.
4. Configurar dominios:
   - `www.jpamorosi.dev` -> Vercel.
   - `api.jpamorosi.dev` o `admin.jpamorosi.dev` -> Dokploy backend.
   - `media.jpamorosi.dev` -> R2/CDN.
5. Activar worker con `INTERNAL_API_TOKEN`.
6. Mantener `OUTBOUND_LEAD_EMAILS_ENABLED=false` durante staging y primeros lotes.
7. Activar `OUTBOUND_LEAD_EMAILS_ENABLED=true` solo despues de aprobar `06-finiquitacion-real-test-gate.md`.
8. Monitorear logs 24h.

## Activar outbound real

La compuerta controla solo emails hacia leads/prospects. No bloquea admin alerts,
magic links, scout digest ni daily pulse.

Precondiciones:

1. `RESEND_FROM_EMAIL` usa dominio verificado.
2. `RESEND_API_KEY` vive solo en Dokploy/VPS.
3. `OUTBOUND_LEAD_EMAILS_ENABLED=false` ya fue probado con scout/heartbeat.
4. `/admin/prospects` tiene candidatos revisados manualmente.
5. Export CSV de mailing candidates revisado.
6. `email_logs` no muestra errores de config.

Cambio:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=true
```

Reiniciar:

```bash
docker compose --profile backend --profile search up -d amorosi-backend worker
```

Prueba inicial:

1. Elegir 1 prospect en stage `contact`, con email y buen `fitReason`.
2. Enviar desde `/admin/prospects` con texto revisado.
3. Verificar:
   - `email_logs.status = sent`.
   - evento `email.sent`.
   - Resend dashboard accepted/delivered.
   - prospect pasa a `contacted` solo si Resend confirmo envio.

Limite operativo inicial:

- Primer dia: max 3 envios manuales.
- No activar automatizacion masiva hasta tener respuesta/deliverability sana.

Rollback:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Reiniciar backend/worker. Los prospects quedan intactos.

## Rate limit

Rate limit:

- En Docker single-process el limiter in-memory sirve para dev/lab.
- En Vercel/serverless o multi-replica, configurar Upstash:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Rollback

Mantener el dump previo al cutover. Si falla:

1. Detener backend/worker.
2. Restaurar dump anterior.
3. Desactivar `SEARXNG_ENABLED` si el fallo viene de discovery.
4. Volver a levantar backend/worker.
