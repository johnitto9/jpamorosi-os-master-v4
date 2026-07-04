# RUN_LOCAL_WINDOWS.md — Running Amorosi Labs on Windows

A single batch runner handles environment checks and the common workflows:
**`run-amorosi-labs.bat`** at the repo root.

Double-click it, or run it from a terminal at the repo root.

## Commands

```bat
run-amorosi-labs.bat              :: same as "dev"
run-amorosi-labs.bat dev          :: start Next dev server + open browser (port 3000)
run-amorosi-labs.bat build        :: production build
run-amorosi-labs.bat test         :: run the test suite (vitest run)
run-amorosi-labs.bat check        :: build + test (pre-push gate)
run-amorosi-labs.bat docker-up    :: docker compose up --build  (public "web" mirror, port 3000)
run-amorosi-labs.bat docker-down  :: docker compose down
run-amorosi-labs.bat backend-up   :: docker compose --profile backend up --build  (admin emulator, port 3001)
run-amorosi-labs.bat backend-down :: docker compose --profile backend down
```

> **Deployment context:** Vercel is the public production frontend. The Docker
> commands are a local prod-like **backend/admin lab** (future Dokploy target),
> not a replacement for Vercel. See `docs/HYBRID_DEPLOYMENT_STRATEGY.md`.

## What the runner does (in order)

1. Normalizes its own directory (works no matter where you launch it from).
2. Verifies `frontend-app/` and `frontend-app/package.json` exist.
3. Verifies **Node.js >= 18** (`node -v`).
4. Verifies **pnpm**; if missing it tries `corepack enable` +
   `corepack prepare pnpm@latest --activate`, and stops with instructions if it
   still can't find pnpm.
5. If **Python** is present and `requirements.txt` exists at the repo root:
   creates `.venv` (if missing), activates it, upgrades pip, installs
   requirements. If Python is missing it **warns and continues** with the
   frontend flow.
6. Ensures `node_modules` (runs `pnpm install` if absent), then runs your command.

On any error the window stays open (`pause`) so you can read the message.

## URLs

Dev server: **http://localhost:3000**

| Route | What |
|---|---|
| `/` | **Amorosi Labs** — the new Hall of Fame home |
| `/os` | **Preserved jpamorosi.os** — the original interactive CV / desktop |
| `/admin` | Backoffice (only active when `ADMIN_ENABLED=true`, see below) |

The runner auto-opens `/` ~5 seconds after `dev` starts.

## Environment setup (first run)

```bat
cd frontend-app
copy .env.local.example .env.local
node scripts/generate-admin-hash.mjs "changeme-local"
:: paste the printed ADMIN_PASSWORD_HASH into .env.local
```

See `docs/ENVIRONMENTS.md` for the full variable model.

## What is `.venv`?

`.venv` is a local **Python virtual environment** created at the repo root. The
project ships a `requirements.txt` with helper tooling (scraping, data, testing
utilities) used for auxiliary scripts — **not** required to run the website. The
runner sets it up automatically only if Python is installed. The Next.js app
itself needs only Node + pnpm.

## Docker (optional)

Docker is **optional** for local development. If you have Docker Desktop:

```bat
:: public production-like mirror (static, admin off) on port 3000
run-amorosi-labs.bat docker-up
run-amorosi-labs.bat docker-down

:: backend/admin emulator (local-json + persistent volume, admin on) on port 3001
run-amorosi-labs.bat backend-up
run-amorosi-labs.bat backend-down
```

Backend emulator setup (first run):

```bat
cd frontend-app
copy .env.docker.local.example .env.docker.local
node scripts/generate-admin-hash.mjs "your-password"   :: paste ADMIN_PASSWORD_HASH
:: then, from repo root:
run-amorosi-labs.bat backend-up
```

Then open **http://localhost:3001/admin**. Public read endpoint:
`http://localhost:3001/api/content/projects`.

If Docker is missing, the runner prints a clear message pointing to Docker
Desktop + WSL integration. You can also run the `.bat` from Windows
PowerShell/CMD (Docker Desktop's CLI is available there even when WSL's isn't).

See `docs/DOCKER_READINESS.md` and `docs/HYBRID_DEPLOYMENT_STRATEGY.md`.
