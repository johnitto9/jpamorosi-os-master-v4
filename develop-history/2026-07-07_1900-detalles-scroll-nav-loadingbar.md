# Change Log: 2026-07-07 19:00 - Detalles (scroll snappier + nav loading bar + overlap proof)

## 1. Objetivo
6 pedidos de pulido tras la refac mobile del hero/interludios/swipe. Sin features nuevas.

## 2. Revisión previa
- Home = `app/page.tsx` (ScrollStage/Lenis + GSAP ScrollTrigger).
- Interludios = `components/hall/Interludes.tsx` (desktop `[data-scene]` scrub horizontal;
  mobile `MobileScene1/2/3` scrub vertical).
- Nav lateral = `components/ui/chapter-nav.tsx` (IntersectionObserver enciende nodos;
  conectores muestran progreso de segmento).
- Botón hero = `components/hall/HeroStartButton.tsx` (scrollTo a % del travel de la sección).

## 3. Cambios aplicados (con paths)
1. `HeroStartButton.tsx` — target `travel * 0.3` → `0.28`. En 0.3 "Fricción" ya asomaba;
   0.28 deja "Comercio" asentado y solo. **Valor a ojo** (knob = ese multiplicador).
2. `app/page.tsx` — secciones con cards pierden la "pausa" del sticky:
   Hall `142/138vh → 110vh`; Featured `132/130vh → 106vh`; Archive `132/130vh → 106vh`.
3. `Interludes.tsx` — recorte de alto (~12%) para pasar de sección más inmediato:
   Scene1 mobile `300→260` / desktop `340→300`; Scene2 mobile `285→250` / desktop `320→280`;
   Scene3 mobile `320→280` / desktop `360→312`. **Valores a ojo.**
4. `Interludes.tsx` MobileScene2 — `il-screen top-[20%] → top-[36%]`: baja la card de la
   imagen para que las cards de capas (`il-layers`, z-20) se superpongan y la imagen quede
   atrás/abajo. **Valor a ojo.**
5. `chapter-nav.tsx` — loading bar reescrita: el progreso del conector ahora mide el trayecto
   REAL entre nodo actual → nodo siguiente (centros vs. centro del viewport), llegando a 100%
   justo cuando el próximo nodo se enciende (antes medía el alto interno del interludio y
   cerraba antes de tiempo). Keyed por `c.id` en vez de `c.segmentAfter`.
6. `chapter-nav.tsx` — nav en mobile: label del nodo activo (título de sección) ahora visible
   en todo viewport (hover reveal sólo `md:`); conectores/loading bar pasan de `md:`-only a
   visibles siempre (`h-8 md:h-12`). El texto del segmento (nombre del interludio) queda
   desktop-only para no saturar el rail mobile. La manito SwipeCue se mantiene (gustó).

## 4. Implicancias técnicas
- El multiplicador del botón es proporcional al travel, así que el recorte de alto de la
  Scene1 no lo desalinea.
- La nueva fórmula del conector asume que los `id` de capítulos existen en el DOM
  (intro/hall-of-fame/featured/lab-archive/contact) — verificado.
- Nada toca la coreografía GSAP (tiempos relativos mapeados a 0..1 sobre el scroll).

## 5. Testing
- `npx tsc --noEmit` → EXIT 0.
- Verificación visual real pendiente en :3001 (Docker, rebuild manual).

## 6. Referencias
- Refac previa: `develop-history/PHASE_MOBILE_REFAC_2026-07-07_hero-interludes-swipe.md`.

## 7. Persistencia
- Sin cambios de fase; detalles de pulido sobre la home. claude_state sin tocar.
