# ASSISTANT_ARCHITECTURE.md — Amorosi Labs portfolio assistant

A **portfolio/CV assistant**, not a general autonomous agent. It guides visitors
(recruiters, founders, CTOs) through Juan's real work. RC2 is **deterministic /
rule-based — no LLM SDK dependency**.

## Pipeline (single output path)

```
POST /api/assistant  { message, history? }
  → guardrails.guardInput()        # sanitize, block injection/admin/secret/offtopic
  → intent-router.routeIntent()    # classify intent (keyword/regex)
  → context-builder.buildContext() # REAL site data (static seed) only
  → response-builder.buildResponse()
       → tool-registry.callTool()  # whitelisted tools → structured actions/cards
  → guardrails.enforceResponse()   # caps + allowed-href filter + no-silence
  → AssistantResponse (JSON)
```

Design mirrors Delibot lessons (see `DELIBOT_REFERENCE_NOTES.md`): tool registry
as source of truth, intent router, one controlled delivery path, anti-silence
fallback, observability logs, guardrails.

## Files
- `lib/assistant/types.ts` — response/action/card shapes + limits.
- `lib/assistant/context-builder.ts` — grounds answers in profile/projects/capabilities.
- `lib/assistant/intent-router.ts` — deterministic intent classification.
- `lib/assistant/tool-registry.ts` — whitelisted tools (no arbitrary calls).
- `lib/assistant/guardrails.ts` — input/output safety + allowed routes.
- `lib/assistant/response-builder.ts` — assembles + enforces every reply.
- `app/api/assistant/route.ts` — public, node runtime, no persistence.
- `components/assistant/*` — widget, message, action button, project card.

## Response shape
```ts
{ message, intent, actions[], cards[], safety: { source, confidence } }
```
Actions: `navigate` (internal), `show_project` (slug), `external` (mailto/github
from profile only). Cards: `{ type: "project", slug }`.

## Tools (whitelisted)
`navigate_to_project`, `show_project_card`, `compare_projects`,
`list_hall_of_fame`, `list_featured_systems`, `explain_capability`, `open_os`,
`open_contact`, `open_or_generate_cv`, `suggest_best_project_for_intent`.
Unknown tool names are rejected; every action href is filtered against
`ALLOWED_ROUTES`.

## Intents
`hiring`, `project_discovery`, `specific_project`, `capability`, `cv`, `contact`,
`about`, `architecture`, `comparison`, `os`, `refusal`, `unknown` (no-silence fallback).

## Memory (memory-lite, intentional)
- Short conversation `history` is **caller-provided** in the request and used only
  to shape the current turn. **Nothing is persisted server-side.**
- No cross-session memory, no visitor PII, no tracking. This is deliberate for a
  public portfolio (privacy + Vercel-safety). Persistent memory is a future,
  opt-in, backend-only concern (Docker/Dokploy), not RC2.

## Data source
The assistant reads the **static seed** (`content/*` via public-projects sync
getters) so it works identically on Vercel and stays static-safe. It never reads
admin/local-json and has no admin powers.

## Future LLM adapter (documented, NOT in RC2)
An optional server-only, env-gated LLM adapter could sit **behind** the same
pipeline: intent-router + context-builder produce a grounded prompt; the LLM only
rephrases within guardrails; tool-registry still owns actions. Requirements:
- server-only, `ASSISTANT_LLM_*` env, disabled by default;
- responses still pass `enforceResponse()`;
- no new hard dependency unless explicitly approved;
- must not invent facts beyond the built context.
Until then, the deterministic router + content-aware responses are "intelligent
enough" without a giant prompt.
