# HYBRID_DEPLOYMENT_STRATEGY.md — Vercel + Docker/Dokploy

Status: Phase 2A.5 · 2026-07-01

## TL;DR

- **Vercel is the public production frontend today.** It stays static and
  admin-off. Nothing here migrates production off Vercel.
- **Docker Desktop is our local prod-like backend/admin lab.** It runs the same
  app with `local-json` storage + a persistent volume + admin enabled, on port
  **3001**.
- **Dokploy/VPS is the future home** for that backend layer, using the same
  Docker strategy.
- **A future remote-api bridge** can let the Vercel frontend read published
  project data from the backend. It is prepared but **not enabled**.

> Docker is **not** replacing Vercel. Docker is the backend lab. Dokploy is the
> future backend home. Full VPS deployment of the public frontend remains optional.

## The four modes

### A) Vercel static public site — CURRENT PRODUCTION
- Host: Vercel.
- `APP_ENV=production`, `PROJECT_STORAGE_DRIVER=static`, `ADMIN_ENABLED=false`.
- Data source: `content/projects.ts` (the static seed).
- No filesystem writes (Vercel FS is ephemeral). Homepage is statically rendered.
- Admin/backoffice is **not** exposed on this path.

### B) Local development
- `run-amorosi-labs.bat dev` (or `pnpm dev`), port 3000.
- Optional: set `PROJECT_STORAGE_DRIVER=local-json` + admin vars in
  `frontend-app/.env.local` to test the backoffice locally.
- Fast inner loop; no Docker required.

### C) Docker Desktop backend emulator — PROD-LIKE BACKEND LAB
- `run-amorosi-labs.bat backend-up` → `docker compose --profile backend up --build`.
- Service `amorosi-backend`, published on **http://localhost:3001**.
- `APP_ENV=local`, `PROJECT_STORAGE_DRIVER=local-json`,
  `PROJECTS_JSON_PATH=/app/data/projects.json`, `ADMIN_ENABLED=true`.
- Persistent named volume `amorosi_backend_data` → `/app/data` (survives restarts).
- Secrets come from `frontend-app/.env.docker.local` (copy the `.example`).
- Admin at http://localhost:3001/admin. Public read endpoints under
  http://localhost:3001/api/content/projects.

> Compose note: `--profile backend up` also starts the default `web` service.
> To run only the emulator: `docker compose --profile backend up --build amorosi-backend`.

### D) Future Dokploy / VPS backend
- Same Docker image + strategy as mode C.
- Persistent volume now (Postgres later — not in scope yet).
- Inject admin secrets via Dokploy env settings, never committed.
- The Vercel public frontend MAY then consume it via the remote-api bridge (below).

## Storage drivers vs modes

| Driver | Mode | Writable | Durable | Notes |
|---|---|---|---|---|
| `static` | A (Vercel), C `web` | no | n/a | Default. Reads `content/projects.ts`. |
| `local-json` | B (optional), C `amorosi-backend`, D | yes | only on durable FS / volume | Seeds from static on first run. |
| `remote-api` | future A→D bridge | no (read-only) | n/a | Prepared, not enabled. |
| `postgres` | future D | — | — | Not implemented; factory falls back to static. |

## Remote-api bridge (prepared, not enabled)

Later, Vercel can read **published** projects from the backend instead of the
static seed:

```
# on Vercel (future)
PROJECT_STORAGE_DRIVER=remote-api
PROJECTS_API_URL=https://backend.example.com
PROJECTS_API_TOKEN=...      # optional
```

- Client: `frontend-app/lib/projects/remote-api-project-repository.ts` (read-only).
- It calls the backend's public endpoints:
  - `GET /api/content/projects` → published projects
  - `GET /api/content/projects/[slug]` → single published project
- **Not enabled by default.** The homepage remains static today; wiring the
  public UI to the repository is a later, deliberate step.

## Content mode (RC2): static vs live

`PROJECT_PUBLIC_CONTENT_MODE` controls how public content is sourced:

- **`static`** (default, Vercel): `/`, `/projects`, `/projects/[slug]` read the
  compiled seed → static/SSG. Admin edits do NOT change these (by design).
- **`live`** (Docker backend emulator): the deliberate **`/preview/*`** surface
  reads the repository (local-json) at request time, so admin edits are visible.

Why a separate `/preview` surface instead of making `/` dynamic: conditional
static↔dynamic on the public routes is fragile and would risk Vercel's SSG. The
preview surface is explicit, safe, and never shipped as the public path. Admin
shows both badges (data source + public mode) and a static-mode warning.

To move Delibot to Hall of Fame and see it: edit in `/admin` (writes local-json) →
open **`/preview`** → the Hall reflects it. On Vercel it stays static.

## Guardrails

- Do not enable `ADMIN_ENABLED` on Vercel.
- Do not use `local-json` on Vercel (ephemeral FS).
- Do not make the homepage dynamic just to add the bridge.
- Keep `web` (compose) mirroring Vercel: static + admin off.
