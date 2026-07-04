# HANDOFF de progreso — Assistant v5 (2026-07-03)

Continuación del plan `handoff-assistant-v5/`. Leé primero `README.md` y los
docs `01`–`05` de esta carpeta, y `claude.md` de la raíz (protocolo: **una fase
por vez**, log en `develop-history/`, nunca borrar — renombrar `._backup`).

App real: `frontend-app/` (Next.js 15 App Router, **pnpm**). Idioma con Juan:
español rioplatense, directo.

---

## ✅ HECHO — Fase 1 (P0): bug del guardrail

**Problema:** en project mode, "quiero un ecommerce con backoffice" disparaba un
refusal en loop. Causa raíz: el regex `ADMIN_SECRETS` en
`frontend-app/lib/assistant/guardrails.ts` rechazaba por keyword ("backoffice",
"admin", "token", "hash").

**Fix aplicado (intent-based, no keyword):**
- `frontend-app/lib/assistant/guardrails.ts`: nuevo `isExfilAttempt(text)` —
  rechaza SOLO si hay verbo de extracción (`give/show/reveal/dame/mostrame/
  pasame/filtrar/robar…`) + secreto real (`password/.env/api key/credential/
  session secret/private key`) **o** término admin/backoffice. `.env` va fuera
  del wrapper `\b(...)\b` (si no, no matchea por el punto). `OFFTOPIC_ADVICE`
  reescrito para exigir contexto de "advice" (un brief fintech/health pasa).
  `INJECTION` y `enforceResponse` intactos.
- `frontend-app/tests/assistant_guardrails.spec.ts` (NUEVO): 8 tests
  accept/reject.
- `frontend-app/docs/assistant/ASSISTANT_GUARDRAILS.md`: doc actualizada.
- Log: `develop-history/PHASE_GUARDRAIL_2026-07-03_p0-exfil-intent.md`.

**Verificado:** `npx pnpm test -- run` → **30/30 tests verdes**. Compilación y
type-check OK. (El `pnpm build` completo sólo falla en el paso `output:
'standalone'` de `next.config.js:59` por `EPERM: symlink` — limitación de
Windows sin Developer Mode/terminal admin; en Vercel/Docker no ocurre.)

---

## ⚠️ INCIDENTE resuelto — front sin estilos (Tailwind)

Al reinstalar deps (`npx pnpm install --config.confirm-modules-purge=false`,
porque `pnpm` no está en PATH y el `node_modules` estaba incompleto — faltaba
`vitest`), pnpm **purgó y recreó `node_modules` mientras el `next dev` de Juan
corría** → el server quedó con módulos a medias y dejó de compilar el CSS. Se
sumó un `.next` a medio armar del build fallido.

**Solución (ya aplicada):**
1. `Remove-Item -Recurse -Force .next` (cache regenerable).
2. Reiniciar dev: `npx pnpm dev` → OK, `STATUS 200` con estilos y efectos.

**node_modules quedó sano** (`tailwindcss@3.4.17`, `next@15.5.18` resuelven).
Lección: NO reinstalar deps con el dev server prendido; si hay que hacerlo,
frenar el server, instalar, `rm -rf .next`, y `pnpm dev` de nuevo.

**Cómo levantar el proyecto (Windows, sin pnpm en PATH):**
```powershell
cd frontend-app
npx --yes pnpm dev        # http://localhost:3000
# tests:
npx --yes pnpm test -- run tests/assistant_guardrails.spec.ts tests/assistant_intent.spec.ts tests/playbooks.spec.ts
```
(Ideal: instalar pnpm global con `npm i -g pnpm` o `corepack enable` para no
depender de `npx`.)

---

## ⏳ PENDIENTE — Fases 2 a 6

### Fase 2 — Wizard "easy guide"  (doc `02-WIZARD-easyguide.md`)
Archivo: `frontend-app/components/assistant/AssistantProjectOrbit.tsx`
(componente `ProjectSetup`, wizard actual de 3 steps: identity → **stack
quick-picks** → concept). Se renderiza desde
`frontend-app/components/assistant/AssistantWidget.tsx` (L713 `ProjectStrip`,
L771 `ProjectSetup`, L721 `BrandingBoard`). Crear proyecto = POST a
`frontend-app/app/api/assistant/projects/route.ts`.

Rediseño pedido:
- **Step 1**: nombre + descripción + **campo de indicaciones de branding/ADN**
  ("¿cómo te la imaginás?": tono, colores, referencias).
- **Step 2**: reemplazar los stack quick-picks (`QUICK_STACK`, L36) por
  **necesidades de negocio** multi-select (🚦 mucho tráfico, ✨ visuales
  fluidas, 🌍 edge global, 🔐 soberanía de datos, +pagos/multi-idioma/app).
  Debajo, **sección colapsable "¿Sos dev?"** con un textbox libre para stack
  específico (único espacio técnico).
- **Step 3**: assets opcionales (ver Fase 3).
- **Step 4**: concepto/visión (el actual step 2).

Restricción del backend (importante): el route sólo acepta
`projectPatchSchema` = `{name, kind, concept, stack, palette, logoUrl}` (strict,
`frontend-app/lib/agent/projects.ts:11`). **No hay campos para branding notes ni
needs.** Sin migración de DB, plegarlos dentro de `concept` como brief
etiquetado (ej. `\n[ADN/branding]: …\n[Necesidades]: tráfico, edge…\n[Stack
dev]: …`) para que lleguen al agente (lee `concept`) y al email admin. El
`stack` queda sólo para lo que ponga el dev. (Alternativa mejor pero más grande:
agregar columnas `branding_notes`/`needs` al schema — ver
`frontend-app/lib/db/bootstrap.ts` y `projects.ts`; decidir con Juan.)

- **Card**: en `ProjectStrip` (L61-92) y `BrandingBoard` (L410) mostrar
  logo subido → logo generado → **fallback emoji por kind** (`KIND_META`, L27),
  no la inicial. Hoy `ProjectStrip` ya usa el emoji del kind; falta soportar
  `logoUrl` cuando exista.
- **Convergencia omni/project/branding**: verificado que **omni SÍ puede crear**
  (el `+` de `ProjectStrip` llama `setSetupOpen(true)` en cualquier tab —
  `AssistantWidget.tsx:718`). Todo va al mismo modelo `session_projects`.

### Fase 3 — Branding progresivo logo→imagen→storyboard  (doc `03`)
`BrandingBoard` en `AssistantProjectOrbit.tsx:410`. Falta:
- Apartados/slots para **logo**, **imagen representativa**, **storyboard**, cada
  uno con "subir" + "generar" (opcional, no bloqueante).
- **Extracción de paleta** de cada asset (canvas client-side o server-side —
  elegir y documentar) → actualizar `palette` del proyecto (reemplaza el
  placeholder cian/violeta `["#00e5ff","#8b5cf6"]`).
- Assets NO sueltos en el chat: viven en el board. Servir imágenes desde
  `/api/media/` (restricción de `enforceResponse` en `guardrails.ts:94`, sólo
  permite cards de imagen bajo esa ruta).

### Fase 4 — Pipeline de imágenes con criterio  (doc `04`)
Hoy `generate_mockup` (orchestrator + `lib/agent/tools-server.ts`) hace **1
imagen genérica**. Debe ser pipeline coherente: 1) referencia plana de UX, 2)
mockups de dispositivo (celular + notebook) que reutilizan ese contenido,
3) pantallas por sección. **Tope duro 9.** Galería en el board (chat + admin),
nada suelto. Anclado al ADN acumulado (assets Fase 3 + conversación + needs).

### Fase 5 — Guided tour cero tokens  (doc `05`)
Hoy tocar el tour llama al LLM. Anclas en `AssistantWidget.tsx`: L34/L95
(strings), L142-144 (nudge Hall of Fame), **L552 `sendAndOpen("Give me the
guided tour")`** = el trigger que va al orchestrator. Hacerlo **preseteado**:
crear `frontend-app/lib/assistant/guided-tour.ts` (árbol de pasos con
`message`/`cards`/`actions`/`next[]`, shape `AssistantResponse`), interceptar el
request del tour ANTES del orchestrator (en el widget o el route handler). i18n
ES/EN (`lib/i18n/dictionaries.ts`). Escape limpio: si el usuario escribe algo
libre, salir al modo inteligente. Aceptación: recorrer el tour = **0** llamadas
al LLM (verificable en `logAiCall`).

### Fase 6 — Admin sessions con pestañas  (doc: falta `06-ADMIN-SESSIONS.md`, NO existe)
`frontend-app/app/admin/sessions/page.tsx` y `[id]/page.tsx`. Cada sesión debe
mostrar **pestañas**: chat(s) (puede haber >1 thread, ver `agent_messages.
thread`), **branding/ADN** (imágenes + paleta ordenadas), y **logs de
seguimiento** que se generan durante la interacción (`recordEvent` /
`lib/events.ts`, `lib/agent/ai-log.ts`). Reflejar el ADN/branding del proyecto
del lado admin; nada de imágenes sueltas.

---

## Estado de tests / archivos tocados en esta sesión
- Modificados: `frontend-app/lib/assistant/guardrails.ts`,
  `frontend-app/docs/assistant/ASSISTANT_GUARDRAILS.md`.
- Nuevos: `frontend-app/tests/assistant_guardrails.spec.ts`,
  `develop-history/PHASE_GUARDRAIL_2026-07-03_p0-exfil-intent.md`,
  este handoff.
- Fase 1 lista para commit. Fases 2-6 sin empezar.

## Guardarrieles (no negociables, del README)
- Cero tokens donde no hace falta (tour + wizard determinísticos).
- Todo asset opcional, siempre "subir o generar", nunca bloquea el avance.
- Nada de imágenes sueltas: board/galería estructurada (chat + admin).
- La seguridad se corrige, no se elimina (`enforceResponse` + allowlist intactos).
- No romper el caso de éxito de test (sesión "marco").
