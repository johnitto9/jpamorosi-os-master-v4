# T00 — Baseline & Freeze Report

**Date:** 2026-07-04
**Branch:** `v4final` @ `1410552` (fix: update next security patch)
**Authority:** `docs/final-refactor/*` marked as highest authority for this refactor.
**Rule honored:** no code modified. This is an audit-only deliverable.

---

## 1. Environment checks

| Check | Result | Notes |
|---|---|---|
| Typecheck (`tsc --noEmit`) | ✅ PASS (exit 0) | Clean. |
| Tests (`vitest run`) | ⚠️ CANNOT EXECUTE | `node_modules` is platform-mismatched (installed on Windows, run under WSL). Rollup native binary `@rollup/rollup-linux-x64-gnu` missing. Needs a clean `pnpm install` in the target env before "no hidden test failure" can be asserted. 4 spec files exist. |
| Full build (`next build`) | ⏸️ NOT RUN | Skipped to avoid the same dep issue + long run. Typecheck passing is a partial proxy. |

**Baseline is NOT cleanly reproducible yet** — reinstall deps in a Linux/CI env, then re-run tests + build.

## 2. Working-tree state (checkpoint blocker)

- `git status` shows **~1258 modified files**. Analysis:
  - The vast majority are **line-ending churn** (symmetric add==delete, e.g. `contact/route.ts` 124/124, `layout.tsx` 44/44). No `.gitattributes` exists; the repo has no CRLF normalization policy.
  - **At least one real uncommitted source change exists**: `frontend-app/app/page.tsx` is 202/8 (asymmetric ≈ +194 net) — genuine edits, not line endings.
- **Implication:** there is no clean HEAD to freeze. Real work is intermixed with pervasive whitespace noise.
- **Recommendation (needs your OK, no code touched):**
  1. Tag current HEAD as rollback point: `git tag baseline-pre-refactor 1410552` (does not touch the tree).
  2. Add a `.gitattributes` (`* text=auto eol=lf`) and normalize in ONE dedicated commit, so future diffs are readable.
  3. Review/commit the real `page.tsx` change separately.

## 3. Security — critical checks (T00 requires acting on confirmed exposure)

| Item | Status | Detail |
|---|---|---|
| Secrets leaked to git | ✅ SAFE | `secrets/*.txt`, `.env.local`, `.env.docker.local` are all **gitignored** (confirmed via `git check-ignore`). Not tracked. |
| Plaintext secrets on disk | ⚠️ HYGIENE | `secrets/` holds Cloudflare+Resend, OpenRouter, Serper keys in plaintext. Fine locally, but **must never be copied into the Docker image or rsync'd to the VPS**. Verify `.dockerignore` excludes `secrets/` and `.env*`. |
| Public Postgres port | 🔴 P0 (deploy-time) | `docker-compose.yml` maps `postgres: 5433:5432` on all host interfaces. On a VPS this = **public Postgres** — violates non-negotiable. Currently only used by the local `backend` profile, but this compose is the stated "future Dokploy target." Must become internal-only / `127.0.0.1` before any VPS deploy. |
| Docker socket exposure | 🟠 P1 | `autoheal` mounts `/var/run/docker.sock`. Container-escape surface. Spec 17 says `:ro` does not make it harmless. Decide keep-with-socket-proxy vs remove before prod. |
| Internal/cron API auth | ✅ DONE | `guardInternal` requires `INTERNAL_API_TOKEN`/`SERVICE_API_TOKEN` bearer; OFF (503) when unset. Solid. |
| Health endpoint | 🟡 MINOR | Returns `db`, `uptimeSeconds`, `timestamp` publicly. Spec 17 wants minimal `{"ok":true}`; move detail behind auth. |
| Upload validation | 🟠 PARTIAL | Extension allowlist + size caps (15MB img / 250MB video) exist. BUT: no MIME/actual-image decode, and **`.svg` is allowed** (spec 17: "no arbitrary SVG by default" — XSS risk). |

## 4. Subsystem classification

| Subsystem | Status | Evidence / gap |
|---|---|---|
| `/os` (interactive CV) | **DONE** | Preserved. Route present. |
| Public Home | **PARTIAL** | Renders, but not in canonical narrative order (spec 10). → T02. |
| Project Rooms | **PARTIAL** | Exist; evidence/architecture-honesty QA pending (spec 15). |
| Orbe naming | **MISSING** | Components named `Assistant*`; public name "Orbe" not applied. → T01. |
| Adaptive assistant (LLM brain) | **DONE (code)** | `orchestrator`, `intent-router`, `guardrails`, `tool-registry`, server tools all present; degrades w/o key. |
| **Guided Tour (deterministic, 0-LLM)** | **MISSING** | No state machine / tour engine. Only the adaptive `AssistantWidget`. The core non-negotiable (zero-token tour) does not exist yet. → T03. |
| Project ⇄ Branding unification | **PARTIAL** | Stored as a `session_projects` blob; no first-class `BrandDNA`/`ProjectCard`/`StackDecision` tables. → T04. |
| Persistence model (spec 04) | **PARTIAL** | Present tables: `projects, visitor_sessions, agent_messages, leads, session_projects, events, ai_logs, email_logs, magic_link_tokens, content_translations, prospects, memory_items`. **Missing as first-class:** `BrandDNA, Palette, Asset, VisualPlan, StackDecision, ProjectCard, Conversation(mode)`. |
| Asset Vault / Visual Planner | **MISSING** | No `Asset` table, no `VisualCoveragePlan`. Generated mockups persist as loose files under `/media/sessions/<id>/`, capped 3/session. → T05. |
| Admin Session Dossier | **PARTIAL** | `/admin/sessions/[id]` exists, transcript-centric. Dossier tabs (Overview/Project/BrandDNA/Assets/Activity) pending. → T06. |
| Scout / prospect pipeline | **DONE (code) / SIMULATED (prod)** | `daily-scout` + `prospects` funnel fully coded. But runs **only under the Docker `backend` profile worker**. Vercel public deploy has **no scheduler** → autonomy is dormant in the current prod path. |
| Heartbeat | **DONE (code) / SIMULATED (prod)** | `worker.mjs` schedules `daily-scout` (SCOUT_HOUR) + `heartbeat` (PULSE_HOUR, daily). Same "only-under-Docker-worker" caveat. |
| R2 media | **DONE (code) / DISCONNECTED** | `storeFile` → R2 with local fallback, secret-free error logging. But **no `.env` sets `R2_*`** (only `.example` files). `isR2Configured()` = false → all media on local volume. See §5. |
| Postgres | **DONE** | `bootstrap.ensureSchema` auto-creates tables; degrades to memory-lite when DB down. Exposure caveat in §3. |
| i18n | **PARTIAL** | Dictionaries + server translate exist; mixed-language surfaces & guardrail coverage per spec 16 unverified. → T01. |
| Email (Resend) | **DONE (code)** | `lib/email/service` sends via Resend or logs to `email_logs` w/o key. |
| Contact API | **DONE** | zod-validated route present. |

## 5. Answers to the three practical release questions

### (a) Is media working on Cloudflare R2? — **NO, not connected.**
The **code is production-ready** (`lib/media/storage.ts`: R2 upload + automatic local fallback + secret-free logging). The **R2 credentials exist** in `secrets/cloudflare and resend credentials.txt`, but they are **not wired into any `.env`** — only the `.example` files mention `R2_*`. So `isR2Configured()` returns false and every upload lands on the local volume served by `/api/media/[...path]`.
**To connect:** set `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` in the deploy env, upload one asset via `/admin/upload`, and confirm a `storage.r2.uploaded` event + a public URL under `R2_PUBLIC_BASE_URL`.

### (b) Search flow (Serper) — **works in code, dormant in current prod.**
`WEB_SEARCH_API_KEY` → `serper.dev`. `daily-scout` rotates 7 weekly angles (2/day), ingests hits into `prospects` (URL-deduped), and advances the kanban one stage per pass (`ingest→filter→enrich→qualify→contact`). Key exists in `secrets/serper-apikey.txt`. **Caveat:** it only fires from the Docker `worker` container. On Vercel there is no scheduler, so nothing runs unless the backend profile is deployed (Dokploy/VPS) or you add a Vercel Cron / external ping.

### (c) Email-finding for a marketing DB — **SUPERSEDED 2026-07-06.**

> Historical baseline note: this section described the pre-SearXNG/prospecting
> state. Current behavior is documented in
> `docs/finalizacion-prod-2026-07-05/DEV_HISTORY.md` and
> `docs/serper-augmented-2026-07-06/README.md`.

The scout finds **opportunities/URLs** (job posts, hiring pages), **not emails.** `ingestSearchHits` stores title/snippet/url only. The `enrich` stage does one more Serper search but **only stores it as text** — it never parses emails out. The **only** path that fills the `prospects.email` column is `ingestDroppedText` (you manually paste an email/forwarded text → regex extracts it). So today the system does **not** autonomously build an email list.

**Historical simple proposal (reuses what existed at that time; superseded):**
1. In the `enrich` stage, add one extra Serper query `"{company}" contact email` and regex-extract emails into the existing `prospects.email` column. Bounded cost (already inside the per-batch limit).
2. Add an admin action "Export qualified + has-email → CSV" from `/admin/prospects` (the table already has stage + email).
3. Reuse the existing **Resend** integration for warm/opt-in outreach only. Do **not** build a scraper or a cold-blast engine — keep a human confirm step in admin.
This stays within "sencillo con lo que ya tenemos" and folds naturally into the autonomy/prospects task scope (not T00).

Current implementation now does:

- SearXNG discovery + provider-aware enrichment queries.
- Bounded scraping of original and selected result URLs.
- Serper only as premium last step.
- Email extraction into `prospects.email` when public emails exist.
- CSV/JSONL export from `/api/admin/prospects`.
- `OUTBOUND_LEAD_EMAILS_ENABLED=false` as the prod safety gate.

## 6. Documentation contradictions found

1. **`CLAUDE.md` says Tailwind v4**, actual is **Tailwind 3.4** (`package.json` devDep). Non-negotiable forbids a major migration, so **v3 stays** — the doc is stale and should be corrected, not the code.
2. **`CLAUDE.md`** frames the product as a simple 3-phase interactive CV; **`final-refactor/*`** describes a much larger autonomous system (Orbe, scout, heartbeat, Postgres, R2). Per authority order, **final-refactor wins**; `CLAUDE.md` is historical reference.
3. **`tools-server.ts`** comments reference "Seedream 4.5" while `env.ts` defaults the image model to `google/gemini-3.1-flash-lite-image` and notes Seedream isn't in the OpenRouter catalog. Minor comment drift.

## 7. P0 / risk summary

- **P0 (deploy-time):** public Postgres `5433:5432` in the compose that is the future VPS target. Fix mapping before any VPS/Dokploy deploy.
- **P1:** `autoheal` docker.sock mount; SVG uploads allowed; health endpoint leaks dep detail.
- **Blockers to a clean baseline:** tests can't run (platform-mismatched deps); dirty working tree with real uncommitted `page.tsx` change buried under line-ending churn.
- **Prod-path gap:** autonomy (scout/heartbeat) + admin + Postgres only live under the Docker backend profile; the current Vercel public path is static/admin-off. Decide the prod topology (Vercel-static + separate Dokploy backend, or all-in on VPS) before release — this drives R2, scheduler, and DB exposure decisions.

## 8. Recommendation to start T01

Once you approve: (1) tag the baseline + add `.gitattributes`, (2) clean-install deps and get tests green, then start **T01 (Naming/i18n truth)** — lowest-risk, high-visibility: apply the `Orbe` public name and close mixed-language surfaces. Do **not** start T01 until you confirm.
