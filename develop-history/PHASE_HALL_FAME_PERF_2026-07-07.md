# Change Log: 2026-07-07 - Hall of Fame performance pass

## 1. Objetivo
Reducir jank/lag perceptible al scrollear o interactuar con la sección Hall of Fame de la home, especialmente en mobile.

## 2. Sospechosos y fixes aplicados

### Ya estaban aplicados (turno anterior)
- `components/hall/HallOfFameGrid.tsx` `DichroicBeams`: reemplazado `blur-3xl` por gradientes radiales pre-softened (cero costo de GPU filter por frame).
- `components/visual/BackgroundVideoPanel.tsx`: video pausado cuando sale de viewport via IntersectionObserver; `preload="metadata"`.

### Nuevos en este turno
1. **Carrusel Hall of Fame — física spring → tween**  
   `components/hall/HallOfFameGrid.tsx`: las animaciones de las tarjetas visuales usaban `type: "spring"` con stiffness/damping/mass. Cambiado a `type: "tween"` `duration: 0.45` `ease: "easeOut"`. Reduce carga de CPU durante los cambios de slide.

2. **Confetti menos denso**  
   `components/ui/confetti.tsx`: `count` default bajado de 46 a 20. Sigue respetando `prefers-reduced-motion` y pausándose off-screen.

3. **ParticleWaveField más liviano**  
   `components/ui/particle-wave-field.tsx`:
   - Eliminado `ctx.shadowBlur` por frame (operación costosa en canvas 2D).
   - Cap de columnas reducido de 160 a 80.
   - En mobile (`W < 640`): spacing 28 (vs 15-19), rows 5 (vs 7-9).

4. **DitheringShader pausado off-screen**  
   `components/ui/dithering-shader.tsx`: agregado IntersectionObserver para detener el loop WebGL cuando el canvas no está en viewport.

## 3. Implicancias técnicas
- El build de Docker ignora errores de TypeScript por diseño (`DOCKER_BUILD=1`), pero los cambios son superficiales y no tocan tipos cruzados.
- Visualmente se mantiene el look: beams, confetti, wave field y dither shader siguen presentes, solo más baratos.
- Reduced-motion sigue cubierto en todos los componentes animados.

## 4. Testing / verificación
- Docker build completado exitosamente.
- `amorosi-backend` y `web` reiniciados y healthy.
- Health checks `:3001/api/health` y `:3000/api/health` OK.
- Pendiente: verificación visual real en `:3000` / `:3001` para confirmar que el lag desapareció en mobile.

## 5. Archivos tocados
- `frontend-app/components/hall/HallOfFameGrid.tsx`
- `frontend-app/components/ui/confetti.tsx`
- `frontend-app/components/ui/particle-wave-field.tsx`
- `frontend-app/components/ui/dithering-shader.tsx`
- `develop-history/PHASE_HALL_FAME_PERF_2026-07-07.md`
