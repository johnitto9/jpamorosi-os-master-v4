# 06_TASK_BACKOFFICE_ADMIN.md — Phase 2: Light Backoffice Admin

## Goal
Build a protected admin surface to manage projects without editing code.

## Scope
Implement a minimal app-like admin. Do not integrate heavy CMS.

## Precondition
`05_TASK_FOUNDATION_REFACTOR.md` must be complete.

## Steps

### 1. Create Repository Layer
Create:

```txt
frontend-app/lib/projects/repository.ts
frontend-app/lib/projects/types.ts
frontend-app/lib/projects/validators.ts
```

Public UI should import from repository, not directly from `content/projects.ts`.

### 2. Auth v1
Create credential-based admin guard using env vars.

Routes:

```txt
/admin/login
/admin
```

Env:

```env
ADMIN_USERNAME=juan
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

Use a signed HTTP-only cookie for session.

### 3. Admin Project CRUD UI
Routes:

```txt
/admin/projects
/admin/projects/new
/admin/projects/[id]
```

Fields:

- title
- slug
- tier
- status
- published
- sortOrder
- oneLiner
- proof
- role
- stack
- highlights
- architecture nodes
- architecture flow
- theme
- asset paths
- aiSummary

### 4. API Routes

```txt
GET    /api/admin/projects
POST   /api/admin/projects
PUT    /api/admin/projects/[id]
DELETE /api/admin/projects/[id]
```

Use Zod validation.

### 5. Storage v1
If no database is configured yet, implement a safe adapter placeholder:

- Public reads from static seed.
- Admin forms can be built and validated.
- Actual write adapter must be clearly marked as pending.

If database env vars exist, implement DB adapter.

## Acceptance Criteria

- `/admin/login` exists.
- Admin route is protected.
- Project form exists.
- Validation exists.
- Repository abstraction exists.
- Public pages still work.
- `pnpm build` passes.

## Checks

```bash
cd frontend-app
pnpm build
```

Manual:

```txt
/admin/login rejects wrong credentials
/admin redirects unauthenticated user
/admin/projects shows project list after login
```

## Security Rules

- No plaintext password.
- No admin env vars in client components.
- No public write endpoints.
- No filesystem writes in production unless explicitly local-only.

## Log Required
Create:

```txt
develop-history/PHASE_AMOROSI_02_BACKOFFICE.md
```

Update:

```txt
develop-history/AMOROSI_LABS_STATE.md
```

## Next Recommended File
`07_TASK_HALL_OF_FAME_UI.md`

## Why
After admin/data is stable, polish the public visual system against real data.
