# Media — BBN (`bbn`)

Drop real assets here. Until they exist, the UI shows branded gradient
placeholders automatically (SmartImage). Do **not** commit fake images.

Expected files (see `docs/PROJECT_MEDIA_GUIDE.md`):

- `logo.svg` — square logo/monogram
- `hero.webp` — card + room hero (16:10)
- `bg.webp` — room background (large, subtle)
- `screenshots/*.webp` — evidence wall (16:9)

Then set the paths in `content/projects.ts` → `assets` for slug `bbn`
(e.g. `heroImage: "/projects/bbn/hero.webp"`).

Theme: editorial blue (#4f7cff) / red (#ff4d4d) — AI-assisted local media.
