# WORK DONE — Final Refactor

**Branch:** `v4final` · rollback: `git reset --hard baseline-pre-refactor`
**Validation:** every commit passed `tsc --noEmit`; the app passed a full
`next build` (13/13 pages). **No live UI/DB/LLM QA was possible in the WSL dev
env** — that pass (T08) is the user's, on a running app.

**Companion docs:** `PENDING.md` (what's left) · `SECURITY_STATUS.md` (cyber) ·
`RELEASE_PROD_READINESS.md` (deploy + secrets) · `99_DECISION_LOG.md`.

---

## Big picture

The whole backend (agent, admin, APIs, i18n, docker) **had never been committed** —
the last real commit only touched `package.json`. First job was securing it
(tag + 2 commits). Then the coherent-machine loop was built end to end:

```
conversation → project → brand DNA → assets → card → admin dossier → memory
```

Today, when a visitor talks to Orbe: a project is created, its palette is
confirmed, Brand DNA is captured, assets are generated & persisted — and all of it
shows in **both** the visitor's Vault and the admin dossier (one source of truth).

## What was done, by area

### Baseline & hygiene
- Tagged `baseline-pre-refactor`; committed the entire uncommitted backend
  (`8ddbe4d`). `.gitattributes` LF normalization killed ~1200 files of CRLF churn
  (`b3601ff`). Confirmed secrets/`.env*` are gitignored (no git leak).

### Release hardening (Fase R)
- **Cloudflare R2 connected + verified** end-to-end (`scripts/r2-smoke-test.mjs`:
  write → S3 read → public `media.jpamorosi.dev` read). Wired the 5 `R2_*` vars.
- Postgres compose port → loopback; upload SVG dropped + magic-byte sniff; health
  endpoint minimized. `RELEASE_PROD_READINESS.md` authored.

### Email / prospecting
- **Email-finding** (`33d3090`): the scout `enrich` stage now fills
  `prospects.email` (snippets + single-page fetch, mailto, junk filter) +
  `GET /api/admin/prospects?format=csv` + Export CSV button (mailing DB).

### T01 — Naming + i18n (7 locales)
- Public assistant → **Orbe** (`743b837`); sections → **Proof Rooms / Systems in
  Orbit / Lab Fragments** (`3210b11`); contact form localized (`996e4f6`). Fixed a
  pre-existing RU=Chinese / ZH=Arabic mixed-language bug. Internal IDs untouched.

### T02 — Home narrative
- Three interludes (Before the Systems / You're Inside the Proof / The Living
  Layer) via a shared `Interlude` shell + distinct CSS focals, canonical order
  (`527d444`). **Confirmed rendering live on :3001.**

### T03 — Orbe Guided Tour
- Deterministic, **zero-LLM** state machine + self-contained UI with scroll
  orchestration + exit→adaptive handoff (`dce0957`). Test asserts the standard
  path never calls the LLM.

### T04 — Project/Branding unification
- Unified persistence: `session_projects` extended + `brand_dna` / `assets` /
  `stack_decisions` / `visual_plans` tables + `project-workspace.ts` (`966acdc`).
- **The agent writes it live**: mockups→assets, techs→stack decisions (`85e4043`),
  `confirm_palette` + `set_brand_dna` tools (`8b64609`). Model fills from chat.

### T05 — Asset Vault
- `GET /api/assistant/workspace` (session-scoped) + `AssetVault.tsx` collapsible
  panel (palette / Brand DNA / stack / assets, thumbnails + lightbox, auto-open,
  live-sync after each turn) (`7344710`, `f5e67cf`).

### T06 — Admin dossier
- Brand Foundation panel in `/admin/sessions/[id]` reading `getProjectWorkspace`
  (same truth as the vault) + new activity events (`43ad0e2`).

### T07 — Security (code side)
- Rate limiting (login 8/10min, contact 5/10min) + test (`b268b27`, `46a71aa`);
  origin/CSRF validation on admin mutations (`fa54e9e`); docker healthcheck IPv6
  fix (`b6097e1`). Full assessment in `SECURITY_STATUS.md`.

## Docker / ops
- Cleaned the stack (removed dead buenpick/lumenscript containers, kept volumes);
  rebuilt with new code; backend healthy on **:3001** serving T01/T02.
- `web` (:3000) can't bind while a Windows-side `pnpm dev` holds the port.

## What remains → see `PENDING.md`
Short version: **T08** (the live QA acceptance-matrix pass — user's), UI polish
(dedicated wizard, mobile vault drawer, carousel, VisualPlanner UI, dossier tabs),
and **T07 infra** (Cloudflare/VPS/backups — user's ops). All app CODE for T00–T07
is done and build-validated.

## To see everything running
The container image predates the T04/T06/T07 commits — rebuild to pick them up:
```
docker.exe compose --profile backend up --build -d   # backend :3001 (admin, DB)
# free :3000 (stop the Windows pnpm dev) for the web mirror to start
```
