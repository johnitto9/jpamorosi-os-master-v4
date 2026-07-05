# 02 — Chat / Asistente UX (items #2 a #8)

Todo esto vive en `components/assistant/`. Fuerte referencia de "cómo lo
queremos" en el repo `lumenscriot14-slim/` (vault/canon integrado inline al
chat, no como panel al fondo).

---

## §A — Vault no se ve / integrarlo al nivel del chat (item #2)

### Síntoma
> "El vault donde se guardan imágenes según tipo de charla (proyecto/branding/
> omni) no se ve. Antes aparecía al fondo, no al nivel del chat; ahora directamente
> ni lo vi. Quiero que las imágenes aparezcan integradas en la interfaz misma."

### Estado actual (verificado)
`AssetVault.tsx` es un panel `fixed right-0 top-0 h-full w-80` con
`hidden ... lg:flex` (línea 205) — **solo desktop, y como panel lateral off-chat**.
Se monta en `AssistantWidget.tsx:747` con:
```tsx
<AssetVault active={open && kind !== "omni"} scope={kind === "branding" ? "branding" : "project"} />
```
Razones por las que "ni lo vio":
1. En mobile nunca renderiza (`lg:flex`, y el propio comentario del archivo dice
   "mobile drawer is a follow-up (see PENDING)").
2. `active` es `open && kind !== "omni"` → en la sala omni no aparece nunca.
3. Aunque abra, es un panel al costado, no "al nivel del chat" como pide.

### Objetivo
Integrar el canon/vault **dentro del cuerpo del chat** (como lumenscript): que
los assets generados aparezcan inline en la conversación y/o en una tira/acordeón
dentro del panel del chat, visible también en mobile. Mantener el panel lateral
como vista expandida opcional en desktop.

### Plan
1. **Revisar el patrón de lumenscript** primero:
   `grep -rn "vault\|canon\|asset" lumenscriot14-slim/ --include=*.tsx -l` y leer
   cómo inyecta los assets en el transcript. Copiar el enfoque.
2. **Inline en el transcript**: cuando el branding wizard o la generación
   producen un asset, además de `refreshVault()`, empujar un mensaje/burbuja al
   transcript con la miniatura clickeable (abre lightbox). El scroll container es
   `AssistantWidget.tsx:911` (`ref={scrollRef}`).
3. **Tira de canon inline** (mobile + desktop): un componente compacto
   `<VaultStrip>` renderizado dentro del panel del chat (arriba del composer o
   bajo los tabs), horizontal-scroll de thumbnails del workspace actual. Reusa
   `loadWorkspace`/`/api/assistant/workspace`. Esto resuelve "que las imágenes
   aparezcan" sin depender del panel lateral lg-only.
4. Mantener `AssetVault` lateral para desktop como "ver todo", pero que su
   visibilidad no sea la única superficie.
5. Considerar activar el vault también en omni si el usuario tiene proyectos
   (hoy `kind !== "omni"` lo apaga).

### Archivos
- `components/assistant/AssetVault.tsx`, `AssistantWidget.tsx`.
- Nuevo: `components/assistant/VaultStrip.tsx` (inline).

---

## §B — Post-branding vuelve a proyecto muy vacío + integrar lo creado (item #3)

### Síntoma
> "Cuando termina el branding nos dirige de nuevo a proyecto (bien), pero queda
> demasiado vacío. Y cuando los steps ya están cerrados, que no solo muestre el
> botón 'ir a proyecto', sino que tenga todo lo creado/vault integrado en su
> interfaz misma."

### Estado actual
- `BrandingDone` (`AssistantFlow.tsx:94-107`) = un `<p>` + un botón "back to room".
  Nada más. De ahí el vacío.
- Al volver a la sala de proyecto en fase `decisions`, se muestra `DecisionsBoard`
  (que sí tiene contenido) — pero el usuario percibe vacío en la transición.

### Objetivo
Que la pantalla de "branding done" y la vuelta a proyecto muestren un **resumen
canon**: logo + imagen representativa + storyboard + palette + DNA en la misma
tarjeta, y de ahí el CTA de continuar. Reutiliza `VaultStrip` de §A.

### Plan
1. Reescribir `BrandingDone` como una tarjeta "Tu universo visual está listo"
   con las 3 imágenes (logo/reference/storyboard) grandes + palette + botón.
   Leer los assets vía `/api/assistant/workspace?projectId=`.
2. En la sala de proyecto, cuando `phase >= consolidated` o mientras carga,
   renderizar el `VaultStrip` arriba del board activo para que nunca se vea vacío.

### Archivos
- `components/assistant/AssistantFlow.tsx` (`BrandingDone`, y el render de la
  sala de proyecto en `AssistantWidget.tsx` ~línea 968-1006).

---

## §C — Multistep de a uno + autoscroll (item #4)

### Síntoma
> "A medida que tocábamos cada step estaría bueno que se auto-scrollee, no que
> tengamos que scrollear nosotros. Mostrar de a uno: respondés, aparece el otro.
> Como ya usamos en otros steps. Puede fallar también en proyecto. Siempre debería
> ser auto y guiado, de a uno."

### Estado actual (verificado)
- `BrandingWizard` (`AssistantFlow.tsx`) YA es de a uno (state `step`, muestra un
  rol por vez). ✔ Ese patrón es el bueno.
- `DecisionsBoard` (`AssistantFlow.tsx:411-460`) **renderiza los 3 presets a la
  vez** (`DECISION_PRESETS.map(...)`, línea 414). Ese es el que obliga a scrollear.
- `ProjectSetup` (`AssistantProjectOrbit.tsx:166+`) es wizard de 6 pasos de a uno
  (ok), pero **no hace autoscroll** al avanzar.
- El scroll container del chat es `AssistantWidget.tsx:911` (`scrollRef`), que ya
  auto-scrollea al fondo cuando llegan mensajes (línea 505-506).

### Objetivo
1. `DecisionsBoard`: revelar UNA pregunta por vez. Al elegir opción, aparece la
   siguiente con animación + autoscroll a ella.
2. Todos los boards: al cambiar de paso, `scrollIntoView({behavior:"smooth"})`
   del nuevo bloque activo.

### Plan
1. `DecisionsBoard`: en vez de mapear todas, mostrar solo las no decididas y
   revelar de a una. `const nextOpen = DECISION_PRESETS.find(d => !decided[d.id])`.
   Renderizar las ya decididas colapsadas (chip ✓) + la actual expandida. Tras
   `pick`, un `ref` a la nueva → `scrollIntoView`.
2. `BrandingWizard`: en `next()` (línea 209) y al montar cada step, `scrollIntoView`
   del contenedor del wizard (agregar un `ref`).
3. `ProjectSetup`: en `setStep(s => s+1)` agregar autoscroll del step nuevo.
4. Patrón reutilizable: un pequeño hook `useAutoScrollOnChange(dep, ref)` que
   haga `ref.current?.scrollIntoView({behavior:"smooth", block:"nearest"})`.

### Archivos
- `AssistantFlow.tsx` (`DecisionsBoard`, `BrandingWizard`),
  `AssistantProjectOrbit.tsx` (`ProjectSetup`).

---

## §D — Scrollbar del chat desentona (item #5) — QUICK WIN

### Síntoma
> "La barra lateral para scrollear del chat desentona, parece PSeInt insertado en
> Aero cyberpunk."

### Estado actual
El scroll container `AssistantWidget.tsx:911-913`
(`className="flex-1 space-y-3 overflow-y-auto px-5 py-4"`) usa el scrollbar nativo
del browser (feo). `app/globals.css:193` ya define `.no-scrollbar` (lo oculta).

### Objetivo
Scrollbar fino, dark, con accent cyan/violet — coherente con el estético.

### Plan (elegir 1)
- **Opción A (recomendada):** agregar una clase `.chat-scroll` en `globals.css`
  con webkit + firefox styling:
  ```css
  .chat-scroll::-webkit-scrollbar { width: 6px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(#22d3ee55,#8b5cf655);
    border-radius: 9999px;
  }
  .chat-scroll::-webkit-scrollbar-thumb:hover { background: #22d3ee88; }
  .chat-scroll { scrollbar-width: thin; scrollbar-color: #22d3ee55 transparent; }
  ```
  y aplicarla en la línea 913 (reemplazar/añadir a `overflow-y-auto`).
- Opción B: usar `.no-scrollbar` (ocultar del todo). Menos usable — el usuario
  igual quiere poder scrollear, así que preferir A.

### Archivos
- `app/globals.css` (nueva clase), `AssistantWidget.tsx:913` (aplicarla). Buscar
  otros `overflow-y-auto` del chat/vault y aplicar la misma clase por coherencia
  (ej. el `overflow-y-auto` del vault `AssetVault.tsx:214`).

---

## §E — Card de proyecto: crece al active + insertar logo (item #6) — QUICK WIN

### Síntoma
> "La card de un proyecto creado, cuando está seleccionada (active), agranda su
> alto (no debería). Y una vez subido/generado un logo, insertarlo chiquito ahí
> en lugar del icono preseleccionado."

### Root cause (VERIFICADO)
`ProjectStrip` en `AssistantProjectOrbit.tsx:112-160`. El card activo añade un
`<span>` extra (línea 138-142) con el label `stripActive` que **suma altura** solo
cuando está `on`. Los no-activos no lo tienen → diferencia de alto.
El icono es `KIND_META[p.kind]?.icon` (línea 127) — nunca usa `p.logoUrl`.

### Fix
1. **Altura estable:** reservar el espacio del label siempre. Opciones:
   - Poner el `<span>` `stripActive` siempre presente pero `invisible`/`opacity-0`
     cuando no está `on` (ocupa layout, no salta), o
   - Posicionarlo `absolute` dentro del card (no afecta flujo), o
   - Darle al card `min-h-[...]` fijo. Recomendado: opción absolute o invisible.
2. **Logo en vez de icono** (línea 126-127):
   ```tsx
   {p.logoUrl ? (
     // eslint-disable-next-line @next/next/no-img-element
     <img src={p.logoUrl} alt="" className="h-4 w-4 rounded object-cover" />
   ) : (
     <span aria-hidden>{KIND_META[p.kind]?.icon ?? "🧩"}</span>
   )}
   ```
   `SessionProjectLite` ya tiene `logoUrl` (línea 38). `updateSessionProject`
   ya lo setea cuando se sube/genera el logo (branding route). Verificar que
   `/api/assistant/projects` devuelve `logoUrl` en el listado que alimenta el strip.

### Archivos
- `components/assistant/AssistantProjectOrbit.tsx` (`ProjectStrip`).

---

## §F — 3 botones generate no andan + separarlos/guiar (item #7)

### Síntoma
> "Al terminar el último multisteps de preguntas te habilita 3 botones en UNA
> card: generate map, generate home, generate screen. Ninguno funciona. Buena la
> idea pero separados, más guiado: generar mapa (genera todo el stack tecnológico
> en un txt que se guarda), generar home (imagen chiquita en el chat, clickeable
> para abrir), etc. Integrar el vault/canon."

### Estado actual (verificado)
`GenerationBoard` (`AssistantFlow.tsx:465-592`). Los 3 controles están en UNA
card (`rounded-2xl border ... p-3.5`, línea 550): map + home en una fila, screen
con input. Llaman `POST /api/assistant/generate` con `target: map|home|screen`.

### Por qué "no funciona" — hipótesis a VERIFICAR (medir primero)
El board sólo se muestra en fase `consolidated`+ . Posibles causas del fallo:
1. `mockupsEnabled()` false (sin `OPENROUTER_API_KEY`) → 503. **Verificar la key
   en la instancia viva.**
2. La fase del proyecto no llegó a `consolidated` (el board aparece pero el
   backend rechaza) — revisar `generate/route.ts` gating de fase.
3. Caps `ASSET_ROLE_CAPS` alcanzados (409) → muestra `t.gLimit` pero el usuario
   lo lee como "no anda".
4. Error real de generación (502) → muestra `t.bFail`.

**Cómo medir:** abrir DevTools Network en `:3001`, tocar cada botón, ver el
status y el body de la respuesta de `/api/assistant/generate`. Anotar. Revisar
también eventos `ai.tool.failed`. NO asumir.

### Objetivo (rediseño guiado)
1. **Separar en 3 tarjetas** distintas, verticales, cada una con su copy y su
   resultado inline:
   - **Generar mapa** → hoy genera una imagen infográfica. El usuario quiere que
     ADEMÁS (o en vez de) genere el **stack tecnológico completo en un .txt que se
     guarda**. Plan: agregar `target:"map"` un modo texto — el orchestrator/LLM
     produce el stack+arquitectura como texto, se persiste como asset de rol
     `map` con la imagen + un archivo de texto (nuevo rol `spec` o campo). Guardar
     vía `addAsset` / un nuevo endpoint. Mostrar el txt descargable en el chat.
   - **Generar home** → genera la imagen; mostrarla **chiquita inline en el chat**
     y clickeable para abrir en lightbox (reusar el lightbox del vault). Hoy el
     `GenerationBoard` no muestra la imagen inline, solo refresca el vault.
   - **Generar screens** → mantener input + genera 1 por vez, inline.
2. Cada resultado se integra al canon/VaultStrip (§A) automáticamente.
3. Estados claros: "generando…", límite alcanzado (con el cap), error con retry.

### Archivos
- `components/assistant/AssistantFlow.tsx` (`GenerationBoard`).
- `app/api/assistant/generate/route.ts` (modo txt para map; devolver la URL del
  asset generado para render inline).
- Posible nuevo rol/persistencia en `lib/agent/project-workspace.ts` para el .txt.

---

## §G — Cierre de ciclo top-tier (item #8)

### Síntoma
> "Mejor culminación/cierre del ciclo/proyecto: que me dé mi formulario de contacto
> con número de sesión, o una miniapp para enviar request. Algo bien completo top
> tier."

### Estado actual
No hay una pantalla de cierre. La fase termina en `ready` (conversación libre).
El sitio ya tiene Formspree (`xanbvlqw`) y `ContactSection`, y hay
`session_started`/dossier por sesión (`al_sid` cookie).

### Objetivo
Al llegar a `ready` (o botón "cerrar proyecto"), mostrar una **tarjeta de cierre**
tipo mini-app: resumen del proyecto (nombre, palette, assets, decisiones) + un
formulario de contacto pre-cargado con el **número/ID de sesión** (`al_sid`) y el
projectId, que envía la request (Formspree o `/api/contact`) para que Juan reciba
todo el canon del visitante.

### Plan
1. Nuevo componente `ProjectCloseCard` en `AssistantFlow.tsx` (o archivo propio),
   visible en `ready`.
2. Form con nombre/email/mensaje + hidden `sessionId` (`al_sid`) + `projectId` +
   resumen serializado del workspace.
3. Enviar a `/api/contact` (existe) o Formspree; confirmar recepción con toast.
4. Incluir el nº de sesión visible ("Ref: <sid corto>") para trazabilidad.
5. Enlazar al dossier admin `/admin/sessions/[id]` en el email (ya hay ese patrón
   en los hitos — ver decisiones FINIQUITO en claude_state.json).

### Archivos
- `components/assistant/AssistantFlow.tsx` (o nuevo `ProjectCloseCard.tsx`),
  `AssistantWidget.tsx` (montarlo en `ready`), `app/api/contact/route.ts`.
