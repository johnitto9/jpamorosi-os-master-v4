# EXEC_LOG_14 — 2026-07-05 (aurora estática + saga del "temblor")

## 1. Fondo estrellado que se movía/"desbordaba" — RESUELTO (commit 9d5572b)
**Causa:** el "living aurora" scroll-reactivo (exec12) en `AuroraScene.tsx` movía
la capa fija del starfield según el evento `al-scroll-stage`. Bug puntual: el
`setTimeout` de settle reseteaba `x` y `scale` pero **nunca `y`**, y como
`y = progress * -22` depende del progreso de scroll, se **acumulaba** al bajar y
no volvía → el fondo quedaba corrido a lo largo de toda la página.
exec13 sólo tapó síntomas (apagó la reacción en mobile/touch y sacó la aurora de
`/cv`); dejó el drift vivo en la home desktop.
**Fix (exec14):** eliminado el listener `al-scroll-stage` en AuroraScene →
fondo **estático** (el ciclo de color, que era lo bueno, se mantiene). x/y/scale
en reposo. `ScrollStage` sigue emitiendo el evento pero ya **no hay consumidor**.
Verificado: no queda listener en el bundle servido (la 2ª aparición del literal
es un chunk viejo cacheado, no servido).

## 2. "Temblor" en INSIDE THE PROOF / THE LIVING LAYER — ARTEFACTO DEL EMULADOR
**Conclusión (confirmada por el usuario):** con **responsividad real** (ventana
angosta, sin device-emulation) **NO tiembla nada**. El temblor sólo aparecía en
el "device mode" del navegador desktop: el emulador escala el viewport (zoom +
DPR emulado) y re-rasteriza el texto transformado de las escenas scrubbeadas cada
frame → shimmer. NO es un bug del sitio; en dispositivo real no ocurre.

**Cómo se descartó:** apagar device toolbar y achicar la ventana real a ~390px →
sin temblor. (Si alguien vuelve a reportarlo, pedir SIEMPRE prueba en teléfono
real o ventana angosta antes de tocar GSAP.)

### Cambios que SÍ quedaron (sanos, aunque no eran la causa del temblor emulado)
`components/hall/Interludes.tsx`:
- `scrub: true` → `scrub: 0.5` en los 3 timelines mobile. Deshace el cambio de
  exec13 (`scrub: true` ata la animación a cada sub-píxel del scroll de Lenis =
  peor); el smoothing numérico es más estable en dispositivos reales.
- `force3D: true` en los `defaults` de los timelines → transforms en capa GPU,
  reduce shimmer de texto en dispositivos reales de gama baja.
Ambos son mejoras de robustez, no un fix del emulador. Se conservan.

## ¿Sirvió todo lo que hicimos en esta ronda?
- **Aurora estática (9d5572b):** SÍ — arregló un bug real y visible (drift del
  fondo al scrollear en toda ruta).
- **scrub 0.5 + force3D:** parcialmente — no era la causa del temblor (emulador),
  pero deshacen un cambio previo peor y ayudan en devices reales. Netos positivos.
- exec13 (aurora off en mobile/`/cv`): el `/cv` sin aurora sigue bien (print-
  friendly); lo demás quedó subsumido por el fix estático de exec14.

## Verificación
tsc 0 · rebuild+recreate OK · `:3001` health OK · usuario confirma: sin temblor
en responsividad real.
