# Plan UX Front

## Chat / sistema conversacional

### Project cards del chat

Archivo: `frontend-app/components/assistant/AssistantProjectOrbit.tsx`.

Estado actual:

- Cards en `ProjectStrip` con `w-40`, layout vertical.
- Muestran `active` por `t.stripActive`.
- Muestran `—` cuando `p.stack.length === 0`.
- Boton `+` separado.

Cambio:

- Pasar a chips/cards wide horizontales y compactas: ancho `min-w-[220px]`, alto fijo aproximado `56px`.
- Eliminar texto `active`; usar ring/borde/acento/aria-pressed.
- Reemplazar `—` por nada o por icono/contador solo si hay data real.
- Reducir padding vertical.
- Mantener multi-select en omni, single focus en project/branding.
- Verificar que no robe area de chat.

### Guardar sesion / email

Archivo: `frontend-app/components/assistant/AssistantWidget.tsx`.

Estado actual:

- `SessionRecoveryCard` esta siempre abajo del transcript.
- Buena funcionalidad, demasiado alta y mal ubicada.

Cambio:

- Moverla al area superior junto a `ProjectStrip`, como boton/chip compacto: icono + "Guardar sesion".
- Al click, abrir popover/dropdown pequeño con input email.
- Mantener `POST /api/session/recover-request`.
- Agregar estado compacto `sent/error`.
- El agente debe poder disparar una action/card de captura cuando detecta interes o lead qualification.

### Participacion activa del agente

Estado actual:

- Lead extraction regex existe.
- LLM puede devolver `lead` estructurado en orchestrator.
- No hay herramienta clara para mostrar capture card bajo demanda.

Cambio:

- Agregar action/card `capture_lead` o `session_recovery` en `AssistantResponse.cards`.
- Orchestrator prompt: pedir datos con intencion cuando hay señales de hiring/proyecto/presupuesto/urgencia, sin ser invasivo.
- El agente debe preguntar por email, empresa, rol/necesidad y urgencia cuando corresponde.
- Tests:
  - Si usuario dice "quiero contratarte para un proyecto", respuesta pregunta datos y muestra card.
  - Si usuario deja email, se persiste lead.
  - Si usuario pide guardar sesion, `recover-request` responde OK y actualiza lead.

### Respuestas mas ricas

Estado actual:

- `AssistantMessage` ya parsea markdown basico.

Cambio:

- Extender render seguro a:
  - `**bold**`
  - `_italic_`
  - texto subrayado controlado via cards o markdown limitado, no HTML libre.
  - links internos/externos ya whitelisteados.
- Evitar colores arbitrarios desde el modelo. Mejor: semantic spans/card tones (`cyan`, `emerald`, `amber`) definidos por tipo de card.

## Home / hero

### Imagen de perfil desde Home Media

Estado actual:

- `HallHero` usa `profile.avatar`.
- `SiteSettings` no tiene `profileImage`.

Cambio:

- Extender `SiteSettings` con `profileImage?: string`.
- Agregar slot en admin Home Media.
- `HallHero` usa `settings.profileImage ?? profile.avatar`.
- Usar `storeFile` para R2/local y resolver via `resolveMediaUrl`.

### CTAs hero

Estado actual:

- `Enter Proof Rooms` -> `#hall-of-fame`.
- `Explore Project Rooms` -> `/projects`.

Cambio:

- Cambiar texto de `Enter Proof Rooms` a `Let's started` (respetar pedido literal aunque gramaticalmente seria `Let's start`).
- Accion: scroll al primer frame del interlude `#before-the-systems` con palabra `commerce` visible. Implementar con anchor + offset o evento custom controlado por `ScrollStage`.
- Eliminar `Explore Project Rooms`.
- Mantener `/os` si sigue siendo necesario.

### Shimmer del nombre

Archivo: `frontend-app/app/globals.css`, clase `.lab-shimmer-text`.

Problema:

- Efecto se repite y luego genera destello en lado derecho.

Cambio:

- Rehacer animacion como background-size mayor, varias capas con `mask` suave, sin saltos de keyframe.
- Evitar `background-position` que termine exactamente en un borde duro.
- Verificar 3 ciclos en desktop/mobile.

## Contact / Open to work

Estado actual:

- Botones: Email, Explore Projects, GitHub.

Cambio:

- Eliminar `Explore Projects`.
- Mantener Email + GitHub.
- Usar iconos/logos: lucide `Mail`; GitHub con `simple-icons` como ya se usa en tech badges.
- Revisar texto i18n: `contactExplore` queda sin uso o se elimina luego.

## ChapterNav + interludios

Estado actual:

- `ChapterNav` lista `intro`, `hall-of-fame`, `featured`, `lab-archive`, `contact`.
- No representa interludios.

Cambio mixto:

- Mantener nodos para secciones principales.
- Agregar segmentos de trayecto entre nodos para interludios:
  - `before-the-systems` entre `intro` y `hall-of-fame`.
  - `inside-the-proof` entre `hall-of-fame` y `featured`.
  - `living-layer` entre `featured` y `lab-archive`.
- Mostrar barra vertical que carga entre nodo y nodo y label del interlude.
- Inspiracion interna: linea `il-thread` mobile de `BeforeTheSystems`.
- No convertir interludios en nodos equivalentes; deben sentirse como viaje entre estaciones.

## Interludios GSAP mobile

Archivos:

- `frontend-app/components/hall/Interludes.tsx`
- `frontend-app/components/ui/scroll-stage.tsx`
- `frontend-app/components/ui/section-transition.tsx`

Pedido:

- Alargar un poco el scroll de interludios, no mucho.
- Mobile: texto/cards aparecen demasiado abajo; subirlos.
- `BeforeTheSystems`: texto apenas debajo de cards/imagenes.
- Al llegar a `HallOfFame`, `Featured`, `LabArchive`: sentir estacion, pequeno scroll sin que la pantalla siga corriendo.
- Hall mobile: link `Browse all project rooms...` queda bajo sombra hasta pasar seccion.
- `InsideTheProof`: cards de texto mas arriba y parcialmente superpuestas a imagen.

Plan tecnico:

- Ajustar altura de secciones mobile de `min-h`/sticky y tiempos de timeline.
- Cambiar `end` de `"bottom bottom"` a una distancia levemente mayor por escena, por ejemplo `end: "+=115%"` o aumentar altura de wrapper, probando con Playwright.
- En mobile static/timeline, subir contenedores con `top`/grid rows: imagen arriba, texto con `-mt` controlado.
- Crear pausa/estacion al final de cada interlude agregando tail spacer corto o `SectionTransition` con menor transform al entrar.
- Revisar z-index/overflow del link `browseAll` luego de Hall; probablemente `SectionTransition`/fade o background overlay lo tapa.

Tests visuales:

- Playwright mobile 390x844: capturas en `before-the-systems`, `hall-of-fame`, `inside-the-proof`, `living-layer`.
- Desktop 1440x900: no romper composicion actual.
- Canvas/pixel check si interviene Three/Aurora.

## Living Layer video en Home Media

Estado:

- `admin/media` ya transcodifica video hero global.
- `storage.ts` soporta mp4/webm.
- `InterludeImages.living1` es string y `InterludeImage` probablemente renderiza imagen.

Cambio:

- Permitir que `living1` sea imagen o video.
- Si se sube video en Home Media:
  - transcodificar con ffmpeg a 720p H.264, sin audio, faststart.
  - generar poster WebP.
  - persistir `{ mp4, poster }` o una union tipada.
  - renderizar `<video muted playsInline loop autoPlay>` con poster.
- Si R2 esta configurado, subir ambos a R2/CDN.
- Mantener fallback imagen.

