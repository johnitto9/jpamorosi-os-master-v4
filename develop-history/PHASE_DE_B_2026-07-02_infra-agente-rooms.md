# Change Log: 2026-07-02 — FASES D + E + B: Postgres, Agente GLM 5.2, Rooms 2.0

## 1. Objetivo
Con autorización del usuario ("arranca de la forma más arquitectónica, metéle
lo más posible"): fundaciones de infra (D), agente calificador de leads (E) y
primera capa de Project Rooms 2.0 (B).

## 2. Cambios aplicados

### FASE D — Infra mínima real
- `docker-compose.yml`: servicio `postgres` (16-alpine, healthcheck, volumen
  `amorosi_pg_data`, host port 5433), `amorosi-backend` con `DATABASE_URL` y
  `depends_on` healthy. Redis/worker deliberadamente NO agregados (comentado
  en el compose por qué y cómo agregarlos).
- `lib/db/pool.ts`: pool pg lazy, `tryQuery` con degradación (DB opcional).
- `lib/db/bootstrap.ts`: DDL idempotente — `projects`, `visitor_sessions`,
  `agent_messages`, `leads` (unique parcial por sesión).
- `lib/projects/postgres-project-repository.ts`: driver `postgres` real del
  ProjectRepository (jsonb doc + columnas espejo, seed automático desde
  content/projects.ts en tabla vacía). Factory actualizado: con
  `PROJECT_STORAGE_DRIVER=postgres` + `DATABASE_URL` ya funciona.
- Dependencias: `pg` + `@types/pg`.
- `.env.docker.local.example`: DATABASE_URL, OPENROUTER_*, CDN Cloudflare.

### FASE E — Agente "Lab Guide" (patrones delibot + GLM 5.2)
- `lib/agent/llm.ts`: cliente OpenRouter (fetch), `z-ai/glm-5.2` default,
  timeout 25s, null ante cualquier fallo.
- `lib/agent/memory.ts`: memoria conversacional por sesión (Postgres),
  memory-lite sin DB (pacto no-silence del conversation_service).
- `lib/agent/leads.ts`: extracción determinista (regex email/tel) + patch
  estructurado del LLM (zod), merge-upsert que nunca pisa con vacío,
  `listLeads` para admin.
- `lib/agent/orchestrator.ts`: Mente Única — guard → memoria → LLM (JSON
  estricto validado, tools solo del registry whitelisted) → fallback
  determinista → persistencia. Salida única E4-only.
- `app/api/assistant/route.ts`: cookie anónima `al_sid` (httpOnly, 180 días)
  → clave de memoria/lead. Contrato de respuesta intacto.
- `components/assistant/AssistantWidget.tsx`: rediseño — panel aero grande
  (desktop 460×660, mobile sheet full-height con backdrop), nudge proactivo
  a los 5s (una vez, localStorage), transcript persistido en sessionStorage,
  sugerencias orientadas a calificación.
- `app/admin/leads/page.tsx` + link "Leads ↗" en el backoffice: tablero de
  calificación (contacto/empresa/necesidad/presupuesto/mensajes).
- `docs/AGENT_ARCHITECTURE.md`: mapa completo.

### FASE B — Project Rooms 2.0 (primera capa)
- `components/projects/ProjectMediaShowcase.tsx`: video loop del proyecto +
  galería de screenshots (resolver Cloudflare-ready), oculto sin media.
- `components/projects/ProjectLinksBlock.tsx`: bloque "Try it where it lives"
  — website/demo/Play Store/App Store/GitHub con tinte de marca.
- `ProjectRoom.tsx`: ambos bloques integrados con SectionTransition.

## 3. Testing (evidencia real)
- `npx tsc --noEmit`: limpio. `pnpm build`: exitoso (23/23 páginas).
- Smoke SQL contra Postgres 16 real (docker): DDL idempotente, insert/select
  de projects, historial de memoria, merge de leads (dos upserts →
  name+email+company combinados), join del listado admin. PASS.
- E2E HTTP con `next dev` + DB: 2 turnos con cookie de sesión → ambos
  persistidos en `agent_messages`, email `jane@acme.com` capturado en `leads`
  por la vía determinista (sin OPENROUTER_API_KEY). Rows de prueba limpiadas
  (TRUNCATE) — DB queda prístina.
- Vía LLM no probada en vivo (sin API key) — 100% guardada por fallback.

## 4. Implicancias
- Vercel sigue estático y sin DB (assistant memory-lite allí); el stack real
  vive en Docker (`--profile backend`): web + backend + postgres.
- Primer insert de lead ahora guarda NULL (no '') — corregido tras el E2E.
- Para activar el cerebro LLM: solo `OPENROUTER_API_KEY` en .env.docker.local.

## 5. Persistencia
claude_state.json actualizado; TODO_queue.md actualizado (pendientes C y F).
