# AUDITORÍA DE PERSISTENCIA DE PROYECTOS — 2026-07-09

Auditoría con evidencia real (código + contenedores + DB viva), y la
implementación que dejó a **Postgres como única fuente de verdad**.

## 1. Qué se encontró (estado ANTES)

| Fuente | Contenido | Rol real |
|---|---|---|
| `/app/data/projects.json` (volumen `amorosi_backend_data`) | **11 proyectos**, todos los enriquecimientos (dataset-creator, Delify e-commerce, Leviathan, RecApp fidedigno) | **Fuente de verdad de facto** — el admin escribía acá |
| Postgres, tabla `projects` | **0 filas** — schema perfecto (slug PK, tier/published/sort_order espejados, `doc` JSONB) creado por `ensureSchema`, jamás usado | Infraestructura lista, nunca activada |
| `frontend-app/content/projects.ts` (seed Vercel) | **10 proyectos, datos viejos**, sin dataset-creator | Lo que Vercel static habría publicado |

**Cadena real verificada:**
- Driver efectivo del backend: `PROJECT_STORAGE_DRIVER=local-json` — definido
  en `docker-compose.yml` línea 65, que **pisa** al `.env.docker.local`
  (gotcha de precedencia: `environment:` > `env_file`).
- `getProjectRepository()` (lib/projects/repository.ts) es el único embudo:
  admin, API pública y modo live pasaban todos por `LocalJsonProjectRepository`.
- Existía un `PostgresProjectRepository` completo (validación zod, sin ORM,
  mismo contrato) esperando el flip del driver.
- ⚠️ **Gotcha crítico descubierto**: ese repo PG *auto-seedea desde el seed
  ESTÁTICO viejo si encuentra la tabla vacía* → switchear el driver sin
  migrar primero habría resucitado los datos desactualizados y perdido
  dataset-creator del vivo. El orden migrar→switchear era obligatorio.
- El worker no toca proyectos. `content_translations` (cache i18n LLM)
  siempre vivió en Postgres, sin cambios.

## 2. Qué se implementó (estado DESPUÉS)

```
ADMIN (write) ─► repository ─► Postgres `projects` (doc JSONB canónico)
API pública / modo live ─► misma repository ─► Postgres
VERCEL static ─► content/projects.ts ─► importa content/projects.data.json
                                          (GENERADO desde Postgres)
JSON viejo ─► queda congelado en el volumen como backup, SIN autoridad
```

1. **Backup previo a todo**: `backups/postgres/amorosi-20260709-041616.dump`
   (pg_dump -Fc, 153KB, SHA-256 registrado; `backups/` gitignoreado).
2. **Migración** — `frontend-app/scripts/migrate-projects-json-to-postgres.ts`:
   valida los 11 contra el zod-schema del app, upsert por slug en UNA
   transacción, `--dry-run` + real, idempotente. Resultado: `inserted: 11`.
3. **Driver flipeado** en `docker-compose.yml` → `postgres` (comentario
   actualizado documentando la migración y el rol de backup del JSON).
4. **Export estático determinista** — `frontend-app/scripts/export-projects-static.ts`:
   Postgres → `content/projects.data.json` (orden tier→sortOrder→slug, diffs
   limpios). **Falla** si falta un proyecto crítico: lumenscript, buenpick,
   bbn, delify, trading-ecosystem, recapp-azure, dataset-creator.
   `content/projects.ts` refactorizado (481→116 líneas): tipos y helpers
   intactos, el array importa el JSON generado. *No editar el .data.json a
   mano — editar en /admin y re-exportar.*
5. **Dump/restore operativos** — `scripts/db-dump.sh` (timestamp + checksum +
   validación de tamaño) y `scripts/db-restore.sh` (confirmación explícita
   tecleando "restore", verificación de checksum y row counts).
6. **Scripts pnpm** (frontend-app): `projects:migrate(:dry-run)`,
   `projects:export-static`, `db:dump`, `db:restore` (+ `tsx` devDep).
7. **Runbook VPS/Dokploy**: `docs/POSTGRES_DEPLOY_MIGRATION.md` (dump →
   scp → restore → verificación → rollback; qué datos locales limpiar
   post-restore y por qué el dump va completo).

## 3. Verificación final ejecutada

- `tsc --noEmit` limpio · **97 tests pasan** (vitest) · `pnpm build` ✓
- Contenedores rebuildeados; `/api/health` ok
- `/api/status` → `storageDriver: "postgres"` ✓
- API pública sirve **11 proyectos desde PG**: dataset-creator ✓,
  Delify e-commerce ✓, Leviathan ✓
- Modo static compila con el `projects.data.json` nuevo → la trampa del
  seed viejo de Vercel quedó cerrada.

## 4. Flujo operativo de ahora en más

- **Editar contenido**: siempre en `/admin` (escribe Postgres).
- **Publicar al front estático**: `DATABASE_URL=... pnpm projects:export-static`
  → revisar diff → commit → push a la rama de prod.
- **Backup**: `DOCKER=docker.exe pnpm db:dump` (antes de cualquier cirugía).
- **Deploy DB al VPS**: seguir `docs/POSTGRES_DEPLOY_MIGRATION.md`.
