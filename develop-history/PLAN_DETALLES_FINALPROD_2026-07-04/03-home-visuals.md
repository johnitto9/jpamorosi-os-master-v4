# 03 — Home / visuales (items #9 a #11)

---

## §A — Carrusel Hall of Fame se rompe / cards encimadas / glitch-reset (item #9)

### Síntoma
> "Las cards de proyectos (Hall of Fame) empiezan bien; al pasarlas como carrusel
> se va rompiendo, las cards quedan muy encimadas, y si seguís carruseleando se
> reinicia/glitchea y vuelve a quedar bien."

### Root cause (VERIFICADO)
`components/hall/HallOfFameGrid.tsx`. El coverflow se calcula a mano:
- `selected = emblaApi.selectedScrollSnap()` (índice de snap, línea 78).
- Por cada slide DOM `i` se computa
  `offset = ((i - selected + total + floor(total/2)) % total) - floor(total/2)`
  (línea ~245) y de ahí `rotateY`, `scale`, `translateZ`, `zIndex`, `opacity`.

El problema: con `loop:true`, **Embla reordena/traslada físicamente los slides**
en los bordes del anillo (mueve nodos de un extremo al otro). El `selectedScrollSnap()`
y el índice DOM `i` dejan de tener una relación lineal en el wrap → el `offset`
calculado no coincide con la posición visual real → cards se enciman, hasta que
Embla "normaliza" y parece resetear. Además, `slides = [...items, ...items]`
cuando hay <5 duplica el set, agravando el desfase de índices.

### Objetivo
Coverflow estable, sin encimado ni glitch en el wrap.

### Plan (recomendado: derivar la transformación del engine de Embla, no del índice)
En vez de `(i - selected)`, usar el **progreso real por slide** que Embla expone:
1. Suscribirse a `emblaApi.on("scroll", ...)` y `on("reInit", ...)`.
2. Leer `emblaApi.scrollProgress()` y `emblaApi.internalEngine().slideRegistry` /
   `scrollSnaps`, o más simple, el patrón oficial "tween" de Embla:
   ```ts
   const engine = emblaApi.internalEngine();
   const scrollProgress = emblaApi.scrollProgress();
   emblaApi.scrollSnapList().forEach((snap, snapIndex) => {
     let diff = snap - scrollProgress;
     // corregir el wrap del loop usando engine.slideLooper.loopPoints
     if (engine.options.loop) {
       engine.slideLooper.loopPoints.forEach((lp) => {
         const target = lp.target();
         if (snapIndex === lp.index && target !== 0) {
           const sign = Math.sign(target);
           if (sign === -1) diff = snap - (1 + scrollProgress);
           if (sign === 1)  diff = snap + (1 - scrollProgress);
         }
       });
     }
     // diff ∈ [-1..1] aprox: usarlo para rotateY/scale/opacity de ESE slide
   });
   ```
   Este es el recipe canónico de Embla para efectos por-slide con loop (evita
   exactamente el bug de índices). Aplicar el transform por slide con un ref
   array a los nodos.
3. Alternativa más barata si no se quiere tocar el engine: **desactivar `loop`**
   y usar `align:"center"` con `containScroll:false`, aceptando que no sea
   infinito. Menos elegante pero elimina el glitch de raíz. Decidir con el usuario.

### Verificación
En `:3001`, carruselear el Hall varias vueltas completas — no debe haber encimado
ni "reset" visible. Probar en mobile (coverflow off <640px) y desktop.

### Archivos
- `components/hall/HallOfFameGrid.tsx`.

---

## §B — Cards no-centrales desaparecen feo (item #10)

### Síntoma
> "Las cards que no son la central desaparecen medio así nomás de la pantalla a la
> mitad. Hay que hacer que desaparezcan, pero ¿no hay forma más natural y
> visualmente atractiva?"

### Root cause
Hoy los slides laterales llevan `opacity-45` fijo + `rotateY(±26)/scale(0.88)/
translateZ(-90px)` (HallOfFameGrid ~línea 260-270) y el contenedor tiene
`overflow-hidden` (línea ~230): el card se **corta duro** contra el borde del
viewport Embla en vez de desvanecerse.

### Objetivo
Salida natural: fade + blur progresivos hacia los bordes, sin corte seco.

### Plan
1. Añadir un **mask-image horizontal** al viewport del carrusel para que los
   bordes se desvanezcan (los cards se disuelven en vez de cortarse):
   ```tsx
   style={{
     WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)",
     maskImage: "linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)",
   }}
   ```
   en el div `overflow-hidden` del track.
2. Opcional: opacidad y `filter: blur()` en función de `|offset|`/`diff` (usar el
   `diff` del §A) para que el desvanecimiento sea gradual, no binario active/no.
3. Si se hace §A con el engine tween, esto sale casi gratis (ya tenés `diff`).

### Archivos
- `components/hall/HallOfFameGrid.tsx` (mismo cambio se aplica idealmente junto
  a §A).

---

## §C — Systems in Orbit + Lab Fragments: corte feo al carruselear (item #11)

### Síntoma
> "Al carruselear las cards de Systems in Orbit y Lab Fragments se nota mucho el
> corte, como un bloque más grande que las mismas cards."

### Root cause (VERIFICADO)
Ambos usan `CardCarousel` (`components/ui/card-carousel.tsx`). El track es
`<div className="ui-interactive -my-6 overflow-hidden py-8" ref={emblaRef}>`
(línea ~72). El `overflow-hidden` corta en seco horizontalmente: al entrar/salir,
las cards se cortan contra un borde recto que se lee como "un bloque más grande".
No hay fade horizontal. (`FeaturedSystemsGrid`/`LabArchiveGrid` sí tienen un
`maskImage` pero es sobre una **capa de fondo** decorativa, no sobre el track del
carrusel.)

### Objetivo
Mismo tratamiento que §B: bordes que se desvanecen, no corte de bloque.

### Plan
1. Aplicar `mask-image` horizontal al viewport del `CardCarousel`:
   ```tsx
   <div
     className="ui-interactive -my-6 overflow-hidden py-8"
     ref={emblaRef}
     style={{
       WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
       maskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
     }}
   >
   ```
   Como es un componente compartido (Featured + Archive), el fix cubre ambos de
   una. Verificar que el mask no coma los dots/controles (están fuera del div).
2. Ajustar los `%` para que la card central quede 100% nítida y solo se
   desvanezcan las que entran/salen.

### Verificación
Carruselear Systems in Orbit y Lab Fragments en `:3001` — el borde ya no debe
leerse como un bloque; las cards entran/salen difuminadas.

### Archivos
- `components/ui/card-carousel.tsx` (afecta Featured + Archive).
