# 00_START_HERE.md — Amorosi Labs Agentic Route

## Mission
Refactor `jpamorosi.dev` into **Amorosi Labs Hall of Fame**: a hiring-focused portfolio that proves AI architecture, production workflows, and real startup execution.

The current OS-style experience must not be deleted. It becomes `/os`.

## North Star
This is not a decorative portfolio. It is a proof system.

The site must communicate, in under 60 seconds:

1. Juan builds real AI-powered systems.
2. LumenScript proves advanced AI orchestration.
3. BBN proves lightweight production agent workflows.
4. BuenPick proves live startup/product execution.
5. The rest of the lab supports the thesis without overwhelming the visitor.

## Primary Routes

```txt
/                    New Amorosi Labs home
/os                  Preserved jpamorosi.os interactive CV
/projects            Project index
/projects/[slug]     Project room / Hall of Fame room
/lab                 Featured systems + archive
/admin               Protected light backoffice
/api/admin/*         Admin CRUD endpoints
/api/ai-guide        Future portfolio AI guide
```

## Operating Loop
Every task follows this loop:

```txt
READ → PLAN → SMALL PATCH → RUN CHECKS → REVIEW → LOG → NEXT FILE
```

Never do large uncontrolled rewrites.

## Required Reading Order
Claude must read these files in order before touching code:

1. `00_START_HERE.md`
2. `01_CONCILIACION_TECNICA.md`
3. `02_ENFOQUE_ONTOLOGICO.md`
4. `03_AGENTIC_LOOP_HARNESS.md`
5. `04_BACKOFFICE_CONTENT_MODEL.md`
6. Then execute task files in order:
   - `05_TASK_FOUNDATION_REFACTOR.md`
   - `06_TASK_BACKOFFICE_ADMIN.md`
   - `07_TASK_HALL_OF_FAME_UI.md`
   - `08_TASK_PROJECT_ROOMS_MEDIA.md`
   - `09_QA_SECURITY_DEPLOY.md`

## Completion Protocol
At the end of each file:

1. Run the checks declared in that file.
2. Update `develop-history/AMOROSI_LABS_STATE.md`.
3. Write a phase log in `develop-history/PHASE_AMOROSI_[phase-name].md`.
4. Stop and ask for authorization before moving to the next task file.

## Non-Negotiables

- Preserve current OS experience under `/os`.
- Do not add heavy 3D to the new home.
- Do not migrate Tailwind major version during phase 1.
- Do not introduce Payload/Tina unless explicitly approved later.
- No skill percentage bars.
- Use evidence-based capability mapping.
- Admin must be protected by credentials.
- Public rendering must not depend on client-only admin code.
- Every visual system must be content-driven.

## First Execution Command for Claude Code

```txt
Read docs/amorosi-labs/00_START_HERE.md through docs/amorosi-labs/09_QA_SECURITY_DEPLOY.md. Then execute only 05_TASK_FOUNDATION_REFACTOR.md. Preserve the existing OS under /os. Stop after build/test/log.
```
