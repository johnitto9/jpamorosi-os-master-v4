# Plan Prod, Deploy y Datos

## Objetivo de arquitectura

Separar responsabilidades:

- Vercel: front publico, rapido, sin secretos sensibles, sin admin writable.
- VPS/Dokploy: backend/admin/API interna, worker, Postgres, SearXNG privado, storage/media si aplica.
- Cloudflare R2/CDN: media publica optimizada.
- Resend: email transactional/outreach.
- OpenRouter: cerebro LLM e imagenes.
- Serper: proveedor premium selectivo.
- SearXNG: radar amplio soberano.

## Servicios en VPS/Dokploy

Servicios minimos:

- `amorosi-backend`: Next standalone en Docker, puerto interno `3000`; exponer solo detras de dominio admin/API.
- `worker`: `node:20-alpine`, corre `frontend-app/scripts/worker.mjs`, red interna.
- `postgres`: `pgvector/pgvector:pg16`, sin puerto publico.
- `searxng`: `searxng/searxng`, red interna, sin puerto publico salvo debug temporal protegido.
- `searxng-valkey`: cache/rate support de SearXNG.
- `autoheal` o health/restart equivalente de Dokploy.

Opcional:

- `web`: mirror publico estatico para smoke. No es esencial si Vercel es el front publico.

## Variables de entorno por destino

### Vercel front publico

Mantener minimo:

- `NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev`
- `NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.jpamorosi.dev`
- `NEXT_PUBLIC_VIDEO_CDN_BASE=...` si Cloudflare Stream o CDN separado.
- `PROJECT_STORAGE_DRIVER=static` o `remote-api` si el front debe leer contenido live desde backend.
- `ADMIN_ENABLED=false`

No poner en Vercel:

- `DATABASE_URL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `OPENROUTER_API_KEY`
- `WEB_SEARCH_API_KEY`
- `R2_SECRET_ACCESS_KEY`
- `INTERNAL_API_TOKEN`

Excepcion: si se decide que Vercel tambien sirva `/api/assistant` con LLM, entonces necesita llaves. Recomendacion prod: que el front hable con backend API propio para inteligencia pesada y admin.

### VPS/Dokploy backend

Requeridas:

- `NODE_ENV=production`
- `APP_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev`
- `PROJECT_STORAGE_DRIVER=postgres` recomendado para prod o `local-json` si se mantiene volumen durable.
- `PROJECT_PUBLIC_CONTENT_MODE=live`
- `DATABASE_URL=postgres://...@postgres:5432/amorosi`
- `ADMIN_ENABLED=true`
- `ADMIN_USERNAME=...`
- `ADMIN_PASSWORD_HASH=...`
- `ADMIN_SESSION_SECRET=...`
- `ADMIN_EMAIL=...`
- `INTERNAL_API_TOKEN=...`

Servicios externos:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_ADMIN_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL=z-ai/glm-5.2`
- `OPENROUTER_IMAGE_MODEL=bytedance-seed/seedream-4.5`
- `WEB_SEARCH_API_KEY` (Serper)

Media:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL=https://media.jpamorosi.dev`
- `NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.jpamorosi.dev`

SearXNG nuevas:

- `SEARXNG_ENABLED=true`
- `SEARXNG_BASE_URL=http://searxng:8080`
- `SEARXNG_TIMEOUT_MS=8000`
- `SEARXNG_FALLBACK_TO_SERPER=true`
- `SEARCH_PRIMARY_PROVIDER=searxng`
- `SEARCH_PREMIUM_PROVIDER=serper`
- `SEARCH_CACHE_TTL_DISCOVERY_S=21600`
- `SEARCH_CACHE_TTL_VERIFICATION_S=3600`

## Contenedor `web`

Situacion actual: definido pero no corriendo.

Acciones:

1. Mantener `web` en compose como mirror de Vercel para smoke local, pero detras de `--profile web`.
2. Documentar dos comandos distintos:

```bash
docker.exe compose --profile web up --build -d web
docker.exe compose --profile backend up --build -d amorosi-backend worker postgres autoheal
docker.exe compose --profile search up -d searxng searxng-valkey
```

3. En Dokploy, no levantar `web` por defecto si Vercel es el front definitivo.
4. Si se necesita preview publico desde VPS, levantar `web` con dominio separado `preview.jpamorosi.dev`.

## Dump local de Postgres

Desde la maquina local con Docker Desktop:

```bash
docker.exe exec jpamorosi-os-master-v4-postgres-1 pg_dump -U amorosi -d amorosi -Fc -f /tmp/amorosi.dump
docker.exe cp jpamorosi-os-master-v4-postgres-1:/tmp/amorosi.dump ./backups/amorosi-$(date +%Y%m%d).dump
```

En PowerShell, si `$(date ...)` molesta:

```powershell
docker.exe exec jpamorosi-os-master-v4-postgres-1 pg_dump -U amorosi -d amorosi -Fc -f /tmp/amorosi.dump
docker.exe cp jpamorosi-os-master-v4-postgres-1:/tmp/amorosi.dump .\backups\amorosi.dump
```

Tambien exportar media local si `R2_*` no cubre todo:

```bash
docker.exe cp jpamorosi-os-master-v4-amorosi-backend-1:/app/data ./backups/app-data
```

## Restore en VPS/Dokploy

1. Crear stack con `postgres` healthy pero app detenida.
2. Copiar dump al contenedor:

```bash
docker cp amorosi.dump <postgres_container>:/tmp/amorosi.dump
```

3. Restaurar:

```bash
docker exec <postgres_container> pg_restore -U amorosi -d amorosi --clean --if-exists /tmp/amorosi.dump
```

4. Levantar `amorosi-backend`; el bootstrap idempotente completara columnas faltantes.
5. Smoke:

```bash
curl -fsS https://api.jpamorosi.dev/api/health
curl -fsS https://api.jpamorosi.dev/api/status
```

6. Validar admin, proyectos, media, assistant, scout manual.

## Readiness checklist

- `pnpm build` pasa en `frontend-app`.
- `pnpm test` pasa o tests criticos documentados.
- Docker build de `amorosi-backend` pasa.
- `/api/health` responde 200.
- Postgres no expone puerto publico.
- SearXNG no expone puerto publico.
- Admin solo en dominio protegido y con cookies secure.
- `ADMIN_SESSION_SECRET`, `INTERNAL_API_TOKEN`, llaves R2/Resend/OpenRouter/Serper rotadas para prod.
- R2 smoke test OK.
- Resend dominio verificado.
- Recovery email OK.
- Dump restore probado en entorno temporal.
- Worker corre scout una vez por dia y respeta idempotencia por evento `agent.daily_scout`.

## Riesgos prod

- `PROJECT_STORAGE_DRIVER=local-json` en prod requiere volumen durable y backup de `/app/data`; preferible migrar contenido a `postgres`.
- Recovery links reusables por 30 dias; mejorar a token single-use.
- `/api/admin/scout-run` usa URL interna local en el codigo actual; revisar que en contenedor/prod use `BACKEND_URL` o ruta correcta.
- SearXNG ya tiene abstraccion SearchProvider; falta prueba integrada con instancia real encendida y luego activar `SEARXNG_ENABLED=true`.
