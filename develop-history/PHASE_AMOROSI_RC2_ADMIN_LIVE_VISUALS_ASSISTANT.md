# PHASE_AMOROSI_RC2 — Live Admin Preview + Backoffice + Visual + Assistant

Date: 2026-07-01. Loop: READ → DIAGNOSE → PLAN → PATCHES → CHECKS → DOCKER SMOKE → LOG → STOP.

## Diagnosis (admin/public mismatch)
Public pages (`/`, `/projects`, `/projects/[slug]`) read the **static seed**
(`content/projects.ts` via `public-projects` sync getters); admin writes to
**local-json** (`/app/data/projects.json`) via the repository. Two disconnected
sources — intentional for Vercel static-safety. So admin edits never changed the
public Hall. Data sources: `/` `/projects` `/projects/[slug]` = static seed;
`/admin` + `/api/content/projects` = repository (local-json in Docker).

## Solution: content mode + deliberate live surface
- `PROJECT_PUBLIC_CONTENT_MODE=static|live` (`lib/env.ts`). Default static.
- New **`/preview`, `/preview/projects`, `/preview/projects/[slug]`** (force-dynamic)
  read local-json via async `getLivePublic*` getters. Grids accept optional
  `projects` prop. `/` stays static/SSG → Vercel safe. Chose an explicit preview
  surface over conditional dynamic `/` (fragile, risks SSG).

## Files created
- Content/preview: `app/preview/{layout,page}.tsx`, `app/preview/projects/{page,[slug]/page}.tsx`; live getters in `lib/projects/public-projects.ts`.
- Assistant: `lib/assistant/{types,context-builder,guardrails,intent-router,tool-registry,response-builder}.ts`; `app/api/assistant/route.ts`; `components/assistant/{AssistantWidget,AssistantMessage,AssistantActionButton,AssistantProjectCard}.tsx`.
- CV: `lib/cv/build-cv-data.ts`, `app/cv/page.tsx`, `components/cv/PrintButton.tsx`.
- Visual: `components/visual/{LabSceneBackground,BackgroundVideoPanel}.tsx`; globals.css keyframes.
- Docs: `docs/assistant/{DELIBOT_REFERENCE_NOTES,ASSISTANT_ARCHITECTURE,ASSISTANT_GUARDRAILS}.md`, `docs/VIDEO_ASSET_PIPELINE.md`.
- Tests: `tests/assistant_intent.spec.ts`; `vitest.config.ts` (`@` alias).

## Files modified
- `lib/env.ts` (mode + helpers), `components/hall/*Grid.tsx` (props), `app/admin/page.tsx` (dashboard), `app/admin/projects/[slug]/page.tsx` (preview link), `app/page.tsx` (bg, IA link, hiring/assistant), `app/projects/page.tsx` + `[slug]/page.tsx` (widget, related), `components/projects/ProjectRoom.tsx` (what-this-proves, related), env examples, `docker-compose.yml`, `docs/HYBRID_DEPLOYMENT_STRATEGY.md`, `docs/VERCEL_DEPLOY_CHECKLIST.md`.

## Decisions
- Admin polish: no schema change; existing `ProjectForm` reused (already grouped).
- Media: no upload endpoint in RC2 (documented future). SmartImage fallbacks prevent broken images. Asset paths editable in admin.
- Visual: CSS-only background (three/fiber exist but kept OFF public for static-safety/perf); video panel gradient fallback (no assets generated).
- Assistant: **deterministic, no LLM dependency**; reads static seed only; memory-lite (request-scoped history, no persistence/PII). LLM adapter documented as future.
- CV: print-ready `/cv` (browser Save-as-PDF). Server PDF endpoint deferred (would need a dep).

## Commands / results
- `pnpm build` ✅ (`/`, `/cv` static; `/projects` static, `/projects/[slug]` SSG; `/preview/*`, `/api/assistant` dynamic; `/os` intact).
- `pnpm test run` ✅ **33/33** (20 desktop + 13 assistant).
- Docker: `docker.exe compose --profile backend up --build -d amorosi-backend` → Up on :3001.
- Smoke (curl.exe): `/`,`/projects`,`/projects/lumenscript`,`/api/content/projects`,`/cv`,`/preview`,`/preview/projects` → 200; `/admin` → 307 (login).
- Assistant: hiring → grounded answer + CV/hall/contact; injection/admin → refusal.
- **Live preview verified**: login → PUT delibot tier=hall_of_fame (persisted local-json) → `/preview` shows Delibot → reverted to featured (no pollution).

## Final answers
1. **Why admin edit didn't show:** public read static seed; admin wrote local-json — disconnected by design (Vercel-safe).
2. **What changed:** `PROJECT_PUBLIC_CONTENT_MODE` + `/preview/*` live surface reading local-json; admin badges/warning + preview links.
3. **Vercel safe?** Yes — default static; `/`,`/projects` static/SSG; preview/admin never on public path.
4. **Backoffice:** dashboard stat cards, data-source + public-mode badges, static warning, tier-grouped list, edit + live-preview links.
5. **Visual:** CSS lab background (grid/glows/nodes/scanline, reduced-motion aware) on home; distinct project-room accents; video panel component w/ gradient fallback.
6. **CTAs distinct?** Yes — Enter Hall of Fame = `#hall-of-fame`; Explore Project Rooms = `/projects`; Open jpamorosi.os = `/os`; cards = `/projects/[slug]`; + "Browse all project rooms" link.
7. **3D/video active?** 3D deliberately NOT on public (static-safety); CSS lab background IS active; video = component with gradient placeholder (no assets yet).
8. **URLs to test:** `/`, `/projects`, `/projects/lumenscript`, `/cv`, `/preview`, `/admin` (login), `POST /api/assistant`; assistant widget bottom-right.
9. **Assets to add next:** `public/projects/{slug}/hero.webp|logo.svg|bg.webp`; `public/media/amorosi-lab-loop.{webm,mp4}` + poster (see docs/VIDEO_ASSET_PIPELINE.md). Branded OG image optional.
10. **Container running + live?** Yes — `amorosi-labs-backend` on :3001, `PROJECT_PUBLIC_CONTENT_MODE=live`, volume `amorosi_backend_data` persists local-json.
11. **Assistant foundation:** deterministic pipeline (guardrails → intent router → context → tools → response builder → enforce), `/api/assistant`, floating widget.
12. **Tools/buttons:** navigate_to_project, show_project_card, compare_projects, list_hall_of_fame, list_featured_systems, explain_capability, open_os, open_contact, open_or_generate_cv, suggest_best_project_for_intent → structured navigate/show_project/external actions + project cards.
13. **Guardrails:** injection/admin/secret/off-topic refusal; allowed-href filter; action(≤4)/card(≤3)/length caps; content-only (no invented metrics); no admin/tools/fs/network; no PII; no-silence fallback; tests cover these.
14. **CV:** yes — assistant opens `/cv` (print/Save-as-PDF), built from real data. Server-side PDF = documented next step (avoids heavy dep).
15. **Delibot files:** `delibot/codigo_extraido_delibotlast.txt` (stable memory heart) + `...last1.txt` (v16/17 quarry). Lessons → tool registry as source of truth, intent router, single delivery path, anti-silence, guardrails, observability, memory-lite. See DELIBOT_REFERENCE_NOTES.md.

## Risks / TODOs
- Preview cards link to static `/projects/[slug]` (not `/preview/...`) — minor; Hall grid on `/preview` already reflects live edits.
- Real media + optional video assets pending.
- Server PDF + optional LLM adapter = future phases.
- Public full-live mode (`/` dynamic) intentionally not done; `/preview` is the live surface.

## Next recommended
Add real media assets; optionally `09_QA_SECURITY_DEPLOY.md` deep pass; optional LLM adapter / server PDF. Nothing committed.
