# Phase FINALPROD — Session 9 (controlled surgery: one timeline per scene, drop scrollerProxy, add observability)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** architectural fix (mobile only — desktop preserved)

> User after S8: "sigue fallando, igual, sin estar animado en mobile".
> User shared a ChatGPT analysis identifying: (a) accumulated
> "fossils" of code across S2–S8 writing to the same targets
> (multiple fromTo on .il-card-a, .il-word, etc.), (b) S8
> scrollerProxy was based on a false premise (modern Lenis uses
> native scrollTop, not transform; the canonical integration
> shares the GSAP ticker), (c) the debug indicator I added was
> looking at the wrong element.

## The fossils (counted before the surgery)

S2–S8 left these duplicates on the same targets:
- `.il-eyebrow`: 2 fromTo
- `.il-head`: 2 fromTo
- `.il-body`: 2 fromTo
- `.il-card-a`: 2 fromTo
- `.il-card-b`: 2 fromTo
- `.il-screen`: 2 fromTo
- `.il-thread`: 2 (fromTo + scrubbed to)
- `.il-word`: 2 (fromTo + 5 nested toggleActions)
- `.il-flow`: 2 (fromTo + 7 nested toggleActions)
- `.il-layer`: 2 (fromTo + 4 nested toggleActions)
- `.il-backdrop`: 2 (fromTo + scrubbed to)
- `.il-rail`: 2 (fromTo + scrubbed to)
- `.il-dot`: pulse animation

With immediateRender and stacked ScrollTriggers all writing the
same `autoAlpha`, `yPercent`, `scale` properties, the visual
result is whichever trigger most recently fired — but the
*state* the user sees is whichever previous trigger left
behind. On mobile, where the user reports no animation, the
end state of one trigger happens to be the natural visible
state of the elements, so the user sees everything at rest.

## S9 — the controlled surgery

### 1. Remove S8's scrollerProxy (false premise)

`components/ui/scroll-stage.tsx` — revert to the canonical Lenis
integration that the Lenis README documents for 1.3.x:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

No `scrollerProxy`, no `pinType: "transform"`. One shared rAF
clock. Lenis animates the wrapper's scrollTop, ScrollTrigger
watches it, both share the GSAP ticker.

### 2. One scrubbed timeline per mobile scene

Each scene's mobile build is now a SINGLE `gsap.timeline()`
bound to the section's scroll (`start: "top top"`, `end:
"bottom bottom"`, `scrub: 0.6`). All initial states are set
at t=0 via `tl.set`; all animations run at their own positions
in the timeline via `tl.to`. One timeline, one owner, one ID
per scene:

- `il-mobile-1` (Before the Systems)
- `il-mobile-2` (Inside the Proof)
- `il-mobile-3` (The Living Layer)

No more 15 toggleActions, no more duplicated fromTo, no more
multiple writers to the same target. The "partitura" ChatGPT
asked for.

### 3. `__IL_DEBUG__.snapshot()` — observability

Exposed on `window` at module load. Returns an array of every
ScrollTrigger with id `il-*` and its current state:

```js
__IL_DEBUG__.snapshot()
// → [
//     { id: "il-mobile-1", progress: 0.47, isActive: true,
//       enabled: true, start: 0, end: 1800, trigger: "div" },
//     ...
//   ]
```

This is the verification surface. The user pastes
`__IL_DEBUG__.snapshot()` in DevTools and sees exactly which
triggers exist, what their progress is, and whether they're
active. No more guessing.

### 4. Fix the debug indicator

The MobileDebugIndicator from S8 was looking at the
MobileStatic fallback (which also has `data-scene-mobile`
but is `motion-safe:hidden`). Now selects by
`[data-scene-mobile].relative` — matches the choreo
MobileScene* elements, not the fallback.

## What is unchanged (intentionally)

- **Desktop `build(tl, q)` function in each scene** —
  preserved. The "joyita" choreography on desktop is
  untouched. The S6 selector scope fix
  (`gsap.utils.selector(section)` not rootEl) is preserved.
- **i18n dictionaries, backend, no CSS animations**
- **Desktop selector scope** (S6 fix)

## Verification

- `tsc --noEmit` → 0 errors
- `docker compose --profile backend build` → built
- `docker compose --profile backend up -d` → recreated,
  healthy at `:3001` (`{"ok":true}`)
- Bundle analysis:
  - `scrollTrigger:{id:` (timeline definitions): 3 (one per scene)
  - `"il-mobile-` (timeline IDs): 3
  - `gsap.ticker.add` (shared clock): 1
  - `__IL_DEBUG__`: 1
  - Lenis integration: present (1 import + 1 raf call)

## Files touched

- `components/ui/scroll-stage.tsx`: revert scrollerProxy,
  use official Lenis + GSAP ticker integration
- `components/hall/Interludes.tsx`:
  - All 3 mobile builds → single scrubbed timeline
  - Remove 21 debug console.logs, 15 toggleActions
  - Add `__IL_DEBUG__.snapshot()` on window
  - Fix MobileDebugIndicator selector

## Commit

`fix(finalprod-s9): ...` on top of `d1e4e05` (S8 debug).

## User verification steps

1. Hard-refresh mobile in `:3001`
2. Open DevTools console
3. Paste: `__IL_DEBUG__.snapshot()`
4. Scroll through the BEFORE THE SYSTEMS section
5. Expect: an array with `{ id: "il-mobile-1", progress:
   0.0…1.0, isActive: true, ... }` — progress should change
   as you scroll
6. Visually: cards rise from below, settle, exit up; words
   dance in sequence

If progress stays at 0 or the array is empty, the timeline
isn't running. Paste the snapshot and we see exactly why.