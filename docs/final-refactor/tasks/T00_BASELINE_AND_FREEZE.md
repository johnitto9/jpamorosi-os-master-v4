# T00_BASELINE_AND_FREEZE

## Objective
Create a verified baseline before feature refactor.

## Read first
- `00_START_HERE.md`
- `01_SYSTEM_TRUTH.md`
- `02_NON_NEGOTIABLES.md`

## Do
1. Create safe checkpoint.
2. Run install/build/typecheck/tests.
3. Inventory routes, project/branding models, assistant modes, admin sessions, migrations, Docker exposure, cron scheduling.
4. Classify features: DONE/PARTIAL/SIMULATED/BROKEN/MISSING.
5. Identify contradictory historical docs.
6. Mark this package as highest authority.

## Critical security checks now
If confirmed exposed:
- public Postgres;
- raw backend;
- leaked secret;
- unauthenticated internal endpoint;

fix before continuing.

## Acceptance
- baseline reproducible;
- no hidden test failure;
- migrations known;
- deploy exposure known;
- heartbeat scheduling known;
- contradictions documented.

## Stop
Report findings. Do not begin T01.
