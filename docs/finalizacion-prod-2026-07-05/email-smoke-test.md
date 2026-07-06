# Email Smoke Test

Objetivo: probar el renderer y transporte real de emails sin activar la
compuerta de outreach hacia leads.

## Qué prueba

- Ruta interna protegida: `POST /api/internal/email-smoke`.
- Template real: `lead_received`.
- Servicio real: `sendEmail()` + Resend + `email_logs` + `email.sent`.
- Payload realista de una empresa interesada.
- Validación rápida de que el render no sale como JSON crudo:
  `htmlHasJsonArtifacts` debe ser `false`.

Este smoke no usa `prospect_outreach` ni `lead_followup`, por lo tanto no
requiere `OUTBOUND_LEAD_EMAILS_ENABLED=true`.

## Ejecución local con Docker

```bash
cd frontend-app
TOKEN="$(docker.exe compose exec -T amorosi-backend printenv INTERNAL_API_TOKEN | tr -d '\r')"
INTERNAL_API_TOKEN="$TOKEN" pnpm smoke:email -- --url http://localhost:3001 --to jpamorosi14@gmail.com --lead-email jpamorosi14@gmail.com
```

Resultado esperado:

```json
{
  "status": 200,
  "ok": true,
  "sent": true,
  "template": "lead_received",
  "to": "jpamorosi14@gmail.com",
  "leadEmail": "jpamorosi14@gmail.com",
  "htmlHasJsonArtifacts": false
}
```

Si `RESEND_API_KEY` o `RESEND_FROM_EMAIL` faltan, el servicio responde con
`skipped: true` y no rompe el flujo. Si el token interno falta o es inválido,
la ruta responde `401`/`503`.

## Producción

Para probar en VPS/Dokploy, usar la URL interna/segura del backend y pasar el
token real por variable de entorno. No pegar el token en la terminal compartida
ni en logs.

La compuerta de envío a leads sigue siendo:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Cambiarla a `true` sólo cuando se decida habilitar emails salientes a leads o
prospects reales.
