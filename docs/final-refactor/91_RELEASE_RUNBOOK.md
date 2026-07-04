# 91_RELEASE_RUNBOOK

## Pre-release
- freeze feature work;
- verify branch/commit;
- run build;
- run typecheck;
- run tests;
- complete acceptance matrix;
- verify env vars;
- verify migrations;
- create VPS snapshot;
- create encrypted Postgres dump off-host.

## Database
For every migration:
- confirm backup;
- run migration;
- verify expected tables/columns;
- run compatibility checks;
- verify session/project data.

## Deploy
Use current approved deployment path.

Do not improvise a new platform during final release.

## Smoke tests

### Public
- `/`
- `/projects`
- representative `/projects/[slug]`
- `/os`
- contact
- locale switch

### Orbe
- open
- guided tour
- free question
- project start
- branding continuation

### Admin
- login
- session dossier
- chats
- project
- brand DNA
- assets
- activity

### APIs
- health
- contact
- assistant
- internal/cron protected

## Security smoke
- DB port not reachable publicly;
- raw backend not reachable unexpectedly;
- admin protected;
- internal token required;
- upload limits work.

## Observation window
After deploy:
- error logs;
- assistant errors;
- DB errors;
- translation latency;
- image generation failures;
- cron/heartbeat execution;
- email delivery.

## Rollback
Document:
- previous image/commit;
- migration rollback constraints;
- DB restore command;
- DNS/origin rollback if changed.

## Release decision
Release only when:
- no P0;
- security baseline acceptable;
- Guided Tour works;
- project/branding persistence verified.
