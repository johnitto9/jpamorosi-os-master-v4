# Agente "Lab Guide" — arquitectura

Patrones portados de delibot_estable/V17 (conceptos, no código Python):
memoria persistente por cliente, tools registry como única fuente de verdad,
salida única (E4-only), pacto no-silence, degradación limpia.

## Mapa de piezas (frontend-app/)

```
lib/agent/
  orchestrator.ts   Mente Única: TODO reply nace acá (guard → memoria → LLM →
                    fallback determinista → lead merge → persistencia)
  llm.ts            Cliente OpenRouter (fetch puro). z-ai/glm-5.2 por defecto.
                    Devuelve null ante CUALQUIER fallo → fallback.
  memory.ts         conversation_service pattern: historial por sesión en
                    Postgres; sin DB opera memory-lite (jamás rompe).
  leads.ts          Calificación: regex determinista (email/tel) ∪ campo
                    `lead` estructurado del LLM (zod). Merge-upsert por sesión,
                    nunca pisa datos existentes con vacío.
lib/assistant/      (preexistente, sigue siendo el núcleo determinista)
  guardrails.ts     input guard + whitelist de rutas + límites de salida
  tool-registry.ts  SSoT de tools — el LLM SOLO puede invocar estas
  response-builder.ts  fallback no-silence content-grounded
lib/db/
  pool.ts           pool pg lazy + tryQuery (degradación)
  bootstrap.ts      DDL idempotente: projects, visitor_sessions,
                    agent_messages, leads
app/api/assistant/route.ts  cookie de sesión anónima (al_sid, httpOnly, 180d)
app/admin/leads/page.tsx    tablero de leads calificados
components/assistant/AssistantWidget.tsx  panel aero grande + nudge proactivo
```

## Flujo de un mensaje

1. `guardInput` (determinista) — inyección/secretos/off-topic → refusal directo.
2. `touchSession` + `loadHistory` (DB; si no hay DB, usa historial del cliente).
3. `extractLeadSignals` (regex, funciona sin LLM).
4. Si hay `OPENROUTER_API_KEY`: prompt = identidad + FACTS del sitio (contexto
   compacto) + estado de calificación ("ya sabemos: email, company…" para no
   re-preguntar) + historial → GLM 5.2 con `response_format: json_object` →
   zod → tools mapeadas por `callTool` (whitelist) → `enforceResponse`.
5. Cualquier fallo del paso 4 (timeout, JSON inválido, 4xx/5xx) → paso
   determinista `buildResponse`. El visitante NUNCA ve un error.
6. `upsertLead` + `saveTurn` (ambos degradan a no-op sin DB).

## Reglas de hierro (heredadas de delibot)

- Nadie responde al cliente salvo el orchestrator (salida única).
- El LLM no puede inventar URLs: solo tools del registry + filtro de hrefs.
- No-silence: siempre hay respuesta con acciones útiles.
- Sin refactor del núcleo determinista: es EL fallback, no código muerto.

## Config

| Env | Efecto |
|---|---|
| `OPENROUTER_API_KEY` | activa el cerebro LLM (sin key: determinista) |
| `OPENROUTER_MODEL` | default `z-ai/glm-5.2` |
| `DATABASE_URL` | activa memoria + leads (sin DB: memory-lite) |

Verificado (2026-07-02): smoke SQL contra Postgres 16 real (DDL idempotente,
merge de leads, historial) + E2E por HTTP (cookie, 2 turnos persistidos,
email capturado como lead). Ver develop-history.
