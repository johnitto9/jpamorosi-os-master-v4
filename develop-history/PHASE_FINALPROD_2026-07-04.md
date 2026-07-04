# Phase FINALPROD — Polish pass toward final production status

**Date:** 2026-07-04 · **Branch:** v4final · **Author:** Claude (Opus 4.8)
**Type:** intermediate handoff + phased plan

> **STATUS 2026-07-04 (session 1): ALL FOUR IMPLEMENTED.** Code-level fixes for
> FP-0…FP-4 applied; `tsc` clean. **Not yet done:** Docker rebuild + live smoke on
> `:3001`, and confirming `bytedance-seed/seedream-4.5` is a live OpenRouter model
> id. Nothing committed. See `claude_state.json → phaseDoneFinalprod`.

Context carried in: we just landed the GSAP-choreographed home *interludes* (see
`components/hall/Interludes.tsx`) — desktop choreography is flame. This phase pulls
four remaining rough edges over the line before calling it prod-ready.

---

## The four items (observed by Juan)

1. **Interludes are desktop-only.** On mobile (`<lg`) each scene collapses to a
   static block; we want a real, well-crafted mobile animation.
2. **Chosen project colors don't reach generation.** The color step in the
   Project-Room wizard looks great and the vault reflects the picked colors, but
   branding/logo generation still uses the base cyber palette
   (celeste `#00e5ff` / violet `#8b5cf6` / black `#0a0a14`), not the ones chosen.
3. **Reference-image step (2/3 in Branding) errors.** Logo (1/3) generates
   perfectly; the representative image throws *"No salió — probá de nuevo o subí
   una imagen."*
4. **Image generation must use Seedream 4.5.**

---

## Root-cause notes (from code read — pre-runtime)

### Item 4 — Seedream config is inconsistent across env files
`lib/agent/tools-server.ts` calls OpenRouter's `/v1/images` with
`env.OPENROUTER_IMAGE_MODEL`. That var differs by file:

| File | Value |
|---|---|
| `lib/env.ts` (default) | `bytedance-seed/seedream-4.5` |
| `.env.docker.local` (the `:3001` instance Juan tests) | `bytedance-seed/seedream-4.5` |
| `.env.local` | `google/gemini-3.1-flash-lite-image` |
| `.env.example`, `.env.docker.local.example` | `google/gemini-3.1-flash-lite-image` (comment: *"Seedream not on OpenRouter yet — swap when it lands"*) |

**Action:** confirm `bytedance-seed/seedream-4.5` is the live OpenRouter model id,
verify the running `:3001` container actually loads it, and align all example/env
files so nobody silently falls back to Gemini. **This must be settled first** —
items 2 and 3 are both downstream of which model actually renders.

### Item 2 — palette not honored by the prompt
Path: wizard → `POST /api/assistant/projects` persists `palette` →
`branding/route.ts` reads `project.palette` fresh and builds:
`Brand colors: ${p.palette.join(", ") || "cyan and violet on dark"}`.

Two candidate failure modes (one fix covers both):
- **(A) Empty in DB:** if `project.palette` is `[]` at gen time, the prompt uses
  the literal fallback *"cyan and violet on dark"* — exactly the celeste/violet
  Juan sees. Needs a DB check on a real project to confirm persistence.
- **(B) Raw hex ignored:** the prompt injects `#16a34a, #8b5cf6, #ffffff`.
  Image models interpret bare hex poorly and drift back to their trained
  noir-cyber bias.

**Fix (robust to both):** (1) verify persistence end-to-end with a real project;
(2) map hex → human color descriptors (e.g. `#16a34a` → "emerald green") and
phrase the prompt as an explicit constraint: *"Use EXACTLY these brand colors:
emerald green, violet, white — they must dominate the palette."* Applies to BOTH
`branding/route.ts` and `generate/route.ts` (`styleGround`).

### Item 3 — reference image (16:9) fails while logo (1:1) works
`tools-server.ts`: `IMAGE_TIMEOUT_MS = 60_000`, but `branding/route.ts` has
`maxDuration = 90`. A wide 2K render that takes 60–85s is aborted by the inner
`AbortController` and surfaces as `generation_failed` → the client's generic
"No salió". Logo (square, smaller pixel area) finishes under 60s, so it passes.

**Leading fix:** raise `IMAGE_TIMEOUT_MS` to ~85s (under the 90s route ceiling).
**Confirm first** by reading the real error: the `ai.tool.failed` event / server
log carries the actual string (`openrouter images <status>` vs `AbortError` vs
`no image in response`). One log line decides between timeout, an aspect-ratio
rejection, or a bad model id (ties back to item 4).

### Item 1 — mobile interludes
`useSceneChoreography` builds the timeline only inside
`mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)")`, and
each scene renders `<MobileStatic>` for `<lg`. So mobile has zero choreography by
design. We add a **mobile variant**: a lighter, vertical scroll choreography
(no sticky-pin stage — mobile viewports can't afford 300vh sticky), e.g. entrance
reveals + the milestone/flow words handing off in place, gated by a second
`mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)")`.
Keep `MobileStatic` as the reduced-motion / no-JS fail-safe.

---

## Plan (one sub-phase at a time; checkpoint + devhistory log after each)

**FP-0 · Seedream lock-in + diagnostics** *(do first, cheap)*
- Confirm `bytedance-seed/seedream-4.5` is a valid live OpenRouter model id.
- Verify the `:3001` container's loaded value; align `.env.example` +
  `.env.docker.local.example` (drop the stale "not on OpenRouter yet" note if it
  now is; otherwise document the real fallback).
- Pull the real `ai.tool.failed` error for the reference-image attempt.
- Deliverable: confirmed model + captured error → decides FP-2 fix precisely.

**FP-1 · Palette honored in generation**
- Confirm `project.palette` persists (real project row).
- Add hex→name mapping + explicit "use exactly these colors" constraint in
  `branding/route.ts` and `generate/route.ts`.
- Verify: create project with distinctive colors (e.g. emerald/white), generate
  logo, confirm output reflects them.

**FP-2 · Reference-image fix**
- Apply the fix the FP-0 error points to (most likely raise `IMAGE_TIMEOUT_MS`
  to ~85s; secondarily handle aspect-ratio/model rejection).
- Verify: generate the representative (16:9) image end-to-end, no "No salió".

**FP-3 · Mobile interludes choreography**
- Add a `(max-width: 1023px)` branch in `useSceneChoreography` with a
  mobile-appropriate timeline (no 300vh sticky pin; lighter reveals + word
  hand-offs). Keep `MobileStatic` as reduced-motion fallback.
- Verify on a narrow viewport: scenes animate, no layout break, reduced-motion
  still static.

**FP-4 · Cleanup**
- Remove the TEMP `console.log` diagnostic in `useSceneChoreography` (lines ~145–152).
- Update `claude_state.json`; final devhistory log.

---

## Constraints for the implementer
- **Low token budget** — think in English, minimal exploration, targeted edits.
- One sub-phase per turn; stop and report after each (project protocol).
- No backups deleted; rename-with-`._backup` if anything must move.
- Image generation stays on **Seedream 4.5**.

## Touch list (files most likely edited)
- `frontend-app/lib/agent/tools-server.ts` (timeout, model call)
- `frontend-app/app/api/assistant/branding/route.ts` (palette prompt)
- `frontend-app/app/api/assistant/generate/route.ts` (`styleGround` palette prompt)
- `frontend-app/components/hall/Interludes.tsx` (mobile choreography, cleanup)
- `frontend-app/.env.example`, `.env.docker.local.example` (Seedream alignment)
