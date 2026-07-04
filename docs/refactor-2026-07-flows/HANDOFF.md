# HANDOFF — Refacción de Flujos (2026-07-04)

## ✅✅ SESIÓN 3 — TODO EL PLAN CERRADO (código listo, nada commiteado)
Se completó lo que faltaba (puntos 1-6 de la sección "⏳ FALTA" de abajo):
- **tsc**: 3 errores de la card decisions arreglados → 0 errores.
- **AssistantWidget.tsx cableado** (Fase 2b + integración): patchPhase/syncPhase/
  goToThread/onDecision; needsSetup solo auto-abre en tab project; composerLocked
  por fase (abre en decisions+); transcript dirigido por fase con los componentes
  de AssistantFlow; Fase 1 omni tour 100% client-side + quickReplies; vault con
  scope/projectId.
- **AssetVault.tsx**: scope project/branding, assets agrupados por rol (Branding/
  Map/Home/Screens colapsable/Mockups), decisiones como chips, mockup mobile/web
  desde el lightbox.
- **Validado**: `tsc --noEmit` OK, `next build` OK. (`vitest` no corre: bug de
  entorno WSL con el binario nativo de rollup, ajeno al código.)
- **Rebuild + smoke VIVO en :3001**: máquina de fases (create/PATCH/400/401),
  decisions persistida, branding/generate validación, y **generación real Seedream**
  (logo asset servido 200 + logoUrl actualizado en el proyecto).
- Log: `develop-history/PHASE_FLOWS_F2-F4_2026-07-04.md`; estado en claude_state.json.

**Único pendiente NO-código (de Juan):** subir 4 fotos a
`frontend-app/public/images/interludes/` (before-the-systems-1.jpg, -2.jpg 4:3;
inside-the-proof-1.jpg 16:9; living-layer-1.jpg). Sin ellas, el fallback CSS
(onError) ya funciona. Decidir también la fuente "memorable" del chat (no tocada).
**Nada commiteado** — Juan decide el commit. Para un smoke visual completo del
flujo en el navegador: http://localhost:3001 (crear proyecto → branding wizard →
decisiones → consolidar → mapa/home/pantallas → vault → mockup → omni tour).

---

# (Contexto original) HANDOFF — Refacción de Flujos (2026-07-04, sesión 2)

Para el agente que continúa. **Leé primero:** `00_MASTER_PLAN.md` y
`01_PROJECT_ROOM_BRANDING_FLOW.md` (misma carpeta), después esto. Protocolo repo
(CLAUDE.md): log en `develop-history/`, estado en `develop-history/claude_state.json`.
Juan autorizó correr TODAS las fases de corrido ("termina todo") — no hace falta
pedir permiso entre fases de este plan.

## Cómo correr / validar
- Typecheck: `cd frontend-app && node_modules/.bin/tsc --noEmit`
- Build: `node_modules/.bin/next build`
- Vivo en :3001: `docker.exe compose --profile backend up --build -d` (desde WSL).
  **Probar SIEMPRE en http://localhost:3001** (:3000 = espejo estático sin IA).
- Imagen: `bytedance-seed/seedream-4.5` vía OpenRouter `/api/v1/images` (b64_json,
  **mínimo 2K**). Texto: `z-ai/glm-5.2`. Un solo OPENROUTER_API_KEY.

## ✅ HECHO (esta sesión — NADA commiteado)

### Fase 2a — CERRADA Y VERIFICADA en :3001
Rebuild hecho; columna `phase` migró (viejos = 'created'); POST devuelve phase;
PATCH /api/assistant/projects {id,phase} probado: válido OK, phase inválida→400,
sin sesión→401. Proyecto de prueba id=13 quedó en 'branding'.

### Fase 4 (interludios) — CÓDIGO HECHO (subagente)
`components/hall/Interludes.tsx` reescrito scroll-driven (sticky + useScroll con
container de ScrollStage — body es overflow:hidden, OJO). Mismos exports/ids/props.
Fallback estático (reduced-motion / <lg). Fotos que Juan debe subir a
`frontend-app/public/images/interludes/`: before-the-systems-1.jpg, -2.jpg (4:3),
inside-the-proof-1.jpg (16:9), living-layer-1.jpg. Con onError→placeholder CSS.

### Server (Fases 2c/2d/3) — CÓDIGO HECHO, sin verificar
- `lib/agent/project-workspace.ts`: AssetRole + "map"|"home"|"mockup";
  `countGeneratedAssets(projectId, role)` (solo source='generated').
- `lib/agent/tools-server.ts`: extraído `generateImageToSession(sessionId, prompt,
  opts&{filePrefix})` (prompt crudo, sin cap); `runGenerateMockup` = wrapper con
  cap 3/sesión (solo chat). `ASSET_ROLE_CAPS` = {logo:2, reference:3, storyboard:2,
  map:2, home:4, screen:9, mockup:6} — techos POR PROYECTO por rol.
- `app/api/assistant/branding/route.ts` (NUEVO): POST {projectId, role:
  logo|reference|storyboard, brief?, uploadUrl?}. Upload registra asset (valida
  que uploadUrl sea de la sesión); generar = Seedream con prompt por rol
  (logo 1:1, resto 16:9) + cap por rol (409 limit). role logo → actualiza logoUrl.
- `app/api/assistant/generate/route.ts` (NUEVO): POST {projectId, target:
  map|home|screen|mockup, brief?, parentAssetId?, device?}. UNA imagen por request
  (cliente loopea). home usa VisualPlan (crea plan determinista hero+2 secciones
  por kind si no hay; max home=4); screen ≤9; mockup deriva de asset padre
  (promptSummary + device frame, 9:16/16:9). Transiciones: consolidated→generating
  al primer render; generating→ready al completar plan de home. Devuelve {asset,
  phase, planned?, done?}.
- `app/api/assistant/decisions/route.ts` (NUEVO): POST {projectId, category,
  option, reason?} → addStackDecision(source user, confirmed).
- `lib/assistant/types.ts`: card nueva `{type:"decisions", items: DecisionProposal[]}`
  + tipo DecisionProposal.
- `lib/assistant/guardrails.ts`: enforceResponse acepta la card decisions.
- `lib/agent/orchestrator.ts`: tool `propose_decisions` (zod ≤4 decisiones,
  2-4 opciones) → card decisions; en whitelist; instrucción en system prompt solo
  cuando phase==='decisions'; `phase` agregado al JSON del proyecto activo.

### Cliente — CÓDIGO HECHO parcial
- `lib/i18n/dictionaries.ts`: **FLOW dict nuevo** (tipo FlowDict + 7 idiomas,
  insertado entre COOKIE y ASSISTANT). Todas las strings del flujo guiado.
- `components/assistant/AssistantFlow.tsx` (NUEVO): PhaseCreatedCard,
  BrandingPointer, BrandingEmptyGate, BrandingDone, BrandingWizard (3 pasos
  subir/generar + brief + resume desde workspace), DecisionsBoard (3 decisiones
  preset multilang: priority/platform/integrations + consolidar), GenerationBoard
  (mapa / home con loop y progreso n/N / pantalla con brief). Usa FLOW[lang].
- `lib/assistant/omni-tour.ts` (NUEVO, Fase 1): OMNI_TOUR 7 idiomas — trigger
  (chip), 3 steps (cards de proyectos hall: lumenscript/buenpick/bbn + links
  /projects y /cv) + quick replies; `matchesTourTrigger()`.
- `components/assistant/AssistantMessage.tsx`: render de card decisions
  (DecisionCards con estado local + prop opcional `onDecision`).

## ⏳ FALTA (en orden)

1. **`tsc --noEmit`** — hay ~4-6 errores pendientes por la card decisions:
   `lib/assistant/response-builder.ts` (narrowing c.src) y
   `tests/assistant_intent.spec.ts`; quizá orchestrator. Arreglar igual que en
   guardrails (chequear c.type antes de c.src).
2. **`AssistantWidget.tsx` — el cableado central (2b + integración de todo):**
   - Helper `patchPhase(id, phase)`: PATCH → actualiza `projects` state.
   - Helper `goToThread(kind, pinId?)`: busca thread del kind o addThread; pinnea
     el proyecto en ese idx (localStorage al_thread_projects).
   - Render del transcript por fase (kind='project' + activeProject):
     created→`<PhaseCreatedCard onStartBranding={patchPhase(id,'branding') +
     goToThread('branding',id)}>`; branding→`<BrandingPointer>`;
     decisions→turns + `<DecisionsBoard onConsolidate={patchPhase 'consolidated'}>`;
     consolidated/generating/ready→turns + `<GenerationBoard onPhase={sync}>`.
   - kind='branding': sin proyectos→`<BrandingEmptyGate onStart={goToThread('project')}>`
     (NO el setup wizard automático); con proyecto phase created→PhaseCreatedCard
     (CTA solo patchea phase, ya está en el tab); phase branding→`<BrandingWizard
     onComplete={patchPhase(id,'decisions')}>`; phase >branding→`<BrandingDone
     onBack={goToThread('project',id)}>`.
   - `composerLocked` nuevo: kind!=='omni' && (!activeProject || kind==='branding'
     || ['created','branding'].includes(phase)). (decisions+ desbloquea en project.)
   - `onDecision` para AssistantMessage: POST /api/assistant/decisions
     {projectId: activeProject.id, category: item.id, option} + al-workspace-refresh.
   - **Fase 1 omni tour**: chip = reemplazar suggestions[0] cuando kind==='omni'
     por OMNI_TOUR[lang].trigger; en send() interceptar ANTES del fetch:
     `if (kind==='omni' && matchesTourTrigger(message))` → playOmniTour(): apendear
     los 3 steps como turns assistant escalonados (setTimeout ~1.1s, loading dots
     entre medio), cards `{type:'project',slug}` y actions `{type:'navigate',...}`
     sintetizadas en turn.response; al final setear estado `quickReplies` (chips
     sobre el composer que hacen send() real y se limpian al enviar).
3. **`AssetVault.tsx`**: prop `scope?: 'project'|'branding'` (widget pasa según
   kind). branding scope = solo Paleta + assets logo/reference/storyboard.
   project scope = agrupar assets por rol: Branding (3 thumbs), Mapa, Home,
   Pantallas (n) colapsable ≤9, Mockups; Decisiones como chips compactos.
   En el lightbox, si role∈{screen,home}: botones "Mockup mobile"/"Mockup web"
   → POST /api/assistant/generate {target:'mockup', parentAssetId, device} (el
   vault tiene projectId; hace el POST él mismo + refresh). Chrome del vault está
   EN-hardcodeado — mantener consistencia.
4. **Validar**: tsc + next build.
5. **Rebuild + smoke en :3001**: flujo completo — crear proyecto → card branding
   → wizard 3 pasos (generar con Seedream real) → decisions → consolidar →
   mapa/home/pantallas → vault con secciones → mockup desde lightbox → omni tour.
   Interludios en la home (scroll).
6. **Cerrar**: logs `develop-history/PHASE_FLOWS_F2-F4_2026-07-04.md` +
   actualizar `claude_state.json` + este HANDOFF. NO commitear (Juan decide).

## Decisiones tomadas por defecto (documentar a Juan, puede cambiarlas)
- Mapa: siempre disponible. Home: ≤4 imágenes (plan default 3). Pantallas ≤9.
- Branding obligatorio antes de decisions (gating por phase).
- Fuente "memorable" del chat: NO tocada — decisión pendiente de Juan.
- Caps por proyecto (ASSET_ROLE_CAPS arriba); cap 3/sesión queda solo para el
  generate_mockup libre del chat.

## Archivos tocados esta sesión (sin commitear)
project-workspace.ts, tools-server.ts, orchestrator.ts, types.ts, guardrails.ts,
dictionaries.ts (FLOW), AssistantMessage.tsx, AssistantFlow.tsx (nuevo),
omni-tour.ts (nuevo), Interludes.tsx, api/assistant/{branding,generate,decisions}/route.ts
(nuevos). Los de la sesión 1 (F0+2a) también siguen sin commitear.
