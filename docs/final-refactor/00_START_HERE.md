# 00_START_HERE — Final Refactor Control Plane

> Nothing important exists only in chat.  
> Nothing visual is generated without a purpose.  
> Nothing autonomous acts without a boundary.

## Mission

Finish the last major refactor of `jpamorosi.dev` without flattening its identity, breaking preserved surfaces, duplicating logic, or allowing historical documentation to override the current product.

This package is the highest-authority refactor specification for Claude Code.

## Authority order

When instructions conflict:

1. `docs/final-refactor/*`
2. Current code and current tests
3. Current runtime evidence and QA screenshots
4. Current database/storage contracts
5. Historical docs and old playbooks

Historical playbooks are reference-only unless a task explicitly says otherwise.

## Required reading order

Before changing code:

1. `00_START_HERE.md`
2. `01_SYSTEM_TRUTH.md`
3. `02_NON_NEGOTIABLES.md`
4. `03_PRODUCT_NARRATIVE_AND_NAMING.md`
5. `04_DATA_AND_PERSISTENCE_CONTRACTS.md`
6. Relevant `specs/*`
7. Active `tasks/TXX_*.md`

Do not begin the next task automatically.

## Execution protocol

For every task:

- inspect current implementation before editing;
- identify existing reusable components and contracts;
- prefer extension over parallel reimplementation;
- preserve stable IDs and persisted data;
- add or update tests for critical behavior;
- run the task acceptance checks;
- stop and report:
  - changed files,
  - migrations,
  - tests,
  - unresolved risks,
  - manual QA still needed.

## Status vocabulary

Every major feature must be classified as one of:

- `DONE`
- `PARTIAL`
- `SIMULATED`
- `BROKEN`
- `MISSING`

Do not mark something done because a button or visual placeholder exists.

## Product surfaces

Treat these as distinct but connected products:

- Public Home
- Project Rooms
- `/os`
- Orbe public AI layer
- Project / Branding Workbench
- Admin Session Dossier
- Autonomous backend: memory, leads, scouting, heartbeat, follow-up
- Infrastructure: Postgres/pgvector, Docker, Cloudflare, Hostinger VPS, R2, Resend, search/model integrations

## Stop conditions

Stop and request review when:

- a migration could invalidate persisted sessions/projects/assets;
- a historical document conflicts with this package;
- a security change could lock out admin access;
- a major visual rewrite is required instead of a surgical refactor;
- a task would require changing stable public URLs or tier IDs;
- acceptance criteria cannot be verified.

## Core principle

The goal is not maximum features.

The goal is one coherent machine:

`conversation → project → brand DNA → assets → card → admin dossier → memory → continuation`
