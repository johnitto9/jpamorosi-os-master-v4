# 01 — Bloque PULIDO (P1–P5)

---

## §A (P1) — Admin: subir imágenes de interludios, R2-ready

### Objetivo
Superficie en `/admin` para subir/cambiar las 4 imágenes de interludios:
`before1`, `before2` (BEFORE THE SYSTEMS ×2), `proof1` (YOU'RE INSIDE THE PROOF),
`living1` (THE LIVING LAYER). Flujo: sube local → `storeFile` (R2 si hay env,
si no local) → guarda URL en `settings.json` (DB local) → el home lee de ahí
(vía `resolveMediaUrl`, sirve del bucket si hay CDN).

### Pasos
1. **Settings** (`lib/media/store.ts`): extender `SiteSettings`:
   ```ts
   export type SiteSettings = {
     heroVideo?: HeroVideo;
     interludes?: { before1?: string; before2?: string; proof1?: string; living1?: string };
   };
   ```
2. **API save** (`app/api/admin/media/route.ts` o nueva `.../interludes/route.ts`):
   revisar cómo guarda hoy el hero video (MediaUploader postea a
   `/api/admin/media`). Reusar el patrón: `guardAdmin` → recibe `{ key, url }`
   (url ya viene de `/api/admin/upload` que corrió `storeFile`) → `saveSiteSettings`
   con `interludes[key]=url`. (El upload en sí ya existe y es R2-ready.)
3. **Admin UI** (`app/admin/media/page.tsx`): sección nueva "Interludes" con 4
   `MediaDropzone`/`MediaUploader` (before1/before2/proof1/living1), cada uno
   muestra la imagen actual (`settings.interludes?.[k]`) y sube vía
   `/api/admin/upload` → guarda con el paso 2. Reusar `components/admin/MediaDropzone`.
4. **Lectura en el home**:
   - `app/page.tsx` (server): `const s = await getSiteSettings()` y pasar
     `interludes={s.interludes}` (o URLs sueltas) a `<Interludes>`/cada interludio.
   - `components/hall/Interludes.tsx`: `IMG` deja de ser const hardcodeado; cada
     interludio usa `interludes?.beforeN ?? IMG_FALLBACK.beforeN`. `InterludeImage`
     envuelve `src` con `resolveMediaUrl(src)` (import de `lib/media/resolve`).
     Fallback a emoji si vacío/error (ya existe).

### Verificación
Subir una imagen para "INSIDE THE PROOF" en `/admin/media`; recargar home; la
card ya no muestra el emoji monitor. (R2 real sólo cuando se seteen las envs.)

### Archivos
`lib/media/store.ts`, `app/api/admin/media/route.ts` (o nueva), `app/admin/media/page.tsx`,
`app/page.tsx`, `components/hall/Interludes.tsx`, `lib/media/resolve.ts` (usar).

---

## §B (P2) — Featured/Archive: fade "groso" → al borde + smooth

### Síntoma
El fade que agregué al `CardCarousel` (Systems in Orbit + Lab Fragments) se come
demasiado de la card; en **mobile (1 card visible)** es peor porque difumina los
bordes de la única card. El usuario quiere: más "al borde", que no coma la card,
y una sombra más definida/smooth (truco de doble sombra superpuesta).

### Estado actual
`components/ui/card-carousel.tsx` viewport:
`maskImage: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)`.
En mobile el slide es `flex-[0_0_100%]` (1 card) → el fade 8% recorta la card.

### Fix
1. Mover el mask a una clase en `globals.css` que **sólo aplique en sm+** (donde
   hay >1 card) y con fade más angosto (al borde):
   ```css
   .carousel-edge-fade { /* sin mask por default (mobile: 1 card, no recorta) */ }
   @media (min-width: 640px) {
     .carousel-edge-fade {
       -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 4%, #000 96%, transparent 100%);
       mask-image: linear-gradient(90deg, transparent 0, #000 4%, #000 96%, transparent 100%);
     }
   }
   ```
   Reemplazar el `style={{...mask...}}` inline por `className="... carousel-edge-fade"`.
2. **Doble sombra smooth** (opcional, para "sombra más definida"): en la sección
   (Featured/Archive) agregar dos overlays de borde (pseudo/hijo) con gradientes
   estrechos, superpuestos con distinta opacidad/anchura para un falloff más
   suave que una sola. Ej. dos `<div>` absolutos a izquierda/derecha:
   `w-8 bg-gradient-to-r from-dark-bg to-transparent` + otro `w-4 from-dark-bg/60`.
   Sólo en sm+ (mobile no lo necesita).
3. Mobile: garantizar que la única card NO tenga fade (con el media query ya
   queda). Verificar en viewport <640px.

### Archivos
`app/globals.css`, `components/ui/card-carousel.tsx` (y opcional Featured/Archive
para el doble-shadow por sección).

---

## §C (P3) — "The Living Layer" vibra al scrollear (micro-desborde)

### Síntoma
En la sección animada LIVING LAYER, al scrollear mientras anima, textos/todo
"vibran"/micro-desbordan. Feo. Es durante el scrub.

### Hipótesis (verificar en el build de la escena 3)
`components/hall/Interludes.tsx` — `LivingLayerInterlude` desktop `build(tl,q)`.
Causas típicas de shimmer en scrub GSAP:
- Animar propiedades que fuerzan layout/reflow (top/left/width/height/margin) en
  vez de sólo `transform`/`opacity`.
- Sub-pixel en texto sin promoción GPU → jitter al re-renderizar cada frame.
- `overflow` del sticky stage recortando + reflow.

### Fix (a probar, medir con el scroll real)
1. Asegurar que TODO lo animado use sólo `transform`/`opacity` (revisar `.il-flow`,
   `.il-layer`, `.il-word`, `.il-screen` de la escena 3).
2. Promoción GPU en los nodos animados: `will-change: transform` + `translateZ(0)`
   / `backface-visibility:hidden` (Tailwind: `transform-gpu`, o CSS). En GSAP,
   `force3D: true` en los `.to()`/defaults de esa timeline.
3. Evitar animar `filter`/`blur` por frame en texto (caro, jitter). Si hay glow
   animado sobre texto, moverlo a una capa hermana no-texto.
4. Redondear posiciones: evitar `yPercent` que resulte en fracciones raras sobre
   texto chico; considerar `y` en px enteros.

### Archivos
`components/hall/Interludes.tsx` (escena 3), quizá `app/globals.css` (util GPU).

---

## §D (P4) — Hall of Fame: cards descentradas en mobile (a la derecha)

### Síntoma
En mobile las cards del Hall se ven corridas a la derecha; deberían verse de a
una, centradas.

### Estado actual
`components/hall/HallOfFameGrid.tsx`: `useEmblaCarousel({ loop:true, align:"center" })`.
Mobile slide `flex-[0_0_86%]` + `px-2`. Con coverflow OFF (<640px) igual quedan
vecinas ocupando 86% c/u y el `containScroll` default ('trimSnaps') puede
descentrar en los extremos del loop.

### Fix
1. Mobile: subir el basis a ~92% y `containScroll:false` (o `""`) para que
   `align:"center"` centre de verdad:
   ```ts
   useEmblaCarousel({ loop:true, align:"center", containScroll:false })
   ```
2. Ajustar el basis mobile a `flex-[0_0_90%]` para que la card activa quede
   centrada con un pequeño peek simétrico a ambos lados (no sólo a la derecha).
3. Verificar con el fix de P5 (comparten componente) — hacerlos juntos.

### Archivos
`components/hall/HallOfFameGrid.tsx`.

---

## §E (P5) — Hall coverflow DESYNC (bug histórico: cards se enciman y "reinicia")

### Síntoma
Desktop (y posiblemente mobile): empieza bien, pero al carruselear la distancia
entre cards se acorta hasta encimarse, luego "reinicia" y vuelve a empezar el
ciclo. Arrastrado por muchas iteraciones sin resolver.

### Root cause (VERIFICADO leyendo el código)
`HallOfFameGrid.tsx` calcula el coverflow a mano:
`offset = ((i - selected + total + floor(total/2)) % total) - floor(total/2)`
con `selected = emblaApi.selectedScrollSnap()` (índice de snap) vs `i` (índice
DOM). Con `loop:true` Embla **reordena/traslada físicamente los slides** en los
bordes del anillo → la relación snap↔DOM se rompe → el offset calculado no
coincide con la posición visual → encimado, hasta que Embla normaliza (el
"reinicio"). `slides=[...items,...items]` cuando hay <5 lo agrava.

### Fix — opción A (recomendada): tween por el engine de Embla (loop-correcto)
No calcular offset por índice; derivar la transformación del progreso real:
```ts
// refs a los nodos de slide
const nodesRef = useRef<HTMLDivElement[]>([]);

useEffect(() => {
  if (!emblaApi) return;
  const engine = emblaApi.internalEngine();
  const apply = () => {
    const progress = emblaApi.scrollProgress();
    const snaps = emblaApi.scrollSnapList();
    snaps.forEach((snap, i) => {
      let diff = snap - progress;                 // -1..1 aprox
      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach((lp) => {
          const target = lp.target();
          if (i === lp.index && target !== 0) {
            const s = Math.sign(target);
            if (s === -1) diff = snap - (1 + progress);
            if (s === 1)  diff = snap + (1 - progress);
          }
        });
      }
      const n = nodesRef.current[i];
      if (!n) return;
      const abs = Math.min(Math.abs(diff), 1);
      const rotateY = coverflow ? diff * -26 : 0;
      const scale = 1 - abs * 0.12;
      const opacity = 1 - abs * 0.55;
      n.style.transform = `rotateY(${rotateY}deg) scale(${scale}) translateZ(${-abs*90}px)`;
      n.style.opacity = String(opacity);
      n.style.zIndex = String(100 - Math.round(abs * 90));
    });
  };
  emblaApi.on("scroll", apply);
  emblaApi.on("reInit", apply);
  apply();
  return () => { emblaApi.off("scroll", apply); emblaApi.off("reInit", apply); };
}, [emblaApi, coverflow]);
```
Y en el JSX, quitar el cálculo de `offset` inline; cada slide `ref={(el)=>{if(el)
nodesRef.current[i]=el;}}` con transición corta. El `diff` es continuo y
loop-correcto → sin encimado ni reset. Esto también da el fade lateral gratis
(P4/§B del plan anterior ya lo cubre en Hall).

### Fix — opción B (fallback simple): sin loop
`useEmblaCarousel({ loop:false, align:"center", containScroll:"trimSnaps" })` y
mantener el offset por índice (ahora sí estable porque no hay reorder). Se pierde
el infinito. Decidir con el usuario si molesta.

### Recomendación
Probar A. Si en `:3001` sigue raro, caer a B. Una hipótesis = un experimento =
un commit (regla del proyecto). Verificar carruseleando varias vueltas completas.

### Archivos
`components/hall/HallOfFameGrid.tsx`.
