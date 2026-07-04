# 08_TASK_PROJECT_ROOMS_MEDIA.md — Phase 4: Project Rooms & Media System

## Goal
Create reusable project rooms for Hall of Fame projects.

## Precondition
`07_TASK_HALL_OF_FAME_UI.md` complete.

## Routes

```txt
/projects
/projects/[slug]
```

## Components

```txt
components/projects/ProjectRoom.tsx
components/projects/ProjectSceneBackground.tsx
components/projects/ProjectHero.tsx
components/projects/ProjectProofCards.tsx
components/projects/ProjectArchitecturePreview.tsx
components/projects/EvidenceWall.tsx
components/projects/FounderNotes.tsx
```

## Project Room Standard
Each project room must render:

1. Branded scene background.
2. Hero with logo/title/status/one-liner.
3. Proof cards.
4. Architecture preview.
5. Evidence wall.
6. Founder notes.
7. CTA.

## Media System
Asset paths should follow:

```txt
public/projects/lumenscript/logo.svg
public/projects/lumenscript/hero.webp
public/projects/lumenscript/bg.webp
public/projects/lumenscript/screenshots/*

public/projects/buenpick/logo.svg
public/projects/buenpick/hero.webp
public/projects/buenpick/bg.webp
public/projects/buenpick/screenshots/*

public/projects/bbn/logo.svg
public/projects/bbn/hero.webp
public/projects/bbn/bg.webp
public/projects/bbn/screenshots/*
```

If assets are missing, use graceful placeholders.

## Copy Direction

### LumenScript
Position as:

```txt
AI-native writing platform and multi-model orchestration engine.
```

### BuenPick
Position as:

```txt
Live local-commerce startup with active merchants and real product friction.
```

### BBN
Position as:

```txt
AI-assisted local media platform with lightweight production agent workflows.
```

## Architecture Preview
Use simple HTML/CSS first.
Do not add React Flow until the project rooms are stable.

## Acceptance Criteria

- `/projects` lists all projects.
- `/projects/lumenscript` exists.
- `/projects/buenpick` exists.
- `/projects/bbn` exists.
- Project rooms share the same template.
- Assets have graceful fallbacks.
- `pnpm build` passes.

## Checks

```bash
cd frontend-app
pnpm build
```

Manual:

```txt
Visit /projects/lumenscript
Visit /projects/buenpick
Visit /projects/bbn
Check mobile readability
Check missing image fallback
```

## Log Required
Create:

```txt
develop-history/PHASE_AMOROSI_04_PROJECT_ROOMS.md
```

Update:

```txt
develop-history/AMOROSI_LABS_STATE.md
```

## Next Recommended File
`09_QA_SECURITY_DEPLOY.md`

## Why
After rooms and admin exist, stabilize performance, security and deployment.
