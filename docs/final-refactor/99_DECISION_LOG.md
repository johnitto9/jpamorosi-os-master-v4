# 99_DECISION_LOG

Use this file for decisions made during execution.

## Template

### YYYY-MM-DD — Decision title

**Context**  
What was discovered.

**Decision**  
What was chosen.

**Why**  
Reasoning.

**Alternatives rejected**  
Short list.

**Impact**  
Files, data, migrations, UX.

**Reversible?**  
Yes / No / Partial.

---

## Execution decisions

### 2026-07-04 — Release-hardening pass before feature refactor

**Context**
User priority is production readiness (deploy, keys/secrets, R2, autonomy), not the
full T01–T08 feature refactor first. T00 audit found: R2 unwired, Postgres port
public in compose, SVG uploads allowed, health endpoint leaking dep detail,
line-ending churn masking real changes.

**Decision**
Run a "Fase R" release-hardening track now (before T01):
- wired + verified Cloudflare R2 (smoke test passes: write/S3-read/public-read);
- Postgres compose port bound to `127.0.0.1`;
- upload route: dropped SVG, added magic-byte content sniff;
- health endpoint minimized (detail gated behind internal token);
- added `.gitattributes` (LF) to stop CRLF churn;
- authored `RELEASE_PROD_READINESS.md` (topology + secrets matrix + runbook).

**Why**
These are prerequisites for any safe deploy and are lower-risk than the feature
work. They also directly answer the user's R2 / search / email questions.

**Alternatives rejected**
Starting T01 (Orbe naming) first — deferred; deploy blockers take precedence.

**Impact**
`docker-compose.yml`, `app/api/admin/upload/route.ts`, `app/api/health/route.ts`,
`.gitattributes`, `.env.local` (R2, gitignored), new scripts/docs. Typecheck green.

**Reversible?** Yes (all additive/surgical; git-revertable).

---

### 2026-07-04 — T01 naming + i18n executed

**Context**
Public assistant was "lab guide"/"guía de lab" in 7 locales; section labels were
Hall of Fame/Featured/Archive; contact form was hardcoded English; found a
pre-existing mixed-language bug (RU launcher = Chinese, ZH launcher = Arabic).

**Decision**
- Assistant → **Orbe** (proper noun, all locales) with localized descriptor in
  the greeting; all aria/dock/cookie/hints/email/admin references updated.
- Public sections → **Proof Rooms / Systems in Orbit / Lab Fragments** (eyebrow +
  title + nav + hero CTA + back link), internal tier IDs untouched.
- Contact form localized via a `contactForm` dict block (7 locales).
- Fixed the RU/ZH launcher bug.

**Deferred (needs your call, NOT changed unilaterally)**
- `navContact`/contact eyebrow → "Open Channel": kept functional "Open to work"
  copy (better for a hiring contact) — decide if the narrative label wins.
- SEO meta still uses the "Hall of Fame" metaphor (changing affects SEO).
- Admin tier labels keep the internal taxonomy ("Hall of Fame" tier).
- Manual QA pending: visual pass of the widget + home per locale.

**Reversible?** Yes. Commits 743b837, 3210b11, 996e4f6.

---

### 2026-07-04 — T02 / T03 / T04-base executed

**T02 (home narrative, 527d444)** — three interludes (Before the Systems / You're
Inside the Proof / The Living Layer) via one shared `Interlude` shell + distinct
CSS focals; canonical order achieved; copy in 7 locales. Clean production build
PASSES. Internal IDs / anchors / /os untouched.

**T03 (Guided Tour, deterministic — <commit>)** — `lib/assistant/guided-tour.ts`
state machine (welcome→builder→proof→portfolio→living→route), graph defined once,
7-locale copy. `GuidedTour.tsx` self-contained (zero fetch), scroll orchestration
+ attention ring, exit → adaptive Orbe via `al-assistant-open` event. Test asserts
the standard path never exits until route (the zero-LLM guarantee) + i18n/graph
integrity. Kept OUT of the 900-line widget to avoid destabilizing it.

**T04-base (workspace persistence)** — DECISION: `session_projects` IS the Project;
EXTEND it, don't build a parallel model. Added brand_dna/assets/stack_decisions/
visual_plans (all additive) + `project-workspace.ts` as the ONE shared contract
for Project Room / Branding / Omni / admin dossier. Palette-confirm gate + max-9
visual plan enforced in code. Wizard UI + Orbe tool wiring (T04 steps 4-10) remain.

**Constraint noted:** dev server + DB not runnable in this WSL env, so live UI/flow
QA and DB migration verification are deferred to the user / a real environment.
Every step gated on `tsc` + a full `next build`.

---

## Seed decisions

### Public assistant
Decision: `Orbe`

### Public section naming
Decision:
- Hall of Fame → Proof Rooms
- Featured Systems → Systems in Orbit
- Experiments & Artifacts → Lab Fragments
- Contact → Open Channel

Internal IDs remain stable unless explicitly justified.

### Shared Brand Foundation Flow
Decision:
One implementation shared by Project Room, Branding, Omni promotion and admin continuation.

### Guided Tour
Decision:
Standard path is deterministic and zero-token.

### Visual generation
Decision:
Visual Coverage Plan precedes multi-image generation.

### Persistence
Decision:
Nothing important exists only in chat.
