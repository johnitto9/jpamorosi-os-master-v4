# PHASE_AMOROSI_02B_03A_PUBLIC_HALL_ROOMS — Change Log

**Date:** 2026-07-01
**Phase:** 2B + 3A — Public Hall of Fame UI + Project Rooms (first pass)
**Loop:** READ → PLAN → SMALL PATCHES → RUN CHECKS → REVIEW → LOG → STOP

## 1. Objective
Make the public portfolio feel like the "Amorosi Labs Hall of Fame" — a premium
lab-gallery of shipped systems — and add a first-pass project index + project
rooms. Keep `/` static-safe for Vercel, keep `/os` untouched, no new deps, no
generated assets, no AI, no Postgres.

## 2. What changed (by part)

### Part B — Public data bridge
- **Created** `frontend-app/lib/projects/public-projects.ts`: the single public
  read layer. Reads the static seed (`content/projects.ts`) synchronously —
  **no repository, no local-json, no fs, no network** → keeps public pages static.
  Exposes `getPublicProjects`, `getPublicHallOfFameProjects`,
  `getPublicFeaturedProjects`, `getPublicArchiveProjects`,
  `getPublicProjectBySlug`. Missing `published` treated as published; sort by
  `sortOrder` then `title`. Comment documents deliberate remote-api wiring later.
- **Repointed** `HallOfFameGrid`, `FeaturedSystemsGrid`, `LabArchiveGrid` to the
  bridge (were importing `content/projects` selectors directly).

### Part C — Hall of Fame home upgrade
- **Content** `content/projects.ts`: repositioned the three flagships —
  LumenScript (AI-native writing platform + multi-model orchestration, memory/
  canon, evaluation loops, OpenRouter direction; status → Platformizing),
  BuenPick (live local-commerce startup, active merchants, marketplace/mobile/
  admin), BBN (AI-assisted local media, lightweight production agent workflows,
  editorial automation/ranking).
- **Content** `content/profile.ts`: hero copy → name + "AI Product Engineer ·
  Systems Architect · Founder" + "I build AI-powered products that survive
  contact with reality…".
- **`HallHero`**: name/role/tagline, three CTAs (Enter Hall of Fame / Explore
  Project Rooms / Open jpamorosi.os), capability→evidence matrix (from
  `content/capabilities.ts`, resolving slugs → titles). Visible focus states.
- **`HallOfFameCard`**: branded background (SmartImage + glow), logo chip
  (monogram fallback), status/category, one-liner, proof, highlights (large),
  stack chips, **CTA to `/projects/[slug]`**.
- **Featured** cards now wrapped in links to rooms; **Archive** rows now link to
  rooms. All with focus-visible rings.
- **Decision:** CSS-only (no framer-motion) to keep `/` static + light and avoid
  client JS at first paint. Playbook allowed framer-motion but the phase's
  static/lightweight constraints took precedence.

### Part D — Project index + rooms
- **Created** `app/projects/page.tsx` — index reusing the three grids + header +
  `/os` CTA; own scroll container; static.
- **Created** `app/projects/[slug]/page.tsx` — `generateStaticParams()` from the
  bridge (SSG), `generateMetadata()`, `notFound()` on miss; own scroll container.
- **Created** `components/projects/`: `ProjectRoom` (shared template),
  `ProjectHero` (branded scene bg + logo + title/labTitle/status/category +
  one-liner + role chips + demo/github links), `ProjectProofCards`,
  `ProjectArchitecturePreview` (plain HTML/CSS nodes+flow, no React Flow),
  `EvidenceWall` (screenshots or branded placeholder tiles),
  `FounderNotes` (aiSummary/placeholder). Closing CTAs (Hall / all rooms / OS).

### Part E — Media readiness
- **Created** `docs/PROJECT_MEDIA_GUIDE.md`: `public/projects/{slug}/{logo.svg,
  hero.webp,bg.webp,screenshots/}` convention, wiring into `assets`, SmartImage
  contract. **No assets generated** (per phase constraint).
- SmartImage already meets Part E (next/image, fill→no layout shift, alt,
  className, priority, branded gradient fallback) — unchanged.

### Part F — Responsive / a11y / perf
- Mobile-first grids (`sm:`/`lg:` breakpoints), `overflow-x-hidden` on page mains,
  `focus-visible` rings on all CTAs/links, high-contrast text on dark, aspect-ratio
  image boxes (no layout shift). No client-only animation required for first paint.
- `/` and `/projects` render static; `/os` untouched.

## 3. Decisions summary
- **Public bridge reads static seed** (not the repository) → guarantees Vercel
  static builds; remote-api remains a deliberate future switch.
- **Reuse hall grids on `/projects`** → DRY, consistent look.
- **CSS-only motion** → lightweight, static-safe.
- **No schema changes** → FounderNotes/EvidenceWall use existing fields +
  placeholders; zero churn to validators/repository.

## 4. Commands run + results
```bash
cd frontend-app
pnpm build      # ✅ / (static), /projects (static), /projects/[slug] (SSG, 10 rooms),
                #    /api/content/* dynamic, /os untouched (347 kB)
pnpm test run   # ✅ 20/20
# repo root:
docker.exe compose config --quiet   # ✅ (Docker Desktop 29.5.2)
```
No build errors after implementation (clean on first full build).

## 5. Media readiness
Convention documented; SmartImage fallback verified in build (flagships have no
images → branded placeholders render). Drop files under `public/projects/{slug}/`
and set `assets` paths to light them up.

## 6. Risks / TODOs
- **No real media yet** — flagship cards/rooms show branded placeholders.
- **Rooms are first-pass**, not cinematic (no ProjectSceneBackground component /
  no React Flow) — good enough to demo, per scope.
- **Public bridge is static** — enabling live data (remote-api) is a later,
  deliberate step that would make consuming pages dynamic.
- `/api/content/*` are `force-dynamic`; add caching if Vercel ever serves them.
- Homepage `<h1>` is the person's name; if SEO wants a lab-branded H1, revisit.

## Next Recommended File
`09_QA_SECURITY_DEPLOY.md` — QA/perf/security/deploy hardening. Alternatively:
add real project media, or start the AI guide.

## Why
The public Hall of Fame + rooms now exist and are content-driven and static-safe;
the next high-value step is QA/security/deploy hardening (or media).

## Blockers
None. **STOP — awaiting authorization before the next phase.**
