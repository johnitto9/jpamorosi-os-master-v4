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