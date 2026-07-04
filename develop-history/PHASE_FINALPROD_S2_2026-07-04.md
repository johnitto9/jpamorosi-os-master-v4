# Phase FINALPROD — Session 2 (interludes mobile polish + vault hierarchy)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** intermediate handoff + plan execution (FP-S2)

> Continuation of `PHASE_FINALPROD_2026-07-04.md` (S1 was code-level fixes
> for Seedream/palette/timeout/mobile + rebuild + commit f56bc09).
> **S2 = two polish passes the user flagged after S1 shipped: mobile interludes
> felt flat vs desktop, and the AssetVault sat "behind the chat at home/background
> level".**

## Context carried in

- Desktop interludes were "flama" — choreographed via GSAP Timeline + ScrollTrigger
  (sticky stage, scrubbed timeline, 2 prints travelling, dancing milestone words,
  growing thread). See `components/hall/Interludes.tsx` (top file comment).
- S1 added a `(max-width:1023px)` GSAP matchMedia branch with `.m-rise` rise+fade
  + `.m-chip` stagger pop over a `MobileStatic` block. User said: more animated
  and clean yes, but **nothing like desktop — multiple images, multiple texts,
  more scrolling**. The `MobileStatic` was a single image + body + chip row.
- AssetVault.tsx had `z-30` for collapsed tab/expanded panel and `z-50` for
  lightbox. The chat backdrop is `z-[119]` and the panel is `z-[121]`. So when
  chat is open, the vault sits *under* the backdrop at "home/background level" —
  exactly what the user reported. They want it at chat hierarchy.

## What changed (this session)

### 1 · Vault z-index — at chat hierarchy, not buried

`components/assistant/AssetVault.tsx`:
- Collapsed tab: `z-30 → z-[115]` (matches `GuidedTour` z-index — chat-ecosystem
  layer: above the page background but consistent with the chat's other floating
  UI; the chat panel still covers it when open, which is correct focus behavior).
- Expanded panel: `z-30 → z-[115]`.
- Lightbox: `z-50 → z-[130]` (above the chat panel at `z-[121]` — previews always
  cover whatever room they were opened from).

The vault stops feeling like a page element buried under home when chat is open;
it now lives in the same layer as the GuidedTour, so the hierarchy reads as
"chat-related floating UI" instead of "page chrome under chat".

### 2 · Mobile interludes — three richer per-scene compositions

`components/hall/Interludes.tsx`:
- Kept `MobileStatic` as the reduced-motion / no-JS fallback (now hidden with
  `motion-safe:hidden` — only shows when prefers-reduced-motion matches).
- Added three new per-scene components: `MobileScene1`, `MobileScene2`,
  `MobileScene3` — each mirrors the desktop narrative *vertically*:
  - **Scene 1 (Before the Systems)**: eyebrow → heading → body → full-bleed
    shop print → pull-quote from first milestone → offset-right workshop print
    → milestone chips (staggered) → closing signature. ~8 reveal moments, 2 images.
  - **Scene 2 (Inside the Proof)**: eyebrow → heading → body → running system
    screenshot → numbered stack-layer cards (one per `t.items`, each its own
    reveal with cyan glow, indented like the desktop build-up) → closing line.
    ~6-9 reveal moments, 1 image + N layer cards.
  - **Scene 3 (The Living Layer)**: eyebrow → heading → body → dimmed backdrop
    → numbered flow-word cards (one per `t.items`, each its own reveal with
    violet glow) → gradient rail visualization with arrival·memory·action markers.
    ~9-12 reveal moments, 1 image + N step cards.
- Both `MobileStatic` and `MobileScene*` render simultaneously, gated by CSS:
  `motion-safe:hidden` on `MobileStatic`, `motion-reduce:hidden` on `MobileScene*`.
  Reduced-motion and no-JS users still get the readable fallback.
- Reuses the existing GSAP `.m-rise` and `.m-chip` selectors (no new triggers);
  the matchMedia branch added in S1 picks up the new elements automatically.

Each call site (`BeforeTheSystems` / `PortfolioSystemInterlude` /
`LivingLayerInterlude`) now renders both `<MobileStatic>` and `<MobileScene*>`
side by side — only one is visible at a time per the motion-preference gate.

### Files touched

- `frontend-app/components/assistant/AssetVault.tsx` — 3 className swaps
  + 4-line block-comment header per change
- `frontend-app/components/hall/Interludes.tsx` — `MobileStatic` reduced to
  fallback (motion-safe:hidden), added `MobileScene1/2/3` (~190 lines), updated
  3 call sites

## Verification

- `node_modules\.bin\tsc --noEmit` → 0 errors
- No backend rebuild needed (frontend-only changes; Next.js dev server picks
  them up via HMR; the `:3001` amorosi-backend was untouched)
- Visual smoke to be done by Juan on real device:
  - Mobile / "what I want": several images one after another, several texts,
    more scrolling, as polished as desktop. The new `MobileScene*` gives 6-12
    reveal moments per scene with multiple images/texts.
  - Vault / "what I want": at chat hierarchy, not buried. Now at z-[115] (same
    as GuidedTour); lightbox above chat panel at z-[130].

## What's NOT changed (intentional)

- i18n dictionaries (7 languages) untouched — `t.eyebrow / heading / body /
  items` contract is the source of truth and stays stable; the new mobile
  scenes read from the same fields.
- Desktop choreography untouched — matchMedia gates already isolate it.
- Backend (`:3001`) untouched — no API/schema/env changes needed.
- No gitignore changes.

## Commits

This change will be committed as a single `feat(finalprod-s2): …` commit on
top of f56bc09 (S1).