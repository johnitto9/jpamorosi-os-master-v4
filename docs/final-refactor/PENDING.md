# PENDING — Final Refactor Status & Open Items

**Updated:** 2026-07-04
**Branch:** `v4final` · rollback tag: `baseline-pre-refactor`

Status map of the 9 stages (T00–T08) + what still needs doing, QA, or your action.
Everything below was gated on `tsc` + a full `next build`; **no live UI/DB QA was
possible in this WSL env** (dev server unreliable on `/mnt/c`), so anything marked
QA-PENDING must be eyeballed in a running app before release.

Legend: ✅ done · 🟡 partial/scaffolded · ⏳ QA-pending · 👤 your action (VPS/infra)

---

## Stage status

| Stage | State | Notes |
|---|---|---|
| **T00** Baseline & freeze | ✅ | Audit + baseline report. Whole backend was UNCOMMITTED — now committed (tag `baseline-pre-refactor`). |
| **T01** Naming + i18n | ✅ ⏳ | Orbe naming (7 locales) + section labels (Proof Rooms / Systems in Orbit / Lab Fragments) + contact form localized. Fixed RU/ZH mixed-language bug. QA: visual pass per locale. |
| **T02** Home narrative | ✅ ⏳ | 3 interludes, canonical order. **Confirmed live on :3001** (Proof Rooms / Systems in Orbit render). QA: mobile / reduced-motion / fast-scroll. |
| **T03** Orbe Guided Tour | ✅ ⏳ | Deterministic 0-LLM engine + self-contained UI + exit→adaptive handoff. Test asserts zero-exit path. QA: click through the tour, scroll cues, handoff. |
| **T04** Project/Branding unification | 🟡 | **Base done**: unified persistence (brand_dna/assets/stack_decisions/visual_plans + `project-workspace.ts`, palette-confirm gate, max-9). **Pending**: wizard UI (easy-guide → constraints → tech-optional → 3 inferred colors → confirm) + Orbe tools that WRITE to the workspace + project-specific reception copy. |
| **T05** Workbench / Vault / Visual Planner | 🟡 | Persistence + roles exist (T04 base). **Pending**: collapsible right panel (Overview/Palette/Stack/Logo/Reference/Storyboard/Screens/Activity), auto-open, compact chat thumbnails, lightbox, Embla carousel reuse, VisualCoveragePlan UI, plan-before-generate gate wired to `runGenerateMockup`. |
| **T06** Admin dossier | 🟡 ⏳ | Brand Foundation panel wired into `/admin/sessions/[id]` (reads `getProjectWorkspace` — same truth as vault). **Pending**: full tab restructure (Overview/Chats/Project/BrandDNA/Assets/Activity), multiple-conversation selector. QA once data exists. |
| **T07** Security hardening | 🟡 👤 | Done: Postgres loopback, upload magic-byte sniff (no SVG), minimal `/api/health`, cron bearer auth, **rate limiting** (login 8/10min, contact 5/10min), **docker healthcheck IPv6 fix**. Pending 👤: Cloudflare Full(strict)+WAF+edge rate limits, admin Access, origin-bypass audit, VPS firewall/SSH/Fail2Ban/auto-updates, docker.sock/autoheal decision, backup+restore drill. |
| **T08** Final QA / release | ⏳ | Not started — the full pass across UX/i18n/rooms/autonomy/persistence/perf/security + pass-fail matrix + release gate. |

---

## Concrete next-session backlog (in order)

1. **T04-UI** — Project Room wizard + Orbe `update_project`/brand tools writing to
   `project-workspace` (BrandDNA, StackDecision, palette confirm). Replace the
   generic Project Room welcome with a project-specific opening.
2. **T05** — Asset Vault side panel + compact thumbnails + lightbox; move
   `runGenerateMockup` output into `assets` (role-tagged) instead of loose files;
   VisualCoveragePlan required before multi-image gen.
3. **T06-full** — tabbed dossier + multi-conversation view.
4. **T08** — acceptance matrix pass, then release.

## Known bugs / debt found (not yet fixed)

- **Legacy `/api/contact/route.ts`**: stale `from: contact@jpamorosi.com` /
  `to: juan.amorosi@gmail.com`, `Access-Control-Allow-Origin: *`, duplicates email
  logic. The live home form uses **Formspree**, so this route is likely dead —
  either delete it or point it at `lib/email/service` + `labs@jpamorosi.dev`.
- **SEO meta** (`app/layout.tsx`, `app/page.tsx`, `app/projects/page.tsx`) still
  uses the "Hall of Fame" metaphor after the section rename — your call.
- **Admin tier labels** keep the internal taxonomy ("Hall of Fame" tier) — fine,
  but note the public↔admin naming divergence.
- **`navContact` → "Open Channel"** deferred: kept functional "Open to work" copy.
- **Tests can't run in this WSL env** (`@rollup/rollup-linux-x64-gnu` missing) —
  do a clean `pnpm install` in Linux/CI, then `pnpm test` (guided_tour + others).

## Your action items (👤 outside the code)

1. **QA visual** of T01/T02/T03 on **:3001** (backend, new code is live) — Orbe
   naming, interludes, guided tour, locale switch.
2. **Free port :3000** (a Windows-side `pnpm dev` holds it) so the `web` container
   can start, OR check everything on :3001. Then `docker.exe compose --profile
   backend up -d` starts the `web` mirror.
3. **Rebuild** the image to pick up T04/T06/T07 code (they were committed AFTER the
   running image built): `docker.exe compose --profile backend up --build -d`.
4. **Verify migrations**: the new T04 tables auto-create on first DB use (additive,
   `IF NOT EXISTS`). Confirm with `docker.exe exec ...-postgres-1 psql -U amorosi -d
   amorosi -c '\dt'` after the app touches the DB.
5. **VPS/Cloudflare** T07 items (see table) before public release.
6. **Resend** is already live/verified — nothing to do.

## Deploy topology reminder

- `:3000` **web** = prod mirror (static, admin OFF) · `:3001` **amorosi-backend**
  = local/admin (live content, admin ON, Postgres). See `RELEASE_PROD_READINESS.md`.
