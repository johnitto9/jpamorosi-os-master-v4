# EXEC LOG 05 — 2026-07-05 (Hall coverflow infinito, sin desync por DOM index)

## Feedback del usuario
No aceptar el fallback `loop:false`: el Hall debe conservar el infinito.

## Cambio
`components/hall/HallOfFameGrid.tsx` mantiene:
- `useEmblaCarousel({ loop: true, align: "center" })`.
- Duplicacion `[...items, ...items]` para densidad cuando hay pocos flagships.
- Dots por proyecto (`selected % items.length`).

Se elimino la transformacion 3D basada en:
`offset = ((i - selected + total + floor(total/2)) % total) - floor(total/2)`.
Ese calculo mezcla indice DOM con snap seleccionado y se rompe cuando Embla
loop mueve slides en el borde del anillo.

Ahora el coverflow escribe `transform`, `opacity` y `zIndex` sobre un nodo interno
`[data-hall-coverflow]`, derivando distancia desde:
- `emblaApi.scrollProgress()`
- `emblaApi.scrollSnapList()`
- `internalEngine().slideRegistry`
- `internalEngine().slideLooper.loopPoints`

La correccion de wrap se hace dentro de `slideRegistry[snapIndex].forEach` y
compara `slideIndex === loopItem.index` (indice de slide, no indice de snap).
Esto preserva el loop y evita la causa arquitectonica del desync historico.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` -> 0 errores.
- `docker.exe compose --profile backend build amorosi-backend` -> OK.
- `docker.exe compose --profile backend up -d amorosi-backend` -> OK.
- Bundle activo verificado dentro del contenedor: contiene `data-hall-coverflow`.
- Health:
  - dentro del contenedor: `{"ok":true}`
  - desde Windows host con `curl.exe http://127.0.0.1:3001/api/health`: `{"ok":true}`

Nota: `curl` desde WSL contra `127.0.0.1:3001` dio connection refused por puente
WSL/Windows, aunque Docker marca el contenedor healthy y Windows responde bien.

## Pendiente
Verificacion visual del usuario en desktop: carruselear varias vueltas completas.
Debe conservar infinito, no encimar cards y no hacer reset/glitch de wrap.

