# PHASE: Wizard "easy guide" — 2026-07-03

## 1. Objetivo

Matar el "step técnico" del wizard de setup. En lugar de preguntarle al visitante
qué stack quiere, preguntarle qué **necesidades de negocio** tiene y dejar que el
agente traduzca a stack concreto después. El espacio técnico queda relegado a
un textbox colapsable cerrado por defecto, único y opt-in.

Doc fuente: `handoff-assistant-v5/02-WIZARD-easyguide.md`.

## 2. Revisión previa

`ProjectSetup` tenía 3 steps: identity → **stack quick-picks** → concept.
El segundo step (`QUICK_STACK`) mostraba chips de tecnología (Next.js, Tailwind,
Postgres…) — perfecto para devs, intimidante para no-devs.

`projectPatchSchema` (lib/agent/projects.ts:11) es strict y solo acepta
`name, kind, concept, stack, palette, logoUrl`. **Sin campos nuevos** —
el brief etiquetado va dentro de `concept`.

## 3. Cambios aplicados (con paths)

### 3.1 `AssistantProjectOrbit.tsx`

**Reemplazos en el archivo:**

- `QUICK_STACK` (10 strings de tech) → `BUSINESS_NEEDS` (7 chips con id estable,
  icono + copy bilingüe): traffic, visuals, edge, sovereignty, payments, i18n,
  mobile.
- Helper `parseStackList(raw)` — tokeniza el textbox dev por coma / newline /
  bullet, dedupea y cape a 20 (límite del schema).

**`ProjectSetup` rediseñado** (state + rendering):

| State nuevo            | Uso                                                      |
|------------------------|----------------------------------------------------------|
| `name`                 | sin cambios                                              |
| `description`          | pitch de una línea, opcional (140 chars)                 |
| `kind`                 | sin cambios                                              |
| `brandingNotes`        | ADN de marca: tono, colores, refs (400 chars, opcional)  |
| `needs`                | array de business-need ids (max 7)                       |
| `devStackOpen`         | colapsable cerrado por defecto                           |
| `devStack`             | textbox libre, parsea a `stack[]` al submit              |
| `vision`               | textarea final (800 chars, era `concept`)                |

**Steps** (sigue siendo 3, el doc 03 de assets entra en una fase futura):

- **Step 0** — Identidad + ADN: nombre + pitch + grid de kind (igual) + textarea
  "¿cómo te la imaginás?".
- **Step 1** — Necesidades + escape dev: 7 chips de negocio multi-select + card
  colapsable "¿Sos dev / tenés stack definido?" con textbox libre adentro.
- **Step 2** — Visión: textarea libre (era el concept actual, ahora más grande
  porque ya no carga el brief etiquetado).

**`buildConcept()`**: arma el brief etiquetado que se manda al backend.
Cada bloque es opcional; solo emitimos líneas para lo que el visitante llenó:

```
[Pitch]: <description>
[ADN/branding]: <brandingNotes>
[Necesidades]: <labels en español/inglés según lang>
[Concepto]: <vision>
```

Hard cap a 1200 chars (límite del schema).

**`parseStackList(devStack)`** se manda como `stack` en el body. Si el dev
colapsable queda cerrado y vacío → `stack: []`.

### 3.2 Card fallback (BrandingBoard)

`project.name.charAt(0).toUpperCase()` → `KIND_META[project.kind]?.icon`.
Motivación: dos proyectos que arrancan con la misma letra ("Aero", "Atlas")
mostraban la misma inicial — ruido visual. El emoji del kind es unívoco y
reconocible. ProjectStrip ya usaba el emoji, ahora el BrandingBoard también.

## 4. Implicancias técnicas

- **Backend intacto.** `projectPatchSchema` no cambia. El agente lee `concept`
  y parsea los bloques `[…]:` con un split simple — ya hay precedente en el
  proyecto (rollingSummary con headers similares).
- **Cero tokens LLM.** El wizard es 100% determinístico (chips, textareas,
  parseo). El agente recién consume el brief cuando el visitor habla.
- **i18n completo**: copy bilingüe (es/en) para títulos de step, chips,
  placeholders, aria-labels.
- **A11y**: chips con `aria-pressed`, colapsable con `aria-expanded`, dots con
  `aria-label="Step N of 3"`, focus rings via utilidades Tailwind existentes.
- **No regresiones**: typecheck verde, 50/50 tests verdes. No se tocaron
  guardrails, ni el backend, ni el agente, ni el layout.

## 5. Testing

```powershell
cd frontend-app
& node_modules\.bin\tsc --noEmit      # TYPECHECK OK
& node_modules\.bin\vitest.cmd run    # 50/50 passed (4 files)
```

Manual flow (no automatizado, requiere login + LLM opcional):
1. Abrir widget del asistente → tab project o branding → click "+"
2. Step 0: tipear nombre + pitch + (opcional) notas de branding + elegir kind
3. Step 1: tildar 2-3 chips de necesidades + click "Saltar" en el colapsable
4. Step 2: tipear la visión → "Crear los cimientos"
5. Theater de 4 pasos → card aparece en el strip con emoji del kind
6. Inspeccionar DB: `concept` arranca con `[Pitch]: …\n\n[ADN/branding]: …\n\n…`

## 6. Referencias

- `handoff-assistant-v5/02-WIZARD-easyguide.md`
- `lib/agent/projects.ts` (schema strict intacto)
- `components/assistant/AssistantProjectOrbit.tsx`
- Fases siguientes: 03 (assets), 04 (imágenes pipeline), 05 (tour cero tokens)

## 7. Persistencia (claude_state.json)

`phase_done += ["P2-wizard-easyguide"]`
`flags.wizard = { steps: 3, dev_section: "collapsed-default", brief_format: "labeled" }`