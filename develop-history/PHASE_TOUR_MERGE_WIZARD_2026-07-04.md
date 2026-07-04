# Change Log: 2026-07-04 — Tour merge + colors/logo wizard + docker fix

## 1. Objetivo
Tres cosas pedidas por Juan tras probar el flujo nuevo:
1. Contenedores docker `web` y `worker` en naranja (no arrancaban).
2. Unificar los "dos guided tour" (Meet Orbe interactivo vs nudges del chat) en
   un único launcher (popup de saludo host + un botón) con anotaciones flotantes.
3. Sala de proyecto no pedía colores/logo en los últimos pasos; chat "sin IA".

## 2. Revisión previa
- Fase previa: CHISPA (i18n total + heartbeat). Refactor T00–T08 en
  `docs/final-refactor/`. `GuidedTour.tsx` (T03), tools `confirm_palette`/
  `set_brand_dna` (T04) y Asset Vault (T05) recién commiteados.
- El PENDING ya anticipaba: rebuild de imagen + wizard de colores como nice-to-have.

## 3. Cambios aplicados (con paths)

### Docker (infra)
- `web` y `worker` estaban en estado `created` (nunca arrancaron) → `docker
  compose --profile backend start web worker`.
- Imagen buildeada 03:51 UTC pero código T04/T05/T07 commiteado 08:22–08:43 →
  `docker compose --profile backend up --build -d` (imagen nueva 09:11 UTC).
- Diagnóstico raíz: el chat "sin IA" y "No pude crearlo" eran de probar en
  **:3000 `web`** (static + sin OpenRouter, espejo de Vercel). En **:3001** la IA
  real y la creación de proyecto funcionan (verificado por curl). Ver memoria
  [[docker-topology-3000-vs-3001]].

### Merge del tour (Fase 1)
- `lib/assistant/guided-tour.ts`: `NOTES` (7 idiomas) con caption corto por estado
  con scroll target; `resolveTourState` ahora devuelve `note`.
- `components/assistant/GuidedTour.tsx`: reescrito. Sin launcher propio (se elimina
  el duplicado abajo-izquierda). Arranca por evento `al-tour-start`. Agrega
  anotaciones flotantes: burbuja anclada a la sección resaltada (sigue el scroll) +
  feed de toasts apilados (journey log, top-right, self-expiring). Re-triggerable.
- `components/assistant/AssistantWidget.tsx`: `TOUR_CTA` (7 idiomas) + `startTour()`
  que dispara `al-tour-start`. El popup de saludo (host lindo, movible, evita otras
  notis) ahora tiene UN botón primario "✦ Hacé el tour" + secundario "explorar".

### Wizard colores/logo (Fase 2 — T04 pendiente)
- `lib/i18n/dictionaries.ts`: `WizardDict` + 4 claves nuevas (`paletteHint`,
  `logoHint`, `logoBtn`, `logoUploading`) y 2 `stepTitles` (colores, logo) en los
  7 idiomas.
- `components/assistant/AssistantProjectOrbit.tsx`: `DEFAULT_PALETTE` por kind;
  wizard pasa de 6 a **8 pasos** (…visión → **colores** → **logo**). Paso colores:
  swatches editables (`input[type=color]`, add/remove hasta 5, seed por kind). Paso
  logo: upload via `/api/assistant/upload` (reusa el endpoint magic-byte). El POST
  a `/api/assistant/projects` ahora manda `palette` + `logoUrl` (el schema ya los
  aceptaba). Ambos pasos SKIPPABLE.

## 4. Implicancias técnicas
- El tour ya no tiene entrada propia: si el popup de saludo se descartó, se
  re-dispara sólo por evento (hoy no hay botón visible extra — decisión de diseño:
  el popup ES la pantallita de entrada).
- Colores/logo se persisten estructurados (no en `concept`), así que aparecen en el
  Asset Vault y BrandingBoard. El agente igual puede refinarlos (confirm_palette).

## 5. Testing (comandos y resultados)
- `tsc --noEmit`: PASS (exit 0) tras cada fase.
- `next build`: PASS (exit 0) — todas las rutas generadas OK.
- Rebuild docker + smoke :3001: rebuild disparado tras el build; verificar visual.
- IA real :3001 verificada por curl (intent=capability, respuesta LLM real).
- Creación de proyecto :3001 verificada por curl (ok:true, palette/logoUrl en schema).

## 6. Referencias
- docs/final-refactor/specs/11_ORBE_AND_GUIDED_TOUR.md, PENDING.md
- Decisiones de Juan: popup-host + botón único; notis "que las proponga yo"
  (burbuja anclada + toast); orden rebuild→tour→wizard.

## 7. Persistencia
claude_state.json actualizado (phase TOUR_MERGE_WIZARD).
