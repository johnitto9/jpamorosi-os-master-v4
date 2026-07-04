# Refacción de Flujos — Master Plan (2026-07-04)

Refacción de UX/flujo del asistente Orbe + interludios + media, pedida por Juan
tras QA del flujo nuevo en :3001. **Protocolo: una fase por vez, con autorización
entre fases** (CLAUDE.md). Este doc es el índice; el flujo grande vive en
`01_PROJECT_ROOM_BRANDING_FLOW.md`.

Probar SIEMPRE en **http://localhost:3001** (:3000 es espejo estático sin IA —
ver memoria docker-topology). Rebuild de imagen tras cambios de código.

---

## 0. Stack confirmado (respuesta a "confirmame que LLM propulsa todo")

- **Cerebro de texto (agente/chat, razonamiento, tools):** `z-ai/glm-5.2` vía
  OpenRouter — `lib/agent/llm.ts` (`/api/v1/chat/completions`). Propulsa TODO el
  omni chat, sala de proyecto, branding, guardrails, scoring, heartbeat.
- **Generación de imágenes (TODO: logos, mockups, home, pantallas, storyboards):**
  ahora **`bytedance-seed/seedream-4.5`** vía OpenRouter (`/api/v1/images`,
  respuesta `b64_json`). **Ya configurado y verificado en vivo (200 OK, 2K).**
  Cambios: `lib/agent/tools-server.ts` (endpoint + parseo + opts aspect/res),
  `lib/env.ts` (default), `docker-compose.yml` y `.env.docker.local`.
  ⚠️ Seedream rechaza "1K": mínimo **2K** (~3.69M px). Default = 2K.
- Un solo `OPENROUTER_API_KEY` cubre ambos. Sin él → fallback determinista.

---

## 1. Estado actual (grounding — qué existe hoy)

| Pieza | Archivo | Estado hoy |
|---|---|---|
| Asset Vault | `app/page.tsx:217` `<AssetVault/>` | Montado en la **HOME** (mal). Colapsable, lee `/api/assistant/workspace`. |
| Multistep sala proyecto | `components/assistant/AssistantProjectOrbit.tsx` (`ProjectSetup`) | 8 pasos: nombre→pitch→kind→ADN→needs→visión→**colores**→**logo**. |
| Threads/tabs | `AssistantWidget.tsx` | omni / project / branding. `needsSetup`, `composerLocked` gatean. |
| BrandingBoard | `AssistantProjectOrbit.tsx` | Strip chico: paleta + logo slot + botón "generar concepto". |
| Render de mensajes | `AssistantMessage.tsx:34` | **Texto plano** → los `**bold**` del LLM se cuelan literales. |
| Interludios | `components/hall/Interludes.tsx` | 3 secciones con card/focal CSS estático (no animado). |
| Hero video | `HallOfFameGrid.tsx` + `settings.heroVideo` | Ver §2. |
| generate_mockup | `lib/agent/tools-server.ts` | Seedream (ya). **Cap 3/sesión** — insuficiente para home+pantallas. |
| Guided tour real | `GuidedTour.tsx` | Ya unificado (fase previa). |
| Guided tour del omni | (dentro del chat) | Duplica al tour real → sacar/renombrar. |

---

## 2. Hero video — diagnóstico (corrige la hipótesis de R2)

**R2 NO está conectado.** `NEXT_PUBLIC_MEDIA_CDN_BASE` y `NEXT_PUBLIC_VIDEO_CDN_BASE`
están **vacías** en ambos contenedores → todo resuelve a rutas locales.

Causa real de "queda pineado un video general que no cambia por proyecto":
- `settings.heroVideo` (site-wide) = `/api/media/hero.mp4` → se muestra siempre.
- **0 proyectos** tienen su propio `assets.heroVideo` en el volume → `activeVideo`
  (HallOfFameGrid:99) SIEMPRE cae al fallback global. Por eso nunca cambia.
- :3000 no muestra video porque el contenido estático no trae `settings.heroVideo`.

La lógica per-proyecto YA existe y es correcta; falta **contenido** (cada proyecto
con su `assets.heroVideo`) y **decisión**: el usuario quiere que "el otro tipo de
video (global) no exista". → Fase incluida en §3 (Fase 0).

---

## 3. Fases (ordenadas por dependencia + riesgo)

### FASE 0 — Quick wins & correcciones (bajo riesgo, alta claridad)
1. **Vault → dentro del chat**: sacar `<AssetVault/>` de `app/page.tsx`; montarlo
   dentro del panel del `AssistantWidget` (donde viven los proyectos), no en la home.
2. **Multistep**: sacar el paso "logo" (último). **Colores queda último** con el
   botón "Crear los cimientos". (El logo pasa a ser el 1er paso de Branding, §Fase 2.)
3. **Markdown/`**` fix**: renderer inline seguro en `AssistantMessage` (bold,
   itálica, `code`, saltos, listas simples) sin dep pesada + tipografía más viva.
4. **Hero video**: eliminar el pin global (`settings.heroVideo` como fallback
   general) → per-proyecto only; los que no tengan video muestran el gradiente.
   Documentar que R2 no está conectado. (Contenido de videos por proyecto = 👤 Juan.)
5. **Seedream 4.5**: ✅ ya hecho — verificar en vivo tras rebuild.

### FASE 1 — Omni chat: pulido + "visita guiada" preseteada
6. **Renombrar/rehacer** el "guided tour" del omni (duplica al real). Nueva
   **"visita guiada"** preseteada plug-and-play: secuencia de cards interactivas
   que tira data + links + cards de proyecto (similar al tour real pero dentro del chat).
7. **Más cards preseteadas de respuesta** (no solo project cards): quick-replies,
   info cards, link cards. Experiencia de chat más pulida y con vida.

### FASE 2 — Sala de proyecto: flujo guiado (núcleo) → ver `01_PROJECT_ROOM_BRANDING_FLOW.md`
8. Post-creación: el chat NO divaga → mensaje presentado + botón **"Generar branding"**.
9. Deriva a tab **Branding** con **multistep nuevo**: logo (subir/**generar** + brief) →
   imagen representativa → storyboard. Cards lindas tipo el multistep. Vault propio de branding.
10. Branding solo hace eso; gating (solo desde card activa; branding vacío → botón "iniciar proyecto").
11. Branding hecho → habilita steps en sala de proyecto: dudas (≤3-4 cards de solución) →
    stack mínimo/features/core/APIs con cards guiadas → estado **consolidado**.

### FASE 3 — Generación consolidada (depende de Seedream + subir cap)
12. **Subir/rehacer el cap** de 3/sesión (por-proyecto, con límites sanos por tipo).
13. **Generar mapa** (une todo) → vault. **Generar home** (estima N imágenes del plan) →
    muestra con imágenes + pitch → vault. **Generar resto de pantallas** (≤9) → sección
    "pantallas" desplegable dentro del vault. Botones **mockup mobile/web** sobre pantallas.
14. Estado consolidado → un poco más de libertad conversacional.

### FASE 4 — Interludios animados (front)
15. Reescribir los 3 interludios (`before-the-systems`, `inside-the-proof`,
    `living-layer`) como secuencias **scroll-driven**: textos que aparecen/quedan/
    desaparecen ("commerce", "real world"…) + **cards con imágenes** (ej. comercio del
    abuelo). Cada uno con su impronta. NO card-grid tipo contacto (esas quedan).
    Requiere **assets reales** (fotos) = 👤 Juan.

---

## 4. Dependencias y riesgos
- **Cap de generación (3/sesión)** bloquea Fase 3 → primero subirlo (Fase 3.12).
- **Costo/latencia Seedream 2K** (~60s timeout, imágenes ~500KB+). Home con N
  imágenes puede tardar → theater de progreso + persistencia incremental.
- **Assets de contenido** (videos por proyecto, fotos de interludios) = acción de Juan.
- **Schema/persistencia**: extender el workspace/vault (T05) con secciones branding,
  decisiones, pantallas, mapa. Máquina de estados de fase del proyecto
  (created → branding → consolidating → consolidated → generating).
- Fases 2-3 son grandes; se subdividen en sub-fases con checkpoint.

## 5. Decisiones abiertas para Juan (antes de Fase 2-3)
- ¿"Generar mapa" siempre, o según tipo de proyecto? (hoy: "mayormente sí")
- Límite de imágenes por proyecto (home ~?, pantallas ≤9) y política de regeneración.
- ¿Branding obligatorio siempre antes de consolidar, sin excepción?
- Fuente tipográfica "memorable" para el chat (¿alguna preferida?).

## 6. Orden de ejecución propuesto
Fase 0 → Fase 1 → Fase 4 (interludios, independiente) → Fase 2 → Fase 3.
(Fase 4 se puede intercalar porque no depende del flujo del agente.)
