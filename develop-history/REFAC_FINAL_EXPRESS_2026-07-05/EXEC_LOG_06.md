# EXEC LOG 06 — 2026-07-05 (R6 tracking conectado a emails reales)

## Hall status
Previo a R6 se cerro el Hall:
- Embla se conserva como motor `loop:true` / drag / selected snap.
- La capa visible del coverflow queda separada en slots circulares fijos.
- Framer Motion anima cada proyecto por `key={project.id}` entre slots.
- El usuario confirmo: "genial quedo perfecto".

## R6 implementado
Base previa ya existia: tabla `tracked_links`, `createTrackedLink`,
`resolveAndRecordClick`, `GET /api/track/[token]`, endpoint admin mint.

Este turno completo la conexion real:
- `lib/email/service.ts`
  - `sendEmail` acepta `tracking?: { leadId?, prospectId?, campaign?, enabled? }`.
  - Reescribe `href="http(s)://..."` en HTML y URLs equivalentes en texto usando
    `createTrackedLink`.
  - Degrada seguro: si DB/tracking falla, deja el link crudo y envia igual.
- `app/api/cron/heartbeat/route.ts`
  - `lead_followup` usa `tracking: { leadId, campaign: "lead_followup" }`.
- `app/api/session/recover-request/route.ts`
  - recovery query trae `lead.id`; `session_recovery` usa tracking por lead.
- `lib/email/tracking.ts`
  - `resolveAndRecordClick` ahora retorna `sessionId` via join con `leads`.
  - evento `lead.link.clicked` incluye `sessionId`.
- `app/api/track/[token]/route.ts`
  - cuando el token resuelve a un lead con `session_id`, setea cookie
    `al_sid=<sessionId>` httpOnly/lax/1y antes del 302.
- `app/admin/sessions/[id]/page.tsx`
  - timeline reconoce `lead.link.created` y `lead.link.clicked`.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` -> 0 errores.
- Rebuild backend + recreate OK.
- Health host: `curl.exe http://127.0.0.1:3001/api/health` -> `{"ok":true}`.
- Smoke DB/API:
  1. Insert temporal `visitor_sessions` + `leads` + `tracked_links`.
  2. GET `/api/track/<token>` devolvio:
     - `302`
     - `location: http://127.0.0.1:3001/cv`
     - `set-cookie: al_sid=<session uuid>; HttpOnly; SameSite=lax`
  3. Query DB: `tracked_links.clicks=1`, `clicked_at IS NOT NULL`.
  4. Evento: `lead.link.clicked` con `payload.sessionId`.
  5. Limpieza de rows temporales realizada.

## Pendiente R6 avanzado
- Secuencia "clicked but no return" en heartbeat.
- Outreach outbound real desde prospects/contact stage usando tracking por
  `prospectId` cuando exista la plantilla/flujo de envio.

