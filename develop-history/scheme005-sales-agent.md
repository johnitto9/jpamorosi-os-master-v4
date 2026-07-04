# Scheme 005 — Agente de ventas "Lab Guide 2.0" (PROPUESTA, pendiente de autorización)

## Objetivo
Evolucionar el asistente actual (orchestrator Mente Única + fallback
no-silence + leads en postgres) a un agente de ventas completo con la
impronta de Juan, sin sobreingeniería: detecta qué necesita el visitante,
le vende con evidencia (proyectos reales), genera maquetas visuales, y
cierra pidiendo contacto — todo sin login, con cookies + sesión.

## Principios (heredados de delibot)
- No-silence: SIEMPRE responde (fallback determinista si LLM cae).
- Salida única por el orchestrator (E4-only del lado web).
- Tools whitelisted con extracción robusta (malformed input no crashea).
- Memoria por sesión (al_sid) con degradación memory-lite sin DB.
- Playbooks/templates versionados, no prompt gigante.

## Fases propuestas

### AGENTE-1 — Cerebro de ventas
- Playbooks JSON (discover → qualify → propose → close) + templates de
  system prompt por etapa con la impronta de Juan (tono directo, evidencia,
  "architecture first"). Estado de venta persistido en visitor_sessions.
- Lead scoring liviano (empresa/startup/idea, presupuesto, urgencia) que el
  orchestrator actualiza tool-first, no por regex del texto libre.
- pgvector para memoria semántica (extensión en compose + embeddings
  opcionales vía OpenRouter; sin key → degrada a keyword match). Indexa
  proyectos + resúmenes de conversación para retrieval del pitch correcto.

### AGENTE-2 — Tools nuevas
- `web_search`: env-gated (SEARCH_API_KEY / proveedor simple); sin key la
  tool no se ofrece al modelo. Para investigar la empresa del lead.
- `generate_mockup`: Seedream 4.5 (bytedance-seed/seedream-4.5) vía
  OpenRouter images API. Guarda el PNG bajo mediaDir()/sessions/<al_sid>/ y
  lo asocia al lead (jsonb meta). Límite por sesión (ej. 3) anti-abuso.
- `request_contact`: pide email/nombre/tel de forma elegante en el momento
  correcto del playbook; al confirmar → lead calificado + notificación
  admin + mensaje de éxito animado en el widget.

### AGENTE-3 — Gran engranaje (admin) + UX
- /admin/leads 2.0: timeline por lead (mensajes, mockups generados, score,
  etapa), insights agregados simples (sin BI).
- Widget: notificaciones/animaciones (toast de éxito, typing, badge de
  mockup listo), galería de mockups de la sesión.

## Riesgos y mitigaciones
- Costo LLM/imágenes → caps por sesión + flags por env.
- pgvector agrega migración → script idempotente en el seed, opt-in.
- Web search sin key → tool oculta, cero impacto.

## Definition of Done
- Conversación multi-turn con etapa de venta visible en admin.
- Mockup generado, persistido y visible en widget + lead.
- Flujo "querés que te contacte" → éxito confirmado + lead calificado.
- LLM caído → fallback responde igual (no-silence).
