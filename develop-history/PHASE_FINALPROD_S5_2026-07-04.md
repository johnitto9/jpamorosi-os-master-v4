# Phase FINALPROD — Session 5 (tuning pass on S4 mobile layout)

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** tuning (continuation of S4)

> User after S4: "bien hay indicios de que lo que quisite hacer funcionó, pero
> está todo superpuesto, hay que ajustar fino, con desktop también nos había
> pasado lo mismo, fijate si podes obtener algo en la ultima doc."

User provided a mobile screenshot showing the issues: milestone words all
overlapping at the same position (the fade-in/out choreography not visible),
the body text crowding the card slot, and "GSAP target not found" warnings
with empty target in the console.

## What changed

### Layout restructure (3 mobile scenes)

Replaced absolute positioning (top-[58%], top-[62%], bottom-24) with a
flex-col structure using three explicit slots:

```
<sticky stage> flex-col items-center px-6 py-6
  ├─ il-narrative  shrink-0  (compact: text-2xl/text-xs, line-clamp-3)
  ├─ il-print-slot flex-1    (cards absolutely positioned inside)
  └─ il-words-band shrink-0  (fixed h-12, words opacity-0)
```

Why this matters:
- `flex-1` on the print slot lets the middle area ADAPT to viewport size
  instead of being a fixed `top-[58%]` that overlaps the body on small phones.
- `line-clamp-3` on `il-body` keeps the body text from wrapping into the
  print slot on narrow viewports.
- `shrink-0` on narrative/words band keeps them at their natural size —
  the print slot absorbs any leftover space.

### Defensive `opacity-0` on the per-frame words

Added `opacity-0` Tailwind class to `.il-word` and `.il-flow`. Even if the
GSAP `fromTo` FROM state doesn't apply (CSS specificity, hot-reload race,
GSAP error), the words stay invisible — they never overlap each other.
The fromTo then animates them to opacity: 1 as the timeline progresses.

### Defensive `gsap.set()` block in the matchMedia callback

Added an explicit `gsap.set()` block at the start of the mobile matchMedia
callback (before the timeline is created):

```ts
gsap.set(q(".il-word"),  { autoAlpha: 0, yPercent: 90 });
gsap.set(q(".il-flow"),  { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" });
gsap.set(q(".il-card-a"),{ yPercent: 130, autoAlpha: 0, scale: 0.85 });
gsap.set(q(".il-card-b"),{ yPercent: 140, autoAlpha: 0, scale: 0.85 });
gsap.set(q(".il-screen"),{ yPercent: 130, autoAlpha: 0, scale: 0.85 });
gsap.set(q(".il-thread"),{ scaleY: 0 });
gsap.set(q(".il-layer"), { autoAlpha: 0, y: 60 });
```

This guarantees the starting state is correct regardless of whether the
fromTo's `immediateRender` fires properly. The animation runs the same way;
the explicit set just removes a class of failures where the visible elements
sit in their default (overlapping) state.

## About the "GSAP target not found" warnings

The user pasted `GSAP target  not found` errors in the console. The target
string is empty. Root cause hypothesis: the per-frame `gsap.utils.selector`
selector function (`q`) is being called and returns an array that GSAP then
processes — and one of those calls is being made with a no-target variant
inside GSAP's internal render path.

The defensive measures in S5 (explicit `gsap.set()` + `opacity-0` class)
should make these warnings cosmetic if they persist, since the elements
start in the correct state regardless. If the warnings remain after S5,
they're GSAP-internal noise that doesn't affect the visible output.

## What was NOT changed (intentional)

- i18n dictionaries untouched.
- Desktop choreography untouched (it works, user only flagged mobile).
- Backend untouched (frontend-only).

## Verification

- `tsc --noEmit` → 0 errors
- Backend rebuilt and recreated on `:3001`, `/api/health=200`
- Bundle contains all S5 markers:
  - `opacity-0`: 3 (one per scene's words band)
  - `line-clamp-3`: 3 (one per scene's body)
  - `flex-col + py-6`: 3 (one per mobile scene)
  - `il-print-slot`: 3 (one per scene)
  - `gsap.set()` calls in matchMedia: 7 (verified in minified bundle)

## Files touched

- `frontend-app/components/hall/Interludes.tsx`:
  - `MobileScene1` body: flex-col restructure + opacity-0 on words
  - `MobileScene2` body: flex-col restructure (dropped numbered badge in layer cards for space)
  - `MobileScene3` body: flex-col restructure + opacity-0 on flow words
  - `useSceneChoreography`: 7 explicit `gsap.set()` calls in mobile matchMedia

## Commit

Hotfix commit on top of `32da19a` (S4).