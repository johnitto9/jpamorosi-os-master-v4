# Deploy VPS / Kubernetes-lite

## Arquitectura actual (compose)
```
web              -> imagen pública estática (espejo de Vercel, admin OFF)
amorosi-backend  -> Next standalone con admin+agente (profile "backend",
                    healthcheck /api/health, restart unless-stopped)
postgres         -> pgvector/pgvector:pg16 (healthcheck pg_isready,
                    volumen amorosi_pg_data)
volúmenes        -> amorosi_backend_data (projects.json + media/uploads)
```
Sin redis ni worker a propósito: se agregan el día que exista una cola real
o jobs largos (el seam está comentado en el compose).

## Correr local (dev)
```bash
cd frontend-app && WATCHPACK_POLLING=true pnpm dev   # WSL necesita polling
docker compose --profile backend up -d postgres      # DB en host:5433
```
Dev usa `.env.local` (DATABASE_URL=postgres://amorosi:amorosi@localhost:5433/amorosi).

## Correr el stack completo (prod-like)
```bash
cp frontend-app/.env.docker.local.example frontend-app/.env.docker.local  # completar
docker compose --profile backend --profile search up --build -d amorosi-backend worker searxng searxng-valkey
curl localhost:3001/api/health && curl localhost:3001/api/status
```

## VPS (Dokploy o docker plano)
1. Clonar repo (los secrets NO viajan por git — ver secrets-and-deploy.md).
2. Crear `frontend-app/.env.docker.local` en el servidor (chmod 600).
3. `docker compose --profile backend --profile search up --build -d amorosi-backend worker searxng searxng-valkey`.
4. Reverse proxy (Caddy/Traefik/nginx) → `:3001`, TLS automático.
5. Backups: `docker exec <pg> pg_dump -U amorosi amorosi > backup.sql` (cron)
   y snapshot del volumen `amorosi_backend_data` (media local).
6. Monitoreo: curl a `/api/health` (uptime) + `/api/status` (capacidades).

## Outbound email cutover

En VPS/Dokploy arrancar siempre con:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Esto permite admin alerts, scout digest y magic links, pero bloquea envios hacia
leads/prospects. Para habilitar outreach real:

1. Verificar dominio Resend y `RESEND_FROM_EMAIL`.
2. Correr scout/heartbeat con gate en `false`.
3. Revisar `/admin/prospects`, `email_logs` y export CSV.
4. Cambiar `OUTBOUND_LEAD_EMAILS_ENABLED=true`.
5. Reiniciar backend y worker.
6. Enviar un solo `prospect_outreach` manual desde admin.
7. Monitorear Resend dashboard + `email_logs`.

Rollback:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Reiniciar backend/worker. No requiere rollback de DB.

## Nota migración de imagen postgres
El volumen viejo fue inicializado por `postgres:16-alpine` (musl). La imagen
nueva es Debian: mismo pg16 pero distintas collations → para el volumen DEV
se recrea (`docker compose --profile backend down -v` solo si querés borrar
TODO; para solo la DB: `docker volume rm <proyecto>_amorosi_pg_data`). En un
futuro prod con data valiosa: dump + restore, no swap de imagen en caliente.

## Logs
`docker compose logs -f amorosi-backend` — el app loguea líneas `[event]`,
`[email]`, `[ai]`, `[assistant]`, `[storage]` greppeables y sin secretos.
