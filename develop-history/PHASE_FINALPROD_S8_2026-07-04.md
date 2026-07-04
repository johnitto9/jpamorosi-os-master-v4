# Phase FINALPROD — Session 8 (the real fix: Lenis + ScrollTrigger scrollerProxy)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** architectural fix (mobile + Lenis sync)

> User after S7: "sigue fallando en mobile, se ve asi desde el primer
> momento hasta que terminamos de scrollear la seccion". User also
> explicitly rejected CSS animations as a solution in S8: "No, el
> approach jamas debe ser cambiar gsap, nunca. queremos solucion
> arquitectonica segura, y top tier."

## Root cause (FINAL)

Lenis animates `transform: translate3d(0, -Y, 0)` on the `content`
element (the inner div of `<main>`). It does NOT update the `<main>`'s
`scrollTop`. ScrollTrigger, by default, watches the `scroller`
element's `scrollTop` and queries its `getBoundingClientRect()` to
compute progress. With Lenis, the `<main>`'s scrollTop never changes
— so ScrollTrigger's progress is always 0 and triggers never fire
reliably.

The desktop choreography worked "by accident": the desktop sections
are 320vh tall, the trigger positions are calibrated for desktop scroll
speeds, and the user has time to scroll past them. On mobile, sections
are smaller and the timing drift becomes visible — the user reported
animation "not playing".

S2–S7 attempted various workarounds (different trigger positions,
different toggleActions, different GSAP patterns) without addressing
the fundamental Lenis + ScrollTrigger integration. S8 is the actual
fix.

## Fix

### 1. `scrollerProxy` (architectural, top-tier)

In `components/ui/scroll-stage.tsx`:
- After Lenis initialization, install `ScrollTrigger.scrollerProxy` on
  the Lenis wrapper element. The proxy overrides:
  - `scrollTop(value)`: returns `lenis.scroll` (Lenis's internal
    progress) when called by ScrollTrigger to read; calls
    `lenis.scrollTo(value, { immediate: true })` when ScrollTrigger
    sets it
  - `getBoundingClientRect()`: returns the viewport box
  - `pinType: "transform"`: tells ScrollTrigger that the scroller
    transforms its content (which is what Lenis does) rather than
    actually scrolling
- `lenis.on("scroll", ScrollTrigger.update)` — every Lenis scroll
  event recalculates ScrollTrigger progress
- `ScrollTrigger.refresh()` after install — recalculates any triggers
  created in the same tick before the proxy was in place
- On unmount: `lenis.destroy()` + drop the scrollerProxy

This is the canonical GSAP + Lenis integration pattern. With the proxy
in place, ScrollTrigger reads Lenis's progress correctly and triggers
fire when the user scrolls through the mobile section.

### 2. Mobile animations redesigned for visibility

- **Durations 1.0–1.8s** (was 0.5–0.9s) — long enough to perceive
- **Dramatic transforms**:
  - Cards: `yPercent: 200` (was 100), `scale: 0.5→1` (was 0.85→1),
    `rotate: ±8deg`
  - Words: `yPercent: 150` (was 80), `scale: 0.7→1`, `rotate: ±8deg`
  - Screen (Scene 2): `rotateY: 15deg → 0` (3D depth on entry)
- **Early starts**: `top 95%` (was 70–85%) — trigger fires the moment
  the section enters the viewport
- **`toggleActions: "play none none reset"`** (was "play none none
  none") — animation REPLAYS on every re-entry. The user can't miss
  it. (Reset rewinds the from state, so the next entry starts from
  the beginning.)
- **Easing**: `expo.out` for cards, `back.out(1.7)` for words —
  dramatic, satisfying

### 3. Debug instrumentation (for verification)

Every mobile animation has an `onToggle` callback that logs to the
console. The mobile build itself logs once when it runs. Open DevTools
console to see exactly which triggers fire and when:

```
[FINALPROD S8] Scene 1 mobile build running { section: true, scroller: true }
[S8 sc1] eyebrow toggle true
[S8 sc1] head toggle true
[S8 sc1] body toggle true
[S8 sc1] card-a toggle true
[S8 sc1] card-b toggle true
[S8 sc1] word-0 toggle true
[S8 sc1] word-1 toggle true
...
[S8 sc1] thread toggle true
```

If the logs show the triggers firing but the animation is not visible,
the issue is the visual transform. If the logs don't show, the
scrollerProxy isn't working — share the console output.

## What is unchanged (intentionally)

- **Desktop `build(tl, q)` function in each scene** — same
  "joyita" choreography
- **Desktop matchMedia** — selector still scoped to `[data-scene]`
  (S6 fix preserved)
- **No CSS animations added** — pure GSAP solution as the user
  requested
- **i18n dictionaries, backend**

## Files touched

- `components/ui/scroll-stage.tsx`: Lenis + ScrollTrigger integration
  via `scrollerProxy` (the actual architectural fix)
- `components/hall/Interludes.tsx`: each scene's mobile build updated
  with longer/dramatic/earlier animations + `toggleActions:"play
  none none reset"` + console.log debug

## Verification

- `tsc --noEmit` → 0 errors
- `docker compose --profile backend build` → built
- `docker compose --profile backend up -d` → recreated, healthy
- Bundle analysis:
  - `scrollerProxy`: 2 matches (install + destroy paths)
  - `"FINALPROD S8"` debug strings: 3 (one per scene)
  - `toggleActions:"play none none reset"`: 15
  - `ease:"expo.out"`: 3 (cards)
  - `console.log`: 21 (debug logs)

## Commit

`fix(finalprod-s8): ...` on top of `6b228dd` (S7).

## User verification steps

1. Hard-refresh mobile in `:3001`
2. Open browser DevTools console
3. Scroll to the BEFORE THE SYSTEMS section
4. Look for `[FINALPROD S8] Scene 1 mobile build running` first
5. Look for `[S8 sc1] <element> toggle true` as you scroll
6. Visually: cards rise from far below with rotation, words appear
   in sequence with a back-ease pop, thread grows top→bottom