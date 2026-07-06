# Resend email system

## Estructura
- `lib/email/templates.ts` — templates puros (data → subject/html/text):
  `magic_link`, `lead_received`, `contact_confirmation`, `session_started`,
  `project_followup`, `admin_alert`.
- `lib/email/service.ts` — transporte único: `sendEmail({template,to,data})`
  y `notifyAdmin(template,data)` (→ `RESEND_ADMIN_TO_EMAIL`).
- `email_logs` (tabla) — un row por intento (ok/skipped/failed, provider id,
  error truncado). `GET /api/admin/email-logs`.
- Eventos: `email.sent` / `email.failed`.

## Variables
```
RESEND_API_KEY=            # sin ella: fallback controlado (log + email_logs)
RESEND_FROM_EMAIL=         # remitente de dominio verificado en Resend
RESEND_ADMIN_TO_EMAIL=jpamorosi14@gmail.com
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

## Degradación
Sin `RESEND_API_KEY` **nada se rompe**: el servicio loguea
`skipped_no_api_key` en `email_logs` y devuelve `{ok:false, skipped:true}`.
El magic link en dev devuelve `devLink` (solo `NODE_ENV!=production`) y lo
imprime en la consola del server.

## Usos actuales
- Magic link admin (`POST /api/admin/magic-link`).
- Notificación de lead al admin: automática cuando el agente captura un
  email/teléfono nuevo, y en `POST /api/leads` público.
- Digests internos: `scout_digest`, `daily_pulse`.
- Outbound customer-facing: `lead_followup` y `prospect_outreach`.
- `contact_confirmation`, `session_started`, `project_followup`,
  `admin_alert`: disponibles para flujos opt-in.

## Outbound gate

`OUTBOUND_LEAD_EMAILS_ENABLED=false` bloquea solo emails hacia leads/prospects:

- `lead_followup`
- `prospect_outreach`

No bloquea:

- magic link admin;
- `lead_received`;
- `scout_digest`;
- `daily_pulse`;
- alertas internas.

Para activar outreach real en prod:

1. Confirmar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` de dominio verificado.
2. Mantener `OUTBOUND_LEAD_EMAILS_ENABLED=false` durante staging y primer scout.
3. Revisar `/admin/prospects` y export CSV.
4. Activar `OUTBOUND_LEAD_EMAILS_ENABLED=true`.
5. Enviar 1 prospect manual desde admin.
6. Revisar `email_logs`, eventos `email.sent/email.failed` y Resend dashboard.
7. Si algo falla, volver a `false` y reiniciar backend/worker.
