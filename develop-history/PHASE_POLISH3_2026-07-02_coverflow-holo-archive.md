# Change Log: 2026-07-02 (4/4) — Coverflow 3D, loop denso, archive holográfico

## 1. Objetivo
Pedidos del usuario post-POLISH2: (a) cards laterales del Hall of Fame más
"inclinadas" (efecto 3D real), (b) carrusel Embla infinito perceptible
("que se repitan"), (c) mismo formato aesthetic imagen-dominante de las
Hall cards en TODAS las grids de cards.

## 2. Revisión previa
- Embla ya tenía `loop: true`, pero con solo 3 flagships al 48% de basis el
  anillo queda "hambriento": apenas alcanza para envolver y no hay cards
  laterales de sobra — el loop no se percibe.
- Las laterales solo tenían `scale(0.92) + opacity 0.45`, sin rotación.
- FeaturedSystemsGrid ya usaba HallOfFameCard (HOLO_TOTAL previo); el único
  lugar con cards/filas sin el formato era LabArchiveGrid (lista timeline).

## 3. Cambios aplicados
- `frontend-app/components/hall/HallOfFameGrid.tsx`:
  - `slides`: si hay <5 proyectos, se duplica el set (`[...items, ...items]`)
    → anillo denso, loop siempre fluido, laterales reales a ambos lados.
  - Coverflow 3D: track con `[perspective:1400px]`, slides con
    `preserve-3d`; cada card no-activa rota `rotateY(±26deg)` hacia el
    centro + `scale(0.88) translateZ(-90px)`, según offset firmado con
    wrap-around en el anillo.
  - `activeIdx = selected % items.length` para accent/video/watermark/dots
    (los dots direccionan proyectos; `scrollTo` salta al duplicado más
    cercano por distancia de wrap).
- `frontend-app/components/hall/LabArchiveGrid.tsx`: lista timeline
  reemplazada por grid de `HallOfFameCard` compactas (mismo layout Reveal
  que Featured). Proyectos sin heroImage caen al panel de partículas
  branded que ya trae la card. Ambient violeta de la sección conservado.
- `/projects` hereda todo (usa las mismas grids).

## 4. Implicancias técnicas
- La duplicación de slides es solo presentación; data/links intactos
  (keys `${id}-${i}`).
- HolographicCard (tilt por hover) convive con el rotateY del coverflow:
  transforms en wrappers distintos, sin conflicto.

## 5. Testing
- `pnpm exec tsc --noEmit` limpio.
- Dev server (WATCHPACK_POLLING=true) → GET / 200; markers verificados en
  SSR: 1× perspective:1400px, 5 cards con rotateY ±26deg, sección
  lab-archive con cards aspect-[4/5].

## 6. Referencias
- scheme004-toptier-roadmap.md, PHASE_POLISH2_2026-07-02.

## 7. Persistencia
- claude_state.json actualizado (decisiones POLISH3).
