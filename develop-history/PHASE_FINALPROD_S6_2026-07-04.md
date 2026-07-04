# Phase FINALPROD — Session 6 (mobile per-element triggers + critical desktop selector scope fix)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** bug fix + animation pattern change (mobile only)

> User after S5: "no funciono sigue todo colapsado figurando desde el
> inicio hasta el fin y sin animacion" — mobile animation not visible.
> Plus: "los textos animados de desktop quedaron mal animados, como que
> permanecen mucho los primeros hasta los ultimos y se acumulan ... en
> desktop estaba joyita, no tocar/deshacer cosas que afecten como estaba
> ya en desktop funcionando".

Two issues, two fixes, separate concerns.

## Mobile: per-element triggers

The single-scrubbed-timeline pattern from S4/S5 doesn't play visibly on
mobile. Scrub ties the animation tightly to scroll: a fast scroll-through
shows almost nothing, and a user sitting at a position sees only the
settled state. "No animation" was technically wrong — the animation was
running, but not perceptibly.

**Fix**: changed the mobile matchMedia to author per-element
ScrollTriggers with `toggleActions: "play none none reverse"`. Each
animated element (cards, thread, words) has its own trigger; the
animation plays once when the element enters the viewport.

The hook signature changed: `useSceneChoreography(build, mobile?)` where
`mobile` is now `(q, ctx) => void` (not `(tl, q) => void`). The mobile
function authors per-element triggers; it gets the scoped selector and
the scroller/trigger context.

Desktop `build(tl, q)` signature is unchanged. The desktop matchMedia
still creates a single scrubbed timeline.

## Desktop: critical selector scope fix (the bug)

This was the actual root cause of the user's "se acumulan" complaint, and
it was a silent bug **introduced in S2** (when the mobile scene with the
same `.il-*` class names was added) but never fixed.

The desktop's `q = gsap.utils.selector(rootEl)` was scoped to the whole
`<section>`, which contains BOTH `[data-scene]` (desktop) AND
`[data-scene-mobile]` (mobile, hidden on lg+ via `lg:hidden`). Both scenes
use the same `.il-*` class names. The forEach on `.il-word` therefore
iterated **10 elements** (5 desktop + 5 mobile hidden) instead of 5.
The 5 desktop words got pushed to late timeline positions
(4.3, 4.92, 5.54, 6.16, 6.78) — past where they could complete a clean
fade-in/out cycle, so they accumulated. The mobile words were at the
early positions (1.2, 1.82, 2.44, 3.06, 3.68) and animated in the hidden
mobile scene (wasted work, but not visible).

**Fix**: one-line change in the matchMedia block — scope `q` to
`[data-scene]` (the desktop scene), NOT to `rootEl` (the whole section).
This isolates the desktop choreography to its own 5 `.il-word` elements
(and other `.il-*` elements). The forEach iterates 5, words animate at
their original positions (1.2, 1.82, 2.44, 3.06, 3.68), and the
accumulation goes away. Desktop is back to "joyita".

A block-comment was added explaining the scope rule so future authors
don't reintroduce the same bug.

## Files touched

- `frontend-app/components/hall/Interludes.tsx`:
  - `useSceneChoreography` signature: `(build, mobile?) → (build, mobile?)`
    where mobile is now `(q, ctx) => void` (per-element trigger pattern)
  - Desktop matchMedia: `gsap.utils.selector(section)` instead of
    `gsap.utils.selector(rootEl)`
  - Mobile matchMedia: changed from creating a scrubbed timeline to
    passing `(q, ctx)` to the mobile function
  - Each scene's mobile section: per-element `gsap.to()` /
    `gsap.from()` with `scrollTrigger: { toggleActions: "play none none
    reverse" }` for cards, thread, words, etc.
  - Desktop `build(tl, q)` function in each scene: **unchanged**

## Verification

- `tsc --noEmit` → 0 errors
- Backend rebuilt and recreated on `:3001`, `/api/health=200`
- Bundle analysis:
  - `scope to section` (correct fix): 2 matches (desktop + mobile)
  - `scope to rootEl` (the bug): 0 matches
  - `toggleActions` (mobile per-element): 15 matches
  - `scrub:1` (desktop timeline): 1 match (unchanged)

## What was NOT changed (intentionally)

- Desktop `build(tl, q)` function in each scene — same choreography,
  same `.il-*` selectors, same timeline structure. Just the selector's
  scope changed.
- Desktop matchMedia conditions and timing.
- i18n dictionaries (7 languages).
- Backend (`:3001`).

## Commit

`fix(finalprod-s6): ...` on top of `0351f2c` (S5).