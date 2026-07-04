# PHASE_AMOROSI_015_02A_HARNESS_ADMIN — Change Log

**Date:** 2026-07-01
**Phase:** 1.5 + 2A — Local/Test/Prod harness + Docker readiness + Admin backoffice foundation
**Loop:** READ → PLAN → SMALL PATCHES → RUN CHECKS → REVIEW → LOG → STOP

## 1. Objective
Make the project production-ready without visual polish: environment separation,
a Windows run harness, Docker readiness, and a protected admin backoffice
foundation with a storage-agnostic repository layer. Preserve the OS and the
Phase 1 home. No CMS, no AI, no project rooms, no new runtime dependencies.

## 2. What changed (by part)

### Part A — Environment separation
Created:
- `frontend-app/.env.example` — documents every variable.
- `frontend-app/.env.local.example` — dev defaults (admin on, local-json).
- `frontend-app/.env.production.example` — prod template, secrets as placeholders.
- `frontend-app/lib/env.ts` — zod validation, **non-throwing** (safeParse → safe
  defaults). Exposes `env`, `isAdminEnabled()`, `isAdminConfigured()`,
  `adminMissingVars()`.
- `frontend-app/scripts/generate-admin-hash.mjs` — scrypt hash generator (no deps).
- `docs/ENVIRONMENTS.md`.

Modified:
- `frontend-app/.gitignore` — negate `!.env.example` / `!.env.local.example` /
  `!.env.production.example` (so templates are tracked while real `.env*` stay
  ignored) and ignore `/data`.

Env model: `APP_ENV` (local|test|production), `NEXT_PUBLIC_SITE_URL`,
`ADMIN_ENABLED`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`,
`PROJECT_STORAGE_DRIVER` (static|local-json|postgres), `PROJECTS_JSON_PATH`.

### Part B — Windows run harness
Created:
- `run-amorosi-labs.bat` (repo root): normalizes dir via `%~dp0`; verifies
  frontend-app + package.json, Node ≥ 18, pnpm (with corepack bootstrap); sets up
  `.venv` from `requirements.txt` if Python present (warns + continues if not);
  `pnpm install` when `node_modules` missing. Commands: `dev` (default, opens
  browser after 5s), `build`, `test`, `check` (build+test), `docker-up`,
  `docker-down`. Keeps console open on error; clear section headers.
- `docs/RUN_LOCAL_WINDOWS.md`.

### Part C — Docker readiness
Created:
- `docs/DOCKER_READINESS.md` (audit + strategy).
- `frontend-app/Dockerfile` (multi-stage: deps → builder → runner; node:20-alpine;
  corepack pnpm; standalone output; non-root `nextjs` user; `/app/data` VOLUME).
- `frontend-app/.dockerignore`.
- `docker-compose.yml` (repo root): one `web` service, port 3000, optional
  `env_file` (`required: false`), named volume `amorosi_data` → `/app/data`.

Modified:
- `frontend-app/next.config.js` → added `output: 'standalone'`.

### Part D — Admin backoffice foundation
Repository layer (`frontend-app/lib/projects/`):
- `types.ts` — re-exports `Project*` from `content/projects.ts`;
  `ProjectRepository` interface (`listProjects/getProject/createProject/
  updateProject/deleteProject`, `driver`, `writable`); typed errors;
  input types aliased to the zod-inferred shapes (single source of truth).
- `validators.ts` — zod `projectSchema` + `createProjectSchema` +
  `updateProjectSchema` (kebab-case slug rule).
- `static-project-repository.ts` — read-only, backed by `content/projects.ts`;
  writes throw `ReadOnlyRepositoryError`.
- `local-json-project-repository.ts` — read/write JSON at `PROJECTS_JSON_PATH`;
  seeds from `content/projects.ts` if the file is missing; validates every write;
  serialized in-process writes; atomic tmp+rename; deep-merges nested
  theme/assets/architecture on update; **never** writes `content/projects.ts`.
- `repository.ts` — factory selecting driver from env; `postgres` warns and falls
  back to read-only static (not implemented yet).

Auth (`frontend-app/lib/auth/`):
- `admin.ts` — Node `crypto` only. `verifyPassword` (scrypt `scrypt:salt:hash`),
  `verifyCredentials` (timing-safe), HMAC-signed httpOnly session cookie
  (`createToken`/`verifyToken`, 8h TTL, `secure` in production), cookie helpers.
- `guard.ts` — `guardAdmin()` → 503 if not configured, 401 if unauthenticated.

API (`frontend-app/app/api/admin/`, all `runtime="nodejs"`, `force-dynamic`):
- `login/route.ts` (POST), `logout/route.ts` (POST),
- `projects/route.ts` (GET list, POST create),
- `projects/[slug]/route.ts` (GET, PUT, DELETE). Zod-validated, guarded.

UI (`frontend-app/app/admin/` + `components/admin/`):
- `layout.tsx` (own scroll container + `robots: noindex`), `page.tsx`
  (setup notice / login redirect / project table), `login/page.tsx`,
  `projects/new/page.tsx`, `projects/[slug]/page.tsx`.
- `LoginForm.tsx`, `LogoutButton.tsx`, `ProjectForm.tsx` (all fields incl.
  tier/status/published toggles, stack/highlights as newline/comma lists).

Public site untouched — still reads `content/projects.ts`.

## 3. Decisions

### Decision — public reads static, admin reads repository
- **What:** Public components keep importing `content/projects.ts`; only admin
  uses the repository factory.
- **Why:** Zero risk to the live home; repository can later back the public site.
- **Rollback:** delete `lib/projects/*` + `app/admin/*` + `app/api/admin/*`.

### Decision — enable Next `output: "standalone"`
- **What:** Added to `next.config.js`.
- **Why:** Needed for a minimal Docker image; build-only, dev-neutral, Vercel-safe.
- **Evidence:** `pnpm build` emits `.next/standalone/server.js` (verified).
- **Rollback:** remove the `output` line.

### Decision — env examples in `frontend-app/` with gitignore negation
- **Why:** Next loads env from `frontend-app/`; copying `.env.local.example` →
  `.env.local` works out of the box.
- **Rollback:** revert `.gitignore` + delete the `*.example` files.

### Decision — repository input types = zod-inferred types
- **What:** `CreateProjectInput`/`UpdateProjectInput` alias the validators' inferred
  types; validated results cast to `Project`.
- **Why:** A hand-written `Partial<Omit<Project,…>>` diverged from the zod partial
  (nested `theme`), breaking the type-check. Aliasing keeps API + repo in lockstep.
- **Rollback:** revert `lib/projects/types.ts`.

## 4. Commands run + results
```bash
cd frontend-app
pnpm install          # ok (already installed)
pnpm build            # ✅ compiled + type-checked + lint clean; 13/13 pages
                      #    / static (109 kB); /admin, /api/admin/* dynamic
                      #    .next/standalone/server.js emitted
pnpm test run         # ✅ 20/20 (tests/desktop_store.spec.ts)
node scripts/generate-admin-hash.mjs "changeme-local"  # scrypt roundtrip ✅
```
Docker `compose config` / image build **not run** — Docker CLI not present in this
WSL distro (documented). Non-blocking pre-existing warnings: tailwind content glob
on `packages/three-react/**/*.js`; stale caniuse-lite.

## 5. Experience notes
- Next 15: `cookies()`/route `params` are async — used `await` throughout.
- `strict:false` tsconfig makes zod output↔`Project` assignability finicky; cast
  validated results to `Project` at the repository boundary.
- The global `<body> overflow:hidden` gotcha applies to `/admin` too — the admin
  layout provides its own `overflow-y-auto` container.
- `server-only` is NOT a dependency here; env/auth modules stay server-only by
  convention (documented in-file) instead of importing it.

## 6. Risks / TODOs
- **Serverless durability:** `local-json` is ephemeral on Vercel — use `static`
  there or add the `postgres` adapter (future). Documented.
- **Docker unverified in this env:** run `docker compose config` + a test
  `up --build` on a Docker-capable machine before deploy.
- **Admin secrets:** must be injected via secret manager in prod; keep
  `ADMIN_ENABLED=false` until then. No plaintext password anywhere.
- **Public/repository unification** deferred (public still reads static seed).
- `postgres` driver + real DB is the remaining piece of playbook `06`.

## Next Recommended File
`07_TASK_HALL_OF_FAME_UI.md` — polish the public visual system against the now
content-driven data. (Alternatively finish the `postgres` adapter for `06`.)

## Why
The admin foundation, repository abstraction, and environment/Docker harness are
in place; the next high-value step is the public Hall of Fame visual system.

## Blockers
None blocking. Docker build validation deferred to a Docker-capable machine.

**STOP — awaiting authorization before the next phase.**
