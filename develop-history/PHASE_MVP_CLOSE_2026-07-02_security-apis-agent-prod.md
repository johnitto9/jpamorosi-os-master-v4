# Change Log: 2026-07-02 — Cierre MVP resiliente (FASES 0-7)

## 1. Objetivo
Cerrar el MVP producción-ready: seguridad de secrets, pgvector real, admin
magic link + Resend, APIs internas/eventos/logs, agente con tools env-gated,
presencia contextual, no-select quirúrgico, docker robusto y docs.

## 2. FASE 0 — Seguridad (PRIORIDAD ABSOLUTA)
- **No existía .gitignore raíz** → creado: secrets/, .secrets/, *.secret(s),
  credentials*, .env* (menos *.example), proyecto_buen_pick/, BBNfinprod/,
  delibot/. Verificado con git check-ignore: nada sensible tracked ni
  trackeable. secrets/ contiene credenciales Cloudflare+Resend (solo local).

## 3. FASE 1 — pgvector (auditoría honesta + camino mínimo)
- Antes: postgres:16-alpine sin extensión, cero uso de vectores, memoria =
  historial por sesión + keyword. Ahora: imagen pgvector/pgvector:pg16,
  CREATE EXTENSION IF NOT EXISTS vector guardado en bootstrap (try/catch,
  no rompe pg plano), volumen dev recreado (musl→glibc collations).
  VERIFICADO: extname=vector en pg_extension, /api/status pgvector:true.
- memory_items (keyword ILIKE) + seam documentado para embeddings
  (docs/pgvector-memory.md). Sin vector DB externa a propósito.

## 4. FASE 2 — Admin magic link + Resend
- lib/email/templates.ts (6 templates) + lib/email/service.ts (sendEmail/
  notifyAdmin, email_logs, eventos email.sent/failed, fallback controlado
  skipped_no_api_key sin romper).
- lib/auth/magic-link.ts: token HMAC stateless (mismo secret de sesión,
  15 min) + single-use vía magic_link_tokens cuando hay DB.
- POST /api/admin/magic-link (anti-enumeration: siempre ok; devLink solo
  fuera de production) + GET /api/admin/verify (cookie de sesión + redirect;
  errores → /admin/login?error=). LoginForm con modo magic (default) +
  password (fallback). ADMIN_EMAIL=jpamorosi14@gmail.com.
  VERIFICADO E2E: verify 1° uso → /admin; reuso → error=used.
- storageService (lib/media/storage.ts): R2 vía @aws-sdk/client-s3 (import
  dinámico) con fallback local y logs sin secretos; /api/admin/upload lo usa.

## 5. FASE 3 — Eventos + APIs
- lib/events.ts (recordEvent/listEvents, 17 tipos), tablas events/ai_logs/
  email_logs/magic_link_tokens/memory_items.
- Salud: GET /api/health (db probe), GET /api/status (flags booleanos).
- Públicas: POST /api/leads, GET /api/projects[/:slug], POST /api/sessions,
  POST /api/sessions/:id/messages, POST /api/ai/chat.
- Admin JSON: /api/admin/{leads,sessions,events,ai-logs,email-logs}.
- Internal (Bearer INTERNAL_API_TOKEN|SERVICE_API_TOKEN; sin token → 503):
  /api/internal/{events,leads,sessions,agent/run,projects/:slug/context,
  memory/write,memory/search}.

## 6. FASE 4 — Agente
- lib/agent/tools-server.ts: web_search (serper, WEB_SEARCH_API_KEY) con UNA
  ronda de follow-up; generate_mockup (Seedream 4.5 bytedance-seed/
  seedream-4.5 vía OpenRouter, cap 3/sesión, guarda en media/sessions/<sid>).
  Tools anunciadas al modelo SOLO si están habilitadas.
- AssistantCard tipo "image" (guardrail: solo /api/media/) + render en widget.
- lib/agent/ai-log.ts: ai_logs por llamada LLM (modelo/ok/latencia/error).
- Orchestrator: eventos session.started/message/lead.*/ai.response.generated;
  notifyAdmin(lead_received) cuando llega email/phone NUEVO.
  VERIFICADO E2E: cadena de eventos completa + email_logs skipped.

## 7. FASES 5-6 — Presencia + polish
- Nudges contextuales por pathname (projects/cv/home-hall) con textos de
  venta; cooldown 40s/150s, máx 2/sesión, sessionStorage.
- .ui-interactive (user-select none + tap-highlight transparent, criterio
  BuenPick SIN global): tracks Embla (Hall + CardCarousel), ChapterNav,
  launcher del widget. Texto/email/CV siguen copiables.

## 8. FASE 7 — Docker + docs
- compose: healthcheck del backend (/api/health), imagen pgvector comentada
  con nota de migración. (pg_isready/restart ya existían.)
- Docs nuevos: secrets-and-deploy, deploy-vps, internal-api,
  agent-architecture, resend-email-system, storage-r2, pgvector-memory.
- README frontend-app actualizado; .env.example + .env.docker.local.example
  con todas las vars nuevas (sin valores).

## 9. Testing
- tsc limpio; vitest 33/33 verdes.
- E2E HTTP: health/status/leads/projects/sessions/magic-link/verify/single-use
  todos verificados contra dev server + postgres pgvector real.

## 10. Pendientes / riesgos
- OPENROUTER_API_KEY real sin probar (vía LLM + mockups Seedream).
- R2: credenciales listas en secrets/, falta pegarlas al env y probar subida.
- Backend Docker requiere rebuild para tomar el código nuevo.
- Magic link sin DB: single-use no exigible (solo expiry 15 min) — documentado.
- Embeddings: seam listo, sin proveedor elegido.
