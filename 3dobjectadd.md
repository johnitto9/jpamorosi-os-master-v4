# 3dobjectadd.md — Playbook de Integración de Avatar 3D

## 0) Modo de Operación (Obligatorio)

**Leé este archivo COMPLETO antes de tocar nada.** La ejecución se realiza FASE por FASE.

1.  **Protocolo Fundacional:** Antes de iniciar, leé `claude.md` para entender el protocolo fundacional, la arquitectura original y las convenciones de persistencia del proyecto. Este playbook extiende esas reglas, no las reemplaza.
2.  **Ejecución Secuencial:** Ejecutás UNA FASE por vez. Al finalizar, te detenés y pedís autorización para la siguiente.
3.  **Persistencia Obligatoria:** Cada cambio se registra en `develop-history/`. Al finalizar la FASE 3, el estado se actualiza en `develop-history/claude_state.json`.
4.  **Protocolo Anti Context-Loss:** Si reiniciás, re-leé `claude.md` y este archivo (`3dobjectadd.md`) + todo `develop-history/` antes de continuar.

---

## 1) Objetivo General

Integrar el avatar 3D del usuario como el elemento visual central en la pantalla de bienvenida del "OS". El objeto debe rotar suavemente, estar correctamente iluminado y posicionarse en una capa intermedia: detrás de la UI de bienvenida (`<h1>`, `<p>`) pero delante del fondo de partículas existente. La integración debe ser performante y modular.

---

## 2) Suposiciones y Activos

* **Working Directory:** `C:\Users\jamor\Downloads\jpamorosi-os-master\jpamorosi-os-master`
* **Activo 3D (Fuente de Verdad):** El modelo 3D optimizado se encuentra en:
    `frontend-app/public/models/avatar-optimized.glb`
* **Stack Tecnológico Relevante:** La integración se realizará utilizando `@react-three/fiber` y `@react-three/drei` sobre Next.js.
* **Punto de Partida:** Se asume que la aplicación es estable y el componente `ConditionalBackground3D.tsx` está funcional y renderizando la escena de partículas.

---

## FASE 1 — Creación del Componente de Avatar Aislado

### Meta
Tener un componente React (`Avatar3D.tsx`) auto-contenido, robusto y performante que se encargue exclusivamente de cargar, configurar y animar el modelo GLB del avatar.

### Pasos

1.  **Crear Archivo:** En la ruta `frontend-app/packages/three-react/src/`, crea un nuevo archivo llamado `Avatar3D.tsx`.

2.  **Implementar Componente:** Pega el siguiente código en el archivo recién creado.

    ```tsx
    // frontend-app/packages/three-react/src/Avatar3D.tsx
    import * as React from 'react'
    import { useGLTF } from '@react-three/drei'
    import { useFrame } from '@react-three/fiber'
    import { Group } from 'three'

    // Este componente encapsula toda la lógica del avatar.
    // Es reutilizable y mantiene el código principal limpio.
    export function Avatar3D() {
      // useGLTF es el hook optimizado para cargar modelos glTF/GLB.
      // Apunta directamente al archivo en la carpeta /public.
      const { scene } = useGLTF('/models/avatar-optimized.glb')
      const modelRef = React.useRef<Group>(null!)

      // useFrame ejecuta esta función en cada frame, permitiendo animaciones fluidas.
      useFrame((state, delta) => {
        // 'delta' es el tiempo transcurrido desde el último frame,
        // esto asegura que la animación sea consistente sin importar el framerate.
        if (modelRef.current) {
          modelRef.current.rotation.y += delta * 0.35 // Velocidad de rotación.
        }
      })

      return (
        // <primitive> es un elemento de R3F para renderizar objetos complejos de Three.js
        // directamente en la escena, como el que nos devuelve useGLTF.
        <primitive
          ref={modelRef}
          object={scene}
          scale={2.8} // Ajustamos la escala para que tenga presencia en la escena.
          position={[0, -1.5, 0]} // Ajustamos la posición vertical.
        />
      )
    }

    // Esta línea es una optimización clave: le indica al navegador que comience
    // a descargar el modelo en segundo plano lo antes posible.
    useGLTF.preload('/models/avatar-optimized.glb')
    ```

### Entregables
* Archivo `frontend-app/packages/three-react/src/Avatar3D.tsx` creado y con el contenido especificado.

### Criterios de Aceptación
* El componente `Avatar3D` existe, es exportado y no produce errores de compilación.
* El código está bien documentado con comentarios que explican su funcionamiento.

---

## FASE 2 — Integración en la Escena 3D Principal

### Meta
Inyectar el componente `<Avatar3D />` en el `<Canvas>` existente que renderiza el fondo de partículas. Esto es crucial para la performance, ya que evita tener múltiples contextos de WebGL.

### Pasos

1.  **Modificar Archivo:** Abre `frontend-app/packages/three-react/src/ConditionalBackground3D.tsx`.

2.  **Actualizar Código:**
    * Importa el nuevo componente `Avatar3D`.
    * Añade la iluminación necesaria para que el modelo no se vea oscuro.
    * Renderiza el componente `<Avatar3D />` dentro del `<Canvas>`.

    ```tsx
    // frontend-app/packages/three-react/src/ConditionalBackground3D.tsx

    import { Suspense, useMemo } from 'react'
    import { Canvas } from '@react-three/fiber'
    import { useMediaQuery } from '../../../hooks/use-media-query'
    import { Avatar3D } from './Avatar3D' // << 1. IMPORTAR

    // ... (interfaz y lógica existente)

    export function ConditionalBackground3D({ ...props }: Background3DProps) {
      // ... (lógica de shouldRender3D existente)

      if (!shouldRender3D) {
        // ... (código de fallback 2D sin cambios)
      }

      return (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0, 5], fov: 75 }}
              style={{ background: 'transparent', pointerEvents: 'none' }}
            >
              {/* 2. AÑADIR ILUMINACIÓN AMBIENTAL Y DIRECCIONAL */}
              <ambientLight intensity={1.5} />
              <directionalLight position={[5, 5, 5]} intensity={2.5} castShadow />
              <directionalLight position={[-5, 5, -5]} intensity={1} color="#ff00aa" />

              {/* Componente existente del fondo de partículas */}
              <Background3DScene {...props} />

              {/* 3. RENDERIZAR EL AVATAR */}
              <Avatar3D />
            </Canvas>
          </Suspense>
        </div>
      )
    }

    // ... (resto del archivo sin cambios)
    ```

### Entregables
* Archivo `frontend-app/packages/three-react/src/ConditionalBackground3D.tsx` modificado.

### Criterios de Aceptación
* Al ejecutar `pnpm dev`, la página de inicio muestra el avatar 3D rotando en el centro.
* El avatar está correctamente iluminado y no se ve plano u oscuro.
* El fondo de partículas sigue funcionando detrás del avatar.

---

## FASE 3 — Ajuste Fino del Layout 2D y Persistencia

### Meta
Refactorizar el layout de la página principal (`page.tsx`) para que el texto de bienvenida se componga armónicamente sobre la escena 3D, creando el efecto de profundidad deseado. Actualizar el estado del proyecto.

### Pasos

1.  **Modificar Archivo:** Abre `frontend-app/app/page.tsx`.

2.  **Actualizar Código:** Reestructura el `<main>` para usar flexbox y `z-index`, permitiendo que el texto se superponga correctamente al canvas 3D.

    ```tsx
    // frontend-app/app/page.tsx
    "use client"

    import { useEffect, useState } from "react"
    import Desktop from "../components/Desktop"
    import { Dock } from "../packages/desktop/components/Dock"
    import { Window } from "../packages/desktop/components/Window"
    import { useDesktopStore } from "../packages/desktop/store"

    export default function HomePage() {
      const [mounted, setMounted] = useState(false)
      const { windows } = useDesktopStore()

      useEffect(() => { setMounted(true) }, [])

      if (!mounted) { /* ... código de carga sin cambios ... */ }

      return (
        <Desktop>
          {/* Header no cambia */}
          <header className=... >...</header>

          {/* << INICIO DE CAMBIOS >> */}
          {/* Hacemos que <main> sea un contenedor relativo que permita superposición */}
          <main className="flex-1 relative flex flex-col items-center justify-center pointer-events-none">

            {/* Este div contendrá el texto y se posicionará con z-index por encima del canvas 3D.
                Le devolvemos los eventos de puntero para que los futuros links/botones funcionen. */}
            <div className="relative z-10 text-center pointer-events-auto -mt-24">
              <div className="mb-12">
                <h1 className="text-4xl md:text-6xl font-bold text-primary-text mb-4 drop-shadow-2xl">
                  <span className="text-accent-cyan">jp</span>
                  <span className="text-accent-magenta">amorosi</span>
                  <span className="text-accent-purple">.os</span>
                </h1>
                <p className="text-secondary-text font-mono drop-shadow-lg">Sistema operativo personal • Interactive CV</p>
                <p className="text-secondary-text opacity-70 text-sm mt-2 drop-shadow-lg">
                  Click on the dock icons below to open applications
                </p>
              </div>
            </div>
          </main>
          {/* << FIN DE CAMBIOS >> */}

          {/* Windows y Dock no cambian */}
          {windows.map((window) => (
            <Window key={window.id} window={window} />
          ))}
          <Dock />
        </Desktop>
      )
    }
    ```
3.  **Persistir Estado:** Actualiza `develop-history/claude_state.json` añadiendo la nueva decisión al array `decisions`.

    ```json
    "decisions": [
      // ... todas las decisiones anteriores
      "FASE 3D_AVATAR: Integrado avatar 3D como elemento central en la home, con componente aislado, inyección en canvas principal y re-layout de la UI 2D."
    ],
    ```

### Entregables
* Archivo `frontend-app/app/page.tsx` modificado.
* Archivo `develop-history/claude_state.json` actualizado.

### Criterios de Aceptación
* El texto de bienvenida se muestra visualmente por delante del avatar 3D.
* La composición visual general se ve pulida e intencional.
* Toda la funcionalidad del Dock y las ventanas sigue operando sin regresiones.
* El proyecto compila y corre sin errores.