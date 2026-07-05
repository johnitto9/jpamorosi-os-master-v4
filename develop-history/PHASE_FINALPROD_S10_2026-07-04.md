# Change Log: 2026-07-04 — FINALPROD S10 (ROOT CAUSE de "sin animación" en mobile)

## 1. Objetivo
Encontrar y arreglar por qué los interludios en mobile (:3001) NO animan,
mientras desktop está "flama". Fix arquitectónico GSAP (sin CSS), 1:1 con
desktop en calidad. Sin tocar la coreografía desktop.

## 2. Revisión previa (S1–S9)
9 sesiones ajustando timing, arquitectura (single scrubbed timeline vs
per-element), Lenis+ScrollTrigger (scrollerProxy S8, revertido S9),
observabilidad (__IL_DEBUG__). El síntoma NUNCA cambió: "sin animación" +
warnings "GSAP target not found" (target vacío) en consola.

## 3. ROOT CAUSE (el bug que atravesó S1–S9 sin ser visto)
`useSceneChoreography` bindea la timeline mobile al elemento que devuelve:

    const mobileSection = rootEl.querySelector("[data-scene-mobile]")

Pero CADA `<section>` contiene DOS bloques con `data-scene-mobile`:

  1. `<MobileStatic>`  — fallback reduced-motion. Clase `motion-safe:hidden`
     ⇒ cuando el movimiento está permitido (justo la condición que gatea el
     matchMedia mobile), está `display:none`. NO contiene ninguna clase
     `.il-*`. Aparece PRIMERO en el DOM.
  2. `<MobileScene1/2/3>` — la escena animada real (`.il-card-a`, `.il-word`,
     `.il-screen`, etc.). Aparece SEGUNDO.

`querySelector` (singular) devuelve el PRIMERO en orden de documento ⇒
siempre agarraba `MobileStatic`. Consecuencias:

  - La timeline se ata a un trigger `display:none` ⇒ `start === end` ⇒
    la timeline NUNCA scrubbea (progress se queda en 0).
  - `q(".il-card-a")`, `q(".il-word")`, etc. devuelven `[]` sobre MobileStatic
    ⇒ exactamente los warnings "GSAP target not found" con target vacío.

La coreografía mobile (S9) estaba perfectamente escrita — apuntaba al
elemento equivocado. La nota de S8-debug incluso detectó que el INDICADOR de
debug miraba MobileStatic; se arregló el indicador (`.relative`) pero NUNCA la
línea real del hook.

## 4. Fix aplicado (quirúrgico, 2 cambios)
`frontend-app/components/hall/Interludes.tsx`:
  (A) `MobileStatic`: atributo `data-scene-mobile` → `data-scene-mobile-static`
      (así deja de ser matcheado como la escena animada).
  (B) Comentario CRÍTICO en el hook explicando por qué `[data-scene-mobile]`
      ahora resuelve únicamente a la escena animada.

Resultado: `querySelector("[data-scene-mobile]")` devuelve MobileScene1/2/3,
un elemento VISIBLE (`block`, `min-h-[280vh]`) con todos los targets `.il-*`.
La timeline scrubbea 0→1 con el scroll (mismo pipeline Lenis+ScrollTrigger que
desktop, ya probado). Desktop INTACTO (usa `[data-scene]`, no tocado).

## 5. Testing
- `npx tsc --noEmit`: 0 errores relacionados con Interludes.
- `grep data-scene-mobile`: `[data-scene-mobile]` matchea SOLO MobileScene1/2/3
  (líneas 423/468/510); MobileStatic es `data-scene-mobile-static` (307);
  debug selector (`[data-scene-mobile].relative`) sigue OK.
- Pendiente verificación del usuario en phone: hard-refresh :3001, scrollear
  los 3 interludios; en consola deben verse `[S9 scN] mobile build running`
  y `__IL_DEBUG__.snapshot()` con progress cambiando 0→1 (ya NO array vacío ni
  triggers sobre display:none).

## 6. Referencias
- Interludes.tsx: hook `useSceneChoreography` (~L238), `MobileStatic` (~L296).
- scroll-stage.tsx: integración canónica Lenis+GSAP (intacta, ya correcta).

## 7. Persistencia
claude_state.json → phase FINALPROD_S10_ROOTCAUSE_FIXED, phaseDoneFinalprodS10
agregado, flags.handoff_mobile.next_step corregido (el problema NUNCA fue
Lenis.scrollTop — era el selector).
