# ENVIRONMENTS.md — Amorosi Labs environment strategy

> Deployment context: **Vercel is the current public production frontend.**
> Docker Desktop is a local prod-like backend/admin lab; Dokploy/VPS is the
> future backend home. See `docs/HYBRID_DEPLOYMENT_STRATEGY.md` for the four
> deployment modes. This file focuses on the variables themselves.

This project runs in three profiles: **local**, **test**, **production**.
Environment variables are loaded by Next.js from the **`frontend-app/`** folder.

> Only `*.example` files are committed. Real `.env*` files are git-ignored.
> **Never commit secrets. Never store a plaintext admin password.**

## Templates

| File | Purpose | Copy to |
|---|---|---|
| `frontend-app/.env.example` | Base template, documents every var | `frontend-app/.env.local` |
| `frontend-app/.env.local.example` | Developer machine defaults | `frontend-app/.env.local` |
| `frontend-app/.env.production.example` | Vercel production template | inject via secret manager / `.env.production` |
| `frontend-app/.env.docker.local.example` | Docker Desktop backend emulator | `frontend-app/.env.docker.local` |

## Variable model

| Variable | local | test | production | Notes |
|---|---|---|---|---|
| `APP_ENV` | `local` | `test` | `production` | Profile marker |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | test URL | `https://www.jpamorosi.dev` | Public, inlined into client bundle |
| `ADMIN_ENABLED` | `true` (optional) | `false`/`true` | `false` unless configured | Master switch for admin |
| `ADMIN_USERNAME` | dev value | optional | secret | |
| `ADMIN_PASSWORD_HASH` | dev hash | optional | **secret, hashed** | `scrypt:<salt>:<hash>` — never plaintext |
| `ADMIN_SESSION_SECRET` | dev value | optional | **secret, ≥16 chars** | HMAC signing key for session cookie |
| `PROJECT_STORAGE_DRIVER` | `local-json` | `static`/`local-json` | `static` (Vercel) or `local-json` (VPS volume) | `static`\|`local-json`\|`remote-api`\|`postgres` |
| `PROJECTS_JSON_PATH` | `./data/projects.json` | `./data/projects.json` | `/app/data/projects.json` (mounted volume) | Only used by `local-json` |
| `PROJECTS_API_URL` | — | — | future (remote-api) | Backend base URL for the remote-api bridge |
| `PROJECTS_API_TOKEN` | — | — | future (remote-api) | Optional bearer token for the bridge |

Validation lives in `frontend-app/lib/env.ts` (zod, **non-throwing** — missing
optional vars never crash the build; admin requirements are enforced lazily).

## Storage driver rules

- **`static`** — read-only, served from `content/projects.ts`. Safe everywhere,
  the only fully durable option on serverless/Vercel. **Default.**
- **`local-json`** — reads/writes a JSON file at `PROJECTS_JSON_PATH`. If the
  file is missing it is **seeded from `content/projects.ts`**. Writes never touch
  `content/projects.ts`.
- **`remote-api`** — read-only bridge: fetches **published** projects from a
  remote backend (`PROJECTS_API_URL` + optional `PROJECTS_API_TOKEN`) via
  `/api/content/projects`. Prepared for a future Vercel→backend link; **not
  enabled by default**.
- **`postgres`** — reserved for a future phase, not implemented yet (factory
  falls back to read-only `static`).

### Durability warning (important)

- **Vercel / serverless filesystems are ephemeral.** Files written by
  `local-json` are lost on redeploy/scale and are not shared between instances.
  On Vercel use `static` (or migrate to `postgres` later).
- **Dokploy / VPS with a Docker volume is durable.** Mount a volume and point
  `PROJECTS_JSON_PATH` at it (e.g. `/app/data/projects.json`) — `local-json`
  writes then persist across restarts and deploys.

## Admin credentials

The admin surface is **disabled** unless `ADMIN_ENABLED=true` **and** all three
admin vars are set. Generate credentials without adding dependencies:

```bash
cd frontend-app
# password hash (scrypt)
node scripts/generate-admin-hash.mjs "your-strong-password"
# session secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the outputs in `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`.

### Local convenience fallback

`.env.local.example` ships with `ADMIN_ENABLED=true` and an insecure
`ADMIN_SESSION_SECRET` for developer convenience. This is **local-only**:
- There is no plaintext password anywhere; you must still generate a hash.
- Do **not** reuse the example session secret outside local.
- In production, keep `ADMIN_ENABLED=false` until real secrets are injected.

## Quick start

```bash
cd frontend-app
cp .env.local.example .env.local
node scripts/generate-admin-hash.mjs "changeme-local"   # paste into .env.local
pnpm dev
```

`/` = Amorosi Labs home · `/os` = preserved interactive OS · `/admin` = backoffice.
