# Integración 3D - React Three Fiber + Vue/TresJS

## Contratos de Props y Toggles

### Background3D Component Contract

```typescript
interface SceneProps {
  density?: number      // Cantidad de puntos (default: 1500)
  color?: string       // Color de los puntos (default: '#00f2ff')
  speed?: number       // Velocidad rotación (default: 0.05)
  autoRotate?: boolean // Rotación automática (default: true)
  responsive?: boolean // Responsive scaling (default: true)
}

interface Background3DProps extends SceneProps {
  fallback?: React.ReactNode // Fallback sin 3D
  className?: string         // CSS classes adicionales
}
```

### Lazy Loading Implementation

```typescript
// React Three Fiber (default)
const Background3D = lazy(() => import('./Background3D'))

// Vue/TresJS Web Component (opcional)
const VuePlanets = lazy(() => import('./VuePlanets.ce'))

// Usage with Suspense
<Suspense fallback={<BackgroundFallback />}>
  {use3D ? <Background3D {...sceneProps} /> : <BackgroundFallback />}
</Suspense>
```

## Flags y Toggles del Sistema

### URL Query Parameters

| Flag | Valores | Descripción | Ejemplo |
|------|---------|-------------|---------|
| `no3d` | `true`/`false` | Deshabilita rendering 3D | `/?no3d=true` |
| `renderer` | `react`/`vue` | Selector de renderer 3D | `/?renderer=vue` |
| `density` | `number` | Override density particles | `/?density=800` |
| `speed` | `number` | Override rotation speed | `/?speed=0.1` |

### Media Query Detection

```typescript
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const isLowPowerMode = useMediaQuery('(prefers-reduced-data: reduce)')
const isMobile = useMediaQuery('(max-width: 768px)')

const shouldUse3D = !prefersReducedMotion && 
                    !isLowPowerMode && 
                    !urlParams.no3d
```

### Responsive Breakpoints 3D

```typescript
const responsive3DConfig = {
  mobile: {
    density: 800,      // Menos partículas
    speed: 0.02,       // Más lento  
    autoRotate: false  // Sin rotación automática
  },
  tablet: {
    density: 1200,
    speed: 0.03,
    autoRotate: true
  },
  desktop: {
    density: 1500,     // Full density
    speed: 0.05,       // Full speed
    autoRotate: true
  }
}
```

## Presupuesto de Performance

### Target Metrics

| Metric | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| **FPS** | 30+ | 45+ | 60+ |
| **Memory** | <50MB | <80MB | <120MB |
| **Load Time** | <2s | <1.5s | <1s |
| **Lighthouse Performance** | 85+ | 90+ | 95+ |

### 3D Optimization Strategy

#### Particle System Limits
```typescript
const performanceLimits = {
  particles: {
    mobile: 500,
    tablet: 1000, 
    desktop: 2000,
    maxEver: 3000
  },
  geometry: {
    segments: 32,        // Sphere segments
    detail: 2           // Fibonacci detail level
  },
  materials: {
    transparent: true,
    alphaTest: 0.1,     // Alpha cutoff
    depthWrite: false   // Avoid z-fighting
  }
}
```

#### Memory Management
```typescript
// Cleanup on unmount
useEffect(() => {
  return () => {
    // Dispose geometries
    geometries.forEach(geo => geo.dispose())
    // Dispose materials  
    materials.forEach(mat => mat.dispose())
    // Clear texture cache
    renderer.dispose()
  }
}, [])
```

## Implementación React Three Fiber

### Esfera Fibonacci Algorithm

```typescript
function fibonacciSphere(samples: number): Vector3[] {
  const points: Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle
  
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2  // y from 1 to -1
    const radius = Math.sqrt(1 - y * y)    // radius at y
    
    const theta = phi * i  // Golden angle increment
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    
    points.push(new Vector3(x, y, z))
  }
  
  return points
}
```

### Component Structure

```typescript
function Background3D({ density = 1500, color = '#00f2ff', speed = 0.05 }: SceneProps) {
  const meshRef = useRef<Group>()
  const points = useMemo(() => fibonacciSphere(density), [density])
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += speed
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })
  
  return (
    <Canvas className="absolute inset-0 -z-10">
      <ambientLight intensity={0.5} />
      <group ref={meshRef}>
        {points.map((point, i) => (
          <mesh key={i} position={point}>
            <sphereGeometry args={[0.002, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
      </group>
    </Canvas>
  )
}
```

## Vue/TresJS Web Component

### Build Configuration

```typescript
// vite.config.ts para Web Component
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: './src/planets.ce.vue',
      name: 'VuePlanets',  
      fileName: 'planets.ce',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
```

### Component Definition

```vue
<!-- planets.ce.vue -->
<template>
  <TresCanvas class="absolute inset-0 -z-10">
    <TresAmbientLight :intensity="0.5" />
    <TresGroup ref="groupRef">
      <TresMesh 
        v-for="(point, i) in points" 
        :key="i"
        :position="point"
      >
        <TresSphereGeometry :args="[0.002, 8, 8]" />
        <TresMeshBasicMaterial :color="color" />
      </TresMesh>
    </TresGroup>
  </TresCanvas>
</template>

<script setup lang="ts">
import { TresCanvas, useRenderLoop } from '@tresjs/core'

const props = defineProps<{
  density?: number
  color?: string  
  speed?: number
}>()

const points = computed(() => fibonacciSphere(props.density ?? 1500))

useRenderLoop(() => {
  if (groupRef.value) {
    groupRef.value.rotation.y += props.speed ?? 0.05
  }
})
</script>
```

### Registration in Next.js

```typescript
// Dynamic import Web Component
useEffect(() => {
  if (renderer === 'vue') {
    import('./vue-widgets/planets.ce.js').then(() => {
      // Web component auto-registered
    })
  }
}, [renderer])

// Usage
{renderer === 'vue' ? (
  <vue-planets 
    density={density}
    color={color}
    speed={speed}
  />
) : (
  <Background3D 
    density={density}
    color={color}
    speed={speed}
  />
)}
```

## Testing Strategy

### Visual Regression Tests
```typescript
describe('Background3D Component', () => {
  it('renders fibonacci sphere correctly', async () => {
    render(<Background3D density={100} />)
    await waitFor(() => {
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })
  })
  
  it('respects no3d flag', () => {
    mockUrlParams({ no3d: true })
    render(<BackgroundProvider />)
    expect(screen.getByTestId('fallback-background')).toBeInTheDocument()
  })
})
```

### Performance Tests
```typescript
describe('3D Performance', () => {
  it('maintains target FPS', async () => {
    const { fps } = await measurePerformance(<Background3D />)
    expect(fps).toBeGreaterThan(30)
  })
  
  it('cleans up resources on unmount', () => {
    const { unmount } = render(<Background3D />)
    const disposesSpy = jest.spyOn(THREE.Object3D.prototype, 'dispose')
    unmount()
    expect(disposesSpy).toHaveBeenCalled()
  })
})
```

## Deployment Considerations

### Bundle Splitting
```typescript
const Background3D = dynamic(() => import('./Background3D'), {
  ssr: false,
  loading: () => <BackgroundFallback />
})
```

### CDN Strategy  
- **React Three Fiber**: Bundle with app (core dependency)
- **Vue/TresJS**: Separate chunk, lazy loaded only when needed
- **Three.js**: Shared dependency, common chunk

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_3D_ENABLED=true
NEXT_PUBLIC_DEFAULT_RENDERER=react
NEXT_PUBLIC_PERFORMANCE_MODE=balanced  # conservative|balanced|performance
```

## Estado de Implementación

### ✅ Completado (Contratos)
- [x] Props interfaces definidas
- [x] Flag system especificado  
- [x] Performance budgets establecidos
- [x] Responsive breakpoints definidos

### ✅ Completado (FASE 2B - Agosto 2025)
- [x] Background3D React component con esfera Fibonacci
- [x] FallbackBackground CSS estático
- [x] ConditionalBackground3D con lazy loading
- [x] Flags ?no3d y prefers-reduced-motion operativos
- [x] Code splitting y Suspense implementado
- [x] Integración completa en Desktop component

### 🔄 Pendiente (Futuras Fases)
- [ ] Vue/TresJS Web Component build
- [ ] Performance monitoring automatizado
- [ ] Visual regression tests automatizados
- [ ] Audio reactive particles

### ✅ Criterios de Aceptación FASE 2B - COMPLETADOS
- [x] Background3D renderiza esfera Fibonacci con 1500 puntos
- [x] Flags ?no3d=true y prefers-reduced-motion funcionan correctamente
- [x] Lazy loading con Suspense y fallback automático
- [x] Integrado en Desktop sin romper funcionalidad existente
- [x] Desktop Store tests (20 casos) passing al 100%