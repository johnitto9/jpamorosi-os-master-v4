# 03_AGENTIC_LOOP_HARNESS.md — Agentic Loop & Development Harness

## Purpose
Constrain Claude Code into a reliable engineering loop: small patches, executable checks, visible decisions, and reversible progress.

## Loop Contract

Every implementation task must follow:

```txt
1. Read current code and relevant docs.
2. Restate the target in 5 lines max.
3. Create/Update task checklist.
4. Apply the smallest coherent patch.
5. Run checks.
6. Inspect errors.
7. Fix only what relates to the task.
8. Update logs.
9. Stop.
```

## Harness Principle
Natural language is not enough. Every phase needs executable evidence.

Minimum checks:

```bash
cd frontend-app
pnpm build
```

When available:

```bash
pnpm test
pnpm lint
pnpm tsc --noEmit
```

For admin/API phases add curl/manual checks.

## Decision Observability
For every meaningful decision, Claude must write:

```md
## Decision
What changed?

## Prediction
What should improve?

## Evidence
What check or visible result confirms it?

## Rollback
Which files would be reverted if wrong?
```

## Component Observability
Every new component must declare:

```md
Path:
Inputs:
Outputs:
State:
Data source:
Failure mode:
```

## Experience Observability
Every phase log must include:

- What was confusing.
- What failed.
- Which assumption changed.
- What not to repeat.

This prevents the agent from reliving the same bug like a cursed NPC.

## Subagent Guidance
If using Claude Code subagents, create them in `.claude/agents/` only after the foundation is stable.

Suggested subagents later:

- `amorosi-architect` — reviews architecture and route boundaries.
- `amorosi-ui-polish` — reviews visual consistency.
- `amorosi-qa` — reviews tests, security and build stability.
- `amorosi-copy-chief` — reviews hiring narrative and project proof.

Do not create subagents in phase 1 unless explicitly requested.

## Hook Guidance
Hooks are optional. If used, they must be conservative.

Potential hooks later:

- Block writes to `.env`.
- Log Write/Edit operations to `develop-history/agent-audit.log`.
- Run formatting after Edit operations.
- Warn before editing existing OS components.

No hook may run destructive commands.

## Stop Conditions
Claude must stop immediately if:

- Build fails in a way unrelated to current phase.
- Required environment variables are missing for an admin feature.
- It needs to choose between Supabase/Payload/Tina without prior approval.
- It is tempted to delete existing OS code.

## Recursive Task Handoff
At the end of each task file, Claude must write:

```md
## Next Recommended File
`XX_TASK_NAME.md`

## Why
One sentence.

## Blockers
List blockers or say `None`.
```

Then stop.
