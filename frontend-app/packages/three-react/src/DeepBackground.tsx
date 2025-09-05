"use client"

import * as React from 'react'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

export interface DeepBackgroundProps {
  density?: number
  speed?: number
}

export function DeepBackground({ 
  density = 800, // Menos densidad para fondo sutil
  speed = 0.02    // Más lento para ser ambient
}: DeepBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const bgSpheresRef = useRef<THREE.Points[]>([])
  const animationRef = useRef<number>()
  const scrollFactorRef = useRef<number>(0)

  // Fibonacci sphere generation para fondo
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

    // Scene setup SOLO para fondo
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Canvas para FONDO - z-index NEGATIVO para estar detrás de HTML
    renderer.domElement.style.position = 'fixed'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100vw'
    renderer.domElement.style.height = '100vh'
    renderer.domElement.style.zIndex = '-1' // DETRÁS de todo HTML
    renderer.domElement.style.pointerEvents = 'none'
    
    // Añadir al body
    document.body.appendChild(renderer.domElement)
    console.log('Deep background canvas added to BODY with z-index: -1')

    // Iluminación muy sutil para fondo
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8) // Más suave
    scene.add(ambientLight)

    // Geometry base para todas las esferas
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    // === ESFERAS DE FONDO SIMPLES PERO VISIBLES ===
    
    console.log('Creating simple but visible background spheres...')
    
    // Posiciones simples y bien distribuidas
    const sphereConfigs = [
      { pos: [-40, 10, -30], color: '#00f2ff', scale: 8.0, opacity: 0.3 },
      { pos: [45, -15, -35], color: '#ff006e', scale: 9.0, opacity: 0.28 },
      { pos: [-30, -25, -40], color: '#8338ec', scale: 10.0, opacity: 0.26 },
      { pos: [35, 20, -45], color: '#06ffa5', scale: 8.5, opacity: 0.24 },
      { pos: [-50, 0, -50], color: '#ffbe0b', scale: 11.0, opacity: 0.22 },
      { pos: [25, -30, -55], color: '#fb5607', scale: 9.5, opacity: 0.20 }
    ]
    
    const backgroundSpheres = []
    
    sphereConfigs.forEach((config, index) => {
      const sphere = new THREE.Points(geometry.clone(), new THREE.PointsMaterial({
        color: config.color,
        size: 0.012, // Tamaño consistente y visible
        sizeAttenuation: true,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false
      }))
      
      sphere.position.set(config.pos[0], config.pos[1], config.pos[2])
      sphere.scale.setScalar(config.scale)
      scene.add(sphere)
      backgroundSpheres.push(sphere)
      
      console.log(`Background sphere ${index}: pos(${config.pos}), scale: ${config.scale}`)
    })
    
    // Guardar referencias
    bgSpheresRef.current = backgroundSpheres
    
    camera.position.set(0, 0, 20)
    camera.lookAt(0, 0, -50) // Mirar hacia las esferas de fondo
    
    // Store refs
    sceneRef.current = scene
    rendererRef.current = renderer

    // Scroll listener ROBUSTO que SÍ funciona
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      // Factor más sensible y visible
      scrollFactorRef.current = scrollY / 500 // Cada 500px = factor 1 (más sensible)
      
      // Debug SIEMPRE para verificar que funciona
      console.log(`🔄 SCROLL EVENT: ${scrollY}px → factor: ${scrollFactorRef.current.toFixed(3)}`)
    }

    // Agregar listener de múltiples formas para asegurar que funcione
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    // También ejecutar una vez al inicio
    handleScroll()
    console.log('✅ Scroll listeners attached (window + document)')

    // Animation loop SIMPLE - Solo rotación básica y scroll directo
    const animate = () => {
      const scrollFactor = scrollFactorRef.current
      
      // ANIMACIÓN SIMPLE: rotación + escala con scroll
      bgSpheresRef.current.forEach((sphere, index) => {
        if (sphere) {
          // Inicializar escala base
          if (!sphere.userData.baseScale) {
            sphere.userData.baseScale = sphere.scale.x
            console.log(`Background sphere ${index} initialized, base scale: ${sphere.userData.baseScale}`)
          }
          
          // Rotación básica lenta
          const rotSpeed = speed * (0.1 + index * 0.02)
          sphere.rotation.x += rotSpeed * 0.3
          sphere.rotation.y += rotSpeed * 0.5
          sphere.rotation.z += rotSpeed * 0.2
          
          // Escala directa con scroll - EFECTO VISIBLE
          const baseScale = sphere.userData.baseScale
          const scrollEffect = 1 + (scrollFactor * 1.0) // Efecto más dramático
          const finalScale = baseScale * scrollEffect
          sphere.scale.setScalar(finalScale)
          
          // Debug para primera esfera
          if (index === 0 && Math.floor(Date.now() / 2000) % 3 === 0) {
            console.log(`🎯 Sphere 0: scroll=${scrollFactor.toFixed(2)}, scale=${finalScale.toFixed(1)}`)
          }
        }
      })
      
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }

    console.log('Starting deep background animation loop...')
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
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (renderer.domElement && document.body.contains(renderer.domElement)) {
        document.body.removeChild(renderer.domElement)
      }
      
      // Dispose geometries and materials
      geometry.dispose()
      bgSpheresRef.current.forEach(sphere => {
        if (sphere.geometry) sphere.geometry.dispose()
        if (sphere.material) {
          const mat = sphere.material as THREE.PointsMaterial
          mat.dispose()
        }
      })
      
      renderer.dispose()
      console.log('🧹 Deep background cleaned up')
    }
  }, [positions, speed])

  return <div ref={containerRef} className="absolute inset-0" style={{ zIndex: -1 }} />
}

export default DeepBackground