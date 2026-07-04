# DOCKER_READINESS.md — Container audit & strategy

Audit date: 2026-07-01 · Phase 1.5 + 2A (updated Phase 2A.5)

> **Role of Docker (Phase 2A.5):** Docker does NOT replace Vercel. Vercel is the
> public production frontend. Docker Desktop is our local prod-like
> **backend/admin emulator**; Dokploy/VPS is its future home. Full
> `docs/HYBRID_DEPLOYMENT_STRATEGY.md` covers the four modes.

## Compose services (Phase 2A.5)

| Service | Profile | Port | Storage | Admin | Purpose |
|---|---|---|---|---|---|
| `web` | (default) | 3000 | `static` | off | Mirrors the Vercel public path |
| `amorosi-backend` | `backend` | 3001 | `local-json` (+volume) | on | Local backend/admin emulator, future Dokploy target |

```bash
docker compose up --build                       # web (public mirror)
docker compose --profile backend up --build     # amorosi-backend (+web)
docker compose --profile backend up --build amorosi-backend   # emulator only
```

Validated with `docker compose config` (Docker Desktop 29.5.2 via WSL):
default → `web`; `--profile backend` → `amorosi-backend` + `web`. ✅


## Current app facts

| Item | Value |
|---|---|
| App location | `frontend-app/` |
| Framework | Next.js 15.2.4 (App Router) |
| Node | 18+ (image uses `node:20-alpine`) |
| Package manager | pnpm 9.12 (via corepack) |
| Config file | `frontend-app/next.config.js` |
| `output: "standalone"` | **Enabled in this phase** (was absent) |
| Runtime FS writes needed? | Only when `PROJECT_STORAGE_DRIVER=local-json` (admin writes JSON) |
| Docker available in dev env? | WSL `docker` no; Windows `docker.exe` yes (Docker Desktop 29.5.2) |

## Decision: enable `output: "standalone"`

**Safe.** It only changes build output (emits `.next/standalone/server.js` and a
minimal traced `node_modules`). It does **not** affect `next dev`, and Vercel
ignores it (Vercel uses its own build output). This is the standard, minimal way
to containerize a Next.js app. Rollback = remove the `output` line from
`next.config.js`.

## Runtime filesystem writes

- **`static`** driver (default): no writes → image is fully immutable. Best for
  Vercel/serverless.
- **`local-json`** driver: writes to `PROJECTS_JSON_PATH`. In Docker this must be
  a **mounted volume** to be durable. The compose file mounts a named volume
  `amorosi_data` at `/app/data`, and the Dockerfile declares `VOLUME ["/app/data"]`
  and pre-creates it owned by the non-root user.

## Required env vars (container)

Minimum: none (defaults are safe, `static` driver, admin disabled).
For admin + writable content, supply via `env_file` or the platform secret store:

```
APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev
PROJECT_STORAGE_DRIVER=local-json
PROJECTS_JSON_PATH=/app/data/projects.json
ADMIN_ENABLED=true
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=scrypt:...:...
ADMIN_SESSION_SECRET=...
```

No secrets are baked into the image (see `.dockerignore` — `.env*` excluded).

## Files created

| File | Role |
|---|---|
| `frontend-app/Dockerfile` | Multi-stage build → minimal standalone runner, non-root user |
| `frontend-app/.dockerignore` | Keeps build context lean; excludes secrets, data, docs |
| `docker-compose.yml` (repo root) | One service `web`, port 3000, optional `env_file`, `/app/data` volume |

## Is Docker required?

**No.** Docker is optional. Local development uses `pnpm dev`
(`run-amorosi-labs.bat dev`). The container path exists for parity and VPS deploys.

## Recommended strategies

### Local Docker Desktop
```bash
run-amorosi-labs.bat docker-up      # docker compose up --build
# open http://localhost:3000
run-amorosi-labs.bat docker-down
```
Use for verifying the production image before deploy. Not needed day-to-day.

### Dokploy / VPS (recommended for writable content)
- Deploy the compose service (or the Dockerfile).
- Keep the `amorosi_data` volume so `local-json` content persists across
  redeploys/restarts.
- Inject admin secrets through Dokploy's environment settings, not committed files.
- `PROJECT_STORAGE_DRIVER=local-json`, `PROJECTS_JSON_PATH=/app/data/projects.json`.

### Vercel / serverless
- **Do not** rely on `local-json` (ephemeral FS, per-instance, wiped on deploy).
- Use `PROJECT_STORAGE_DRIVER=static`. Migrate to `postgres` (future phase) when
  writable content is needed on serverless.

## Validation status

- `next.config.js` standalone enabled and covered by `pnpm build`.
- `docker compose config` **validated** (Phase 2A.5) via Docker Desktop 29.5.2
  (`docker.exe` from WSL): services render correctly for both the default and
  `backend` profiles.
- Full image **build** (`docker compose up --build`) not run here to avoid a long
  build; run it once on the target machine before first deploy.

### How to run when WSL lacks the docker CLI

Docker Desktop's Windows CLI is reachable as `docker.exe` from WSL, or run the
`.bat` from Windows PowerShell/CMD. Enable Docker Desktop → Settings → Resources
→ WSL integration to get a native `docker` in WSL.

## Blockers

None blocking. Only remaining step: a one-time full image build on the target
machine before deploy.
