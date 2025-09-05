# Playbook: refac2.md — Refactor de UX Móvil y Estabilización de Entorno
# Objetivo: jpamorosi-os

**MODO DE OPERACIÓN:**
Leé este archivo COMPLETO antes de tocar nada. Ejecutarás las fases en orden. Al finalizar cada una, reportarás el resultado y esperarás confirmación para proceder. Usarás el protocolo de persistencia y logs definido en `claude.md`.

---

## 1) OBJETIVO GENERAL

Esta misión tiene tres metas críticas, en orden de prioridad:
1.  **Estabilizar el Entorno:** Asegurar que el proyecto descargado de GitHub compile y se ejecute de manera predecible antes de realizar cualquier cambio funcional.
2.  **Corregir la UI del Escritorio:** Validar que el dock de aplicaciones esté visualmente centrado y funcional.
3.  **Rediseñar la Experiencia Móvil:** Transformar la UX en dispositivos móviles a una experiencia fluida, nativa y de una sola vista activa.

---

## 2) FASE 0: VERIFICACIÓN Y ESTABILIZACIÓN DEL ENTORNO

### 2.1) Diagnóstico
La experiencia anterior demostró que el principal punto de fallo es un entorno de desarrollo inestable. No podemos trabajar sobre una base rota. Esta fase es para asegurar que todo funciona antes de empezar.

### 2.2) Plan de Ejecución (Fase 0)

1.  **Limpieza Nuclear:** Asume que pueden existir artefactos corruptos. Ejecuta los siguientes comandos en la raíz del proyecto (`frontend-app`):
    ```bash
    rm -rf node_modules .next pnpm-lock.yaml
    ```

2.  **Instalación de Dependencias:** Ejecuta una instalación limpia. Usa un timeout generoso para evitar los errores de la vez anterior.
    ```bash
    timeout 300 pnpm install
    ```

3.  **Verificación de Dependencias Críticas:** Confirma que `next` está correctamente instalado. El comando `pnpm list next` debe devolver una versión válida. Si falla, detente y reporta el error.

4.  **Ejecución del Servidor de Desarrollo:** Intenta levantar el servidor. Este es el punto de validación más importante.
    ```bash
    pnpm dev
    ```
    -   **Éxito esperado:** El servidor se inicia en `localhost:3000` (o un puerto alternativo) sin errores de compilación.
    -   **Plan de Contingencia:** Si el comando falla con `"next" no se reconoce`, ejecuta `npx next dev` directamente y reporta si esto soluciona el problema.

5.  **Análisis de Carpetas Adicionales:** Revisa la existencia de las carpetas `vue-components.disabled` y `vue-widgets.disabled`. Analiza su contenido (ej. `package.json`, archivos `.vue`). Concluye y reporta que, aunque contienen experimentos interesantes con Vue/TresJS, **no son necesarias para el funcionamiento actual de la aplicación principal en React** y deben ser ignoradas para esta refactorización.

### 2.3) Criterios de Aceptación (Fase 0)
-   [ ] El comando `pnpm install` finaliza sin errores.
-   [ ] El comando `pnpm dev` levanta el servidor y la aplicación es accesible en el navegador.
-   [ ] Se ha confirmado que las carpetas `.disabled` no son dependencias críticas.

**NO PROCEDAS A LA FASE 1 HASTA QUE ESTOS TRES PUNTOS SE CUMPLAN.**

---

## 3) FASE 1: ANÁLISIS Y VALIDACIÓN DEL DOCK EN DESKTOP

### 3.1) Diagnóstico
Basado en el análisis anterior, el problema del "logo N" fue una pista falsa. El objetivo real es asegurar que el componente `Dock` se renderice correctamente.

### 3.2) Plan de Ejecución (Fase 1)

1.  **Localización del Componente:** Identifica el archivo del componente Dock en `packages/desktop/components/Dock.tsx`.
2.  **Análisis de Estilos:** Revisa el código y confirma que se están utilizando clases de Tailwind CSS para el centrado. La implementación debe contener una estructura similar a `<footer>` o `<div>` con clases `fixed bottom-0 left-0 right-0 flex justify-center`.
3.  **Validación Visual:** Con el servidor corriendo (`pnpm dev`), abre la aplicación en un navegador en modo escritorio. Confirma visualmente que el dock está perfectamente centrado horizontalmente. Si no lo está, modifica las clases de Tailwind en `Dock.tsx` para corregirlo.

### 3.3) Criterios de Aceptación (Fase 1)
-   [ ] El componente Dock está visualmente centrado en el eje horizontal en la vista de escritorio.
-   [ ] No hay elementos externos que interfieran con su posicionamiento.

---

## 4) FASE 2: REDISEÑO DE LA EXPERIENCIA MÓVIL

### 4.1) Visión
Transformar la interfaz de ventanas múltiples a una interfaz de panel único y pantalla completa en dispositivos móviles, con animaciones fluidas y scroll nativo.

### 4.2) Plan de Ejecución (Fase 2)

1.  **Detección de Dispositivo:** Utiliza el hook ya existente en `hooks/use-media-query.tsx` para detectar el breakpoint móvil. El breakpoint a utilizar es `(max-width: 768px)`.

2.  **Lógica de Ventana Única (State Manager):** Modifica `packages/desktop/store.ts`.
    -   Dentro de la función `openWindow`, antes de añadir una nueva ventana, verifica si se está en el breakpoint móvil.
    -   Si es `true`, **primero vacía el array `state.windows`** (`state.windows = []`) antes de añadir la nueva ventana. Esto asegura que solo una pueda estar abierta a la vez.

3.  **Adaptación del Componente `Window.tsx`:** Modifica `packages/desktop/components/Window.tsx`.
    -   Llama al hook `useMediaQuery` dentro del componente para obtener una variable `isMobile`.
    -   **Clases Condicionales:** Aplica clases de forma condicional al contenedor principal.
        -   Si `isMobile`, aplica: `fixed inset-0 z-50`.
        -   Si no, mantiene las clases de posicionamiento absoluto (`absolute`).
    -   **Deshabilitar Interacciones:** Desactiva el drag, resize y el botón de minimizar si `isMobile` es `true`. El `onMouseDown` del drag y resize debe retornar `null` o no ejecutarse. El botón de minimizar no debe renderizarse.
    -   **Scroll de Contenido:** Al contenedor del contenido (`div` que envuelve a `<WindowContent />`), aplica la clase `overflow-y-auto` si `isMobile` es `true`. Ajusta el `padding` para una mejor experiencia táctil (ej. `px-6 py-4`).

4.  **Implementación de Animaciones (framer-motion):**
    -   Define dos variantes de animación:
        -   `mobileAnimations = { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }`
        -   `desktopAnimations = { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } }`
    -   En el componente `motion.div` principal de la ventana, aplica la variante correspondiente basándote en la variable `isMobile`.

5.  **Estilo y Acabado Final (Móvil):**
    -   Aplica un fondo semitransparente con efecto blur al panel móvil para mantener visible el fondo 3D y asegurar la legibilidad: `bg-dark-bg/90 backdrop-blur-lg`.

### 4.3) Criterios de Aceptación (Fase 2)
-   [ ] En pantallas < 768px, las ventanas se abren a pantalla completa.
-   [ ] En móvil, abrir una nueva "ventana" cierra automáticamente la anterior.
-   [ ] La animación en móvil es un deslizamiento vertical (`slide`).
-   [ ] El contenido dentro del panel móvil es escroleable.
-   [ ] La experiencia de escritorio (> 768px) permanece sin cambios.