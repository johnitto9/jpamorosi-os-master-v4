"use client"

import * as React from 'react'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useGesture } from '@use-gesture/react'

export interface SceneProps {
  density?: number
  color?: string 
  speed?: number
}

export function Background3DWithAvatar({ 
  density = 1500, 
  color = "#00f2ff", 
  speed = 0.05 
}: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const pointsRef = useRef<THREE.Points>()
  const avatarRef = useRef<THREE.Object3D>()
  const animationRef = useRef<number>()
  const scrollFactorRef = useRef<number>(0) // Factor de scroll para animaciones
  const gestureRotationRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 }) // Rotación por gestos

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

  // Gesture handler for interactive rotation
  useGesture({
    onDrag: ({ movement: [mx, my] }) => {
      // Update gesture rotation with sensitivity control
      gestureRotationRef.current = {
        x: my / 200, // Vertical movement controls X rotation
        y: mx / 200  // Horizontal movement controls Y rotation
      }
    },
  }, {
    target: typeof window !== 'undefined' ? window : undefined,
  })

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    // Sin color de fondo para transparencia
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Force canvas styles for visibility - AGGRESSIVE APPROACH
    renderer.domElement.style.position = 'fixed'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100vw'
    renderer.domElement.style.height = '100vh'
    renderer.domElement.style.zIndex = '9999' // Alto pero por debajo de ventanas (10000+)
    renderer.domElement.style.pointerEvents = 'auto' // Habilitar eventos para gestos
    renderer.domElement.style.isolation = 'isolate' // Crear nuevo stacking context
    
    // Añadir directamente al body para evitar problemas de stacking context
    document.body.appendChild(renderer.domElement)
    console.log('Canvas added to BODY:', renderer.domElement)

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.5)
    directionalLight1.position.set(5, 5, 5)
    directionalLight1.castShadow = true
    scene.add(directionalLight1)
    
    const directionalLight2 = new THREE.DirectionalLight(0xff00aa, 1)
    directionalLight2.position.set(-5, 5, -5)
    scene.add(directionalLight2)

    // Points geometry and material for particles
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.002,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false
    })

    // Esfera principal (la que ya teníamos) - DETRÁS DEL AVATAR Y CENTRADA
    const mainPoints = new THREE.Points(geometry, material)
    mainPoints.position.set(0, 0, -5) // Partículas centradas visualmente con el avatar (Y=0 para centro visual)
    mainPoints.scale.setScalar(2) // Hacer las partículas más grandes para que sean visibles desde lejos
    scene.add(mainPoints)
    
    // Las esferas de fondo ahora están en DeepBackground.tsx (z-index: -1)
    
    // Avatar loading
    const loader = new GLTFLoader()
    loader.load(
      '/models/avatar-optimized.glb',
      (gltf) => {
        console.log('Avatar loaded successfully:', gltf)
        const avatar = gltf.scene
        
        // Debug: imprimir info detallada del modelo
        console.log('=== AVATAR DEBUG INFO ===')
        console.log('Avatar scene children count:', avatar.children.length)
        console.log('Avatar scene:', avatar)
        
        let meshCount = 0
        avatar.traverse((child) => {
          console.log('Child type:', child.type, 'name:', child.name, 'visible:', child.visible)
          
          if ((child as any).isMesh) {
            meshCount++
            console.log(`MESH ${meshCount}:`, child.name, child)
            const mesh = child as THREE.Mesh
            
            // Force visibility
            mesh.visible = true
            mesh.castShadow = true
            mesh.receiveShadow = true
            
            // Debug geometry
            if (mesh.geometry) {
              console.log('Geometry vertices count:', mesh.geometry.attributes.position?.count)
              const bbox = new THREE.Box3().setFromObject(mesh)
              const size = bbox.getSize(new THREE.Vector3())
              const center = bbox.getCenter(new THREE.Vector3())
              console.log('Bounding box min:', bbox.min.x.toFixed(3), bbox.min.y.toFixed(3), bbox.min.z.toFixed(3))
              console.log('Bounding box max:', bbox.max.x.toFixed(3), bbox.max.y.toFixed(3), bbox.max.z.toFixed(3))
              console.log('Model size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3))
              console.log('Model center:', center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3))
            }
            
            // Fix materials aggressivamente
            if (mesh.material) {
              console.log('Material before fix:', mesh.material)
              
              // Restaurar material original mejorado
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat: any) => {
                  if (mat.isMeshStandardMaterial || mat.isMeshPhongMaterial) {
                    mat.emissive = new THREE.Color(0x202020) // Sutil glow
                    mat.emissiveIntensity = 0.1
                  }
                })
              } else {
                const mat = mesh.material as any
                if (mat.isMeshStandardMaterial || mat.isMeshPhongMaterial) {
                  mat.emissive = new THREE.Color(0x202020) // Sutil glow
                  mat.emissiveIntensity = 0.1
                  mat.wireframe = false // Sin wireframe
                }
              }
              
              console.log('Material after fix:', mesh.material)
            }
          }
        })
        
        console.log('Total meshes found:', meshCount)
        console.log('=== END AVATAR DEBUG ===')
        
        // Remover cubo de debug
        
        if (meshCount === 0) {
          console.warn('NO MESHES FOUND IN AVATAR MODEL!')
        }
        
        avatar.scale.setScalar(6) // Escala adecuada para no tapar completamente las partículas  
        avatar.position.set(0, -1.5, 5) // Subir el avatar ligeramente desde -2.5 a -1.5
        scene.add(avatar)
        avatarRef.current = avatar
        console.log('Avatar added to scene at position:', avatar.position, 'scale:', avatar.scale)
        console.log('Avatar ref assigned successfully:', avatarRef.current)
      },
      (progress) => {
        console.log('Avatar loading progress:', progress.loaded / progress.total * 100 + '%')
      },
      (error) => {
        console.error('Avatar 3D loading failed:', error)
        // Add a simple placeholder cube instead
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshPhongMaterial({ color: 0x00f2ff })
        const cube = new THREE.Mesh(geometry, material)
        cube.position.set(0, 0, 0)
        cube.scale.setScalar(2)
        scene.add(cube)
        avatarRef.current = cube
        console.log('Added placeholder cube instead of avatar')
      }
    )
    
    camera.position.set(0, 0, 20) // Alejar aún más la cámara para dar espacio al avatar adelantado
    
    // Ajustar punto de mira según dispositivo
    const isMobileSetup = window.innerWidth < 768
    const lookAtY = isMobileSetup ? -3.5 : -1.5  // Mirar más abajo en mobile
    camera.lookAt(0, lookAtY, 0)
    console.log('Camera positioned at:', camera.position, 'looking at Y:', lookAtY)
    console.log('Camera positioned at:', camera.position, 'looking at origin')

    // Store refs
    sceneRef.current = scene
    rendererRef.current = renderer
    pointsRef.current = mainPoints

    // Animation loop optimized with gesture integration
    const animate = () => {
      const gestureRotation = gestureRotationRef.current
      
      // Rotate particles - Combine automatic rotation with gesture control
      if (pointsRef.current) {
        // Base automatic rotation + gesture interaction
        pointsRef.current.rotation.x = (pointsRef.current.rotation.x + speed * 0.05) + gestureRotation.x
        pointsRef.current.rotation.y = (pointsRef.current.rotation.y + speed * 0.03) + gestureRotation.y
        pointsRef.current.rotation.z += speed * 0.01
      }
      
      // Rotate avatar suavemente + scroll interaction + gesture control
      if (avatarRef.current) {
        const scrollBoost = 1 + (scrollFactorRef.current * 0.5) // Acelera con scroll
        
        // Base rotation + gesture interaction for avatar - VELOCIDAD ORIGINAL RESTAURADA
        avatarRef.current.rotation.y += speed * 0.8 * scrollBoost // Velocidad original encontrada en backup: 0.8
        avatarRef.current.rotation.x = gestureRotation.x * 0.5 // Subtle gesture response
        avatarRef.current.rotation.z = gestureRotation.y * 0.3 // Subtle gesture response
        
        // Ligero movimiento Y basado en scroll - ajustado para mobile
        const isMobileView = window.innerWidth < 768
        const originalY = isMobileView ? -5.0 : -1.5  // Avatar MUCHO más abajo en mobile (Y negativo = abajo)
        
        // DEBUG: Log para verificar que se está aplicando
        if (Math.random() < 0.001) { // Log ocasional para no saturar console
          console.log('🔍 Avatar Y position debug:', {
            isMobileView,
            windowWidth: window.innerWidth,
            originalY,
            finalY: originalY + (scrollFactorRef.current * 1.0),
            scrollFactor: scrollFactorRef.current
          })
        }
        
        avatarRef.current.position.y = originalY + (scrollFactorRef.current * 1.0)
      }
      
      // Las esferas de fondo se animan en DeepBackground.tsx
      
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }

    // Scroll listener para animaciones ligadas al scroll
    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      scrollFactorRef.current = Math.min(scrollY / Math.max(maxScroll, 1), 1) // Normalized 0-1
    }

    window.addEventListener('scroll', handleScroll)
    console.log('Scroll listener added for synchronized animations')

    console.log('Starting animation loop...')
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (renderer.domElement && document.body.contains(renderer.domElement)) {
        document.body.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      
      // Background spheres cleanup handled in DeepBackground.tsx
      
      renderer.dispose()
    }
  }, [positions, color, speed])

  return <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ zIndex: 9999 }} />
}

export default Background3DWithAvatar