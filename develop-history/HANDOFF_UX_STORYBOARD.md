# HANDOFF — Amorosi Labs UX / Storyboard + Video pipeline

Date: 2026-07-01. Snapshot of the interactive-CV redesign work.

## F3 — done (this pass)
- **Site-wide aurora background** (replaces the cyberpunk grid everywhere, not just `/`).
  - `components/visual/AuroraScene.tsx` — `motion.div` w/ framer-motion color cycle on `radial-gradient` + `<StarField>` (canvas2D) + vignette. Palette comes from the scene store. SSR-safe, reduced-motion aware.
  - `components/visual/AuroraLayer.tsx` — thin client wrapper so the scene can be mounted from the server `RootLayout`.
  - `app/layout.tsx` now renders `<AuroraLayer />` once for the whole app, behind a `relative z-10` wrapper so all routes inherit the background.
- **Per-section palette** via `store/sceneStore.ts` (zustand):
  - `palette` (the active gradient cycle) + `hallPalette` (sticky Hall brand, set by the selected flagship).
  - `setPalette(palette)` / `setHallPalette(palette)` / `reset()`.
- **`components/visual/SceneController.tsx`** — observes section ids via `IntersectionObserver` (rootMargin `-45% 0`) and promotes the right palette as each section enters the center band. On the home the Hall is special-cased so it preserves the project brand even if you scroll out and back.
- **`SceneSetter`** — one-shot palette for pages without sections. Used on:
  - `/admin/*` (admin layout) — emerald/cyan backoffice palette.
  - `/projects` — base index palette; the Hall on this page promotes the active flagship's brand on top.
  - `/projects/[slug]` — palette derived from the project's `theme.accent` + `theme.secondary` (so the page background matches the room).
  - `/preview`, `/preview/projects`, `/preview/projects/[slug]` — same logic as the public versions.
- **`HallOfFameGrid` now brands the whole site on selection**: derives a 4-stop palette from the active project's `theme.accent` + `theme.secondary` + cyan + violet, and pushes it to BOTH `hallPalette` and `palette` (so the Hall's brand color shows on the aurora even on pages without `SceneController`, like `/projects`).
- **`HallHero`** lost its local `<AuroraBackground />` — the global layer is the one background.
- **Project admin form (`components/admin/ProjectForm.tsx`) already had the `theme` group** (accent / secondary / glow / mood) plus `assets.heroImage` / `assets.logo` / `assets.backgroundImage` paths. No new fields were needed for the "color representativo" request — admin edits flow straight into the Hall + aurora via `getPublic*`.

## How to run / verify
- WSL has **no** docker CLI → use **`docker.exe`** and **`curl.exe`** (Docker Desktop).
- Rebuild + run backend emulator:
  `cd <repo> && docker.exe compose --profile backend up --build -d amorosi-backend`
- App: **http://localhost:3001** · Admin: `/admin` (user `admin` / pass `admin-local-change-me`, local only).
- Local checks: `cd frontend-app && pnpm build && pnpm test run` (33 tests).
- Docker build skips typecheck (`DOCKER_BUILD=1`) → **local `pnpm build` is the real type gate**.

## Deployment model (unchanged)
- Vercel = public prod, `PROJECT_STORAGE_DRIVER=static`, `PROJECT_PUBLIC_CONTENT_MODE=static`, admin off.
- Docker = backend emulator: `local-json` + `live` content mode + admin + ffmpeg. Data on volume `amorosi_backend_data` → `/app/data`.
- `/` and `/projects` are SSR (`force-dynamic`); in `live` reflect local-json; in `static` read the seed (Vercel-safe).

## Visual system (components/ui)
- `aurora-background.tsx` — hero bg: framer-motion color-cycling radial gradient + `star-field.tsx` (canvas2D starfield, twinkle+drift). (R3F Stars was replaced — it crashed on client.)
- `star-field.tsx` — canvas starfield.
- `holographic-card.tsx` — profile card: rests tilted ~14°, cursor modulates around it (never flat), holographic sheen + glare.
- `orbital-wave.tsx` — Saturn-style ring split into `part="back"`/`"front"` so it wraps the card (back behind, front in front). No comet.
- `particle-wave-field.tsx` — delicate dotted wave (canvas2D, small soft dots, `mask` prop center/right/bottom, density scales w/ width). Used in Hall cards + open-to-work.
- `wave.tsx` + `wave-lazy.tsx` — R3F ripple shader (currently UNUSED in hero; kept for reuse; must load via wave-lazy ssr:false).
- `reveal.tsx` — framer-motion load/enter animation (used in hero + Featured).
- `scroll-stage.tsx` — owns the page `<main>` scroll container and shares its ref via `ScrollContainerContext` (the OS layout locks `<body>`, so the page scrolls inside `<main overflow-y-auto>`).
- `section-transition.tsx` — SCROLL-LINKED cinematic scene transition. `useScroll` (bound to the ScrollStage container) drives opacity+scale+rise+blur as each section travels the viewport, so sections "arrive"/"depart" tied to the wheel in both directions (scrub). No GSAP/pinning. `blur` prop lowered on heavy sections (Hall video = 4). Wraps every section on `/` EXCEPT `HallHero` (above the fold → would flash on the initial pre-measure frame; keeps its own `Reveal`).
- `chapter-nav.tsx` — fixed dot rail, smooth-scroll between section chapters.
- `confetti.tsx` — branded canvas confetti (used on selected Hall card).
- `dithering-shader.tsx` — WebGL2 dither (used once, LumenScript card top).
- `LabSceneBackground.tsx` (components/visual) — global grid + glows (scanlines removed).
- `BackgroundVideoPanel.tsx` (components/visual) — local video w/ gradient fallback.

## Sections (current state)
- **Hero** (`components/hall/HallHero.tsx`): aurora+stars bg, staggered Reveal load, holographic profile card wrapped by orbital ring (back/front). `id="intro"`.
- **Hall of Fame** (`components/hall/HallOfFameGrid.tsx`): CLIENT. Dark-room micro-universe: dichroic beams, **Embla carousel** of flagships, selected card **brands section** (accent glow + title watermark), **confetti** on selected, controls+dots. Accepts `projects` + `heroVideo` props. `id="hall-of-fame"`.
- **Featured** (`FeaturedSystemsGrid.tsx`): balanced flex-wrap cards + stagger Reveal. `id="featured"`.
- **Lab Archive** (`LabArchiveGrid.tsx`): timeline w/ glowing nodes. `id="lab-archive"`.
- **Open to Work** (in `app/page.tsx`): particle-wave (right) + amber horizon. `id="contact"`.

## F2 — Hero video pipeline (admin upload → ffmpeg transcode)
- `Dockerfile` runner: `apk add ffmpeg` (ffmpeg 8.x present, verified).
- `lib/media/store.ts` — `dataDir()`, `mediaDir()` (=`/app/data/media`), `getSiteSettings()/saveSiteSettings()` (`/app/data/settings.json`), `safeMediaPath()`.
- `app/api/admin/media/route.ts` — POST multipart → save → ffmpeg 720p MP4 (H.264, no audio, faststart) + WebP poster → update settings. DELETE clears. Guards: admin + writable driver. `maxDuration=300`, 250MB cap.
- `app/api/media/[...path]/route.ts` — public read w/ range support.
- `app/admin/media/page.tsx` + `components/admin/MediaUploader.tsx` — admin UI (linked from dashboard).
- `app/page.tsx` reads `getSiteSettings()` → passes `heroVideo` to `HallOfFameGrid`, which renders `BackgroundVideoPanel` (dimmed) if set.
- **Verified end-to-end** via a test clip: upload→transcode→`/api/media/hero.mp4` 200 + poster 200.

## KNOWN ISSUE (being fixed now)
User uploaded a real 16:9 hero video from admin but it does NOT appear on the Hall of Fame background on `/`. Under investigation — likely candidates:
1. `BackgroundVideoPanel` default `webm` source (points at a non-existent `/media/amorosi-lab-loop.webm`) confusing playback, or
2. video too dark (`opacity-40` panel under a `bg-[#05060b]/70` overlay), or
3. React `muted`/autoplay not starting, or settings not read on `/`.
Fix in progress: verify `/app/data/settings.json`, `/api/media/hero.mp4`, and the rendered `<video>` in `/` HTML; then correct source/opacity/autoplay.

## F3 — pending (next)
- Micro-universe identity for Featured / Archive / Open-to-Work.
- **Individual project page** (`/projects/[slug]`) adapted to the new storyboard UX.
- Project cover/logo (admin-uploaded) driving Hall branding when a project is selected.
- Later: Cloudflare Stream/R2 offload for video.

## Tests: `tests/assistant_intent.spec.ts` (13) + `tests/desktop_store.spec.ts` (20) = 33. `vitest.config.ts` has `@` alias.
## Nothing committed.
