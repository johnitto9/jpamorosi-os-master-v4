# Change Log: 2026-07-04 — Refacción Flujos · FASE 0 + Seedream

## 1. Objetivo
Fase 0 del plan `docs/refactor-2026-07-flows/` (quick wins) + configurar Seedream 4.5
como modelo de imagen de la casa. Autorizado por Juan (Fase 0 completa + hero video
per-proyecto matando el global).

## 2. Cambios aplicados

### Seedream 4.5 (modelo de imagen para TODO)
- `lib/agent/tools-server.ts`: `runGenerateMockup` reescrito para el endpoint
  dedicado `POST /api/v1/images` (antes usaba `/chat/completions` estilo Gemini).
  Parseo `data[0].b64_json`. Nuevos opts `MockupOpts{aspectRatio,resolution}`
  (Seedream rechaza "1K" → floor 2K). Aspects tipados por contexto (logo 1:1, etc.).
- `lib/env.ts`: default `OPENROUTER_IMAGE_MODEL = bytedance-seed/seedream-4.5`.
- `docker-compose.yml` + `.env.docker.local`: idem explícito.
- Verificado en vivo: endpoint 200 + `b64_json` (566KB), y contenedor levanta con
  el modelo correcto. Cerebro de texto sigue `z-ai/glm-5.2`.

### Fase 0
1. **Vault dentro del chat**: `AssetVault` acepta prop `active`; se quitó de
   `app/page.tsx` y se montó en `AssistantWidget` con `active={open && kind!=="omni"}`
   (solo visible con el chat abierto en sala de proyecto/branding).
2. **Multistep sin paso logo**: `AssistantProjectOrbit` — removido step 7 (logo),
   estado/handler/POST de logo, SKIPPABLE {1,3,4,5,6}. Colores queda último + crear.
   Removido stepTitle "logo" en los 7 idiomas (dict). (El logo se muda a Branding, Fase 2.)
3. **Fix `**` + tipografía**: `AssistantMessage` — nuevo `RichText`/`renderInline`
   XSS-safe (bold cyan, itálica, `code` chip, listas, saltos). Sin dep. `leading-relaxed`.
4. **Hero video per-proyecto**: `HallOfFameGrid` — eliminado el fallback global
   (`settings.heroVideo`); solo `active.assets.heroVideo`, si no hay → gradiente.
   Removido prop `heroVideo` + type `HeroVideo` + `getSiteSettings`/`settings` en page.

## 3. Diagnóstico registrado
- **R2 NO conectado** (`NEXT_PUBLIC_*_CDN_BASE` vacías). El "video pineado" era el
  global `settings.heroVideo`; 0 proyectos tenían `assets.heroVideo`. Ahora
  per-proyecto only (contenido de videos por proyecto = acción de Juan).

## 4. Testing
- `tsc --noEmit`: PASS. `next build` (vía docker): PASS.
- Rebuild docker + :3001: home 200, glm responde real, image model = seedream.
- Seedream endpoint: 200 + b64_json (probado en vivo).
- Pendiente QA visual de Juan: vault en chat (no home), multistep termina en colores,
  chat sin `**`, hall sin video global.

## 5. Persistencia
claude_state.json → FLOWS_F0. Plan en docs/refactor-2026-07-flows/ (00 master, 01 flow).
Fases 1-4 pendientes (una por vez).
