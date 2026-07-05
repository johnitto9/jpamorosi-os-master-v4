# EXEC LOG 02 — 2026-07-05 (Hall coverflow — el fix REAL)

## Feedback del usuario
- Hall of Fame **desktop**: quedó horrible + desbordado, y el **bug raíz SIGUE**
  (cards se superponen al carruselear hasta un "glitch"/reinicio).
- Hall **mobile**: ahora EXCELENTE. Systems in Orbit + Lab Fragments: muy bien.
- Duda: la "sombra sofisticada" parecía estar sólo en Systems, no en Lab.

## Root cause (segundo, el verdadero)
En EXEC_LOG_01 reescribí el coverflow con el engine-tween de Embla, pero cometí
un bug en la corrección de wrap: iteraba `slideLooper.loopPoints` y comparaba
`snapIndex === loopItem.index`. **`loopItem.index` es un índice de SLIDE, no de
snap.** Por eso la corrección NUNCA matcheaba → el `diff` del slide en el borde
del anillo quedaba sin corregir → desincronización → superposición → "reset".
Es decir: el bug histórico seguía por la MISMA razón conceptual (diff mal
calculado en el wrap), sólo que ahora en el engine-tween.

Además el look de reposo empeoró: con `diff` continuo, la distancia entre snaps
adyacentes es ~1/N (chica) → los vecinos casi no se transformaban → a 48% de
basis se encimaban (el desborde de la captura).

## Fix (canónico Embla v8.5.1)
`components/hall/HallOfFameGrid.tsx`:
1. **Wrap correction correcta**: mover el cálculo de `diff` + el loop de
   `loopPoints` DENTRO del `slideRegistry[snapIndex].forEach((slideIndex)=>...)`
   y comparar `slideIndex === loopItem.index` (per-slide, como el ejemplo oficial
   de Embla). Ahora el borde del anillo se corrige → sin desync/reset.
2. **Amplificación desktop**: `dist = diff * total` (unidades de distancia-slide,
   ≈±1 por vecino) → los vecinos recuperan lean+recede fuertes
   (`rotateY(dist*-22) scale(1-ad*0.11) translateZ(-ad*120)`, opacity `1-ad*0.42`).
   Restaura el look "muy lindo al iniciar" y elimina el encimado a 48% basis.
3. **Mobile intacto**: la rama `!coverflow` (scale+fade con `abs=min(|diff|,1)`)
   NO se tocó — el usuario dijo que mobile quedó excelente.

## Systems vs Lab Fragments
Revisado: `FeaturedSystemsGrid` y `LabArchiveGrid` usan `CardCarousel` de forma
IDÉNTICA (mismo componente, misma clase `.carousel-edge-fade`). El fade está en
AMBOS por igual — la asimetría percibida es de contenido/fondo, no de código.
Intenté agregar un edge-shadow "definido" al CardCarousel compartido pero lo
REVERTÍ: los devs previos ya habían quitado tiras oscuras de borde porque
"pintaban seam lines sobre la aurora viva" (justo el corte-bloque que molestaba).
El mask transparente es lo correcto y ya cubre ambas secciones.

## Estado
- tsc 0. Rebuild en curso.
- PENDIENTE: verificación visual del usuario en desktop (carruselear varias
  vueltas — no debe encimarse ni reiniciar; reposo debe verse lindo).
- Si AÚN desincroniza: fallback = `loop:false` (finito, sin reorder → cero
  desync), aceptando perder el infinito. Documentado como plan B.

## Addendum (mismo día): el usuario testeó el build VIEJO
El usuario reportó "sigue buggeado + más grandes + menos movimiento" pero había
testeado el build previo (antes del fix de la wrap-key). El build con el fix ya
está vivo (loopPoints en bundle, health ok) → re-testear.
Además, para el "más grandes / menos movimiento": subí la fuerza del transform
desktop a los valores del coverflow original (rotateY dist*-26, scale 1-ad*0.15
≈0.85, translateZ -ad*100, opacity min 0.28) — vecinos más chicos y con recede
dramático. Mobile intacto.

## R3 — Omni hilbanador (chat intelligence)
`lib/agent/orchestrator.ts`: `tryLlmResponse`/`systemPrompt` reciben un nuevo
param `universe` = TODOS los proyectos de la sesión (`allProjects`), no sólo los
pinneados a la tab. Nuevo bloque "SESSION UNIVERSE" en el system prompt: lista
name/kind/phase de todo lo que el visitante está construyendo (cross-tab) e
instruye a omni a hilvanarlos por nombre, notar progreso y conectar ideas.
Cerró el gap: antes omni sólo veía activeProjects (pinneados). tsc 0.
