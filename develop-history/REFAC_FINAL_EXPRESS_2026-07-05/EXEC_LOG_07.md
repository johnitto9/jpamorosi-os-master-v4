# EXEC_LOG_07 — 2026-07-05

## Objetivo
Cerrar el siguiente tramo R6 backend sin reabrir arquitectura:
- outreach outbound real desde `/admin/prospects`;
- segundo toque `clicked-but-no-return` desde heartbeat;
- mantener tracking existente como fuente unica de links.

## Cambios
- `POST /api/admin/prospects` suma action `outreach`.
  - Requiere admin guard.
  - Requiere prospect existente, stage `contact`, y `email`.
  - Usa template `prospect_outreach`.
  - Envia con `sendEmail(... tracking: { prospectId, campaign:"prospect_outreach" })`.
  - Si Resend no esta configurado o falla el transporte, NO marca contactado.
  - Si envia OK, mueve a `contacted` y emite `prospect.outreach.sent`.
- `ProspectBoard` suma boton **Enviar outreach** dentro del drawer, no en la card.
  - Accion deliberada, con error visible si el envio falla.
  - La accion manual "Marcar contactado" queda como fallback.
- `heartbeat` suma secuencia `clicked-no-return`.
  - Busca leads con tracked link clickeado hace >2h y sin `visitor_sessions.last_seen`
    posterior al click + 10 min.
  - Idempotencia sin migracion: evento `lead.click_followup.sent`.
  - Limite propio: 2 por ciclo.
  - Reusa `lead_followup` con tracking `campaign:"clicked_no_return"`.
  - LLM personaliza si hay key; fallback deterministico si no.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` → 0 errores.
- `docker.exe compose --profile backend build amorosi-backend` → OK.
- `docker.exe compose --profile backend up -d amorosi-backend` → OK.
- `curl.exe -s http://127.0.0.1:3001/api/health` → `{"ok":true}`.
- Logs backend: Next ready, sin errores de arranque.

## No probado adrede
- No se disparo un email real a prospects vivos desde admin para evitar outreach externo
  accidental durante implementacion.

## Pendiente despues de exec07
- R2: card de sesion + email de permanencia loginless/resume link.
- R1: captura implicita nombre/empresa en ProjectSetup step 0.
- R4: tool `show_card`.
- Worker scout: persistir `lastScoutDate` en DB si se quiere evitar reset por restart.
- R2 envs/CDN siguen vacios; uploads locales.
