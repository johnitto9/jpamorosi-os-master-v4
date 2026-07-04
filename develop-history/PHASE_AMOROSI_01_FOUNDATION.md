# PHASE_AMOROSI_01_FOUNDATION — Change Log

**Date:** 2026-07-01
**Task file:** `amorosi-labs-agentic-playbook/05_TASK_FOUNDATION_REFACTOR.md`
**Loop:** READ → PLAN → SMALL PATCH → RUN CHECKS → REVIEW → LOG → STOP

## 1. Objective
Refactor jpamorosi.dev into the foundation of **Amorosi Labs** — a hiring-focused
Hall of Fame portfolio — while preserving the existing OS experience under `/os`.

## 2. Prior review (what existed)
- Real Next.js app in `frontend-app/` (App Router, Next 15.2.4, React 18.3.1).
- `app/page.tsx` lazy-loaded `./client-app` (the OS desktop/dock/window system).
- Tailwind **v3.4** with custom tokens (`dark-bg`, `accent-cyan`, etc.).
- Global `layout.tsx` sets `<body>` to `h-screen w-screen overflow-hidden` (needed by the OS).
- Content in `content/*.json`; projects data included real projects (Trading, RecApp, Delibot, AI Lab, Kaelos, Code Saver).

## 3. Changes applied (with paths)
### Routing / OS preservation
- **Added** `frontend-app/app/os/page.tsx` — lazy-loads `../client-app` (OS unchanged), with its own metadata. The OS now lives at `/os`.
- **Replaced** `frontend-app/app/page.tsx` — new server-rendered Amorosi Labs home:
  `<HallHero /> <HallOfFameGrid /> <FeaturedSystemsGrid /> <LabArchiveGrid />` + `/os` CTA + footer.
  - `client-app.tsx` was **not** modified or deleted.

### Content model (new)
- `frontend-app/content/projects.ts` — `Project`/`ProjectTier`/`ProjectStatus` types, static seed, and selector functions.
- `frontend-app/content/profile.ts` — identity + hiring thesis.
- `frontend-app/content/capabilities.ts` — evidence-based capability→proof map (no skill bars).

### Components (new)
- `components/design-system/`: `GlowCard.tsx`, `StatusBadge.tsx`, `SmartImage.tsx`, `SectionHeader.tsx`
- `components/hall/`: `HallHero.tsx`, `HallOfFameCard.tsx`, `HallOfFameGrid.tsx`, `FeaturedSystemsGrid.tsx`, `LabArchiveGrid.tsx`

## 4. Decisions

### Decision — scroll container on `/`
- **What:** The new home opts into scrolling via an internal `h-full overflow-y-auto` `<main>`.
- **Why:** Global `<body>` is `overflow:hidden h-screen` for the OS. Rather than change the shared layout (risk to OS), the home scrolls internally.
- **Evidence:** `pnpm build` static-renders `/`; layout untouched so `/os` still full-viewport-locked.
- **Rollback:** revert `app/page.tsx`.

### Decision — server components, CSS-only, no framer-motion on home
- **What:** All new components are server components with CSS transitions.
- **Why:** Playbook forbids new heavy motion/3D on home; keeps First Load JS tiny and SEO-friendly.
- **Evidence:** `/` = 2.96 kB / 109 kB First Load, prerendered `○ (Static)`.
- **Rollback:** components are additive; delete `components/hall` + `components/design-system`.

### Decision — SmartImage graceful fallback
- **What:** Missing assets render a deterministic gradient placeholder instead of `next/image` errors.
- **Why:** LumenScript/BuenPick/BBN have no image assets yet; must degrade gracefully (playbook Hall of Fame logic).
- **Evidence:** Build succeeds with `heroImage: undefined` on 3 hall projects.
- **Rollback:** revert `SmartImage.tsx`.

### Decision — no dependencies added, no Tailwind migration
- Held per non-negotiables. `package.json` unchanged.

## 5. Testing (commands + results)
```bash
cd frontend-app
pnpm install     # ✅ (node_modules was absent)
pnpm build       # ✅ compiled, type-checked, lint-clean, 13/13 static pages
pnpm test run    # ✅ 20/20 (tests/desktop_store.spec.ts)
```
Build route table: `/` static 109 kB First Load; `/os` 347 kB (heavy OS, as expected).

Non-blocking warnings observed (pre-existing, not introduced here):
- Tailwind `content` glob warning on `./packages/three-react/**/*.js`.
- caniuse-lite is 11 months old.

## 6. Experience notes (what to remember)
- The single biggest gotcha is the global `overflow:hidden` body — any new scrollable
  route MUST provide its own scroll container. Do not "fix" it in `layout.tsx`.
- Hall of Fame flagship projects (LumenScript/BuenPick/BBN) are proof-narrative only in
  the codebase — copy is seeded, real assets/links still needed.
- `node_modules` was not present; a fresh clone needs `pnpm install` before build.

## 7. Persistence
- Updated `develop-history/AMOROSI_LABS_STATE.md`.
- This log created.

## Next Recommended File
`06_TASK_BACKOFFICE_ADMIN.md`

## Why
The public content model now exists; admin CRUD can target the same `Project` schema.

## Blockers
None. **STOP — awaiting authorization before Phase 06.**
