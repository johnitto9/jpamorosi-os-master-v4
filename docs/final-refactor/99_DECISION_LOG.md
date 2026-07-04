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
