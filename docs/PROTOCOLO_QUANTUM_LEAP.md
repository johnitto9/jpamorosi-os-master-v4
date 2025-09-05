# PROTOCOLO QUANTUM LEAP :: jpamorosi.os
**ID de Misión:** QL-20250812
**Estado:** PENDIENTE DE EJECUCIÓN
**Objetivo:** Catalizar la transición de `jpamorosi.os` desde un prototipo funcional (Estado Actual) a una aplicación de producción pulida, responsiva y desplegada en Vercel (Estado Cuántico).

---
## **VISIÓN Y DIRECTIVA PRINCIPAL**

Este protocolo es la única fuente de verdad para el sprint final de despliegue. La estrategia abandona la construcción incremental en favor de un enfoque de **pulido y estabilización acelerado**. Cada fase está diseñada para ser ejecutada de forma atómica, asegurando la calidad antes de proceder.

**Anti-Loss Context Protocol (ACLP):**
-   **Checkpoints de Estado:** Al final de cada fase, se actualizará `develop-history/claude_state.json` para reflejar el nuevo estado (`phase_complete`, decisiones clave).
-   **Logs de Misión:** Cada fase generará un log detallado en `develop-history/` (ej: `PHASE_QL1_STABILITY_LOG.md`), documentando cada cambio, su justificación y el resultado.
-   **Sincronización:** Antes de iniciar una nueva fase, la IA debe confirmar la relectura de este protocolo y del último log de misión.

---
## **FASE 1: ESTABILIDAD FUNDACIONAL Y NÚCLEO RESPONSIVO**

**Objetivo:** Erradicar todos los bugs de usabilidad conocidos y reconstruir la experiencia para que sea nativa en cualquier dispositivo.

**Acciones Críticas:**
1.  **`FIX:CORE-BUGS`**:
    -   **Overflow de Ventanas:** Integrar `overflow-y-auto` en el contenedor de contenido del componente `Window` para activar el scroll interno.
    -   **Crash de Timeline:** Corregir el typo (`experience` -> `experiences`) en `TimelineApp.tsx` y añadir "optional chaining" (`?.`) para robustez.
    -   **Límites de Viewport:** Implementar lógica de contención en la función de arrastre de ventanas para prevenir que se salgan de la pantalla.
2.  **`REFACTOR:RESPONSIVE`**:
    -   **Layout Adaptativo:** Modificar la estructura raíz con clases responsivas de Tailwind (`md:`, `lg:`) para que el layout de escritorio solo se active en pantallas grandes.
    -   **Componentes Móviles:**
        -   `Window` -> En vistas móviles, se renderizará a pantalla completa, desactivando el drag & drop.
        -   `Dock` -> En vistas móviles, se transformará en una barra de menú inferior fija y estilizada para uso táctil.

**Persistencia (ACLP):**
-   **Log:** `develop-history/PHASE_QL1_STABILITY_LOG.md`
-   **Estado:** `claude_state.json` -> `{ "phase": "QL1_COMPLETE", "decisions": ["Bugs críticos corregidos", "Implementado refactor responsivo mobile-first"] }`

---
## **FASE 2: INTEGRACIÓN FUNCIONAL Y CONTENIDO FINAL**

**Objetivo:** Hacer que todas las funcionalidades interactivas sean operativas y cargar la aplicación con la información profesional definitiva.

**Acciones Críticas:**
1.  **`INTEGRATE:FORMSPREE`**:
    -   Instalar la dependencia `@formspree/react`.
    -   Refactorizar `ContactApp.tsx` para usar el hook `useForm("xanbvlqw")`, reemplazando la lógica de estado manual.
    -   Asegurar que los estilos de éxito/error del formulario sean consistentes con el tema.
2.  **`INTEGRATE:CONTENT`**:
    -   Establecer un punto de sincronización para recibir el texto final del usuario.
    -   Poblar todos los archivos de contenido (`about.json`, `skills.json`, `timeline.json`, `projects.json`) con la información definitiva.

**Persistencia (ACLP):**
-   **Log:** `develop-history/PHASE_QL2_CONTENT_LOG.md`
-   **Estado:** `claude_state.json` -> `{ "phase": "QL2_COMPLETE", "decisions": ["Formulario de contacto funcional con Formspree", "Contenido final integrado en todas las apps"] }`

---
## **FASE 3: PULIDO ESTÉTICO Y ASSETS DE IMPACTO**

**Objetivo:** Elevar la experiencia visual de un "prototipo funcional" a un "producto memorable".

**Acciones Críticas:**
1.  **`ASSETS:IMAGES`**:
    -   Recibir las imágenes seleccionadas por el usuario.
    -   Optimizar cada imagen para la web (compresión, formato .webp).
    -   Integrarlas en los componentes correspondientes (`AboutApp`, `ProjectsApp`, etc.) usando el componente `LazyImage`.
2.  **`ASSETS:3D-ELEMENTS`**:
    -   Recibir la especificación del usuario sobre qué "fichas" (ventanas) deben contener elementos 3D adicionales.
    -   Diseñar e implementar componentes `react-three-fiber` ligeros y de alto rendimiento para estos elementos (ej: logos 3D, íconos de tecnologías).

**Persistencia (ACLP):**
-   **Log:** `develop-history/PHASE_QL3_POLISH_LOG.md`
-   **Estado:** `claude_state.json` -> `{ "phase": "QL3_COMPLETE", "decisions": ["Imágenes optimizadas integradas", "Elementos 3D adicionales implementados en ventanas específicas"] }`

---
## **FASE 4: CHECKLIST PRE-LANZAMIENTO Y DESPLIEGUE EN VERCEL**

**Objetivo:** Ejecutar la secuencia final de lanzamiento para poner `jpamorosi.os` online.

**Acciones Críticas:**
1.  **`QA:FINAL-PASS`**:
    -   Realizar una última ronda de pruebas manuales en múltiples navegadores y dispositivos.
    -   Ejecutar una auditoría con Google Lighthouse y aplicar optimizaciones para asegurar scores > 90.
2.  **`CONFIG:VERCEL`**:
    -   Crear el proyecto en Vercel y conectar el repositorio.
    -   Configurar las variables de entorno si fueran necesarias.
3.  **`DEPLOY:PRODUCTION`**:
    -   Ejecutar el comando `pnpm build` para verificar que el empaquetado de producción es exitoso.
    -   Hacer push a la rama principal para activar el despliegue automático de Vercel.
    -   Verificar el despliegue en la URL de producción.

**Persistencia (ACLP):**
-   **Log:** `docs/DEPLOYMENT_LOG.md` (incluirá URL final, fecha y versión).
-   **Estado:** `claud_state.json` -> `{ "phase": "QL4_DEPLOYED", "status": "LIVE" }`