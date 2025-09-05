# Plan de Refactorización y Estabilización: REFAC2.MD

**Versión:** 1.0
**Fecha:** 2025-08-12
**Objetivo:** Lograr que la aplicación `jpamorosi-os` sea 100% funcional y estable en un entorno de desarrollo local, con todas las características visuales y de interactividad restauradas.

---

### 1. Visión y Objetivo Final

El estado final deseado es un "Sistema Operativo" web interactivo que funcione como un CV. Debe tener:
- Un **fondo 3D dinámico y de alta calidad** renderizado con React Three Fiber.
- Un **layout perfectamente estable** que no se rompa ni requiera scroll anómalo.
- **Efectos visuales de "Glassmorphism"** (`glass-card`) funcionales.
- Un **sistema de ventanas y un dock interactivos** gestionados por Zustand.
- Un **build de producción (`pnpm build`) exitoso** y sin errores.

---

### 2. Diagnóstico Compuesto (Síntesis de IA)

La causa raíz de los fallos no es un único error, sino una serie de problemas fundamentales en la base del proyecto que no fueron atendidos:

1.  **Conflicto de Versión/Configuración de Tailwind CSS:** La sintaxis usada no es compatible o la configuración es incorrecta, impidiendo que clases personalizadas y efectos como `backdrop-blur` se compilen.
2.  **Implementación Frágil de Hooks:** El hook `useMediaQuery` no es "SSR-safe" (no verifica la existencia de `window`), causando errores de hidratación en Next.js.
3.  **Integración Incorrecta de React Three Fiber:** El abandono de R3F fue prematuro. El error `ReactCurrentOwner` probablemente se debe a un problema de importación de React o a un conflicto con el layout, no con la librería en sí.
4.  **Layout CSS No Robusto:** La estructura HTML/CSS principal no está preparada para contener elementos con posicionamiento absoluto/fijo, causando que el contenido se solape o se desborde.

---

### 3. Plan de Ejecución por Fases

Se procederá de manera incremental, asegurando la estabilidad en cada fase antes de continuar.

#### **FASE 0: Preparación y Base Sólida**

* **Objetivo:** Limpiar el proyecto y establecer una versión de dependencias estable y una estructura de layout irrompible.
* **Pasos a Ejecutar:**
    1.  Eliminar todos los cachés: `rd /s /q .next node_modules` y luego `pnpm install`.
    2.  **Estabilizar Tailwind:** Desinstalar la versión actual y forzar la instalación de la v3, que es más estable y compatible con la configuración actual de PostCSS.
        ```bash
        pnpm remove tailwindcss @tailwindcss/postcss postcss autoprefixer
        pnpm add -D tailwindcss@^3.0.0 postcss@^8.0.0 autoprefixer@^10.0.0
        ```
    3.  Crear un `tailwind.config.js` limpio y funcional.
    4.  Implementar la **estructura de layout base en `app/layout.tsx`** usando `flexbox` para asegurar que la página ocupe toda la pantalla y se organice en columnas.
    5.  Crear un componente `<Desktop />` **mínimo y funcional** que solo contenga un fondo con gradiente (sin 3D aún) y renderice a sus `children`. El objetivo es verificar que el layout principal funciona.

#### **FASE 1: Estilos Fundamentales y Efectos Visuales**

* **Objetivo:** Asegurar que todo el sistema de estilos, incluyendo las clases personalizadas y los efectos visuales, funcione a la perfección.
* **Pasos a Ejecutar:**
    1.  Corregir `tailwind.config.js` para extender el `theme` con los colores personalizados (`dark-bg`, `accent-cyan`, etc.).
    2.  Definir la clase `.glass-card` en `app/globals.css` usando `@layer components` para asegurar que el efecto de desenfoque (`backdrop-blur`) funcione.
    3.  Verificar visualmente que los colores y el efecto `glass-card` se aplican correctamente en el componente `<Desktop />` mínimo.

#### **FASE 2: Re-integración Segura de Funcionalidad 3D**

* **Objetivo:** Reintroducir el fondo 3D de React Three Fiber de forma controlada, asegurando que no rompa el layout estable que ya hemos construido.
* **Pasos a Ejecutar:**
    1.  Corregir el hook `useMediaQuery` para que sea seguro en el servidor (`if (typeof window === 'undefined') return`).
    2.  Revisar los componentes de R3F (`ConditionalBackground3D`, etc.) y asegurar que la importación de React sea `import * as React from 'react'`.
    3.  Modificar el componente `<Desktop />` para que el `<ConditionalBackground3D />` se renderice en un `div` con `position: absolute`, `inset-0`, y `z-index: 0`, mientras que el contenido principal se renderiza en un `div` con `position: relative` y `z-index: 10`. Esto aísla el canvas 3D del flujo del layout.

#### **FASE 3: Restauración del Sistema Interactivo**

* **Objetivo:** Reintegrar la lógica del estado de la aplicación (Zustand) y los componentes interactivos como el Dock y las ventanas.
* **Pasos a Ejecutar:**
    1.  Asegurar que el store de Zustand (`useDesktopStore`) se inicialice correctamente.
    2.  Integrar el componente `<Dock />` funcional, que permita abrir ventanas al hacer clic.
    3.  Integrar el componente `<Window />`, que debe renderizarse correctamente sobre el resto del contenido.

#### **FASE 4: Verificación Final y Limpieza**

* **Objetivo:** Realizar una prueba completa de todas las funcionalidades y asegurar que el proyecto esté listo para un build de producción.
* **Pasos a Ejecutar:**
    1.  Testear exhaustivamente todas las interacciones: abrir, cerrar, minimizar y arrastrar ventanas.
    2.  Probar los flags de URL (`?no3d=true`, `?density=500`).
    3.  Ejecutar `pnpm build` para confirmar que la compilación de producción se completa sin errores.
    4.  Documentar cualquier decisión de arquitectura importante tomada durante la refactorización.
