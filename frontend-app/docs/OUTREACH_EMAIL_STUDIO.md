# Outreach Studio (`/admin/email`)

Human-in-the-loop compositor de outreach para el backoffice de Amorosi Labs.
Un email cuidadosamente revisado por vez: elegir intención → completar bloques →
previsualizar el HTML real → confirmar destinatario → enviar por Resend.

> MailBBN (`../../mailbbnslim`) se usó **sólo como referencia conceptual**
> (pantalla de compose, selección de plantilla, confirmación previa, bloqueo de
> `noreply`, historial, persistencia del provider ID). No se copió su
> arquitectura: nada de SQLite, FastAPI, Jinja, Gmail OAuth, inbox sync ni
> templates alojados en Resend.

## Recon — lo que ya existía y se reutilizó

| Pieza | Archivo | Cómo se usa |
|---|---|---|
| Transport central | `lib/email/service.ts` `sendEmail()` | se refactorizó para exponer `sendRenderedEmail()` como núcleo único |
| Templates + shell visual | `lib/email/templates.ts` | el shell/botón/rows/bullets se extrajeron a `lib/email/shell.ts` |
| Tracking de links | `lib/email/tracking.ts` | preservado vía `withTrackedLinks` dentro del transport |
| Outbound gate | `lib/env.ts` `outboundLeadEmailsEnabled()` + `OUTBOUND_LEAD_EMAILS_ENABLED` | el composer es outbound-gated |
| `email_logs` | `service.ts` `logEmail`/`listEmailLogs`, `GET /api/admin/email-logs` | historial reciente en la pantalla |
| Admin guard | `lib/auth/guard.ts` `guardAdmin()` | protege ambos endpoints |
| Prospects | `lib/agent/prospects.ts` (`getProspect`, `markProspectOutreachSent`, `detectProspectLang`) | precarga + marcar contactado |
| Media | `lib/media/store.ts` `getSiteSettings()` (`profileImage`, `interludes.proof1`) | avatar + visual secundaria |

Assets de email: foto de perfil = `settings.profileImage` (fallback
`https://jpamorosi.dev/imgs/img-profile-jpa.jpg`); visual secundaria (Orbe) =
`settings.interludes.proof1` (fallback `https://jpamorosi.dev/og.jpg`). Idénticos
a los que usa el outreach autónomo (`buildProspectOutreachData`).

## Decisión arquitectónica: una sola fuente de verdad

```
datos estructurados (form)
   → schema Zod (registry)
   → renderer puro (registry.render → renderComposite)
   → { subject, html, text }
        ├── preview  (POST /api/admin/email/preview)  — SIN efectos
        └── envío    (POST /api/admin/email/send)     — mismo renderer
```

`lib/email/composer/compose.ts::composeEmail()` es la **única** función que
produce el email. Preview y send la invocan con los mismos inputs (incluida la
media, resuelta igual por `resolveComposerMedia()` en ambos), así que lo que se
ve es byte-for-byte lo que sale. La paridad está cubierta por test.

## Resend = transporte, no sistema de templates

`sendRenderedEmail({ logTemplate, to, rendered, outboundGated, tracking })` es el
núcleo único que habla con Resend. `sendEmail()` (autónomo) ahora renderiza y
delega en él — **un solo lugar** que llama a `resend.emails.send({from,to,subject,
html,text})`, un solo lugar que escribe `email_logs`, aplica el gate y el
tracking. No se usan templates hospedados en Resend ni IDs de template.

## Registry modular

`lib/email/composer/registry.ts` declara cada categoría: `key, label,
description, fields[], schema (zod), defaults, render`. La UI construye el
formulario desde `fields`; agregar una 4.ª categoría = registrar metadata +
schema + render, sin tocar la pantalla.

Categorías iniciales (todas outbound-gated, bilingüe es/en):

- **`founder_direct`** — Founder / señal concreta.
- **`opportunity_fit`** — Oportunidad / encaje profesional.
- **`warm_followup`** — Follow-up / continuidad (visual off por defecto).

Todas pasan por `renderComposite()` (`lib/email/shell.ts`) → mismo shell, avatar
bubble, rows, bullets, visual y CTA que `prospect_outreach`. Son variaciones de
una identidad, no tres emails distintos.

## Endpoints

- `POST /api/admin/email/preview` → `{ ok, subject, html, text, warnings }`.
  Admin-guarded. Puro: no envía, no toca prospects, no escribe logs, no llama a
  Resend.
- `POST /api/admin/email/send` → valida sesión, template, email, rechaza
  `noreply`, exige `confirmRecipient === to`, chequea el gate, renderiza con el
  **mismo** `composeEmail`, envía por `sendRenderedEmail`, registra, devuelve
  `providerId`, y marca el prospect contactado **sólo tras éxito** (y sólo si
  estaba en stage `contact`). `GET` devuelve el estado de guardrails.

## UI

`app/admin/email/page.tsx` (server: guard + estado + precarga desde prospect) +
`components/admin/OutreachStudio.tsx` (client). Desktop 45/55 editor·preview;
mobile con tabs Editar/Previsualizar. Preview en `<iframe sandbox="" srcDoc>`
(sin scripts, sin navegación), debounce ~320 ms, conserva el último preview
válido. Toggle HTML/Texto. Asunto editable que nunca se auto-reemplaza (vacío =
asunto generado). Autosave en `localStorage` por categoría. Historial (últimos
~15 de `email_logs`) colapsable. Badges: Resend / Outbound / DB.

Se optó por **banners inline** en vez del sistema de toast (`components/ui`
existe pero el `Toaster` no está montado en el layout admin — evitar acoplar).

## Integración con prospects

Drawer de `/admin/prospects` → botón **“Abrir en Outreach Studio ↗”** →
`/admin/email?prospectId=<id>&template=founder_direct`. La página precarga los
campos distribuyendo los datos del prospect con criterio (email, nombre,
empresa, título, snippet/enrichment/fitReason/nextAction, url, idioma detectado).
El botón de “Enviar outreach” rápido del board se conserva; la lógica de envío
NO se duplicó (el board sigue usando `POST /api/admin/prospects` action
`outreach`, el studio usa el nuevo camino — ambos terminan en el mismo transport
central).

## Seguridad / guardrails

Reutiliza `OUTBOUND_LEAD_EMAILS_ENABLED`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`RESEND_ADMIN_TO_EMAIL`. Con outbound apagado: preview y editor funcionan, el
envío externo se bloquea con mensaje claro, la variable no se toca. Protección
contra doble click / reenvío concurrente, email inválido, `noreply`, mismatch de
confirmación, campos largos (maxLength en schema), template desconocido, payload
inesperado, HTML injection (todo user input pasa por `esc()`), acceso sin sesión.
Los tests/smoke **no** envían a un prospect externo.

## Tests

`tests/outreach_studio.spec.ts` (15): renderers producen subject/html/text,
escaping/injection, template desconocido, datos inválidos, warning de cuerpo
vacío, subject override, **paridad preview/send**, guard de `noreply`,
clasificación outbound, catálogo. `tests/email_gate.spec.ts` sigue verde (el
refactor del transport no cambió el comportamiento del gate).

## Probar localmente

```bash
cd frontend-app
pnpm test                 # 131 pass
pnpm exec tsc --noEmit    # clean
pnpm build                # ok
```

En el navegador (con admin configurado + sesión): `/admin/email` → preview de
las tres categorías → abrir desde un prospect (`?prospectId=…`) → preview con
outbound apagado (envío bloqueado) → validación de destinatario → vista mobile →
historial. No hacer un envío real a un prospect; un envío de comprobación sólo a
`RESEND_ADMIN_TO_EMAIL`.
