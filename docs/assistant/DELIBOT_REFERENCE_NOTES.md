# DELIBOT_REFERENCE_NOTES.md — architectural reference (NOT a migration)

Delibot extracted code lives in `delibot/` as **reference only**:

- `delibot/codigo_extraido_delibotlast.txt` — **stable base** (delibot_estable).
  Healthiest heart for persistent memory: `conversation_service.py`, conversation
  tests, stable fallback, anti-silence pact. Stores/retrieves messages per client,
  injects history before the AI service, tests multi-turn memory.
- `delibot/codigo_extraido_delibotlast1.txt` — v16/v17 **quarry** of advanced
  pieces only: DeliveryService, E4-only, deterministic photo flow, health report,
  golden tests, Orchestrator / "Mente Única", V17 docs.

> Rule: **Do not import Delibot code into the app. Do not migrate Delibot.**
> Use it purely as architectural reference for the portfolio assistant.

## Files worth studying (if extractable from the txts)

- **Memory core:** `conversation_service.py`, `api/webhooks.py`,
  `tests/test_conversation_persistence.py`, `tests/test_full_conversation.py`,
  Phase_5_* forensics/fix/regression/postmortem, `bedrock.md`, `bedrockadd.md`.
- **Tools core:** `core/tools_registry.py`, `services/ai_service.py`,
  `tests/test_tool_extraction.py`, `services/thinking_mode.py`.
- **Adaptability / orchestration:** `core/state_machine.py`, `state_service.py`,
  `intelligent_router_service.py`, `jinja_service.py`, `core/prompt_manager.py`,
  `core/asset_loader_service.py`, `delivery_service.py`, `photo_service.py`,
  `core/template_linter.py`.
- **Output / control:** `delivery_service.py`, `whatsapp_service.py`,
  `whatsapp-bot/index.js`, `messageHandler.js`.
  - Rule: **no service sends messages directly** except through DeliveryService or
    an approved wrapper.
- **Observability / testing:** `observability_service.py`, `test_e4_only.py`,
  `test_webhook_monitor.py`, `test_tool_extraction.py`,
  `test_conversation_persistence.py`, `test_full_conversation.py`,
  `health_report.json`, V17 observability/validation markdowns.

## Things to avoid (carried over)
- Don't refactor everything; don't merge V17 wholesale over delibot_estable.
- Don't change database and webhook in the same pass.
- Don't touch memory, tools and delivery together without tests.
- No cosmetic "final enhancer"; no tone/slang in Jinja templates.
- No direct WhatsApp-style sends from random services.
- Never delete fallback / no-silence behavior.
- Don't replace `conversation_service` without a feature flag.
- "More intelligent" ≠ "giant prompt."

## Philosophy
> The agent must not paint the dragon. It must tame it.

## Translation → Amorosi Labs portfolio assistant
| Delibot lesson | Portfolio assistant equivalent |
|---|---|
| Persistent per-client memory | **memory-lite** conversation context (client/request only, no PII, no cross-session) |
| `tools_registry` as source of truth | `lib/assistant/tool-registry.ts` — whitelisted tools only |
| intelligent router / state machine | `lib/assistant/intent-router.ts` |
| DeliveryService controls all output | `lib/assistant/response-builder.ts` — one structured output path |
| anti-silence pact | **no-silence fallback** — always return a useful answer + 2-3 buttons |
| golden tests | `tests/assistant_*.spec.ts` intent/guardrail guards |
| observability | server-side structured logs in the assistant route |
| guardrails | `lib/assistant/guardrails.ts` — no admin/tools abuse, no invented metrics, no PII, prompt-injection resistant |

RC2 assistant is **deterministic/rule-based** (no LLM SDK dependency). An LLM
adapter is documented as a future, server-only, env-gated option in
`docs/assistant/ASSISTANT_ARCHITECTURE.md`.
