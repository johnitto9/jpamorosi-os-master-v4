# RC2 HANDOFF — Phase RC2 (in progress)

Date: 2026-07-01. Phase: RC2 — Live Admin Preview + Backoffice Polish + Visual Pass + Assistant.

## STATUS: ~80% done, NOT build-verified yet since assistant was added. STOPPED mid Part H/I.

## Where to read first (context)
1. `develop-history/AMOROSI_LABS_STATE.md` — living state.
2. This file.
3. The original RC2 task prompt (parts A–K) — in chat history.
4. `docs/assistant/ASSISTANT_ARCHITECTURE.md` + `ASSISTANT_GUARDRAILS.md` + `DELIBOT_REFERENCE_NOTES.md`.

## What was DONE this phase
- **Part B (Delibot):** files already in `delibot/`. Created `docs/assistant/DELIBOT_REFERENCE_NOTES.md`.
- **Part C (content mode + live preview):** DONE.
  - `lib/env.ts`: added `PROJECT_PUBLIC_CONTENT_MODE=static|live` (+ `getPublicContentMode`, `getStorageDriver`).
  - `lib/projects/public-projects.ts`: added async `getLivePublic*` getters (read repo/local-json).
  - Grids (`HallOfFameGrid`/`FeaturedSystemsGrid`/`LabArchiveGrid`) now accept optional `projects` prop.
  - New live surface (force-dynamic): `app/preview/layout.tsx`, `app/preview/page.tsx`, `app/preview/projects/page.tsx`, `app/preview/projects/[slug]/page.tsx`.
  - Diagnosis: public pages read STATIC seed; admin writes local-json → disconnected by design. `/preview/*` reads local-json so admin edits are visible there. Vercel stays static.
- **Part D (admin):** `app/admin/page.tsx` rewritten (stat cards, data-source + public-mode badges, static warning, grouped-by-tier list, preview links). Edit page got "View live preview" link.
- **Part E/G (IA + rooms):** homepage "Browse all project rooms" link; `ProjectRoom` added "What this proves" + "Related systems"; `app/projects/[slug]/page.tsx` computes `related`.
- **Part F (visual):** `components/visual/LabSceneBackground.tsx` (CSS-only, in globals.css keyframes) added to home; `components/visual/BackgroundVideoPanel.tsx` (gradient fallback); `docs/VIDEO_ASSET_PIPELINE.md`.
- **Part H (assistant):** DONE (code written, NOT yet built):
  - `lib/assistant/`: `types.ts`, `context-builder.ts`, `guardrails.ts`, `intent-router.ts`, `tool-registry.ts`, `response-builder.ts`.
  - `app/api/assistant/route.ts` (node, deterministic, no LLM, no persistence).
  - `components/assistant/`: `AssistantWidget.tsx`, `AssistantMessage.tsx`, `AssistantActionButton.tsx`, `AssistantProjectCard.tsx`.
  - Widget wired into `app/page.tsx`, `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`.
  - **CV:** `lib/cv/build-cv-data.ts`, `app/cv/page.tsx`, `components/cv/PrintButton.tsx`. (PDF endpoint = future, not built.)
  - Docs: `docs/assistant/ASSISTANT_ARCHITECTURE.md`, `ASSISTANT_GUARDRAILS.md`.

## What REMAINS (do next, in order)
1. **BUILD (critical, not run yet):** `cd frontend-app && pnpm build`. Assistant/CV/preview code is unverified — fix any TS errors. Likely suspects: assistant type casts in `tool-registry.ts`/`response-builder.ts`, `AssistantAction` href access.
2. **Part I (assistant tests):** create `tests/assistant_intent.spec.ts` (vitest). Cover: hiring→CV/contact/project actions; LumenScript Q→lumenscript card/action; BuenPick→buenpick; BBN→bbn; unknown→non-silent fallback; injection/admin prompt→refusal, no admin action; unknown tool rejected (`hasTool`); actions only allowed hrefs; CV data has no invented fields. Import from `lib/assistant/response-builder` + `tool-registry` + `lib/cv/build-cv-data`.
3. **Part C docs/env:** update `docs/HYBRID_DEPLOYMENT_STRATEGY.md` + `docs/VERCEL_DEPLOY_CHECKLIST.md` (add `PROJECT_PUBLIC_CONTENT_MODE`); add the var to `frontend-app/.env.docker.local.example` (=live) and `.env.production.example` (=static). Also add `PROJECT_PUBLIC_CONTENT_MODE=live` to `docker-compose.yml` amorosi-backend `environment:` and to `frontend-app/.env.docker.local` (real local file).
4. **Part J (docker smoke):** `docker.exe compose --profile backend up --build -d amorosi-backend` (WSL has no docker; use `docker.exe`). Then curl.exe smoke: `/`, `/projects`, `/projects/lumenscript`, `/admin`, `/api/content/projects`, `/cv`, `/preview`, POST `/api/assistant`. Verify: move Delibot→hall_of_fame in admin, save, confirm `/preview` Hall shows it.
5. **Part K (logs):** update `AMOROSI_LABS_STATE.md`; create `develop-history/PHASE_AMOROSI_RC2_ADMIN_LIVE_VISUALS_ASSISTANT.md` (answer the 15 final questions in the RC2 prompt).

## Key gotchas / decisions
- WSL has NO docker CLI → always use `docker.exe` / `curl.exe`.
- Docker build sets `DOCKER_BUILD=1` → `next.config.js` skips typecheck IN CONTAINER ONLY (framer-motion MotionStyle strictness). So `pnpm build` LOCAL is the real type gate — run it before trusting.
- Global `<body>` is `overflow:hidden` → every scrollable route needs its own `h-full overflow-y-auto` main.
- Vercel safety: never `local-json` / never admin on / public `/`,`/projects/[slug]` must stay static/SSG. Live mode = `/preview/*` only (deliberate).
- Assistant = deterministic (NO LLM dep). Reads static seed only. No commit unless user asks.
- Local admin (Docker): user `admin` / pass `admin-local-change-me` at http://localhost:3001/admin. Docker container may still be running from prior phase.

## Nothing committed. Do not commit unless user says so.
