# PHASE_AMOROSI_02A5_HYBRID_DOCKER_BACKEND — Change Log

**Date:** 2026-07-01
**Phase:** 2A.5 — Hybrid Deployment Alignment + Docker Desktop Backend Emulator
**Loop:** READ → PLAN → SMALL PATCHES → RUN CHECKS → REVIEW → LOG → STOP

## 1. Objective
Align the architecture with the real deployment plan — **Vercel public frontend +
optional Docker/Dokploy backend/admin layer** — without breaking the Vercel path,
without making Docker mandatory, and without filesystem writes on Vercel. No Hall
of Fame polish, no AI, no Postgres, no production migration.

## 2. Final strategy (Vercel vs Docker vs Dokploy)
- **Vercel** = current public production frontend. Stays `static`, admin OFF,
  homepage statically rendered. Untouched by this phase.
- **Docker Desktop** = local prod-like **backend/admin emulator**
  (`amorosi-backend`, port 3001, `local-json` + persistent volume, admin ON).
- **Dokploy/VPS** = future home for that same backend image/strategy.
- **remote-api bridge** = prepared but NOT enabled (future Vercel→backend reads).
- Authoritative doc: `docs/HYBRID_DEPLOYMENT_STRATEGY.md`.

## 3. What changed

### Part A — Precheck
- Confirmed `PROJECT_STORAGE_DRIVER=static` is the Vercel-safe mode; `local-json`
  only safe with a durable FS/volume.
- **Docker finding:** WSL `docker` still absent, but Windows `docker.exe`
  (Docker Desktop 29.5.2) IS reachable from WSL → used for `compose config`.

### Part B — Deployment docs
- **Created** `docs/HYBRID_DEPLOYMENT_STRATEGY.md` (four modes A–D, driver matrix,
  bridge, guardrails).
- **Updated** `docs/ENVIRONMENTS.md` (context banner, docker template row,
  `remote-api` driver + `PROJECTS_API_URL/TOKEN`).
- **Updated** `docs/DOCKER_READINESS.md` (two-service table, compose validation
  result, WSL/docker.exe guidance).
- **Updated** `docs/RUN_LOCAL_WINDOWS.md` (backend-up/down, emulator setup).

### Part C — Env examples
- **Modified** `frontend-app/.env.production.example` — Vercel framing; commented
  future `remote-api` block (`PROJECTS_API_URL`, `PROJECTS_API_TOKEN`).
- **Created** `frontend-app/.env.docker.local.example` — backend emulator
  (APP_ENV=local, port 3001, admin ON, local-json, `/app/data/projects.json`).
- **Modified** `frontend-app/.gitignore` — negate `!.env.docker.local.example`.

### Part D — Docker Desktop backend emulator
- **Modified** `docker-compose.yml`:
  - `web` (default): production-like mirror of Vercel — `static`, `ADMIN_ENABLED=false`, port 3000, no volume.
  - `amorosi-backend` (profile `backend`): port 3001, `local-json`,
    `PROJECTS_JSON_PATH=/app/data/projects.json`, `env_file` optional
    `.env.docker.local`, named volume `amorosi_backend_data:/app/data`.
  - Documented that `--profile backend up` also starts `web`; run
    `... up amorosi-backend` for emulator-only.

### Part E — Public remote API bridge (IMPLEMENTED, low-risk, not enabled)
- **Created** `frontend-app/lib/projects/remote-api-project-repository.ts` —
  read-only client of the public endpoints; writes throw; validates via zod.
- **Modified** `frontend-app/lib/env.ts` — driver enum + `remote-api`;
  `PROJECTS_API_URL` (url, optional), `PROJECTS_API_TOKEN` (optional).
- **Modified** `frontend-app/lib/projects/repository.ts` — `remote-api` case.
- **Modified** `frontend-app/lib/projects/types.ts` — `driver` union + `remote-api`.
- **Created** `frontend-app/app/api/content/projects/route.ts` and
  `.../[slug]/route.ts` — PUBLIC, read-only, **published-only**, no auth, no
  mutation; safe for future Vercel consumption and compatible with local-json.
- Homepage NOT wired to the repository → stays static; Vercel build unaffected.

### Part F — Windows harness
- **Modified** `run-amorosi-labs.bat` — added `backend-up`/`backend-down`
  dispatch + `:require_docker` helper (clear Docker Desktop/WSL message, no
  cryptic crash). Existing commands unchanged.

## 4. Decisions

### Decision — implement the remote-api bridge now (read-only), keep it off
- **What:** Full read-only repository + public endpoints, driver not default.
- **Why:** Low risk, unblocks the future Vercel→backend link without touching the
  static homepage today.
- **Evidence:** `pnpm build` green; `/` remains `○ (Static)`; endpoints are `ƒ`.
- **Rollback:** remove `remote-api` case + files; revert env enum.

### Decision — `web` mirrors Vercel, `amorosi-backend` is the lab
- **Why:** Keeps a clean prod-parity image separate from the writable admin lab;
  matches the hybrid strategy exactly.
- **Rollback:** revert `docker-compose.yml`.

### Decision — published-only public endpoints
- **Why:** Never leak unpublished projects through the public bridge; admin stays
  the only path to drafts.

## 5. Commands run + results
```bash
cd frontend-app
pnpm build      # ✅ / static (109 kB); /api/content/*, /api/admin/*, /admin dynamic
pnpm test run   # ✅ 20/20
# Docker (via Docker Desktop 29.5.2, docker.exe from WSL):
docker.exe compose config --services                    # -> web
docker.exe compose --profile backend config --services  # -> amorosi-backend, web
```
Full `docker compose up --build` intentionally NOT run (long build; not required
to validate this phase). Type fix during checks: added `remote-api` to the
`ProjectRepository.driver` union.

## 6. Docker validation result
`docker compose config` **passes** for both the default and `backend` profiles
using Docker Desktop's Windows CLI. Image build deferred to a one-time run on the
target machine.

## 7. Risks / TODOs
- **Bridge is inert until wired:** public UI still reads `content/projects.ts`.
  Enabling `remote-api` on Vercel is a future, deliberate step (and would make the
  consuming pages dynamic — not done here).
- **Vercel durability unchanged:** never set `local-json`/`ADMIN_ENABLED` on Vercel.
- **One-time Docker build** unverified (config validated only).
- **Postgres** still not implemented (factory falls back to static).
- Public read endpoints are `force-dynamic`; if Vercel ever serves them, add
  caching/revalidation deliberately.

## Next Recommended File
`07_TASK_HALL_OF_FAME_UI.md` — public visual system against content-driven data.
Alternatively: wire public pages to the repository behind a flag, or add the
`postgres` adapter for the backend.

## Why
The hybrid deployment model, backend emulator, and read-only bridge are in place
and verified; the next high-value step is the public Hall of Fame visual system.

## Blockers
None blocking. One-time Docker image build should be run on the target machine
before first backend deploy.

**STOP — awaiting authorization before the next phase.**
