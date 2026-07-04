# Change Log: 2026-07-02 (6/6) — AGENTE-1: cerebro de ventas + presencia viva

## 1. Objetivo
(a) Pulir front: bordes de cards del Hall recortados + animación "crece y
vuelve" en los nodos del ChapterNav. (b) Arrancar scheme005: cerebro de
ventas del agente (playbooks + scoring + impronta) y presencia proactiva
(popups preseteados, saludo "¡Hola!" grande con la mascota).

## 2. Diagnóstico del recorte de cards
HolographicCard inclina las cards en reposo (rotateX 6° + rotateY) y el
coverflow suma ±26°; las esquinas salen de la caja y el `overflow-hidden`
del viewport Embla las recortaba. El clip corta en el padding-box → padding
vertical en el viewport crea aire sin tocar nada más.

## 3. Cambios aplicados (frontend-app/)
### Front
- HallOfFameGrid: viewport `mt-4 py-10` (antes `mt-10` sin padding),
  controles `mt-1`. CardCarousel: `-my-6 py-8` (mismo fix, compensado).
- chapter-nav: nuevo `KnobPop` con useAnimationControls — overshoot
  `scale [1 → 1.55 → 0.92 → 1]` (0.6s) que se re-dispara en cada activación
  (scroll o click) vía pulseKey.

### Cerebro de ventas (server)
- `lib/agent/playbooks.ts` (NUEVO): etapas discover→qualify→propose→close
  calculadas POR CÓDIGO desde el lead row (tool-first, el LLM nunca decide
  su etapa); scoring aditivo 0-100 (need 30, email 20, budget 20, company
  15…); personaBlock con la impronta de Juan (architecture-first, evidencia
  sobre promesas, directo y cálido, "la conversación ES la demo");
  stageBlock con goal + tácticas por etapa para el system prompt.
- `lib/db/bootstrap.ts`: columnas `stage`/`score` en leads (CREATE + ALTER
  IF NOT EXISTS idempotente para tablas preexistentes).
- `lib/agent/leads.ts`: updateLeadStage(); listLeads ordena por score DESC
  (hottest first) y expone stage/score.
- `lib/agent/orchestrator.ts`: systemPrompt ahora = misión de ventas +
  persona + playbook de la etapa actual + reglas duras de siempre; tras el
  upsert del lead recalcula stage/score y los persiste. Fallback no-silence
  intacto.
- `/admin/leads`: columna Stage (badge por color: close=verde,
  propose=cyan, qualify=violeta) + score.

### Presencia viva (client)
- AssistantWidget: popup de saludo con "¡Hola!" GIGANTE (gradient
  cyan→blanco→violeta, spring pop) + mascota saludando 64px.
- PRESET_NUDGES: 3 ganchos de venta (match idea / hiring proof / CV) que
  se disparan a los 40s y 150s SOLO si el visitante aún no chateó, máx 2
  por sesión (sessionStorage), nunca sobre el panel abierto, respetan
  visibilidad de pestaña. CTA manda el prompt directo al agente.
- El launcher (mascota) saluda con la mano mientras hay popup en pantalla.

## 4. Testing
- tsc limpio.
- E2E HTTP: POST /api/assistant con email en el texto → respuesta
  determinista OK; postgres real: lead con email capturado, stage=discover,
  score=20 persistidos (SELECT verificado en el contenedor).

## 5. Pendiente (scheme005)
- AGENTE-2: tools web_search (env-gated) + generate_mockup (Seedream 4.5
  via OpenRouter) + request_contact con confirmación animada.
- AGENTE-3: timeline por lead en admin + galería de mockups en widget.
- Probar vía LLM con OPENROUTER_API_KEY real.

## 6. Persistencia
- claude_state.json actualizado.
