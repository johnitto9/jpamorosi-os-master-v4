"use client"

import * as React from 'react'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

export interface SceneProps {
  density?: number
  color?: string 
  speed?: number
}

export function SimpleBackground3D({ 
  density = 1500, 
  color = "#00f2ff", 
  speed = 0.05 
}: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const pointsRef = useRef<THREE.Points>()
  const animationRef = useRef<number>()

  // Fibonacci sphere generation
  const positions = useMemo(() => {
    const positions = new Float32Array(density * 3)
    const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle

    for (let i = 0; i < density; i++) {
      const y = 1 - (i / (density - 1)) * 2  // y from 1 to -1
      const radius = Math.sqrt(1 - y * y)    // radius at y
      const theta = phi * i  // golden angle increment

      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      positions[i * 3] = x
      positions[i * 3 + 1] = y 
      positions[i * 3 + 2] = z
    }

    return positions
  }, [density])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Points geometry and material
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.002,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)
    
    camera.position.z = 1

    // Store refs
    sceneRef.current = scene
    rendererRef.current = renderer
    pointsRef.current = points

    // Animation loop
    const animate = () => {
      if (pointsRef.current) {
        pointsRef.current.rotation.x += speed * 0.05
        pointsRef.current.rotation.y += speed * 0.03
        pointsRef.current.rotation.z += speed * 0.01
      }
      
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [positions, color, speed])

  return <div ref={containerRef} className="absolute inset-0 -z-10" />
}

export default SimpleBackground3D