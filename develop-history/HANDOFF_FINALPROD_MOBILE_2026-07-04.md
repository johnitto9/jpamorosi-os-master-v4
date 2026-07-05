# Handoff FINALPROD — Mobile interlude animations (sessions 1–9, 2026-07-04)

> **Propósito de este doc**: que cualquier agente (humano o AI) que tome
> el caso pueda entender de un vistazo qué pasó, qué se intentó, qué
> funciona, qué NO funciona, y por dónde seguir investigando. Asume
> cero contexto previo.

---

## 1. TL;DR ejecutivo

- **Desktop choreography**: funciona ("flama" — confirmado por el
  usuario en sesiones previas). Arquitectura: una timeline scrubbed por
  escena, hook `useSceneChoreography(build)`, selector scoped a
  `[data-scene]` (fix S6), sin scrollerProxy. NO TOCAR.
- **Mobile choreography**: **NO funciona visualmente** después de 9
  iteraciones. El usuario reporta "sin animación, todo colapsado desde
  el inicio hasta el fin de la sección" de forma consistente.
- **Causa raíz sospechada pero NO confirmada**: Lenis 1.x con
  `wrapper` + `content` puede no estar actualizando `wrapper.scrollTop`,
  por lo que ScrollTrigger no recibe el evento de scroll y la timeline
  nunca avanza. **Esto es la hipótesis principal a verificar**.
- **Observabilidad disponible**: `__IL_DEBUG__.snapshot()` +
  `__IL_DEBUG__.play(progress)` + `__IL_DEBUG__.scrollTop()` +
  `__IL_DEBUG__.wrapperInfo()` + `__IL_DEBUG__.reducedMotion()`,
  todos en `window`. MobileDebugIndicator visible en mobile con
  botones TEST (▶ 0.3, ▶ 0.6, snapshot).

## 2. Contexto del proyecto

- **Repo**: `C:\Users\jamor\Downloads\jpamorosi-os-master-v4`
- **Frontend**: `frontend-app/` (Next.js + Tailwind v4 + GSAP + Lenis)
- **Backend**: Docker, profile `backend`, port `3001`, container
  `jpamorosi-os-master-v4-amorosi-backend-1`. El container `:3000`
  (web) fue **matado en sesión 6** — sólo usar `:3001`.
- **Runtime stack**: Next.js 15 production build con `dynamic =
  "force-dynamic"`, ScrollStage wrapper con Lenis 1.x, GSAP 3.x con
  ScrollTrigger plugin, Lenis integrado vía `gsap.ticker.add` (sin
  scrollerProxy — S9).
- **Usuario**: Juan Pablo Amorosi. Mobile-first (viewport ≤1023px en
  el test device), escribe en español con typos informales, trabaja
  con su iPhone apuntando a `localhost:3001` (probablemente vía
  proxy o red local). El dev container de él está en Windows /
  PowerShell.

## 3. Estructura del home y de los interludes

- `app/page.tsx` renderiza en orden:
  1. `<ScrollStage>` (main con Lenis)
  2. `HallHero` (con scroll cue "SCROLL" — ese es el texto que el
     usuario ve arriba en su screenshot, NO viene de `ScrollWatermark`)
  3. `<BeforeTheSystems t={t.il1} />`
  4. `<SectionTransition>` + `HallOfFameGrid`
  5. `<PortfolioSystemInterlude t={t.il2} />`
  6. `<SectionTransition>` + `FeaturedSystemsGrid`
  7. `<LivingLayerInterlude t={t.il3} />`
  8. `<SectionTransition>` + `LabArchiveGrid`
  9. `<SectionTransition>` (Contact) + `ContactSection`
  10. `<SectionTransition>` (OS CTA) + footer
  11. `<AssistantWidget />` + `<GuidedTour />`
- **Cada interlude** (`components/hall/Interludes.tsx`) es un componente
  que llama `useSceneChoreography(build, mobile)` y retorna:

  ```jsx
  <section ref={root} id="before-the-systems" className="relative scroll-mt-20">
    <MobileStatic t={t} accent="amber" image={IMG.before1} emoji="🏪" />
    <MobileScene1 t={t} />           {/* lleva el <MobileDebugIndicator /> adentro */}
    <div data-scene className="hidden lg:block min-h-[320vh]">   {/* desktop choreography */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <SceneGlow ... />
        {/* .il-eyebrow, .il-head, .il-body, .il-thread, .il-card-a,
            .il-card-b, .il-word (×5) — desktop scrubbed timeline */}
      </div>
    </div>
  </section>
  ```

- **MobileScene1/2/3**: cada uno con `data-scene-mobile`, sticky inner
  stage, flex-col con slots `il-narrative` / `il-print-slot` /
  `il-words-band` (o equivalents scene 2/3: `il-layers`, `il-rail-block`).
- **MobileStatic**: fallback reducido para `prefers-reduced-motion: reduce`
  o no-JS. Hidden cuando motion está permitido.
- **Desktop choreography** (`build(tl, q)`): la timeline original, S6
  fix de scope (`gsap.utils.selector(section)`, NO rootEl), una sola
  partitura. NO TOCAR.
- **Mobile choreography** (`mobile(q, { scroller, section })`): desde
  S9, una sola timeline scrubbed por escena con `id: "il-mobile-1/2/3"`,
  `tl.set(...)` en t=0 para initial states, `tl.to(...)` en posiciones
  progresivas (0.02, 0.06, 0.12, 0.20, 0.40, 0.42, 0.62, etc.).
  El `scrollTrigger` está bound a la `section` con `start: "top top"`,
  `end: "bottom bottom"`, `scrub: 0.6`.

## 4. Las 9 iteraciones — qué se intentó, qué se rompió

| Sesión | Commit | Idea central | Resultado |
|--------|--------|--------------|-----------|
| S1 | `f56bc09` | Seedream lock-in, palette via `describePalette`, mobile reveal branch | Build OK, mobile no anda |
| S2 | `ce4d7eb` | Vault z-index fix; añade MobileStatic + MobileScene1/2/3 con `data-scene-mobile` | Layout OK, animation OK desktop, mobile sin animar |
| S3 | `030b1eb` | `querySelector` (singular) → `querySelectorAll` para wirear `.m-rise`/`.m-chip` en mobile | Fix de query, mobile aún no anda |
| S4 | `32da19a` | "1:1 architectural parity" — refactor hook con `mobileBuild(tl, q)`, vertical scrubbed timeline en mobile | Mobile más rico pero user reporta "no es 1:1 con desktop" |
| S5 | `0351f2c` | Layout tune: flex-col, `line-clamp-3`, defensive `opacity-0` + `gsap.set()` block | Layout mejora, animation aún no anda |
| S6 | `86f7c1c` | **CRÍTICO**: fix scope desktop (`selector(section)` no `rootEl`) — 10 words iteraban en vez de 5. **Mobile**: per-element toggleActions | Desktop fix. **Mobile introduce nuevo bug** (fossils: 2 fromTo por target) |
| S7 | `6b228dd` | Trigger es la SECTION (no el element — sticky stage fija posición) | Teóricamente correcto, mobile aún no anda |
| S8 | `36c2e9d` | Lenis+ScrollTrigger scrollerProxy + dramatic mobile anims | **Falsa premisa**: Lenis 1.x no usa transform, scrollerProxy innecesario. Fossils empeoran. |
| S8-debug | `d1e4e05` | MobileDebugIndicator (initial bug: miraba MobileStatic) | Indicador agregado pero con selector mal |
| S9 | `ce9c403` | **Cirugía controlada**: revertir scrollerProxy, UNA timeline scrubbed por escena, fossils eliminados, `__IL_DEBUG__.snapshot()` | Architecture limpia. **Pero el user no confirmó si anda** — sigue en limbo. |

### Lo que ChatGPT identificó (S9 driver)

> "Acumulación de fósiles. S2–S8 dejaron múltiples fromTo escribiendo
> sobre los mismos targets (.il-card-a, .il-word, .il-flow, .il-layer,
> .il-screen, etc.) con diferentes start positions, durations, eases,
> toggleActions. Con immediateRender y stacked ScrollTriggers, el
> resultado visual es cual escribió último."
>
> "S8 scrollerProxy fue construido sobre premisa falsa. Lenis 1.x en
> modo wrapper+content anima scrollTop del wrapper (no transform del
> content), entonces el proxy era innecesario."
>
> "El bug no es 'GSAP difícil'. Es arqueología de estado."

## 5. El estado actual del código (post-S9)

### `components/ui/scroll-stage.tsx`

- Wrapper: `<main ref={ref} className={className}>` (de page.tsx:
  `"no-scrollbar relative h-full w-full overflow-y-auto overflow-x-hidden
  text-primary-text antialiased"`).
- Lenis: `new Lenis({ wrapper, content, duration: 1.15, smoothWheel:
  true, touchMultiplier: 1.4 })` — sólo se inicializa si
  `prefers-reduced-motion: reduce` está OFF.
- Integración canónica Lenis+GSAP (S9):
  ```ts
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  ```
- `gsap.registerPlugin(ScrollTrigger)` ya está en este file.

### `components/hall/Interludes.tsx`

- `useSceneChoreography(build, mobile?)`:
  - matchMedia desktop: `(min-width: 1024px) and (prefers-reduced-motion: no-preference)`, selector scoped a `[data-scene]`, timeline scrubbed (`scrub: 1`).
  - matchMedia mobile: `(max-width: 1023px) and (prefers-reduced-motion: no-preference)`, selector scoped a `[data-scene-mobile]`, timeline scrubbed (`scrub: 0.6`, `id: "il-mobile-1/2/3"`).
- **Mobile build actual (S9)** para Scene 1 — UNA timeline con `tl.set` en t=0 y `tl.to` progresivos. Ejemplo:
  ```ts
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      id: "il-mobile-1",
      trigger: section,
      scroller,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  tl.set(q(".il-eyebrow"), { y: 24, autoAlpha: 0 }, 0)
    .set(q(".il-head"),    { y: 40, rotate: -3, autoAlpha: 0 }, 0)
    .set(q(".il-body"),    { y: 24, autoAlpha: 0 }, 0)
    .set(q(".il-card-a"),  { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: -8 }, 0)
    .set(q(".il-card-b"),  { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: 8 }, 0)
    .set(q(".il-thread"),  { scaleY: 0, transformOrigin: "top center" }, 0)
    .set(q(".il-word"),    { autoAlpha: 0, yPercent: 90, scale: 0.75, rotate: 0 }, 0);

  tl.to(q(".il-eyebrow"), { y: 0, autoAlpha: 1, duration: 0.08 }, 0.02)
    .to(q(".il-head"),    { y: 0, rotate: 0, autoAlpha: 1, duration: 0.12, ease: "power3.out" }, 0.06)
    .to(q(".il-body"),    { y: 0, autoAlpha: 1, duration: 0.10 }, 0.12)
    .to(q(".il-card-a"),  { yPercent: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 0.18, ease: "power3.out" }, 0.20)
    .to(q(".il-card-a"),  { yPercent: -18, scale: 0.96, duration: 0.14 }, 0.45)
    .to(q(".il-card-a"),  { autoAlpha: 0, yPercent: -120, duration: 0.14 }, 0.62)
    .to(q(".il-card-b"),  { yPercent: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 0.18, ease: "power3.out" }, 0.42)
    .to(q(".il-card-b"),  { yPercent: -18, duration: 0.15 }, 0.65)
    .to(q(".il-thread"),  { scaleY: 1, duration: 0.5, ease: "power2.out" }, 0.20);

  const words = q(".il-word");
  const wordCount = words.length;
  words.forEach((w, i) => {
    const inAt = 0.30 + i * 0.08;
    const outAt = inAt + 0.12;
    tl.set(w, { rotate: i % 2 ? 6 : -6 }, 0);
    tl.to(w, { autoAlpha: 1, yPercent: 0, scale: 1, rotate: 0, duration: 0.07, ease: "back.out(1.7)" }, inAt);
    if (i < wordCount - 1) {
      tl.to(w, { autoAlpha: 0, yPercent: -80, scale: 0.9, duration: 0.06 }, outAt);
    }
  });
  ```
- Mismo patrón para Scene 2 (`il-mobile-2`) y Scene 3 (`il-mobile-3`).
- `__IL_DEBUG__` expuesto en `window` con snapshot, play, scrollTop,
  wrapperInfo, reducedMotion.
- `MobileDebugIndicator` agregado **sólo en MobileScene1** con botones
  ▶ 0.3, ▶ 0.6, snapshot.

## 6. La hipótesis pendiente (lo más probable)

**Lenis 1.x con `wrapper` + `content` puede NO actualizar
`wrapper.scrollTop`**. Si Lenis sólo aplica `transform: translate3d(0,
-Y, 0)` al `content` sin tocar el scrollTop del wrapper, entonces
ScrollTrigger (que mira `wrapper.scrollTop` por default) ve siempre 0 y
la timeline nunca avanza. El Lenis 1.3.x docs oficial dice que esta
integración funciona, pero no está 100% confirmado en este stack.

**Cómo verificarlo** (1 minuto en el browser del user):
1. Hard-refresh mobile en `:3001`.
2. Abrir DevTools console.
3. Pegar: `__IL_DEBUG__.wrapperInfo()`.
4. Swipe hacia abajo en la sección BEFORE THE SYSTEMS.
5. Si `scrollTop` se queda en 0 siempre, **Lenis no está actualizando
   el scrollTop del wrapper** → la timeline nunca arranca.
6. Si `scrollTop` cambia con el swipe, **entonces la timeline debería
   avanzar** y el problema es otro (visual, transformOrigin, z-index).

**Si se confirma la hipótesis**, las opciones son:
1. **Volver a `scrollerProxy`** pero con la API correcta para Lenis 1.x
   (no `pinType: "transform"` — la Lenis API real usa
   `ScrollTrigger.scrollerProxy(wrapper, { scrollTop: () => lenis.scroll,
   getBoundingClientRect: () => ({...viewport...}) })` SIN `pinType`).
2. **Forzar `wrapper.scrollTop` updates** desde el tick de Lenis
   (`wrapper.scrollTop = lenis.scroll` en `lenis.raf`).
3. **Cambiar la integración a `Lenis({ wrapper: window, content: ... })`**
   (default Lenis) y dejar que ScrollTrigger use el window — pero eso
   rompe el `<main>` como scroll container.

## 7. Herramientas de debug disponibles

### En el browser del user

```js
// ¿Está corriendo la timeline? ¿Avanza con el scroll?
__IL_DEBUG__.snapshot()
// → [{ id: "il-mobile-1", progress: 0.0–1.0, isActive: true, ... }]

// Forzar la timeline a un progress (independiente del scroll)
__IL_DEBUG__.play(0.3)
__IL_DEBUG__.play(0.6)

// ¿Lenis está actualizando el scrollTop del wrapper?
__IL_DEBUG__.scrollTop()  // debería cambiar al hacer swipe
__IL_DEBUG__.wrapperInfo()
// → { scrollTop, scrollHeight, clientHeight, hasOverflow, hasLenis, viewportHeight }

// ¿El user tiene reduced-motion activado?
__IL_DEBUG__.reducedMotion()  // true = mobile NO va a animar nunca
```

### En el mobile, además, hay un overlay visual

El `MobileDebugIndicator` aparece como un cuadradito cyan en la
esquina inferior-izquierda del mobile scene (sólo en Scene 1
actualmente). Tiene botones:
- ▶ 0.3 / ▶ 0.6 → llama `__IL_DEBUG__.play(0.3)` / `play(0.6)`
- snapshot → loguea `__IL_DEBUG__.snapshot()` en console

El overlay muestra en tiempo real:
- Sec top / Sec height (bounding rect del data-scene-mobile)
- card-a opacity (del getComputedStyle)
- words visible (N/total)
- wrap scrollTop (del `<main>`)
- Lenis: present / ?
- reducedMotion: ON ⚠ / off

## 8. Verificación al tomar el caso

### Comandos para verificar el estado actual

```bash
# ¿Está vivo el backend?
curl -s http://127.0.0.1:3001/api/health
# → {"ok":true}

# ¿Cuál es el chunk de la page actual?
curl -s "http://127.0.0.1:3001/" | grep -oE '/_next/static/chunks/app/page-[\w]+\.js'

# ¿Está el código S9 deployed? (buscar il-mobile-1)
curl -s "http://127.0.0.1:3001/_next/static/chunks/app/page-XXXX.js" | grep -c "il-mobile-1"
# → debería ser 1 (o más)
```

### Git log reciente

```
ce9c403 fix(finalprod-s9): one scrubbed timeline per mobile scene + remove scrollerProxy
d1e4e05 chore(finalprod-s8-debug): add visible mobile animation debug indicator
36c2e9d fix(finalprod-s8): Lenis+ScrollTrigger scrollerProxy + dramatic mobile animations
6b228dd fix(finalprod-s7): mobile trigger is the SECTION (not the element) — sticky fix
86f7c1c fix(finalprod-s6): mobile per-element triggers + critical desktop selector scope fix
0351f2c fix(finalprod-s5): mobile layout tune + defensive gsap.set for words/flow
32da19a feat(finalprod-s4): 1:1 mobile/desktop architectural parity — vertical scrubbed timelines
030b1eb fix(finalprod-s3): wire mobile reveals via querySelectorAll on [data-scene-mobile]
ce4d7eb feat(finalprod-s2): vault z-index at chat hierarchy + rich mobile interludes
f56bc09 feat(finalprod): mobile interludes, palette→generation, reference-image fix, Seedream lock-in
```

## 9. Plan de investigación (next steps concretos)

### Paso 1 — Verificar la hipótesis Lenis
Pegar en la consola del mobile:
```js
__IL_DEBUG__.wrapperInfo()
__IL_DEBUG__.scrollTop()
// Hacer swipe. Si scrollTop no cambia, Lenis no está moviendo el wrapper.
```

### Paso 2 — Si Lenis no actualiza scrollTop
**Opción A (menos invasiva)**: agregar `wrapper.scrollTop = lenis.scroll` en
el tick de Lenis. Modificar `scroll-stage.tsx`:
```ts
const tick = (time) => {
  lenis.raf(time * 1000);
  if (wrapper) wrapper.scrollTop = lenis.scroll;  // ← forzar sync
};
```
**Opción B (canónica)**: scrollerProxy real (sin `pinType`):
```ts
ScrollTrigger.scrollerProxy(wrapper, {
  scrollTop: (value) => value === undefined ? lenis.scroll : lenis.scrollTo(value, { immediate: true }),
  getBoundingClientRect: () => ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }),
});
lenis.on("scroll", ScrollTrigger.update);
```

### Paso 3 — Si Lenis SÍ actualiza scrollTop pero la timeline no avanza
Debug más profundo. Posibilidades:
- `scroller` no se está pasando correctamente al ScrollTrigger.
- El `useGSAP` hook no se está ejecutando (verificar console para
  `[S9 sc1] mobile build running`).
- Hay un error de TypeScript/runtime que rompe la timeline.
- El `gsap.context()` o el matchMedia cleanup está matando la timeline
  prematuramente.

### Paso 4 — Si la timeline avanza pero no se ve
Debug visual:
- `getComputedStyle(cardA).transform` debería cambiar al hacer scroll.
- Si el transform cambia pero no se ve → `overflow: hidden` del sticky
  stage está clippeando el card cuando sale/entra. Solución: cambiar a
  `overflow-visible` o reposicionar.
- Si el transform no cambia → `tl.set` no se aplicó, o el `q()` no
  encontró el elemento.

### Paso 5 — Una vez que funcione
1. Remover `MobileDebugIndicator` de MobileScene1.
2. Mantener `__IL_DEBUG__` (es liviano, dev-only).
3. Verificar desktop intacto (debería estar — el fix S6 preservó el
   scope, y S9 no tocó `build(tl, q)`).
4. Hacer un rebuild final y commit.

## 10. Lo que NO hay que hacer (lecciones aprendidas)

- **No añadir CSS animations** — el user fue explícito: "el approach
  jamas debe ser cambiar gsap, nunca. queremos solución arquitectónica
  segura, y top tier."
- **No acumular más fossils** — cada iteración que dejó código
  duplicado empeoró las cosas. Antes de añadir, **borrar** lo que
  no sirve.
- **No confiar en "QA" tipo contar strings en el bundle** — eso sólo
  prueba que el texto está compilado, no que la animación funcione.
  Usar `__IL_DEBUG__.snapshot()`.
- **No tocar el desktop `build(tl, q)`** — está confirmado funcionando
  y el user lo cuida. El fix S6 del scope es la única modificación
  permitida ahí.
- **No usar `scrollerProxy` con `pinType: "transform"`** — premisa
  falsa sobre Lenis 1.x (S8 lo confirmó).

## 11. Archivos críticos

| Path | Qué hay | Estado |
|------|---------|--------|
| `frontend-app/components/hall/Interludes.tsx` | Mobile scenes + useSceneChoreography + `__IL_DEBUG__` + MobileDebugIndicator | S9 architecture limpia. MobileScene2/3 sin debug indicator (sólo Scene 1). |
| `frontend-app/components/ui/scroll-stage.tsx` | ScrollStage con Lenis+GSAP canonical integration | S9 — sin scrollerProxy, sin pinType. Verificar si Lenis actualiza wrapper.scrollTop. |
| `frontend-app/app/page.tsx` | Home con ScrollStage | OK |
| `frontend-app/app/layout.tsx` | Body `h-screen w-screen overflow-hidden` | OK |
| `frontend-app/app/globals.css` | Tailwind + custom rules (oculta Next dev indicator) | OK |
| `frontend-app/tailwind.config.js` | Content paths incluyen `./components/**/*` | OK |
| `frontend-app/components/assistant/AssetVault.tsx` | Vault z-index fix (S2) | OK |
| `frontend-app/components/assistant/AssistantWidget.tsx` | Widget | OK |
| `develop-history/PHASE_FINALPROD_S[1-9]_2026-07-04.md` | 9 logs de sub-fases | Documentados |
| `develop-history/claude_state.json` | Estado + decisiones acumuladas | phase: "FINALPROD_S9_DONE" |

## 12. TL;DR para el próximo agente

> **Mobile interlude animations no funcionan en mobile (BEFORE THE
> SYSTEMS / INSIDE THE PROOF / LIVING LAYER). Desktop funciona.
> Arquitectura GSAP limpia post-S9 (una timeline scrubbed por escena,
> sin fossils, sin scrollerProxy). La hipótesis más probable es que
> Lenis 1.x con `wrapper`+`content` no está actualizando
> `wrapper.scrollTop`, por lo que ScrollTrigger ve siempre 0 y la
> timeline nunca avanza. Verificar con `__IL_DEBUG__.scrollTop()`
> mientras el user hace swipe en mobile. Si scrollTop se queda en 0,
> agregar `wrapper.scrollTop = lenis.scroll` en el tick de Lenis o
> usar scrollerProxy (sin pinType). Una vez que la timeline avance,
> remover MobileDebugIndicator y commit final.**

---

**Si tenés que pedirle algo al user**: él está testeando en mobile
contra `:3001`. Pedile el output de `__IL_DEBUG__.wrapperInfo()` y
`__IL_DEBUG__.snapshot()` mientras scrollea — eso te va a decir
exactamente qué pasa. Si te dice "no anda", no asumas, pedí el
output concreto. Las 9 sesiones anteriores muestran que asumir
causa raíz sin medición lleva a más fossils.

**Memoria del agente que sigue**: este user odia iterar en lo
mismo. Si vas a proponer un fix, **medí primero** (con
`__IL_DEBUG__`), y si tu fix no resuelve, **revertí** antes de
apilar más. La regla de oro: una hipótesis = un experimento =
un commit. Si el experimento falla, el revert va en el mismo commit
o en el siguiente, no se acumulan.
