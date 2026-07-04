# Phase FINALPROD — Session 4 (mobile scene choreography: 1:1 architectural parity)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** architecture refactor (continuation of S3)

> User after S3: "aver si esta mas lindo, ahora esta animado, pero no es uno
> a uno con desktop como buscamos, podes hacer un esfuerzo?" — wanted true
> 1:1, not "animations now fire but different pattern".

## What changed

### The architectural gap (recap)

S1–S3 fixed the bug (mobile reveals firing) and added richer mobile scenes
with multiple images / texts / reveal moments. But the mobile pattern was
still **per-element reveal-on-scroll** (each `.m-rise` element got its own
ScrollTrigger via `toggleActions`). The desktop pattern is **ONE shared
scrubbed timeline** (a single Timeline where every element is animated as
a function of scroll progress). Different shapes.

The user wanted 1:1. The honest read: the right answer was a mobile-specific
GSAP skill with the SAME architectural shape as desktop, just vertical.

### Implementation: same hook, mobile build parameter

`useSceneChoreography(build, mobileBuild?)` now accepts an optional
`mobileBuild` parameter. When provided, the hook attaches a SECOND
scrubbed timeline to `[data-scene-mobile]` (matching the desktop pattern of
`[data-scene]`). Both timelines share the same architecture:

```
matchMedia (responsive + motion gate)
  ├─ desktop (≥1024px): ONE Timeline scrubbed to [data-scene]
  └─ mobile  (≤1023px): ONE Timeline scrubbed to [data-scene-mobile]
```

The selectors are scoped per matchMedia (desktop `q` = `selector(rootEl)`,
mobile `q` = `selector(mobileSection)`), so the same `.il-*` class contract
drives both without collision.

### Per-scene mobile choreography (mirrored from desktop)

| Scene     | Desktop choreography                  | Mobile choreography (NEW)             |
|-----------|----------------------------------------|---------------------------------------|
| Scene 1   | Cards enter deep-right, cross left,    | Cards rise from below, settle, exit up|
|           | words dance horizontally, thread grows | words dance stacked, thread grows top→bottom |
| Scene 2   | Screen flies in from depth (rotateY),  | Screen rises from below, layer cards  |
|           | layer cards assemble bottom-up         | assemble bottom-up (vertical stack)   |
| Scene 3   | Backdrop parallax, flow words pulse,   | Same — backdrop drifts, flow words    |
|           | rail + dots advance                    | pulse stacked, rail advances          |

Same timeline structure (timeline positions, durations, eases), same `.il-*`
selectors. Only the transforms differ (vertical instead of horizontal/3D).

### Mobile JSX: same shape, vertical layout

Each `MobileScene*` is now a tall section (`min-h-[260-300vh]`) with a
sticky inner stage (`sticky top-0 flex h-screen flex-col items-center
overflow-hidden`). Inside the stage:

- **Scene 1 mobile**: narrative at top (centered, vertical thread on its
  left), prints absolutely-positioned in middle-lower (`il-card-a`, `il-card-b`),
  milestone words in lower band.
- **Scene 2 mobile**: narrative at top, screen image in middle
  (`il-screen`), stack layer cards in lower band (`il-layer` per item).
- **Scene 3 mobile**: narrative at top, backdrop + flow words stage in
  middle (`il-backdrop`, `il-flow`), rail + dots in lower (`il-rail`, `il-dot`).

CSS gating: `motion-reduce:hidden` on the choreo scenes (reduced-motion users
see only `MobileStatic`), `motion-safe:hidden` on `MobileStatic` (motion-safe
users see only the choreo scenes).

## Files touched

- `frontend-app/components/hall/Interludes.tsx`:
  - Hook signature: `(build) → (build, mobileBuild?)` (+ section query, scope)
  - `MobileScene1` body: rewritten (sticky stage + `.il-*` contracts)
  - `MobileScene2` body: rewritten (sticky stage + `.il-*` contracts)
  - `MobileScene3` body: rewritten (sticky stage + `.il-*` contracts)
  - `BeforeTheSystems`: added mobileBuild function with vertical transforms
  - `PortfolioSystemInterlude`: added mobileBuild function with vertical transforms
  - `LivingLayerInterlude`: added mobileBuild function with vertical transforms

## Verification

- `tsc --noEmit` → 0 errors
- `docker compose --profile backend build amorosi-backend` → built
- `docker compose --profile backend up -d amorosi-backend` → recreated,
  healthy at `:3001` (`{"ok":true}`)
- Served bundle (`page-173d83df4adf0a8c.js`):
  - `sticky top-0` matches: 6 (3 desktop + 3 mobile)
  - `yPercent` (vertical transform) matches: 28
  - All `.il-*` contracts present in expected counts:
    `il-thread:4 il-card-a:6 il-screen:6 il-flow:4 il-layer:4`
  - Both `mobileBuild` functions called and their GSAP setups bundled

## What this is and isn't

**Is now**: 1:1 architectural parity with desktop — same scrubbed-timeline
skill, same `.il-*` selector contract, same per-scene build-function
pattern. Mobile choreography genuinely mirrors the desktop one, just vertical.

**Isn't**: pixel-perfect parity. Mobile sections are 260-300vh vs desktop's
300-340vh, and the transforms are scaled to fit a phone viewport. The
overall motion language is the same; the specific durations and positions
are tuned per layout.

If the user wants further refinement (longer scrub, more card overlap,
faster card handoffs), that's tuning on top of this — not another
architectural pass.

## Commit

`feat(finalprod-s4): ...` on top of `030b1eb` (S3).