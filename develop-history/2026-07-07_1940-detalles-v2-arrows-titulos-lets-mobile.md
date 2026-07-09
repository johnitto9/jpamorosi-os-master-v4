# Change Log: 2026-07-07 19:40 - Aclaraciones (flechas / títulos tempranos / lets mobile)

## 1. Objetivo
3 correcciones sobre la tanda anterior de detalles.

## 2. Cambios aplicados (con paths)
1. `SwipeCue.tsx` — se saca la manito/dedo; queda **solo flechas hacia abajo** (dos
   chevrons apilados que planean hacia abajo + fade en secuencia, reutilizando
   `.lab-swipe-hand` para el glide y `.lab-swipe-chevron-*` para el fade). Afecta hero
   mobile y el pie de las 3 escenas GSAP.
2. `HeroStartButton.tsx` — landing viewport-aware: mobile `travel * 0.36`, desktop `0.28`.
   El timeline mobile revela "Comercio" en progress ~0.30 (vs ~0.20 desktop), así que el
   `0.28` único caía ANTES de que apareciera la palabra en mobile.
3. `Interludes.tsx` — títulos de interludios (mobile) aparecen antes:
   - Nuevo helper `revealNarrativeOnEnter(q, section, scroller)`: revela eyebrow/head/body
     con un tween ONE-SHOT disparado al ENTRAR la escena (`start: "top 88%"`,
     `toggleActions: play none none reverse`), desacoplado del scrub de las cards.
   - En las 3 mobile builds se quita la narrativa del timeline scrubbeado (sets + reveals)
     y se llama al helper. Antes la narrativa recién se revelaba cuando la escena terminaba
     de fijarse (pin) → ~1 viewport de "espacio vacío" entre el hero y la 1ª pantalla
     animada. Ahora el título está apenas la escena asoma desde abajo.
   - Se mantiene `opacity-0` SSR (sin flash); el helper la sube en enter.

## 3. Implicancias técnicas
- Desktop sin cambios (usa `.from`, narrativa visible en reposo). El helper es mobile-only
  (scope = `[data-scene-mobile]`).
- Dos ScrollTriggers por sección (scrub `il-mobile-N` + one-shot de narrativa) — OK.
- El `revealNarrativeOnEnter` no lleva `id`, así que `__IL_DEBUG__.play()` (filtra
  `il-mobile-`) no lo toca; es solo debug.

## 4. Testing
- `npx tsc --noEmit` → EXIT 0.
- Verificación visual pendiente en :3001 (Docker, rebuild manual).

## 5. Referencias
- Previa: `develop-history/2026-07-07_1900-detalles-scroll-nav-loadingbar.md`.
- Memoria flash-fix: la narrativa sigue `opacity-0` en SSR (no se revierte ese fix).
