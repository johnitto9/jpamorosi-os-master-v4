# Email Smoke Test

Objetivo: probar el renderer y transporte real de emails sin activar la
compuerta general de outreach hacia leads.

## Qué prueba

- Ruta interna protegida: `POST /api/internal/email-smoke`.
- Modo default `scout_outreach`: template real `prospect_outreach`, con datos
  enriquecidos parecidos a los que deja la maquinaria de scouting.
- Modo `full_lead_cycle`: `lead_received` para admin y `contact_confirmation`
  para el lead simulado.
- Servicio real: `sendEmail()` + Resend + `email_logs` + `email.sent`.
- Payload realista de una empresa interesada.
- Validación rápida de que el render no sale como JSON crudo:
  `htmlHasJsonArtifacts` debe ser `false`.

El modo default usa `prospect_outreach`, pero sólo desde la ruta interna
protegida, en `APP_ENV!=production`, con campaign
`email_smoke_prospect_outreach`. No cambia `OUTBOUND_LEAD_EMAILS_ENABLED` ni
habilita envíos autónomos.

## Ejecución local con Docker

```bash
cd frontend-app
TOKEN="$(docker.exe compose exec -T amorosi-backend printenv INTERNAL_API_TOKEN | tr -d '\r')"
INTERNAL_API_TOKEN="$TOKEN" pnpm smoke:email -- --url http://localhost:3001 --to jpamorosi14@gmail.com --lead-email amorosijp@gmail.com
```

Resultado esperado:

```json
{
  "status": 200,
  "ok": true,
  "sent": true,
  "mode": "scout_outreach",
  "adminTo": "jpamorosi14@gmail.com",
  "leadEmail": "amorosijp@gmail.com",
  "htmlHasJsonArtifacts": false,
  "deliveries": [
    { "template": "prospect_outreach", "to": "amorosijp@gmail.com", "ok": true }
  ]
}
```

Para probar el flujo de contacto entrante:

```bash
INTERNAL_API_TOKEN="$TOKEN" pnpm smoke:email -- --url http://localhost:3001 --mode full_lead_cycle
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
