# Change Log: 2026-07-02 — Finiquitación: carrusel, media rooms, agente++, worker k8s-lite

## 1. Front
- Hall carousel: overlap al avanzar = stacking por orden DOM (los slides
  posteriores pintaban SOBRE el activo). Fix: zIndex por distancia al activo
  (10 - |offset|) en el wrapper del slide → la disposición del turno 1 se
  mantiene en todo el anillo infinito.
- Mobile: coverflow (rotateY ±26°) desactivado bajo 640px vía matchMedia —
  las vecinas rotadas arrastraban la fila y la corrían a la derecha. En
  mobile: solo scale(0.9) + opacity.

## 2. Media en project rooms (bug arquitectónico)
- Causa: app/projects/[slug]/page.tsx leía getPublicProjectBySlug (SEED
  ESTÁTICO compilado) mientras la home usa la fuente auto (live en dev/
  Docker). Los uploads del admin aparecían en el Hall pero jamás en la sala.
- Fix para TODAS las salas: getPublicProjectBySlugAuto + getPublicProjectsAuto
  + force-dynamic (mismo contrato que la home; en Vercel auto=seed, seguro).
- VERIFICADO: /projects/buenpick renderiza los /api/media/uploads/* (fotos
  + mp4) cargados desde el admin.

## 3. Agente / chat
- Email público contact@jpamorosi.dev en content/profile.ts (única fuente →
  botón del chat, home, CV; el superadmin queda SOLO en env). Requiere
  Cloudflare Email Routing (contact@ → inbox) para recibir.
- Tool open_github (guardrail permite https://github.com/); verificado en
  vivo: el LLM la usó con copy on-brand.
- Acciones del chat: TODAS cierran el panel (evento al-assistant-close) y
  los hash-links del mismo path scrollean directo sin router hop (lag fuera).
- Imágenes: POST /api/assistant/upload (sesión al_sid — la crea si es la
  primera interacción, 10MB, 5/sesión, media/sessions/<sid>/shared-*),
  widget con botón 📎 + drag&drop sobre el panel + preview + thumbnail en el
  turno; attachments validados server-side (solo paths de la propia sesión)
  y anotados al texto para el LLM.
- Prompt: bloque PROJECT CO-CREATION (estimar stack mínimo → lead.notes,
  pitch marketinero + generate_mockup cuando la idea está clara → contacto)
  + manejo de imagen compartida + preferencia por botones.

## 4. Seguimiento + emails
- session_started → email real al admin en cada sesión nueva (verificado
  ok=true). Transición a stage=close → admin_alert "Lead listo para cerrar".
- writeMemory (kind lead-fact) por cada turno que aprende algo del lead.
- /admin/sessions (lista con lead intel que se va completando: nombre,
  empresa, stage·score, msgs, última página) + /admin/sessions/[id]
  (transcript completo + panel de lead).

## 5. Infra k8s-lite (compose)
- worker: node:20-alpine + scripts/worker.mjs (cero deps) — health probe
  cada 60s con logs greppeables y escalada, y dispara el scout diario.
- autoheal (willfarrell/autoheal): reinicia contenedores unhealthy con
  label autoheal=true (backend etiquetado). Healthchecks ya existentes.
- Aclaración anti-sobreingeniería: pgvector/pgvector:pg16 ES un postgres 16
  normal + extensión; NO hace falta segunda DB. Redis sigue afuera a
  propósito.
- /api/cron/daily-scout (Bearer interno): 2 búsquedas rotativas por día de
  semana (7 ángulos de mercado) → LLM rankea matches vs perfil → digest en
  español al admin. Sin LangChain a propósito (orchestrator propio, logging
  propio, cero deps). Hoy responde skipped:no_web_search_key hasta cargar
  WEB_SEARCH_API_KEY (serper.dev).
- INTERNAL_API_TOKEN generado e instalado en .env.local + .env.docker.local.

## 6. Testing
- tests/playbooks.spec.ts (12 casos: scoring, stage machine, prompt blocks).
  Suite total 42/42 verde. tsc limpio.
- E2E: buenpick room con media ✔, cron 401 sin token / skipped con token ✔,
  open_github vía LLM ✔, session_started email real ✔, mailto público
  contact@jpamorosi.dev ✔.

## 7. Pendiente del usuario
- Cloudflare Email Routing: contact@jpamorosi.dev → bandeja real.
- WEB_SEARCH_API_KEY (serper.dev) para activar web_search + scout diario.
- docker compose --profile backend up --build -d (backend nuevo + worker +
  autoheal).

## 8. UPDATE — stack prod-like completo en Docker (verificado)
- 4 contenedores: amorosi-backend (rebuild con código nuevo + keys en
  .env.docker.local: OpenRouter, Resend, Serper, INTERNAL_API_TOKEN),
  postgres pgvector, worker (probes ok cada 60s en logs), autoheal.
- Flags backend 3001: llm/email/webSearch/pgvector/internalApi TODOS true.
- Serper validado con 1 búsqueda directa (quota mínima). Scout diario listo
  (worker lo dispara a las 9:00).
