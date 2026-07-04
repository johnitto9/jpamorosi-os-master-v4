# 04_BACKOFFICE_CONTENT_MODEL.md — Light Backoffice & Content Model

## Purpose
Design the future admin/backoffice without bloating the first refactor.

## Decision
Build a custom light admin before integrating a full CMS.

This gives Juan:

- Admin credentials.
- CRUD projects.
- Hall of Fame toggle.
- Featured/archive organization.
- Order control.
- Published/unpublished control.
- Update without touching code.

## Phased Content Source

### Phase 1 — Static Seed
Use `content/projects.ts` as source of truth.

### Phase 2 — Repository Abstraction
Create `lib/projects/repository.ts` and let public UI call repository functions.
Initially repository reads from static seed.

### Phase 3 — Database Backoffice
Swap repository implementation to database-backed content.
Recommended: Supabase/Postgres or existing Postgres.

## Project Model

```ts
export type ProjectTier = "hall_of_fame" | "featured" | "archive"

export type ProjectStatus =
  | "Live"
  | "Platformizing"
  | "R&D"
  | "Prototype"
  | "Paused"

export type Project = {
  id: string
  slug: string
  tier: ProjectTier
  status: ProjectStatus
  published: boolean
  sortOrder: number

  title: string
  labTitle: string
  category: string
  oneLiner: string
  proof: string
  role: string[]
  stack: string[]
  highlights: string[]

  architecture?: {
    nodes: string[]
    flow: string[]
  }

  assets: {
    logo?: string
    heroImage?: string
    backgroundImage?: string
    screenshots?: string[]
  }

  theme: {
    accent: string
    secondary: string
    glow: string
    mood: "ai-engine" | "commerce" | "media" | "ops" | "archive"
  }

  aiSummary: string
  createdAt?: string
  updatedAt?: string
}
```

## Backoffice Routes

```txt
/admin/login
/admin
/admin/projects
/admin/projects/new
/admin/projects/[id]
```

## API Routes

```txt
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/projects
POST   /api/admin/projects
GET    /api/admin/projects/[id]
PUT    /api/admin/projects/[id]
DELETE /api/admin/projects/[id]
```

## Auth v1
Use env credentials first:

```env
ADMIN_USERNAME=juan
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

Never store plaintext password.
Never expose admin env vars client-side.

## Admin UX v1
Simple and fast:

- Project table.
- Tier select.
- Status select.
- Published toggle.
- Sort order input.
- Text fields.
- Stack/highlights as newline-separated list.
- Theme fields.
- Asset path fields.
- Save button.

No rich editor yet.

## Hall of Fame Logic
A project can become Hall of Fame if:

- `tier = hall_of_fame`
- `published = true`
- `heroImage` exists
- `backgroundImage` exists
- `proof` is non-empty
- `highlights.length >= 3`

The UI should degrade gracefully if assets are missing, but admin should warn.

## Database Table Draft

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  tier text not null,
  status text not null,
  published boolean default false,
  sort_order integer default 100,
  title text not null,
  lab_title text,
  category text,
  one_liner text,
  proof text,
  role jsonb default '[]',
  stack jsonb default '[]',
  highlights jsonb default '[]',
  architecture jsonb,
  assets jsonb default '{}',
  theme jsonb default '{}',
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Next Task Reference
Backoffice implementation belongs to `06_TASK_BACKOFFICE_ADMIN.md`.
Do not implement it before `05_TASK_FOUNDATION_REFACTOR.md` is complete.
