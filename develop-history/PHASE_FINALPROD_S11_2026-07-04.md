# Change Log: 2026-07-04 — FINALPROD S11 (verificación de pipeline + rebuild real)

## 1. Objetivo
Confirmar por qué el mobile seguía "colapsado" tras S10 y cerrar el fix.

## 2. Hallazgo A — el rebuild del usuario no actualizaba código
La imagen `amorosi-labs-backend` tiene el código HORNEADO
(`frontend-app/Dockerfile`: `COPY . .` + `pnpm build` standalone; único volumen
`amorosi_backend_data:/app/data`, SIN mount de fuente). Reiniciar el contenedor
reusa la imagen vieja → el usuario veía siempre "S9 DEBUG". Secuencia correcta
(docker.exe desde WSL, `docker` pelado no existe en la distro):

    docker.exe compose --profile backend build amorosi-backend
    docker.exe compose --profile backend up -d amorosi-backend

Verificación anti-caché (grep del marcador dentro del contenedor):

    docker.exe exec <backend> sh -c "grep -rho 'S10 DEBUG' /app/.next/static | sort | uniq -c"

El :3001 SÍ está containerizado: el `localhost:3000` del log es interno al
contenedor, mapeado a `:3001` del host. No corre suelto sobre Windows.

## 3. Hallazgo B — el pipeline GSAP funciona (el bloqueo era el bundle viejo)
Con S10 realmente cargado, el debug indicator (instrumentado con estado real del
ScrollTrigger) mostró:
  - mobileBuild ran: {"sc1":1,"sc2":1,"sc3":1} → las 3 builds mobile corren.
  - 3 triggers il-mobile-* existen (snapshot() → array de 3).
  - progress trackea 0→1 correcto: prog 0.000 con sección arriba (Sec top 175px),
    prog 1.000 con sección pasada (Sec top -5491px). Cableado Lenis→ScrollTrigger OK.
  - Escena 3 renderiza la palabra "memory" centrada con el rail → coreografía real.

Conclusión: el problema de S1–S10 percibido como "sin animación" era, en su tramo
final, el bundle S9 cacheado sirviéndose por un rebuild que no reconstruía la
imagen. El fix de selector de S10 (data-scene-mobile-static) era necesario y correcto.

## 4. Fix aplicado en S11
Anomalía residual: `card-a opacity 1` en prog 0 (estado de reposo ANTES de que el
ScrollTrigger renderice la timeline). Blindaje: `gsap.set()` INMEDIATO de los
elementos viajeros en las 3 builds (card-a/b/thread/word; screen/layer;
backdrop/flow/rail/dot), independiente del trigger. El narrativo no se toca
(fail-safe legible). Desktop intacto.

## 5. Testing
- tsc --noEmit: 0 errores.
- Rebuild OK, contenedor recreado, health {"ok":true}.
- Bundle nuevo: page-e2f4be4d18e01991.js (antes dd58cc0d…), marcadores presentes.
- Pendiente: hard-refresh del usuario en :3001 + scroll-through de los 3 interludios.

## 6. Persistencia
claude_state.json → phase FINALPROD_S11_PIPELINE_VERIFIED, phaseDoneFinalprodS11.
Memoria docker-topology actualizada con el gotcha exacto del rebuild.

## 7. Próximo paso (cleanup, tras confirmación)
Sacar MobileDebugIndicator + console.logs + __IL_MOBILE_RAN__; conservar
__IL_DEBUG__.snapshot() (liviano, dev-only) o retirarlo también.
