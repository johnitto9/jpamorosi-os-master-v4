# Phase FINALPROD — Session 7 (mobile trigger is the SECTION, not the element)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** bug fix (mobile only)

> User after S6: "sigue fallando en mobile, se ve asi desde el primer momento
> hasta que terminamos de scrollear la seccion". Mobile animation still
> not visible.

## Root cause (S6 introduced a new bug)

S6 changed the mobile pattern to per-element ScrollTrigger with the
**element** as the trigger. That doesn't work inside a sticky container.

The mobile section is:
```html
<div data-scene-mobile className="min-h-[280vh]">
  <div className="sticky top-0 h-screen">
    <div className="il-card-a absolute">...</div>
  </div>
</div>
```

The inner stage is `position: sticky; top: 0` — it pins to the top of
the viewport while the user scrolls through the 280vh of content. The
`.il-card-a` element is INSIDE the sticky stage, so its viewport
position is FIXED (it never moves — only the section scrolls past).

A ScrollTrigger with `trigger: il-card-a` and `start: "top 88%"` waits
for the element's top to reach 88% of the viewport. But the element
is at, say, 50% of the viewport and stays at 50%. The trigger never
fires. No animation. The user sees the element at whatever its current
state is (default, or the fromTo's FROM state if immediateRender fired).

The fix: trigger the SECTION (which IS NOT sticky and moves with scroll),
not the element. Each element gets a different `start` position so the
animations play in sequence as the user scrolls through the section.

## Fix (mobile only — desktop untouched)

Changed every per-element mobile animation to use the SECTION as trigger
with `gsap.fromTo` (explicit from + to) and different start positions.

**Scene 1 (Before the Systems) mobile build:**
- Eyebrow: `start: "top 85%"` — subtle rise
- Head: `start: "top 80%"`
- Body: `start: "top 75%"`
- Card-a: `start: "top 70%"` — rises from below (yPercent 100 → 0)
- Card-b: `start: "top 50%"` — enters later
- Thread: scrub `start: "top 70%"` to `end: "top 20%"` — grows top→bottom
- Words: each at `start: "top 55/50/45/40/35%"` — sequence

**Scene 2 (Inside the Proof) mobile build:**
- Eyebrow / head / body: same as Scene 1
- Screen: `start: "top 65%"` — rises from below
- Layer cards: each at `start: "top 55/48/41/34%"` — sequence

**Scene 3 (Living Layer) mobile build:**
- Eyebrow / head / body: same
- Backdrop: scrub `start: "top 70%"` to `end: "top 20%"` — gentle drift
- Rail: scrub `start: "top 70%"` to `end: "top 20%"` — grows left→right
- Flow words: each at `start: "top 60/54/48/42/36/30/24%"` — sequence

`toggleActions: "play none none none"` on every animation — play once
when the trigger fires, keep the final state, no reverse on scroll-back.
`gsap.fromTo` (not `gsap.from` or `gsap.to`) so the FROM state is
deterministic and applied immediately at the right timeline position.

## Why the desktop is still good (S6 fix preserved)

The desktop matchMedia uses `gsap.utils.selector(section)` where `section`
is the `[data-scene]` desktop element — scope is to the desktop scene
only, so it doesn't pick up the mobile scene's elements. The desktop
`build(tl, q)` function is unchanged. The scrubbed timeline pattern
(sticky 320vh + scrub: 1) is preserved.

## Verification

- `tsc --noEmit` → 0 errors
- `docker compose --profile backend build amorosi-backend` → built
- `docker compose --profile backend up -d amorosi-backend` → recreated,
  healthy at `:3001` (`{"ok":true}`)
- Bundle analysis:
  - `fromTo` calls: 28 (explicit from + to states)
  - `toggleActions:"play none none none"`: 15 (per-element triggers)
  - `start:"top 70%"` matches: 4 (cards/screen/thread scrub start)
  - `start:"top 85%"` matches: 3 (eyebrow per scene)
  - `start:"top 50%"` matches: 1 (card-b start)
  - Word starts 55/50/45/40/35: 1 (in the wordStarts array)

## Files touched

- `frontend-app/components/hall/Interludes.tsx`:
  - Scene 1 mobile build: section trigger, per-element fromTo with
    different start positions
  - Scene 2 mobile build: same pattern
  - Scene 3 mobile build: same pattern
  - Hook signature unchanged from S6 (`(build, mobile?)`)
  - Desktop `build(tl, q)` and desktop matchMedia: **unchanged**

## What was NOT changed (intentionally)

- Desktop `build(tl, q)` function in each scene.
- Desktop matchMedia (selector still scoped to `[data-scene]`).
- i18n dictionaries.
- Backend.