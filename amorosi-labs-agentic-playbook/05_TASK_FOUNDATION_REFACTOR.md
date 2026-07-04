# 05_TASK_FOUNDATION_REFACTOR.md — Phase 1: Foundation Refactor

## Goal
Create the Amorosi Labs foundation while preserving the current OS under `/os`.

## Scope
This phase creates structure, data, and basic rendering. No admin. No AI guide. No new 3D.

## Steps

### 1. Preserve OS
Move current root experience to:

```txt
frontend-app/app/os/page.tsx
```

If current `app/page.tsx` lazy-loads `./client-app`, adjust imports so `/os` still works.

### 2. Create New Root Home
Replace `frontend-app/app/page.tsx` with a new server or client page rendering:

```tsx
<HallHero />
<HallOfFameGrid />
<FeaturedSystemsGrid />
<LabArchiveGrid />
```

### 3. Create Content Model
Create:

```txt
frontend-app/content/projects.ts
frontend-app/content/profile.ts
frontend-app/content/capabilities.ts
```

Seed at least:

Hall of Fame:

- LumenScript.
- BuenPick.
- BBN.

Featured:

- Delify.
- Delibot.
- Trading Ecosystem.
- RecApp Azure.

### 4. Create Components

```txt
components/design-system/GlowCard.tsx
components/design-system/StatusBadge.tsx
components/design-system/SmartImage.tsx
components/design-system/SectionHeader.tsx
components/hall/HallHero.tsx
components/hall/HallOfFameCard.tsx
components/hall/HallOfFameGrid.tsx
components/hall/FeaturedSystemsGrid.tsx
components/hall/LabArchiveGrid.tsx
```

### 5. Visual Style
Use current Tailwind only.

Base style:

```txt
Dark background
Soft radial glows
Glass panels
High contrast typography
Simple responsive bento grid
Subtle hover transitions
```

### 6. No Skill Bars
Create capability mapping instead:

```txt
Capability → Proven in project(s)
```

## Acceptance Criteria

- `/` renders new Amorosi Labs home.
- `/os` renders old OS experience.
- Hall of Fame cards render from `projects.ts`.
- Featured systems render from `projects.ts`.
- No new heavy dependency added.
- `pnpm build` passes.

## Checks

```bash
cd frontend-app
pnpm build
```

If available:

```bash
pnpm test
pnpm lint
```

## Log Required
Create:

```txt
develop-history/PHASE_AMOROSI_01_FOUNDATION.md
```

Update:

```txt
develop-history/AMOROSI_LABS_STATE.md
```

## Next Recommended File
`06_TASK_BACKOFFICE_ADMIN.md`

## Why
After the public content model exists, admin CRUD can target the same schema.
