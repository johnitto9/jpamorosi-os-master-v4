# Change Log: 2026-07-04 — FLOWS Fases 1/2b/2c/2d/3/4 (cierre de sesión 3)

## 1. Objetivo
Terminar el refactor de flujos guiados que quedó a medias en la sesión 2:
cablear la máquina de estados `phase` al cliente (el corazón, Fase 2b), integrar
branding/decisiones/generación en el chat, sumar scope al vault, y dejar todo
compilando + verificado vivo en :3001. Autorizado correr todas las fases de
corrido (Juan: "termina todo").

## 2. Revisión previa
Leídos HANDOFF.md (autoridad), claude_state.json y todo el código de la sesión 2:
server (branding/generate/decisions + ASSET_ROLE_CAPS + propose_decisions),
AssistantFlow.tsx, omni-tour.ts, FLOW dict, card decisions en tipos/guardrails/
AssistantMessage. Faltaba: fix tsc, cableado AssistantWidget, AssetVault scope,
build/rebuild/smoke, logs.

## 3. Cambios aplicados (con paths)
### Fix de tipos (punto 1 del handoff) — 3 errores
- `lib/agent/orchestrator.ts`: import de `DecisionProposal`; narrow explícito
  `arg.items as DecisionProposal[]` (zod infería todo opcional).
- `lib/assistant/response-builder.ts`: `dedupeCards` narrowe por `c.type`
  (project→slug / image→src / decisions→`decisions:<ids>`).
- `tests/assistant_intent.spec.ts`: `slugs()` narrowe por `c.type` igual.

### AssistantWidget.tsx — el cableado central (Fase 2b + integración)
- Imports: componentes de AssistantFlow, OMNI_TOUR/matchesTourTrigger,
  DecisionProposal. Sacado BrandingBoard (superado por el wizard).
- `patchPhase(id,phase)`: PATCH /api/assistant/projects + update optimista del
  orbit. `syncPhase(id,phase)`: solo mirror local (generate ya avanzó server-side).
- `goToThread(kind,pinId?)`: salta/crea el tab del kind y pinnea el proyecto
  (single-focus, localStorage al_thread_projects).
- `onDecision(item,option)`: POST /api/assistant/decisions + al-workspace-refresh.
- `needsSetup`: SOLO auto-abre el wizard en el tab project vacío (branding sin
  proyecto muestra BrandingEmptyGate, no wizard).
- `composerLocked` nuevo: bloqueado si !activeProject || kind==='branding' ||
  phase∈{created,branding}; desbloquea en decisions+ del project.
- Transcript dirigido por fase (IIFE): setup → branding workspace (EmptyGate/
  PhaseCreatedCard/BrandingWizard/BrandingDone) → project room (created→
  PhaseCreatedCard que patchea branding + goToThread; branding→BrandingPointer;
  decisions→turns+DecisionsBoard; consolidated/generating/ready→turns+
  GenerationBoard) → locked derivation → conversación libre (omni).
- Fase 1 omni tour: chip = suggestions[0] reemplazado por OMNI_TOUR[lang].trigger;
  `playOmniTour()` apendea los 3 steps escalonados (loading dots entre medio,
  cards de proyecto + links sintetizados en response) y setea quickReplies;
  send() intercepta el trigger ANTES del fetch (cero LLM); quickReplies como chips
  sobre el composer que hacen send() real y se limpian al enviar.
- `<AssetVault scope={kind==='branding'?'branding':'project'} projectId=.../>`.

### AssetVault.tsx — scope + secciones (punto 3)
- Props `scope?: 'project'|'branding'` y `projectId?` (refocus por efecto).
- project scope: assets agrupados por rol (Branding / Map / Home / Screens
  colapsable ≤9 / Mockups) + Stack&decisions con decisiones como chips esmeralda.
- branding scope: solo Paleta + Brand DNA + assets logo/reference/storyboard.
- Lightbox: si role∈{screen,home} → botones "Mockup mobile/web" que POSTean
  /api/assistant/generate {target:'mockup',parentAssetId,device} + refresh.
- `renderThumb` compartido; chrome EN mantenido.

## 4. Implicancias técnicas
- La máquina de fases vive en el server (persistida) y el cliente la refleja
  optimista; el composer se abre recién en decisions (foundations-first respetado).
- El tour omni ya no quema completions: es 100% client-side.
- El vault es la vista canónica de artefactos por rol; los mockups se derivan
  desde el lightbox sin salir del panel.

## 5. Testing (comandos y resultados)
- `tsc --noEmit`: OK (0 errores).
- `next build`: OK (todas las rutas compilan, incl. /api/assistant/{branding,
  generate,decisions}).
- `vitest`: NO corrió por bug de entorno WSL (falta binario nativo
  @rollup/rollup-linux-x64-gnu de rollup) — ajeno al código; tsc validó los tipos
  del spec.
- Rebuild backend (`docker.exe compose --profile backend up --build -d
  amorosi-backend`) + smoke VIVO en :3001:
  - create project → phase=created; PATCH→branding OK; phase inválida→400;
    sin sesión→401.
  - decisions POST→200, persistida en workspace.
  - branding sin sesión→401, role inválido→400; generate sin sesión→401,
    target inválido→400.
  - **Generación real Seedream**: POST branding role=logo → asset logo con URL
    /api/media/... servida (200, PNG 320KB); project.logoUrl actualizado.

## 6. Referencias
- Autoridad: docs/refactor-2026-07-flows/HANDOFF.md + 00_MASTER_PLAN /
  01_PROJECT_ROOM_BRANDING_FLOW.
- Sesión previa: PHASE_FLOWS_F0 y F2a.

## 7. Persistencia
claude_state.json actualizado (phase FLOWS_S3_DONE). Pendiente NO-código: Juan
sube las 4 fotos de interludios a frontend-app/public/images/interludes/
(before-the-systems-1.jpg, -2.jpg 4:3; inside-the-proof-1.jpg 16:9;
living-layer-1.jpg) — con onError→placeholder CSS ya funciona sin ellas.
NADA commiteado (Juan decide).

## Decisiones por defecto (Juan puede cambiarlas)
- Mapa siempre disponible; Home ≤4 (plan default 3); Pantallas ≤9.
- Branding obligatorio antes de decisions (gating por phase).
- BrandingBoard (header viejo del branding tab) removido: el BrandingWizard es
  ahora el dueño del branding. El export sigue en AssistantProjectOrbit por si
  se quiere reusar.
- Fuente "memorable" del chat: NO tocada (pendiente de Juan).
