"use client"

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Scene contract interface
export interface SceneProps {
  density?: number
  color?: string 
  speed?: number
}

// Fibonacci sphere distribution for cosmic effect
function generateFibonacciSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2 // y from 1 to -1
    const radius = Math.sqrt(1 - y * y) // radius at y
    const theta = phi * i // golden angle increment

    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    positions[i * 3] = x
    positions[i * 3 + 1] = y 
    positions[i * 3 + 2] = z
  }

  return positions
}

// Animated 3D points component
function StarField({ density, color, speed }: Required<SceneProps>) {
  const meshRef = useRef<THREE.Points>(null!)
  
  const positions = useMemo(() => 
    generateFibonacciSphere(density), 
    [density]
  )

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.x = time * speed * 0.05
      meshRef.current.rotation.y = time * speed * 0.03
      meshRef.current.rotation.z = time * speed * 0.01
    }
  })

  return (
    <Points ref={meshRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.002}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  )
}

// Main Background3D component - Solo la escena, sin Canvas
export function Background3D({ 
  density = 1500, 
  color = "#00f2ff", 
  speed = 0.05 
}: SceneProps) {
  return <StarField density={density} color={color} speed={speed} />
}

export default Background3D