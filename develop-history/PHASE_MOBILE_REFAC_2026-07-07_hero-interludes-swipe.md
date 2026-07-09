# Change Log: 2026-07-07 - Refac mobile final (hero + interludios + swipe + nav)

## 1. Objetivo
Refac de pulido enfocado en MOBILE del Hall (home). 8 pedidos concretos del usuario.

## 2. Revisión previa
- Home = `frontend-app/app/page.tsx` (ScrollStage/Lenis + GSAP ScrollTrigger).
- Escenas GSAP: `components/hall/Interludes.tsx` (desktop `[data-scene]` scrubbed
  horizontal; mobile `MobileScene1/2/3` scrubbed vertical + `MobileStatic` fallback
  reduced-motion).
- Hero: `components/hall/HallHero.tsx` (+ `HeroStartButton.tsx`).
- Barra lateral: `components/ui/chapter-nav.tsx` (estaba `hidden md:block`).

## 3. Cambios aplicados (con paths)
1. **Efecto de texto hero "top tier / raro"** — `app/globals.css` `.lab-shimmer-text`:
   agregado hue-drift holográfico (`lab-holo-hue`) + glitch cromático RGB-split
   raro vía pseudo-elementos `::before/::after` (`content: attr(data-text)`,
   `lab-glitch-a/b`). `HallHero.tsx`: h1 ahora lleva `data-text={profile.name}`.
2. **Botones arriba de la imagen de perfil (mobile)** — `HallHero.tsx`: reordenado
   con `order-*` en mobile → texto (1) · botones (2) · imagen (3) · capabilities (4).
   Desktop intacto (`md:order-none`).
3. **Swipe "solo hacia abajo" con dedito** — nuevo `components/hall/SwipeCue.tsx`
   (SVG mano + chevrons, CSS puro, sin librería nueva; anim `lab-swipe-*` en
   globals.css). Reemplaza el scroll-cue viejo en mobile del hero (desktop mantiene
   la cápsula "scroll").
4. **Fix del glitch GSAP (aparece/desaparece/reaparece)** — causa raíz: en las
   escenas mobile la narrativa (`.il-eyebrow` = "before the systems", `.il-head` =
   "Primero…", `.il-body`) se renderizaba VISIBLE en SSR y recién después GSAP la
   ocultaba. Fix: agregado `opacity-0` a esos elementos en `MobileScene1/2/3`
   (igual que los `.il-word`, que nunca parpadeaban). Ahora sólo aparecen AL COMPÁS
   de la timeline. Desktop no se toca (usa `.from()`, fail-safe visible).
5. **"Before the systems": subir textos (comercio/fricción/Alún)** — `MobileScene1`:
   la words-band pasó de slot inferior a estar anclada `absolute top-1/2 mt-[5.5rem]`
   dentro del print-slot → justo debajo de las cards (cards sin moverse, siguen
   centradas).
6. **"Inside the proof": subir las boxes** — `MobileScene2`: `il-layers`
   `bottom-[20%]` → `bottom-[32%]` (screen/card sin tocar).
7. **ChapterNav en mobile** — `chapter-nav.tsx`: ya no `hidden`; rail compacto
   dots-only a la derecha (`right-2.5 md:right-7`), conectores/labels sólo desktop
   (`max-md`/`md:` gates), `pointer-events-none` en el `<nav>` + `pointer-events-auto`
   en los knobs para no bloquear el scroll táctil.
8. **Swipe cue al pie de cada escena GSAP** — `<SwipeCue>` agregado al fondo de
   `MobileScene1/2/3` (tono amber/cyan/violet).

## 4. Implicancias técnicas
- Trade-off del fix #4: si GSAP no inicializa en mobile-motion, la narrativa queda
  oculta (mismo trade-off que ya tenían los `.il-word`). El path reduced-motion/no-JS
  usa `MobileStatic` (narrativa visible), así que la degradación real está cubierta.
- `.lab-shimmer-text` pasó a `display:inline-block` (necesario para los ghosts del
  glitch). Único uso = h1 del hero, layout sin cambios.

## 5. Testing (comandos y resultados)
- `npx tsc --noEmit` → EXIT 0.
- Pendiente: verificación visual en :3001 (docker) — requiere rebuild manual.

## 6. Persistencia
- claude_state.json: sin cambio de fase (refac de pulido).
