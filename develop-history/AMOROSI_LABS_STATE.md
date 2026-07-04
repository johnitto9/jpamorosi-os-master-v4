# AMOROSI_LABS_STATE.md — Live State

> Living state for the Amorosi Labs refactor of jpamorosi.dev.
> Update this file at the end of every phase.

## Current Phase
- **Phase:** RC2 — Live Admin Preview + Backoffice Polish + Visual Pass + Assistant
- **Status:** ✅ COMPLETE (build green, 33/33 tests, Docker smoke pass, live preview verified)
- **Date:** 2026-07-01
- **Prev:** Phase 1 ✅ · 1.5+2A ✅ · 2A.5 ✅ · 2B+3A ✅ · Finalization ✅ · Docker smoke ✅

## RC2 summary (see PHASE_AMOROSI_RC2_ADMIN_LIVE_VISUALS_ASSISTANT.md)
- **Content mode** `PROJECT_PUBLIC_CONTENT_MODE=static|live`; deliberate `/preview/*` live surface (reads local-json). Vercel stays static/SSG.
- **Admin** dashboard: stat cards, data-source + public-mode badges, static warning, grouped list, preview links.
- **Assistant** (deterministic, no LLM): `lib/assistant/*`, `/api/assistant`, floating widget on public pages. Tools whitelisted, guardrails, no-silence.
- **CV**: `/cv` print page + `lib/cv/build-cv-data.ts` (real content only). PDF endpoint = future.
- **Visual**: CSS `LabSceneBackground` on home, `BackgroundVideoPanel` (gradient fallback).
- **Verified**: admin edit (Delibot→hall) → `/preview` reflects it → reverted.
- Local admin (Docker): admin / admin-local-change-me at http://localhost:3001/admin.

## Docker backend emulator (running)
- Image `amorosi-labs-backend`; container `jpamorosi-os-master-v4-amorosi-backend-1`; port `3001->3000`.
- Volume `jpamorosi-os-master-v4_amorosi_backend_data` → `/app/data` (seeded `projects.json`, 10 projects).
- Driver `local-json`, admin enabled (local-only creds in git-ignored `frontend-app/.env.docker.local`).
- Built via `docker.exe` (WSL has no docker CLI; Docker Desktop 29.5.2 exposes `docker.exe`).
- **Docker-only build note:** builder sets `DOCKER_BUILD=1` → next.config skips type/lint in the
  container image ONLY (the frozen pnpm install resolves framer-motion `MotionStyle` more strictly).
  Vercel + local `pnpm build` keep strict checking (DOCKER_BUILD unset). Runtime is unaffected.
- Stop: `docker compose --profile backend down` (or `docker.exe ...`).

## Deployment strategy (authoritative)
- **Vercel = current public production frontend** (static, admin OFF). Not migrating.
- **Docker Desktop = local prod-like backend/admin emulator** (`amorosi-backend`, port 3001, `local-json` + volume, admin ON).
- **Dokploy/VPS = future backend home** (same Docker strategy).
- **remote-api bridge = prepared, NOT enabled** (future Vercel→backend read path).
- Full doc: `docs/HYBRID_DEPLOYMENT_STRATEGY.md`.

## Route Map
| Route | Meaning | Status |
|---|---|---|
| `/` | New Amorosi Labs Hall of Fame home | ✅ live (static) |
| `/os` | Preserved jpamorosi.os interactive CV | ✅ preserved |
| `/projects` | Project index (HoF/Featured/Archive) | ✅ live (static) |
| `/projects/[slug]` | Project rooms (first pass) | ✅ live (SSG, 10 rooms) |
| `/lab` | Featured + archive page | ⬜ folded into /projects |
| `/admin`, `/admin/login`, `/admin/projects/*` | Light backoffice | ✅ foundation live (protected) |
| `/api/admin/*` | Admin auth + project CRUD | ✅ foundation live |
| `/api/content/projects`, `/api/content/projects/[slug]` | Public read-only content | ✅ live (published-only) |
| `/api/ai-guide` | AI portfolio guide | ⬜ future |

## Tech Baseline (verified)
- Next.js **15.2.4** (App Router)
- React **18.3.1**
- Tailwind **v3.4** (NOT migrated — per playbook non-negotiable)
- framer-motion 10.18 available (not used yet on home; home is CSS-only)
- Package manager: **pnpm 9.12**
- Real app lives in `frontend-app/`

## Content Model (source of truth — Phase 1 static seed)
- `frontend-app/content/projects.ts` — `Project` type + seed + selectors
  (`getProjects`, `getProjectsByTier`, `getProjectBySlug`, `getHallOfFame`, `getFeatured`, `getArchive`)
- `frontend-app/content/profile.ts`
- `frontend-app/content/capabilities.ts` (evidence-based, no skill bars)

### Seeded projects
- **hall_of_fame:** LumenScript, BuenPick, BBN
- **featured:** Delify, Delibot, Trading Ecosystem, RecApp/Azure
- **archive:** AI Lab (RunPod), Kaelos (Legal), Code Saver

## Component Inventory (new)
- `components/design-system/GlowCard.tsx`
- `components/design-system/StatusBadge.tsx`
- `components/design-system/SmartImage.tsx` (graceful gradient fallback for missing assets)
- `components/design-system/SectionHeader.tsx`
- `components/hall/HallHero.tsx`
- `components/hall/HallOfFameCard.tsx`
- `components/hall/HallOfFameGrid.tsx`
- `components/hall/FeaturedSystemsGrid.tsx`
- `components/hall/LabArchiveGrid.tsx`

## Checks (last run 2026-07-01)
- `pnpm install` — ✅
- `pnpm build` — ✅ (`/` = 109 kB First Load, static; `/os` = 347 kB)
- `pnpm test run` — ✅ 20/20 (desktop store)

## Known Non-Negotiables Held
- OS preserved under `/os`. ✅
- No Tailwind major migration. ✅
- No new heavy 3D on home. ✅ (home is server-rendered, CSS-only)
- No skill percentage bars — capability→proof mapping instead. ✅
- No admin / AI guide / backoffice yet. ✅
- No new dependencies added. ✅

## Open TODOs (deferred, not in Phase 1)
- Real hero/background assets for LumenScript, BuenPick, BBN (currently gradient placeholders).
- `sitemap.ts` / `robots` still reference the OS-centric model; revisit for SEO once routes settle.
- Root `layout.tsx` metadata still says "jpamorosi.os"; consider Amorosi Labs default (left untouched this phase to minimize risk).
- Repository abstraction `lib/projects/repository.ts` (Phase 2/06).

## Phase 1.5 + 2A additions

### Environment (Part A)
- `frontend-app/.env.example`, `.env.local.example`, `.env.production.example` (tracked via gitignore negation).
- `frontend-app/lib/env.ts` — zod, non-throwing validation; helpers `isAdminEnabled/isAdminConfigured/adminMissingVars`.
- `frontend-app/scripts/generate-admin-hash.mjs` — scrypt hash generator (no deps).
- `docs/ENVIRONMENTS.md`.
- Env model: `APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_ENABLED`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `PROJECT_STORAGE_DRIVER` (static|local-json|postgres), `PROJECTS_JSON_PATH`.

### Windows harness (Part B)
- `run-amorosi-labs.bat` (dev|build|test|check|docker-up|docker-down; default dev; venv + pnpm/corepack bootstrap).
- `docs/RUN_LOCAL_WINDOWS.md`.

### Docker (Part C)
- `next.config.js` → `output: 'standalone'` enabled (safe; dev-neutral; Vercel ignores).
- `frontend-app/Dockerfile` (multi-stage, non-root, `/app/data` volume), `frontend-app/.dockerignore`, root `docker-compose.yml`.
- `docs/DOCKER_READINESS.md`. Docker is OPTIONAL. Build/compose validation deferred (no Docker in audit env); standalone `server.js` confirmed emitted by `pnpm build`.

### Admin foundation (Part D)
- Repository layer: `lib/projects/types.ts`, `validators.ts` (zod), `repository.ts` (factory), `static-project-repository.ts` (read-only default), `local-json-project-repository.ts` (writable, seeds from content, atomic writes, never touches content/projects.ts).
- Auth: `lib/auth/admin.ts` (scrypt verify, HMAC signed httpOnly cookie, timing-safe), `lib/auth/guard.ts`.
- API: `app/api/admin/{login,logout}/route.ts`, `app/api/admin/projects/route.ts` (GET/POST), `app/api/admin/projects/[slug]/route.ts` (GET/PUT/DELETE). All node runtime, force-dynamic, guarded.
- UI: `app/admin/{layout,page}.tsx`, `app/admin/login/page.tsx`, `app/admin/projects/new/page.tsx`, `app/admin/projects/[slug]/page.tsx`; `components/admin/{LoginForm,LogoutButton,ProjectForm}.tsx`.
- Admin disabled + safe setup notice unless `ADMIN_ENABLED=true` and all admin vars set. Not linked from public site; `robots: noindex`.
- Public site still reads `content/projects.ts` (unchanged) — lowest risk.

## Checks (Phase 1.5+2A, 2026-07-01)
- `pnpm build` ✅ (`/` static 109 kB; admin/api dynamic; standalone `server.js` emitted)
- `pnpm test run` ✅ 20/20
- scrypt hash roundtrip ✅ (generator ↔ verifier)

## Phase 2A.5 additions
- Storage driver `remote-api` added: `lib/env.ts` enum + `PROJECTS_API_URL`/`PROJECTS_API_TOKEN`; `lib/projects/remote-api-project-repository.ts` (read-only); wired in `repository.ts` factory (not default).
- Public read-only endpoints: `app/api/content/projects/route.ts` + `[slug]/route.ts` (published-only, no auth, no mutation).
- Env: `.env.production.example` clarified (Vercel; commented remote-api block); new `.env.docker.local.example`; gitignore negation added.
- `docker-compose.yml`: `web` (default, static/admin-off mirror of Vercel) + `amorosi-backend` (profile `backend`, port 3001, local-json, volume `amorosi_backend_data`).
- `run-amorosi-labs.bat`: added `backend-up`/`backend-down` + `:require_docker` helper with Docker Desktop/WSL guidance.
- Docs: new `HYBRID_DEPLOYMENT_STRATEGY.md`; updated `ENVIRONMENTS.md`, `DOCKER_READINESS.md`, `RUN_LOCAL_WINDOWS.md`.
- Homepage untouched → **Vercel build path unaffected**; `/` still static.

## Checks (Phase 2A.5, 2026-07-01)
- `pnpm build` ✅ (`/` static; `/api/content/*` + admin dynamic)
- `pnpm test run` ✅ 20/20
- `docker compose config` ✅ (Docker Desktop 29.5.2 via `docker.exe`): default→`web`; `--profile backend`→`amorosi-backend`+`web`

## Phase 2B + 3A additions
- **Public bridge:** `lib/projects/public-projects.ts` — static-safe read layer
  (`getPublicProjects/HallOfFame/Featured/Archive/BySlug`); published default-true;
  sort order→title. Hall grids repointed to it. Homepage stays static.
- **Content copy:** LumenScript (AI writing platform + orchestration, Platformizing),
  BuenPick (live local-commerce startup), BBN (AI-assisted local media) repositioned
  in `content/projects.ts`; `content/profile.ts` hero copy updated.
- **Home upgrade:** `HallHero` (name/role/tagline, 3 CTAs, capability→evidence
  matrix), `HallOfFameCard` (logo chip + "Enter room" CTA), Featured cards link to
  rooms, Archive rows link to rooms. CSS-only (no framer-motion) → static + light.
- **Project rooms:** `app/projects/page.tsx` (index) + `app/projects/[slug]/page.tsx`
  (SSG via generateStaticParams + generateMetadata, notFound on miss).
  `components/projects/`: ProjectRoom, ProjectHero, ProjectProofCards,
  ProjectArchitecturePreview, EvidenceWall, FounderNotes.
- **Media:** `docs/PROJECT_MEDIA_GUIDE.md` (public/projects/{slug}/… convention);
  SmartImage graceful branded fallback (no assets generated this phase).

## Checks (Phase 2B+3A, 2026-07-01)
- `pnpm build` ✅ — `/` & `/projects` static; `/projects/[slug]` SSG (10 rooms:
  lumenscript, buenpick, bbn, delify, delibot, trading-ecosystem, recapp-azure,
  ai-lab-runpod, kaelos-legal, code-saver); `/os` untouched (347 kB).
- `pnpm test run` ✅ 20/20
- `docker compose config` ✅

## Finalization phase additions
- **Content:** flagship copy sharpened (LumenScript "not a prompt wrapper" +
  OpenRouter/BYOK; BuenPick food-rescue live startup; BBN AI local media);
  `profile.ts` main message crisp + supporting thesis. No fake metrics.
- **Themes (distinct rooms):** LumenScript amber/violet, BuenPick mint/green,
  BBN editorial blue/red (in `content/projects.ts`).
- **Home:** hiring conversion band (`#contact`, mailto + Explore Projects + GitHub)
  + softened OS CTA; hero shows tagline + thesis.
- **Media:** `public/projects/{slug}/` folders + per-folder `README.md` (7 projects);
  no images generated; SmartImage still falls back to branded gradients.
- **SEO:** root metadata/JSON-LD → Amorosi Labs / AI Product Engineer; removed
  conflicting hardcoded OG tags; `sitemap.ts` now lists real routes + rooms;
  `robots.txt` disallows `/admin`; canonical host `www.jpamorosi.dev`.
- **Deploy:** `docs/VERCEL_DEPLOY_CHECKLIST.md` (root=frontend-app, static driver,
  admin off, env vars, static-safe route expectations).

## Checks (Finalization, 2026-07-01)
- `pnpm build` ✅ — `/`, `/projects`, `/os` Static; `/projects/[slug]` SSG (10 rooms);
  admin/api Dynamic. No public page flipped to dynamic.
- `pnpm test run` ✅ 20/20
- `docker compose config` ✅

## Deploy status
**Safe to deploy to Vercel** with env: `APP_ENV=production`,
`PROJECT_STORAGE_DRIVER=static`, `ADMIN_ENABLED=false`,
`NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev`.

## Next Recommended File
Optional: add real project media, then `09_QA_SECURITY_DEPLOY.md` deep pass, or
the AI guide. **STOP and await authorization.**
