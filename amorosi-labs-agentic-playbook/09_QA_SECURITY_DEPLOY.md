# 09_QA_SECURITY_DEPLOY.md — Phase 5: QA, Security & Deploy

## Goal
Make the refactor trustworthy enough to ship.

## Checks

Run:

```bash
cd frontend-app
pnpm build
pnpm test
pnpm lint
```

If no lint/test exists, document that instead of pretending.

## Manual QA

### Public

- `/` loads.
- `/os` loads.
- `/projects` loads.
- `/projects/lumenscript` loads.
- `/projects/buenpick` loads.
- `/projects/bbn` loads.
- Mobile layout works.
- No broken images.
- No console errors.

### Admin

- `/admin` redirects if unauthenticated.
- `/admin/login` rejects wrong credentials.
- `/admin/login` accepts correct credentials.
- Project form validates required fields.
- Hall of Fame tier can be selected.
- Published toggle works.

## Security Checklist

- No plaintext admin password.
- No secrets in public bundle.
- Admin APIs require auth.
- Write endpoints validate input with Zod.
- No unrestricted file writes.
- No destructive Claude hooks.
- `.env.local` not committed.

## Performance Checklist

- Use `next/image` where possible.
- Avoid heavy 3D on `/`.
- Lazy-load admin-only code.
- Avoid layout shift with width/height or stable containers.
- Keep `/os` heavier effects isolated.

## SEO Checklist

- Metadata updated from jpamorosi.os to Amorosi Labs.
- Sitemap includes new routes.
- Robots does not block project routes.
- OG image planned or placeholder exists.

## Final Log
Create:

```txt
develop-history/PHASE_AMOROSI_05_QA_DEPLOY.md
```

Update:

```txt
develop-history/AMOROSI_LABS_STATE.md
```

## Final State Summary Template

```md
# AMOROSI_LABS_STATE.md

## Current Phase

## Completed

## Pending

## Known Risks

## Next Suggested Phase

## Last Build Result

## Last Manual QA
```

## Stop Condition
After this file, stop and ask Juan whether to proceed with:

1. AI Guide.
2. React Flow architecture diagrams.
3. Rich media polish.
4. CMS upgrade.
