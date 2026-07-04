# PROJECT_MEDIA_GUIDE.md — Project media convention

How to add images for project cards and rooms. **No assets are generated in this
phase** — components already degrade gracefully to branded gradient placeholders
until real media lands.

## Folder convention

Put assets under `frontend-app/public/projects/{slug}/`:

```
public/projects/{slug}/logo.svg          # square logo/monogram (chip + hero)
public/projects/{slug}/hero.webp         # card + room hero image (16:9 / 16:10)
public/projects/{slug}/bg.webp           # room background (large, subtle)
public/projects/{slug}/screenshots/      # evidence wall images (16:9)
```

Example (Hall of Fame):

```
public/projects/lumenscript/logo.svg
public/projects/lumenscript/hero.webp
public/projects/lumenscript/bg.webp
public/projects/lumenscript/screenshots/01.webp
public/projects/buenpick/...
public/projects/bbn/...
```

`public/...` is served from the site root, so the path in content is
`"/projects/lumenscript/hero.webp"`.

## Wiring assets to a project

Set the paths in `content/projects.ts` (or later via the admin backoffice):

```ts
assets: {
  logo: "/projects/lumenscript/logo.svg",
  heroImage: "/projects/lumenscript/hero.webp",
  backgroundImage: "/projects/lumenscript/bg.webp",
  screenshots: [
    "/projects/lumenscript/screenshots/01.webp",
    "/projects/lumenscript/screenshots/02.webp",
  ],
},
```

Consumers:
- `heroImage` → Hall/Featured cards + `ProjectHero`
- `logo` → card chip + room hero (monogram fallback = first letter)
- `backgroundImage` → `ProjectHero` scene background
- `screenshots` → `EvidenceWall` (placeholder tiles when empty)

## Format guidance

- Prefer **WebP/AVIF** for photos/screenshots; **SVG** for logos.
- Hero: ~1600×1000 (16:10). Screenshots: 16:9. Keep files lean (< ~250 KB).
- `next.config.js` already serves `image/webp` + `image/avif`.

## SmartImage contract

`components/design-system/SmartImage.tsx` is the single image primitive:

- Uses `next/image` with `fill` inside an aspect-ratio box → **no layout shift**.
- **Graceful fallback:** when `src` is missing, renders a branded gradient
  placeholder (uses the project `theme.accent` / `theme.glow`) with a small label
  instead of a broken image.
- Props: `src?`, `alt` (required), `accent`, `glow`, `className`, `sizes`,
  `priority`, `label`.
- Always pass a meaningful `alt`. Pass `priority` only for above-the-fold heroes.

## Adding media later (checklist)

1. Drop files under `public/projects/{slug}/`.
2. Reference them in `content/projects.ts` `assets`.
3. `pnpm build` — cards/rooms pick them up automatically; placeholders disappear.
