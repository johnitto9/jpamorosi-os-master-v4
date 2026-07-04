# 07_TASK_HALL_OF_FAME_UI.md — Phase 3: Hall of Fame UI System

## Goal
Turn the new home into a premium Hall of Fame experience.

## Precondition
`05_TASK_FOUNDATION_REFACTOR.md` complete. Preferably `06_TASK_BACKOFFICE_ADMIN.md` complete or at least repository abstraction exists.

## Design Principle
Every flagship project is a room preview, not a generic card.

## Steps

### 1. Upgrade HallHero
Hero must clearly state:

```txt
Amorosi Labs
AI Product Engineer · Systems Architect · Founder
I build AI-powered products that survive contact with reality.
```

Add CTAs:

- Enter Hall of Fame.
- Open jpamorosi.os.
- Contact / Ask AI later.

### 2. Upgrade HallOfFameCard
Each Hall card must include:

- branded blurred background
- logo area
- project status
- project category
- proof copy
- top stack chips
- CTA to `/projects/[slug]`

### 3. Add Capability Matrix
Render capabilities from `content/capabilities.ts`:

```txt
Capability → Evidence Project(s)
```

### 4. Featured Systems
Compact cards for Delify, Delibot, Trading Ecosystem, RecApp.

### 5. Archive Shelf
Dense grid for minor experiments.

### 6. Motion
Use existing `framer-motion` only:

- section reveal
- card hover depth
- stagger chips
- background glow shift

Do not add a new animation package yet.

## Acceptance Criteria

- Home feels premium without heavy 3D.
- Cards are content-driven.
- LumenScript/BuenPick/BBN feel visually distinct.
- Mobile layout is clean.
- No layout shift from images.
- `pnpm build` passes.

## Checks

```bash
cd frontend-app
pnpm build
```

Manual:

```txt
Check / on desktop
Check / on mobile width
Check /os still works
Check project CTA routes do not 404 if phase 4 exists; otherwise link to /projects
```

## Log Required
Create:

```txt
develop-history/PHASE_AMOROSI_03_HALL_UI.md
```

Update:

```txt
develop-history/AMOROSI_LABS_STATE.md
```

## Next Recommended File
`08_TASK_PROJECT_ROOMS_MEDIA.md`

## Why
The card previews need full project rooms to fulfill their promise.
