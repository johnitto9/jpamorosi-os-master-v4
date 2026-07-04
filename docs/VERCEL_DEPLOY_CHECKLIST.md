# VERCEL_DEPLOY_CHECKLIST.md — Public production (Vercel)

Vercel is the **current public production frontend**. This checklist keeps the
public site static-safe and deploy-ready. (Docker/Dokploy is a separate future
backend layer — see `docs/HYBRID_DEPLOYMENT_STRATEGY.md`.)

## Project settings

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root Directory | `frontend-app` |
| Install command | `pnpm install` (auto-detected) |
| Build command | `next build` (default; repo script `pnpm build`) |
| Output | default (Vercel handles `output: 'standalone'` fine) |
| Node version | 18+ (20 recommended) |

> Root Directory **must** be `frontend-app` — the Next app is not at repo root.

## Required environment variables (Production)

Minimum for the public static site:

```
APP_ENV=production
PROJECT_STORAGE_DRIVER=static
PROJECT_PUBLIC_CONTENT_MODE=static
ADMIN_ENABLED=false
NEXT_PUBLIC_SITE_URL=https://www.jpamorosi.dev
```

> `PROJECT_PUBLIC_CONTENT_MODE=static` keeps `/` and `/projects` static/SSG. The
> live surface (`/preview/*`) is Docker-only and reads local-json; never enable it
> on Vercel.

Optional:

```
GOOGLE_SITE_VERIFICATION=...    # if using Search Console meta verification
```

Do **not** set `ADMIN_*` secrets on Vercel for now (admin stays off here).

## Hard rules for Vercel

- ❌ **Do not** set `PROJECT_STORAGE_DRIVER=local-json` — serverless filesystem is
  ephemeral; writes are lost and not shared across instances.
- ❌ **Do not** enable admin (`ADMIN_ENABLED=false`). The backoffice belongs to the
  Docker/Dokploy backend, never the public path.
- ❌ **Do not** rely on filesystem writes in any request path.
- ✅ Public data comes from `content/projects.ts` via the static public bridge
  (`lib/projects/public-projects.ts`).

## Expected build output (static-safe)

- `/` → Dynamic SSR (ƒ) — reads content per request. With
  `PROJECT_PUBLIC_CONTENT_MODE=static` (Vercel) it renders from the in-memory seed
  (no fs writes, no local-json) → safe. In Docker `live` mode it reflects admin/
  local-json edits.
- `/projects` → Dynamic SSR (ƒ) — same rule as `/`.
- `/projects/[slug]` → SSG (●), prerendered from `generateStaticParams` (static
  seed). Live room previews use `/preview/projects/[slug]`.
- `/os` → Static (○) (client-loaded OS)
- `/admin/*`, `/api/admin/*`, `/api/content/*` → Dynamic (ƒ) — fine on Vercel;
  admin returns a setup notice / 401 while `ADMIN_ENABLED=false`.

`/` and `/projects` are intentionally Dynamic SSR (content-mode aware) but remain
Vercel-safe: in `static` mode they read the in-memory seed only. If they ever try
to read local-json on Vercel, that's a misconfiguration — keep
`PROJECT_PUBLIC_CONTENT_MODE=static` and `PROJECT_STORAGE_DRIVER=static` on Vercel.

## Pre-deploy checks (local)

```bash
cd frontend-app
pnpm build      # confirm the route table above
pnpm test       # 20/20
```

## Domain / SEO

- Canonical host: `https://www.jpamorosi.dev` (metadataBase, sitemap, robots aligned).
- `robots.txt` disallows `/admin`, `/api/`, `/_next/`.
- `sitemap.xml` lists `/`, `/projects`, `/os`, and each project room.
- OG image: `/imgs/avif/og.avif` (exists). No new OG assets required.

## Notes

- The Docker/Dokploy backend + `remote-api` bridge are future/optional and do not
  affect this Vercel deploy.
- Real project media (`public/projects/{slug}/…`) is optional; missing assets fall
  back to branded gradient placeholders (no broken images).
