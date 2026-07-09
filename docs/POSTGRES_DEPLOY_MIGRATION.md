# POSTGRES — Fuente de verdad, dump y migración a VPS/Dokploy (2026-07-09)

## Arquitectura de persistencia (verificada con evidencia, no con docs viejas)

```
ADMIN (write) ──► getProjectRepository() ──► PROJECT_STORAGE_DRIVER=postgres
                                              └► tabla `projects` (slug PK,
                                                 tier/published/sort_order
                                                 espejados, doc JSONB canónico)
BACKEND/API pública (live) ──► misma repository ──► Postgres
VERCEL (static) ──► content/projects.ts ──► importa content/projects.data.json
                                             (GENERADO desde Postgres)
```

- **Postgres es la única fuente de verdad** del contenido de proyectos.
- `/app/data/projects.json` (volumen `amorosi_backend_data`) quedó como
  **backup congelado** de la era local-json (2026-07-09). No es autoridad;
  no borrarlo, no editarlo.
- `content/projects.data.json` es un **artefacto generado** — nunca editarlo
  a mano; se regenera con el export (abajo).
- Lo demás de la DB (leads, sesiones, prospects, traducciones, eventos,
  brand DNA, assets) siempre vivió en Postgres — sin cambios.

## Comandos (desde `frontend-app/`, WSL usa `DOCKER=docker.exe`)

| Comando | Qué hace |
|---|---|
| `pnpm projects:migrate:dry-run` | Valida el JSON exportado contra el zod-schema y reporta qué haría (requiere `DATABASE_URL` y `PROJECTS_JSON`) |
| `pnpm projects:migrate` | Upsert transaccional por slug → tabla `projects` (idempotente, repetible) |
| `pnpm projects:export-static` | Postgres → `content/projects.data.json` determinista; **falla** si falta un proyecto crítico (lumenscript, buenpick, bbn, delify, trading-ecosystem, recapp-azure, dataset-creator) |
| `DOCKER=docker.exe pnpm db:dump` | `pg_dump -Fc` → `backups/postgres/amorosi-<ts>.dump` + SHA-256 (backups/ está gitignored) |
| `DOCKER=docker.exe pnpm db:restore <file.dump>` | Restore con confirmación explícita (`--clean --if-exists`) + verificación de checksums y row counts |

`DATABASE_URL` local desde el host: `postgres://amorosi:amorosi@localhost:5433/amorosi`.

## Flujo de publicación al front estático (Vercel)

1. Editar proyectos en `/admin` (escribe Postgres).
2. `DATABASE_URL=... pnpm projects:export-static`
3. Revisar el diff de `content/projects.data.json` (limpio y determinista).
4. Commit + push a la rama de producción (ver DEPLOY_FRONT_CUTOVER_2026-07-09.md).

## Migración de la DB al VPS/Dokploy

```bash
# 1. Preflight local
curl -fsS http://localhost:3001/api/health && curl -fsS http://localhost:3001/api/status

# 2-4. Backup + dump + checksum (un solo paso, lo hace todo)
DOCKER=docker.exe ./scripts/db-dump.sh
#    → backups/postgres/amorosi-YYYYMMDD-HHMMSS.dump (+ .sha256)

# 5. Copiar al VPS de forma segura
scp backups/postgres/amorosi-*.dump* user@vps:/srv/backups/

# 6. Restaurar en el VPS (con el stack de compose levantado)
ssh user@vps 'cd /srv/app && ./scripts/db-restore.sh /srv/backups/amorosi-XXXX.dump'
#    (pide teclear "restore"; verifica checksum y muestra row counts)

# 7-9. Verificación en el VPS
docker exec <pg> psql -U amorosi -d amorosi -tAc \
  "SELECT count(*) FROM projects; SELECT slug FROM projects ORDER BY slug"
#    Esperado: 11 filas; presentes dataset-creator, recapp-azure,
#    trading-ecosystem (Leviathan), delify.

# 10. Healthcheck backend
curl -fsS https://<host>/api/health && curl -fsS https://<host>/api/status
#    status debe reportar storageDriver: "postgres"
```

**Rollback**: restaurar el dump previo (`db-restore.sh` con el archivo
anterior) — cada dump queda con timestamp y checksum en `backups/postgres/`.

## Qué incluye el dump (y qué considerar NO promover)

El dump es la DB completa — correcto para el cutover: proyectos,
`content_translations` (ahorra re-pagar el LLM por 11 idiomas), leads,
brand DNA y assets de sesiones.

Datos locales que viajan pero que podés limpiar post-restore si molestan
(evidencia: son operativos/de prueba, no contenido):

```sql
-- opcional, en el VPS, tras verificar:
TRUNCATE email_logs, ai_logs;            -- logs de la operación local
DELETE FROM events WHERE created_at < now() - interval '30 days';
-- visitor_sessions/agent_messages: sesiones de prueba locales; truncar
-- SOLO si no querés conservar el historial de leads asociado.
```

No hay razón fuerte para excluirlos del dump en sí (complejidad > beneficio);
la limpieza post-restore es más simple y auditable.

## Precedencia de envs (gotcha)

`docker-compose.yml > .env.docker.local` para las claves definidas en
`environment:` — el driver se cambió EN EL COMPOSE
(`PROJECT_STORAGE_DRIVER: postgres`); la línea vieja `local-json` del
`.env.docker.local` quedó inerte para el backend.
