# 01_CONCILIACION_TECNICA.md — Technical Reconciliation

## Purpose
Create a sober bridge between the current deployed codebase and the new Amorosi Labs architecture.

## Current Known Reality
The current project is a Next.js app under `frontend-app/`. It already contains:

- App Router entry at `frontend-app/app/page.tsx`.
- A lazy-loaded client app for the OS experience.
- Desktop/Dock/Window system.
- Zustand window store.
- Content JSON files.
- Three.js / avatar experiments.
- Existing `develop-history` protocol.

## Conflict to Resolve
The current root `/` is an OS-style portfolio. The new hiring goal requires `/` to become the premium Hall of Fame landing experience.

Resolution:

```txt
current /  → move to /os
new /      → Amorosi Labs Hall of Fame
```

## Tech Decisions

### Keep

- Next.js App Router.
- Tailwind current version.
- Existing OS components.
- Existing 3D avatar inside `/os`.
- Existing `develop-history` discipline.

### Add, but only when needed

- Content-driven `content/projects.ts`.
- Shared components under `components/design-system`.
- Project components under `components/projects`.
- Admin route under `/admin`.
- Server-side data adapter for projects.

### Avoid for now

- Tailwind major migration.
- New global animation framework.
- New 3D system on home.
- Payload CMS.
- TinaCMS.
- Overbuilt database schema.
- Anything that prevents a quick build.

## Backoffice Decision
Use a **custom lightweight admin**, not a heavy CMS in the first version.

Recommended implementation:

```txt
Storage: Supabase Postgres or existing Postgres if already available
Auth: simple credentials session using env vars first, upgradeable later
Media: public `/public/projects/*` in phase 1, storage bucket later
Data access: lib/projects/repository.ts
```

Why:

- Faster than integrating a full CMS.
- More app-like.
- Works with a future AI guide.
- Allows Hall of Fame toggling and ordering.
- Keeps the portfolio under Juan's visual system.

## Data Source Strategy
Use a repository abstraction from day one:

```ts
getProjects()
getProjectBySlug(slug)
createProject(input)
updateProject(id, input)
deleteProject(id)
```

Phase 1 may return data from `content/projects.ts`.
Phase 2 can swap the backend to Supabase/Postgres without changing UI components.

## Admin Scope v1
The admin should manage:

- Project title.
- Slug.
- Tier: `hall_of_fame | featured | archive`.
- Status.
- One-liner.
- Proof copy.
- Role list.
- Stack chips.
- Highlights.
- Architecture nodes/flow.
- Theme accent.
- Asset paths.
- Published flag.
- Sort order.

No rich-text editor in v1. Plain controlled fields first.

## Build Constraints
After every phase run:

```bash
cd frontend-app
pnpm build
```

If available:

```bash
pnpm test
pnpm lint
```

## Risk Register

| Risk | Mitigation |
|---|---|
| Breaking current OS | Move it to `/os` before rewriting `/` |
| Admin overbuild | Start with simple CRUD, no CMS |
| Vercel filesystem writes | Do not write content to local files in production |
| UI slop | Shared ProjectRoom and HallCard components |
| AI inventing structure | Follow this file order and update state logs |
