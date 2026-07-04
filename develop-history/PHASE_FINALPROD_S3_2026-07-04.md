# Phase FINALPROD — Session 3 (mobile interludes animation bug)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** hotfix (continuation of S2)

> User reported after S2: "Vi que se agregaron algunas cards de imagenes nuevas
> sobre todo en la primer seccion de 'before the systems...' en mobile, pero,
> no es 1 a 1 con respecto a como es todo en desktop, ni ahí, de hecho no hay
> animación directamente en mobile". Root cause was a silent bug in my S2.

## Root cause

S2 added a SECOND `[data-scene-mobile]` block per scene (`MobileScene1/2/3`)
alongside the existing `MobileStatic`. The matchMedia handler in
`useSceneChoreography` (line 169–185) was using `querySelector` (singular):

```ts
const mob = rootEl.querySelector<HTMLElement>("[data-scene-mobile]");
```

`querySelector` returns the FIRST match in document order. Per the JSX layout
in each scene, that was `MobileStatic` — which is hidden on motion-safe devices
via `motion-safe:hidden`. So:

- **Motion-safe mobile (the default)**: `MobileStatic` exists but is `display:none`;
  `MobileScene*` is visible but the GSAP query never reaches it. Result: zero
  visible animations despite the components having `.m-rise`/`.m-chip` markers
  that *would* animate if the triggers were wired up.
- **Reduced-motion mobile**: the matchMedia query `(prefers-reduced-motion:
  no-preference)` doesn't match → no animation triggered. Correct behavior,
  by accident (because the bug also broke the reduced-motion path, but the
  user wasn't testing that).

So all the `.m-rise` rises + `.m-chip` staggers I designed in S2's
`MobileScene1/2/3` were sitting there, beautifully authored, with zero
ScrollTrigger wiring to fire them.

## Fix

`components/hall/Interludes.tsx` — single line + iteration loop:

```diff
- const mob = rootEl.querySelector<HTMLElement>("[data-scene-mobile]");
- if (!mob) return;
- gsap.utils.toArray<HTMLElement>(mob.querySelectorAll(".m-rise")).forEach(...);
+ const blocks = rootEl.querySelectorAll<HTMLElement>("[data-scene-mobile]");
+ if (!blocks.length) return;
+ blocks.forEach((mob) => {
+   gsap.utils.toArray<HTMLElement>(mob.querySelectorAll(".m-rise")).forEach(...);
+   const chips = mob.querySelectorAll(".m-chip");
+   if (chips.length) gsap.from(chips, { ... });
+ });
```

Both blocks now receive reveals. The hidden one (`MobileStatic` on
motion-safe) gets them too, but the parent is `display:none` so it's wasted
work — negligible CPU. The visible one (`MobileScene*`) finally animates.

Added a block-comment explaining the scope rule so future authors don't fall
into the same trap when adding a third block.

## Parity with desktop — what S3 is and what it isn't

This fix gets the existing reveal choreography FIRING on mobile (which is
what was missing). It does NOT make mobile 1:1 with desktop, because the
desktop pattern is structurally different:

| Aspect              | Desktop                                        | Mobile (now)                          |
|---------------------|------------------------------------------------|---------------------------------------|
| Pattern             | Sticky 300vh stage + 1 shared scrubbed timeline| Per-element reveal-on-scroll          |
| Driver              | `scrub: 1` (time = scroll position)            | `toggleActions` (play once at viewport)|
| Layout              | 2-column horizontal, sticky                    | Vertical stack                        |
| Choreography        | Single partitura across all elements          | N independent triggers                 |
| Orchestration skill | `useSceneChoreography` with `build(tl, q)`    | Inline matchMedia handler             |

The desktop has a dedicated skill (Timeline + ScrollTrigger.scrub + sticky
stage). The mobile has a generic reveal-on-scroll handler. Both are valid
GSAP patterns; they're just different tools for different layouts. True 1:1
would require a mobile-specific choreography skill (similar to the desktop
one, but designed for vertical scroll without sticky pinning) — that's a
real investment, not a fix.

The 8 skills in `gsap-skills-main/skills/` (gsap-core, gsap-scrolltrigger,
gsap-timeline, gsap-react, gsap-frameworks, gsap-performance, gsap-plugins,
gsap-utils) are all viewport-agnostic — none of them refuses to work on
mobile. The reason mobile isn't 1:1 is **we wrote a desktop skill and a
mobile placeholder**, not that GSAP can't.

## Verification

- `tsc --noEmit` → 0 errors
- `docker compose --profile backend build amorosi-backend` → built
- `docker compose --profile backend up -d amorosi-backend` → recreated,
  healthy at `:3001` (`{"ok":true}`)
- Served bundle (`page-7c23434f8ac0af8a.js`) contains `MobileScene[123]`,
  `Milestones`, `The journey`, `Stack`, `Signal` (4 hits) — the new
  mobile scenes + the querySelectorAll fix are both live.

## Files touched

- `frontend-app/components/hall/Interludes.tsx` — `querySelector` → iterate
  `querySelectorAll` (1 line + iteration block + comment)

## Commit

Hotfix commit on top of `ce4d7eb` (S2).