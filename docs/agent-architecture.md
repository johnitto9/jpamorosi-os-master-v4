# Agent architecture — el guía de ventas de Amorosi Labs

## Principios (heredados de delibot)
- **No-silence:** el visitante SIEMPRE recibe respuesta (fallback determinista
  ante cualquier falla del LLM). 
- **Salida única:** todo pasa por `lib/agent/orchestrator.ts` (Mente Única).
- **Tool-first:** el modelo solo puede nombrar tools whitelisted; el código
  decide etapa de venta y scoring, nunca el LLM.
- **Degradación limpia:** sin DB → memory-lite; sin API keys → tools ocultas.

## Pipeline (runAgent)
1. `guardInput` — sanitiza, refusals deterministas (injection/secrets/offtopic).
2. Memoria — `touchSession` + historial DB (fallback: historial del cliente).
3. Señales deterministas de lead (regex email/phone) — funcionan sin LLM.
4. **Vía LLM** (`OPENROUTER_API_KEY`): system prompt = misión de ventas +
   persona (impronta de Juan) + playbook de la etapa actual + hechos del sitio
   → JSON estricto validado con zod → tools.
5. **Server tools** (una ronda, sin loops):
   - `web_search` (env `WEB_SEARCH_API_KEY`, serper.dev): investiga la empresa
     del lead; el resultado alimenta UNA completion de seguimiento.
   - `generate_mockup` (Seedream 4.5 vía OpenRouter, `OPENROUTER_IMAGE_MODEL`):
     mockup visual guardado bajo `media/sessions/<sid>/`, máx 3 por sesión,
     llega como card de imagen (solo paths `/api/media/` pasan el guardrail).
6. Client tools (registry): navegación, cards de proyecto, CV, contacto.
7. Fallback determinista (`buildResponse`) si el LLM falla en cualquier punto.
8. Persistencia: lead merge-upsert + `stage`/`score` recalculados por código
   (`lib/agent/playbooks.ts`) + turno + eventos + `ai_logs` (latencia/outcome).
9. Si en este turno llegó email/teléfono nuevo → `notifyAdmin(lead_received)`.

## Playbook de ventas (stages por código)
`discover → qualify → propose → close` — calculado desde el lead row:
need+contacto→close · need→propose · company/budget/name o 4+ turnos→qualify.
Scoring aditivo 0-100 (need 30, email 20, budget 20, company 15, phone 5,
name 5, notes 5). El prompt recibe goal+tácticas de la etapa actual.

## Presencia proactiva (client)
- Saludo "¡Hola!" grande + mascota animada (una vez, 4s tras cargar).
- Nudges preseteados contextuales por página (home/hall, /projects, /cv) a los
  40s y 150s, máx 2 por sesión, nunca sobre el panel abierto, respetan
  `prefers-reduced-motion` y visibilidad de pestaña.

## Observabilidad
`ai_logs` (modelo, ok, latencia, error) + `events` (ai.response.generated,
ai.tool.called/failed) + `email_logs`. Ver `/api/admin/ai-logs` etc.
