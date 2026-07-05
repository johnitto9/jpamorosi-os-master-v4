# EXEC_LOG_12 — 2026-07-05

## Objetivo
Cerrar P3: que la Living Layer global responda al scroll sin tocar layout ni
reabrir el pipeline Lenis/GSAP.

## Cambios
- `ScrollStage` emite evento `al-scroll-stage` en cada scroll Lenis con:
  - `progress` normalizado;
  - `velocity` acotada.
- `AuroraScene` escucha ese evento y anima solo propiedades GPU:
  - `x`;
  - `y`;
  - `scale`.
- La capa aurora interna ahora tiene `transform-gpu` + `will-change-transform`
  y overscan `-inset-[5%]` para que el movimiento no muestre bordes.
- `prefers-reduced-motion` no escucha el evento.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` → 0 errores.

## Pendiente operativo
- Rebuild/recreate backend para verlo vivo en `:3001`.
