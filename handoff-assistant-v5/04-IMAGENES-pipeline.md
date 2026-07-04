# 04 — Generación de imágenes con criterio (pipeline de pantallas coherentes)

## Problema actual

El caso de éxito en test (sesión **"marco"**) generó **una sola imagen de concepto genérica** de la app pedida. Eso es lo que hay que superar: no "un concepto libre", sino un set coherente y necesario.

## Pipeline requerido

Con todo el ADN acumulado (assets del flujo 03 + conversación + necesidades del wizard), el agente razona QUÉ imágenes hacen falta para representar el proyecto y las genera **en orden, encadenadas**:

1. **Imagen plana de referencia de la UX** (la "fuente de verdad" visual del contenido).
2. **Mockups de dispositivo que reutilizan ese mismo contenido**: si es webapp → una con celular mostrando la app y una con notebook mostrando la versión web. **Ambas deben coincidir en contenido** (misma home, misma paleta) — por eso primero se genera la referencia plana y se usa en los prompts de ambas.
3. **Pantallas por sección**, agnósticas de dispositivo: home completa, y las secciones que el proyecto realmente necesite (el agente decide con criterio según lo conversado).

**Tope duro: 9 pantallas** por proyecto. Criterio anti-irse-por-las-ramas: generar solo lo que representa pantallas/vistas reales discutidas.

## Dónde viven

Igual que en 03: **apartado especial en la UX del chat** (galería dentro del board/pestaña del proyecto), no mensajes sueltos. Servidas desde `/api/media/` (restricción de `enforceResponse`). Mismo apartado visible del lado admin (ver 06).

## Aceptación
- Para una webapp de prueba: referencia plana → mockup celular + mockup notebook con contenido coincidente → 2+ pantallas de sección, todas con la paleta del ADN.
- Nunca más de 9. Nunca una imagen "concepto libre" desanclada del ADN.
- Galería ordenada en chat y en admin; nada suelto en el scroll.
