# PHASE: Admin dragnet drawer + promote-to-lead — 2026-07-03

## 1. Objetivo

Cerrar el loop entre los dos funnels de admin (`/admin/pipeline` inbound y
`/admin/prospects` outbound) y matar la confusión visual de que parecían
duplicados. Decidido con Juan antes de tocar nada: NO fusionar; el parecido
era cosmético. Lo que sí sirve, copiar.

## 2. Revisión previa

- `/admin/pipeline` (kanban inbound, leads con sesión, click → sesión)
- `/admin/prospects` (kanban outbound / dragnet, scout + drops manuales)
- Cards del dragnet mostraban `line-clamp-3` de enrichment — el resto estaba
  enterrado. Sin detalle expandible, sin salida al funnel inbound.

## 3. Cambios aplicados (con paths)

### 3.1 Endpoint — promover prospect a lead

`frontend-app/app/api/admin/leads/route.ts`
- Agregado `POST` que valida con `leadPatchSchema` (zod strict, ya en
  `lib/agent/leads.ts:15`) y llama `insertLead(parsed.data, source)`.
- `source` viaja en header `x-lead-source` (default `admin_manual`,
  `prospect:<id>` cuando viene del drawer) — el body schema queda limpio.
- `insertLead` ya strippea strings vacíos antes de escribir (lib/agent/
  leads.ts:88) → no se pisan campos existentes.
- Emite `recordEvent("lead.created", …)` para trazabilidad.
- `guardAdmin()` igual que el resto de la backoffice.

### 3.2 Drawer de detalle

`frontend-app/components/admin/ProspectBoard.tsx`
- Estado nuevo `selected: Prospect | null`.
- `Card` ahora es clickable + keyboard accessible (Enter/Space) y abre el
  drawer; los botones internos (mailto, contactar, descartar) usan
  `stopPropagation` para no triggerear la apertura.
- Nuevo `ProspectDrawer` con backdrop + panel lateral (framer-motion slide):
  header (empresa + score ring + botón cerrar), DetailRows para URL,
  contacto, snippet, enrichment completo (sin clamp), fitReason, nextAction.
  Footer con Descartar / Marcar contactado / **Promover a lead →**.
- Escape cierra el drawer; click en backdrop también.
- Optimistic update en `onStage` para que la kanban se sienta inmediata; el
  refresh server-side reconcilia.
- `onPromoted` marca el prospecto como `contacted` localmente + toast en
  `lastReport`.

### 3.3 Botón "Promover a lead"

En el drawer. POST a `/api/admin/leads` con mapeo:
- `name = contactName`
- `email`, `company`, `need = snippet.slice(0,400)`
- `notes = "Origen: prospect #<id> (<source>) — <url|título>"`

Habilitado solo si hay email O (company + (contactName | title)).
Deshabilitado si el prospecto ya está contactado/discarded.

`x-lead-source: prospect:<id>` para que el admin session lo pueda filtrar.

### 3.4 Headers renombrados (rutas intactas)

- `frontend-app/app/admin/pipeline/page.tsx`
  `Pipeline — lead funnel` → `Pipeline — inbound`, subtitle agrega tag
  `<span class="text-white/70">inbound</span>`.
- `frontend-app/app/admin/prospects/page.tsx`
  `Prospects — the dragnet` → `Prospects — outbound (dragnet)`, subtitle
  explica outbound + menciona el drawer + promote.

Las rutas `/admin/pipeline` y `/admin/prospects` NO cambian — los links
existentes (incluido el botón "Inbound pipeline" dentro de prospects) siguen
andando.

## 4. Implicancias técnicas

- **Cero migración DB**: `insertLead` ya existía con `session_id = NULL`,
  exactamente lo que un prospecto sin sesión necesita. El prospecto promovido
  aparece en `/admin/pipeline` desde el primer GET (es una fila `leads`
  normal, solo que sin chat asociado).
- **Cero tokens LLM**: ni el drawer ni el promote gastan LLM — todo es data
  ya capturada por el pipeline. El LLM solo entra en `qualifyProspect`
  (cuando un prospecto avanza de enrich → qualify), como antes.
- **A11y**: drawer con `role="dialog"`, `aria-modal`, `aria-label`;
  atajo Escape; card con `role="button"` + `tabIndex={0}` + keyboard handler.
- **No regresiones**: typecheck limpio, 50/50 tests verdes. No se tocaron
  guardrails ni el orchestrator ni el admin auth.

## 5. Testing

```powershell
cd frontend-app
& node_modules\.bin\tsc --noEmit   # TYPECHECK OK
& node_modules\.bin\pnpm test -- run
# Test Files  4 passed (4)
# Tests       50 passed (50)
```

Manual flow pendiente (no automatizado, requiere DB + login admin):
1. Login `/admin/login` → ir a `/admin/prospects`
2. Click en una card → drawer abre con todo el enrichment
3. Botón "Promover a lead" → toast "Promovido a lead #X", la card sale del
   board (queda en `contacted` que sí está visible)
4. Ir a `/admin/pipeline` → ver el nuevo lead con `session_id = NULL` y
   `source = prospect:N`
5. Escape y click en backdrop cierran el drawer

## 6. Referencias

- Decisión con Juan: thread anterior (admin/pipeline vs admin/prospects)
- `lib/agent/leads.ts:122` (`insertLead`), `:15` (`leadPatchSchema`)
- `lib/agent/prospects.ts` (modelo outbound, intacto)
- `lib/auth/guard.ts` (auth pattern)

## 7. Persistencia (claude_state.json)

`phase_done: ["P0-guardrail", "P0.5-admin-drawer-promote"]`
`flags.renderer: "react"` (sin cambios)
`flags.dragnet: { drawer: true, promote_to_lead: true }`