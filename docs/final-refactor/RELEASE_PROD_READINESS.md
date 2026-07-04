# RELEASE — Production Readiness & Secrets Runbook

**Owner:** jpamorosi.dev
**Last updated:** 2026-07-04
**Companion to:** `91_RELEASE_RUNBOOK.md` (high-level) — this file is the concrete,
value-level guide: exactly which secret goes where and how to flip prod on.

---

## 1. Deployment topology (the two machines)

The product is intentionally split. Do not collapse it.

| Surface | Where | Content | Admin | DB | Autonomy |
|---|---|---|---|---|---|
| **Public site** (`/`, `/projects`, `/os`, Orbe public) | **Vercel** | `static` seed (SSG) | **OFF** | none | none |
| **Backend / admin / autonomy** | **Dokploy on Hostinger VPS** (Docker) | `local-json` on a mounted volume (or `postgres`) | **ON** | Postgres (internal network) | worker: scout + heartbeat |

- The public Vercel path is stateless and cheap; it must never hold admin secrets or a DB.
- The VPS/Docker backend is where Postgres, uploads, the assistant brain, and the
  cron worker live. R2 is shared media storage reachable from both.

## 2. Secrets inventory — what goes where

> Source of truth for real values: `secrets/` (local, gitignored) — **never commit,
> never bake into an image, never rsync to the VPS.** Inject via each platform's
> secret manager (Vercel Environment Variables / Dokploy env).

| Variable | Vercel (public) | VPS backend | Purpose | Status |
|---|:--:|:--:|---|---|
| `APP_ENV` | `production` | `production` | env mode | ✅ |
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://www.jpamorosi.dev` | ✅ | canonical URL, OG, referer | ✅ |
| `PROJECT_STORAGE_DRIVER` | `static` | `local-json` (or `postgres`) | content source | ✅ |
| `PROJECT_PUBLIC_CONTENT_MODE` | `static` | `live` | how public pages read content | ✅ |
| `ADMIN_ENABLED` | `false` | `true` | admin master switch | ✅ |
| `ADMIN_USERNAME` | — | ✅ | admin login | set |
| `ADMIN_PASSWORD_HASH` | — | ✅ `scrypt:…` | admin login (never plaintext) | set — see §4 |
| `ADMIN_SESSION_SECRET` | — | ✅ (48+ rand bytes hex) | signs admin cookies | set |
| `DATABASE_URL` | — | ✅ `postgres://…@postgres:5432/amorosi` | Postgres (internal net) | set |
| `OPENROUTER_API_KEY` | — | ✅ | LLM brain (GLM 5.2) + image mockups | ✅ in secrets |
| `OPENROUTER_MODEL` | — | `z-ai/glm-5.2` | text model | ✅ |
| `OPENROUTER_IMAGE_MODEL` | — | `google/gemini-3.1-flash-lite-image` | mockup model | ✅ |
| `WEB_SEARCH_API_KEY` | — | ✅ (serper.dev) | scout + prospect enrichment | ✅ in secrets |
| `RESEND_API_KEY` | — | ✅ | email (scout digest, contact, follow-up) | ✅ in secrets |
| `RESEND_FROM_EMAIL` | — | ✅ `Amorosi Labs <labs@jpamorosi.dev>` | sender | ✅ (needs verified domain — see §6) |
| `RESEND_ADMIN_TO_EMAIL` | — | ✅ `jpamorosi14@gmail.com` | where alerts land | ✅ |
| `ADMIN_EMAIL` | — | ✅ | magic-link allowlist | ✅ |
| `INTERNAL_API_TOKEN` | — | ✅ | auth for `/api/internal/*` + worker cron | ✅ set |
| `R2_ACCESS_KEY_ID` | optional* | ✅ | R2 media write | ✅ **connected** |
| `R2_SECRET_ACCESS_KEY` | optional* | ✅ | R2 media write | ✅ |
| `R2_BUCKET_NAME` | optional* | ✅ `jpamorosi-media-prod` | R2 bucket | ✅ |
| `R2_ENDPOINT` | optional* | ✅ `https://<accountid>.r2.cloudflarestorage.com` | R2 S3 endpoint | ✅ |
| `R2_PUBLIC_BASE_URL` | optional* | ✅ `https://media.jpamorosi.dev` | public media domain | ✅ **live** |

\* Vercel only needs R2 vars if the public path ever uploads. Today uploads happen
in the admin backend, so R2 vars live on the VPS. The public site just references
`https://media.jpamorosi.dev/...` URLs directly.

## 3. Cloudflare R2 — DONE and verified ✅

Media storage is **connected and proven end-to-end** (2026-07-04):

```
node frontend-app/scripts/r2-smoke-test.mjs
# ✅ PutObject → ✅ HeadObject (S3) → ✅ Public GET via media.jpamorosi.dev → ✅ cleanup
```

- Bucket `jpamorosi-media-prod`, custom domain `media.jpamorosi.dev` (public, serving).
- App wiring: `lib/media/storage.ts` uploads to R2 when `isR2Configured()`, else falls
  back to the local volume — an R2 outage never blocks the admin.
- **To go live in prod:** copy the 5 `R2_*` vars into the VPS/Dokploy env. Nothing
  else changes. Re-run the smoke test from the server to confirm.

## 4. Admin credentials

Generate the password hash offline (no dependency, never store plaintext):

```
node frontend-app/scripts/generate-admin-hash.mjs "the-real-password"
# → ADMIN_PASSWORD_HASH=scrypt:<salt>:<hash>
```

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and a fresh
`ADMIN_SESSION_SECRET` (`openssl rand -hex 48`) on the VPS only. Rotate the
session secret if it ever leaks (invalidates all admin sessions).

## 5. Security baseline — status after this pass

Applied in this batch (see git diff):

- ✅ **Postgres not public** — compose port bound to `127.0.0.1:5433:5432`; prod
  should drop the host mapping entirely (internal `postgres:5432` only).
- ✅ **Uploads hardened** — SVG removed from allowlist (XSS); magic-byte content
  sniff now rejects a file whose bytes don't match its declared image/video kind.
- ✅ **Health endpoint minimized** — public `/api/health` returns only `{"ok":true}`;
  db/uptime detail requires the internal bearer token.

Still to decide before/at deploy:

- 🟠 **autoheal + docker.sock** — container-escape surface. Either remove autoheal
  in prod (Dokploy already restarts unhealthy containers) or put it behind a
  restricted socket-proxy. Do not assume `:ro` is safe.
- 🟠 **App ports on VPS** — bind `3000`/`3001` to loopback and reverse-proxy
  (Cloudflare → origin) instead of publishing them on the public IP.
- 🟡 **Cloudflare**: SSL/TLS `Full (strict)`, WAF, rate-limit the expensive routes
  (`/api/assistant`, `/api/contact`, `/api/admin/login`). Consider Cloudflare
  Access in front of `/admin/*` as a second layer.
- 🟡 **VPS hardening**: default-deny firewall, SSH keys only, Fail2Ban, auto
  security updates, snapshot before deploy, daily encrypted Postgres dump off-host.

## 6. Email deliverability — LIVE ✅

`jpamorosi.dev` is verified in Resend (SPF + DKIM) and the system has been sending
real email for a while: sender `Amorosi Labs <labs@jpamorosi.dev>`, delivering to
`jpamorosi14@gmail.com` (magic-link, lead alerts, scout digest, follow-ups).
Nothing to do here for release. Keep `RESEND_API_KEY` in the VPS secret manager
only; rotate if leaked.

## 7. Autonomy — the "arranque inicial" (scout → prospects → email)

The autonomous layer only runs where the **worker container** runs (VPS backend),
not on Vercel. To turn it on:

1. Deploy with the `backend` profile (worker + postgres + backend).
2. Ensure `WEB_SEARCH_API_KEY`, `INTERNAL_API_TOKEN`, `OPENROUTER_API_KEY`,
   `RESEND_*` are set. Worker fires `daily-scout` at `SCOUT_HOUR` and `heartbeat`
   at `PULSE_HOUR`.
3. `daily-scout` sweeps rotating market angles → ingests into `prospects` (kanban
   at `/admin/prospects`) → advances one stage/pass → emails a digest.

**Honest gap (email marketing DB):** the scout captures *opportunities/URLs*, not
emails. The only path that fills `prospects.email` today is the manual
"drop a forwarded email/text" intake. To actually build a mailing list without
over-engineering:

- add one Serper `"{company}" contact email` query in the `enrich` stage and
  regex-extract into the existing `prospects.email` column;
- add an admin "export qualified + has-email → CSV" action;
- reuse the existing Resend integration for **warm/opt-in** outreach only, with a
  human confirm step. No scraper, no cold-blast engine.

This is a small, scoped task (folds into the prospects pipeline) — not part of the
release hardening. Flagged here so it isn't forgotten.

## 8. Deploy sequence

1. `git tag baseline-pre-refactor` (rollback point) — **do before any deploy**.
2. Clean `pnpm install` in CI/Linux; run `pnpm test` + `next build` green.
3. Vercel: set public env vars (§2 left column), deploy, smoke-test `/`, `/projects`,
   a `/projects/[slug]`, `/os`, contact, locale switch.
4. VPS/Dokploy: set backend env vars (§2), deploy `backend` profile; verify Postgres
   is internal-only, admin login works, `/api/health` (with token) shows `db:ok`,
   R2 smoke test passes from the server.
5. Verify DNS: `media.jpamorosi.dev` (R2), `www.jpamorosi.dev` (Vercel), backend origin.
6. Observation window: error logs, assistant errors, cron/heartbeat execution,
   email delivery, translation latency.

## 9. Rollback

- Public: Vercel → redeploy previous deployment.
- Backend: redeploy previous image/commit; restore Postgres from the latest
  encrypted dump if a migration went wrong (all schema is `CREATE TABLE IF NOT
  EXISTS` via `lib/db/bootstrap.ts` — additive, low-risk).
- Media: R2 objects are durable; no rollback needed.

---

### Doc hygiene notes
- `docker-compose.yml` references `docs/HYBRID_DEPLOYMENT_STRATEGY.md` and the
  upload route references `docs/storage-r2.md` — verify these exist or fix the
  references (T08 QA).
- `CLAUDE.md` still says Tailwind v4; actual is 3.4 (correct the doc, not the code).
