# EXEC LOG 03 — 2026-07-05 (Hall REVERT + R6 email tracking)

## 1. Hall of Fame — REVERT total (a pedido del usuario)
El usuario: "sigue buggeándose, superponiéndose, glitcheando, de hecho peor,
con menos movimiento que ANTES de todo. Revertí los últimos cambios y dejalo
como estaba, documentando lo que intentaste."

### Qué se intentó (2 sesiones) y por qué falló
- **EXEC_LOG_01 (engine-tween v1)**: reescribí el coverflow con el recipe de
  Embla (scrollProgress + loopPoints). BUG propio: la corrección de wrap
  comparaba `snapIndex === loopItem.index`, pero `loopItem.index` es índice de
  SLIDE → nunca matcheaba → el diff del borde quedaba sin corregir → seguía el
  encimado+reset. Además, con diff continuo a 48% basis los vecinos casi no se
  transformaban → se veían grandes/estáticos.
- **EXEC_LOG_02 (engine-tween v2)**: corregí la wrap-key (slideIndex) + amplifiqué
  (`dist=diff*total`). tsc/bundle OK. PERO el usuario reportó que SEGUÍA
  buggeado y con peor movimiento. (Posibles causas no confirmadas: la
  amplificación + duplicación de slides `[...items,...items]` para <5 flagships
  crea un anillo donde el mapping snap↔slide con dos copias no cierra; o el
  imperative-style transform pelea con el layout a 48% basis. No se pudo
  diagnosticar más sin ver el runtime en vivo del usuario.)

### Decisión
Revertir 100% al coverflow ORIGINAL (discrete offset por índice + CSS
`transition-all duration-500`), que el usuario prefiere aunque tenga el desync
histórico — porque el LOOK y el MOVIMIENTO eran mejores. Se conserva el
edge-fade mask del track (eso SÍ le gustó). Archivos:
`components/hall/HallOfFameGrid.tsx` restaurado:
- init `useEmblaCarousel({ loop:true, align:"center" })` (sin containScroll).
- removido `nodesRef` + el `useEffect` de tween completo.
- `import { cn }` restaurado, `useRef` removido.
- `slides.map` con `offset = ((i - selected + total + floor(total/2)) % total) -
  floor(total/2)`, `transition-all duration-500`, transform discreto
  (rotateY ±26 / scale 0.88 / translateZ -90 en desktop; scale 0.9 en mobile).

### Estado del bug histórico (SIN resolver, documentado)
El desync al carruselear (encimado→reset) es un problema conocido del coverflow
con `loop:true` + slides duplicados. La ruta segura NO intentada aún:
`loop:false` (sin reorder → cero desync) aceptando perder el infinito, o
eliminar la duplicación y usar suficientes slides reales. Queda como el próximo
experimento si el usuario quiere atacarlo de nuevo — pero pidió dejarlo como
estaba por ahora.

## 2. R6 — Email tracking con links jpamorosi.dev (loop outbound→inbound)
Cierra el círculo que arrancó con R5 (harvest de emails): emails salientes con
links rastreables → click atribuido a lead/prospecto → deja de ser huérfano.

### Cambios
- `lib/db/bootstrap.ts`: tabla `tracked_links (token PK, lead_id, prospect_id,
  campaign, target_url, clicks, clicked_at, created_at)` + índices. Aditivo.
- `lib/events.ts`: eventos `lead.link.created` / `lead.link.clicked`.
- `lib/email/tracking.ts` (NUEVO): `createTrackedLink({target,campaign,leadId,
  prospectId})` → token opaco (randomBytes base64url), inserta, devuelve
  `${SITE_URL}/api/track/<token>`; `resolveAndRecordClick(token)` → bumpea
  clicks + stampa clicked_at + event → devuelve target. Valida target http(s).
- `app/api/track/[token]/route.ts` (NUEVO): GET → resolveAndRecordClick → 302 a
  target con `Cache-Control: no-store` (Cloudflare no cachea el redirect).
  Token desconocido/DB down → redirige al home, nunca 500.
- `app/api/admin/track-link/route.ts` (NUEVO): guardAdmin + zod → mint de link
  para pegar en emails. (Cast `as TrackedLinkInput` por quirk de inferencia zod.)

### Pendiente de R6 (para completar el loop, documentado)
- Envolver los CTAs de los templates de `lib/email/service.ts` con
  `createTrackedLink` (campaña por hito).
- Bind loginless: en el click, setear/asociar cookie `al_sid` a la sesión del
  lead (hoy sólo registra el evento).
- Timeline de clicks en el dossier admin (`/admin/sessions/[id]`, `/admin/leads`).
- Secuencias de follow-up por estado en `heartbeat` según si clickeó.

## Verificación (HECHA, en vivo :3001)
- tsc 0. Rebuild+recreate OK, health ok.
- Hall revertido: el `page` chunk nuevo ya NO usa el tween (el grep de
  `loopPoints`=1 es un chunk hasheado VIEJO que Next dejó en /static, no el
  servido). Fuente restaurada al original + tsc limpio.
- **R6 PROBADO E2E**: `ensureSchema` creó `tracked_links` al primer hit.
  - `/api/track/nonexistent` → 302 al home. ✓
  - insert token de prueba → `/api/track/testtok123` → **302 a
    https://jpamorosi.dev/cv**, `Cache-Control: no-store`. ✓
  - DB tras el click: `clicks=1, clicked_at` seteado (+ evento
    `lead.link.clicked`). ✓ → el tracking funciona punta a punta.
