"use client"

import React, { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Vector3 } from "three"
import * as THREE from "three"

interface SceneProps {
  density?: number
  color?: string
  speed?: number
  autoRotate?: boolean
  responsive?: boolean
}

interface Background3DProps extends SceneProps {
  fallback?: React.ReactNode
  className?: string
}

// Fibonacci Sphere Algorithm
function fibonacciSphere(samples: number): Vector3[] {
  const points: Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2 // y from 1 to -1
    const radius = Math.sqrt(1 - y * y)   // radius at y
    
    const theta = phi * i // Golden angle increment
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    
    points.push(new Vector3(x, y, z))
  }
  
  return points
}

// Fibonacci Sphere Component
function FibonacciSphere({ 
  density = 1500, 
  color = '#00f2ff', 
  speed = 0.05,
  autoRotate = true 
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const points = useMemo(() => fibonacciSphere(density), [density])
  
  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += speed
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <group ref={groupRef}>
        {points.map((point, i) => (
          <mesh key={i} position={point.toArray()}>
            <sphereGeometry args={[0.002, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </>
  )
}

// Fallback component for non-3D mode
function BackgroundFallback({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 -z-10 ${className || ""}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-magenta/10 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.05),transparent_50%)]" />
      
      {/* Animated dots pattern as fallback */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-accent-cyan rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Main Background3D Component
export function Background3D({
  density = 1500,
  color = '#00f2ff',
  speed = 0.05,
  autoRotate = true,
  responsive = true,
  fallback,
  className = ""
}: Background3DProps) {
  
  // Responsive adjustments
  const responsiveConfig = useMemo(() => {
    if (!responsive) return { density, speed }
    
    // Detect screen size (simplified for SSR compatibility)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024 && window.innerWidth >= 768
    
    if (isMobile) {
      return {
        density: Math.min(800, density),
        speed: speed * 0.5
      }
    } else if (isTablet) {
      return {
        density: Math.min(1200, density),
        speed: speed * 0.7
      }
    }
    
    return { density, speed }
  }, [density, speed, responsive])

  return (
    <div className={`absolute inset-0 -z-10 ${className}`} data-testid="background3d-container">
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 0, 3], fov: 75 }}
        gl={{ 
          alpha: true, 
          antialias: false, // Performance optimization
          powerPreference: "high-performance" 
        }}
        dpr={[1, 2]} // Limit pixel ratio for performance
        data-testid="three-canvas"
      >
        <FibonacciSphere
          density={responsiveConfig.density}
          color={color}
          speed={responsiveConfig.speed}
          autoRotate={autoRotate}
        />
      </Canvas>
      
      {/* Fallback overlay for loading */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 via-transparent to-accent-magenta/5 pointer-events-none" />
    </div>
  )
}

// Export fallback component separately
export { BackgroundFallback }