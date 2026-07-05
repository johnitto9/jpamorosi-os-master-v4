# EXEC_LOG_13 — 2026-07-05

## Objetivo
Reducir temblor percibido en mobile/emulacion mobile durante los interludios
GSAP `YOU'RE INSIDE THE PROOF` y `THE LIVING LAYER`.

## Cambios
- `AuroraScene`: la reaccion scroll-reactive agregada en exec12 queda desactivada
  en `(max-width:1023px)` y en dispositivos `pointer: coarse`. Evita sumar una
  capa fija moviendose debajo de escenas sticky/scrubbeadas en mobile.
- `Interludes.tsx`: timelines mobile usan `scrub: true` en vez de `scrub: 0.6`.
  Lenis ya suaviza el scroll; el smoothing extra de ScrollTrigger podia generar
  micro-lag/jitter durante scroll continuo.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` → 0 errores.
- `docker.exe compose --profile backend build amorosi-backend` → OK.
- `docker.exe compose --profile backend up -d amorosi-backend` → OK.
- `curl.exe -s http://127.0.0.1:3001/api/health` → `{"ok":true}`.

## Pendiente
- Verificacion visual del usuario en mobile/emulacion mobile.
