Playbook: InteractiveStellarBackground.md — Implementación de Fondo 3D Interactivo
MODO DE OPERACIÓN:
Leé este archivo COMPLETO antes de tocar nada. Ejecutarás las fases en orden. Al finalizar cada una, reportarás el resultado y esperarás confirmación para proceder. Usarás el protocolo de persistencia y logs definido en claude.md.

1) OBJETIVO GENERAL
Sustituir el fondo estático actual por un entorno 3D dinámico y de alto rendimiento que sirva como "escenario" principal para la UI del sistema operativo. El objetivo es crear una experiencia inmersiva donde el usuario pueda controlar directamente la rotación de un campo estelar mediante gestos de arrastre con el mouse (desktop) y deslizamiento táctil (móvil).

2) FASE 0: ANÁLISIS Y ARQUITECTURA
2.1) Diagnóstico
La experiencia de usuario actual carece de un elemento visual central que unifique la interfaz y proporcione un "wow factor". El "bug feliz" de la v1 demostró el potencial de un fondo dinámico. Se requiere una implementación intencional, robusta y performante que eleve la calidad estética del proyecto.

2.2) Decisiones de Arquitectura
Motor de Renderizado: Se utilizará el ecosistema de @react-three/fiber por su integración nativa con React y su enfoque declarativo.

Generación de Estrellas: Se empleará el componente <Stars> de la librería @react-three/drei por su alta optimización y facilidad de configuración.

Gestión de Interacción (Gestos): Para manejar de forma unificada el mouse drag y el mobile swipe, se integrará la librería @use-gesture/react. Es la solución estándar en la industria para gestos complejos en React, garantizando una respuesta fluida y multiplataforma.

Estructura de Componentes: Toda la lógica se encapsulará en un nuevo componente, InteractiveStars.jsx, para promover la modularidad y mantener el layout principal (app/page.jsx) limpio.

3) FASE 1: IMPLEMENTACIÓN TÉCNICA
3.1) Plan de Ejecución (Fase 1)
Instalación de Dependencias: El único prerrequisito es la librería de gestos. Ejecuta el siguiente comando en la raíz del proyecto (frontend-app):

Bash

pnpm add @use-gesture/react
Creación del Componente: Crea el archivo frontend-app/components/InteractiveStars.jsx y añade el siguiente código. Este componente contendrá toda la lógica de renderizado y gestión de gestos.

JavaScript

// components/InteractiveStars.jsx
"use client";

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useRef } from 'react';
import { useGesture } from '@use-gesture/react';

function AnimatedStars() {
  const groupRef = useRef();

  useGesture({
    onDrag: ({ movement: [mx, my] }) => {
      if (groupRef.current) {
        // Mapea el movimiento del gesto a la rotación. El divisor controla la sensibilidad.
        groupRef.current.rotation.x = my / 200;
        groupRef.current.rotation.y = mx / 200;
      }
    },
  }, {
    target: typeof window !== 'undefined' ? window : undefined,
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={150}
        depth={50}
        count={7000}
        factor={4}
        saturation={0}
        fade
        speed={0} // La animación es 100% controlada por el usuario
      />
    </group>
  );
}

export function InteractiveStars() {
  return (
    <div className="fixed inset-0 -z-20 cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <AnimatedStars />
      </Canvas>
    </div>
  );
}
Integración en Layout Principal: Modifica app/page.jsx para renderizar el nuevo fondo. Es crucial que el fondo esté en una capa z-index inferior a la UI principal.

JavaScript

// app/page.jsx
import { InteractiveStars } from '@/components/InteractiveStars';
// ...

export default function HomePage() {
  return (
    <>
      {/* Capa de Fondo Interactivo */}
      <InteractiveStars />

      {/* Capa de UI Principal */}
      <main className="relative z-10">
        {/* Dock, ventanas, y resto de la UI */}
      </main>
    </>
  );
}
4) FASE 2: VERIFICACIÓN Y AJUSTE FINO
4.1) Plan de Ejecución (Fase 2)
Verificación en Desktop: Ejecuta pnpm dev y confirma que al hacer clic y arrastrar con el mouse, el campo de estrellas rota de manera fluida. Verifica que el cursor cambia a grab y grabbing.

Verificación en Móvil: Usa las herramientas de desarrollador del navegador para simular un dispositivo móvil. Confirma que el gesto de deslizar el dedo (swipe) produce la misma rotación.

Ajuste de Sensibilidad: Modifica el divisor en la función onDrag (ej. my / 200) para hacer la rotación más rápida o más lenta, según la sensación deseada.

Verificación de Capas: Asegúrate de que los elementos de la UI (dock, ventanas) se renderizan por encima del fondo y que sus eventos de clic no son interferidos.

4.2) Criterios de Aceptación (Fase 2)
[ ] El fondo estático ha sido reemplazado por un campo de estrellas 3D.

[ ] La rotación del fondo responde correctamente al gesto de arrastrar el mouse en escritorio.

[ ] La rotación del fondo responde correctamente al gesto de swipe en dispositivos móviles.

[ ] La interacción es fluida y no presenta caídas de rendimiento notables.

[ ] La UI principal se renderiza por encima del fondo y permanece 100% funcional.

[ ] La lógica del fondo está correctamente encapsulada en el componente InteractiveStars.jsx.