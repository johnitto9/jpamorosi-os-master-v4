<template>
  <div class="vue-planets-container">
    <TresCanvas v-bind="gl" window-size>
      <TresPerspectiveCamera :position="[0, 0, 5]" />
      <TresAmbientLight :intensity="0.3" />
      <TresDirectionalLight :position="[5, 5, 5]" :intensity="0.8" />
      
      <!-- Earth-like planet -->
      <TresMesh
        ref="earthRef"
        :position="[-2, 0, 0]"
        @click="onPlanetClick('earth')"
      >
        <TresSphereGeometry :args="[0.8, 32, 32]" />
        <TresMeshStandardMaterial 
          :color="earthColor"
          :roughness="0.3"
          :metalness="0.1"
        />
      </TresMesh>
      
      <!-- Mars-like planet -->
      <TresMesh
        ref="marsRef"
        :position="[0, 1.5, -1]"
        @click="onPlanetClick('mars')"
      >
        <TresSphereGeometry :args="[0.6, 32, 32]" />
        <TresMeshStandardMaterial 
          :color="marsColor"
          :roughness="0.5"
          :metalness="0.2"
        />
      </TresMesh>
      
      <!-- Jupiter-like planet -->
      <TresMesh
        ref="jupiterRef"
        :position="[2.5, -0.5, -0.5]"
        @click="onPlanetClick('jupiter')"
      >
        <TresSphereGeometry :args="[1.2, 32, 32]" />
        <TresMeshStandardMaterial 
          :color="jupiterColor"
          :roughness="0.4"
          :metalness="0.1"
        />
      </TresMesh>
      
      <!-- Saturn-like planet with ring -->
      <TresGroup :position="[-1, -2, -2]">
        <TresMesh
          ref="saturnRef"
          @click="onPlanetClick('saturn')"
        >
          <TresSphereGeometry :args="[0.9, 32, 32]" />
          <TresMeshStandardMaterial 
            :color="saturnColor"
            :roughness="0.3"
            :metalness="0.15"
          />
        </TresMesh>
        
        <!-- Saturn's ring -->
        <TresMesh :rotation="[Math.PI / 2, 0, 0]">
          <TresRingGeometry :args="[1.2, 1.6, 32]" />
          <TresMeshStandardMaterial 
            :color="'#8B7355'"
            :transparent="true"
            :opacity="0.6"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
      
      <!-- Stars background -->
      <TresPoints>
        <TresBufferGeometry>
          <TresBufferAttribute
            attach="attributes-position"
            :array="starsPositions"
            :count="starsPositions.length / 3"
            :item-size="3"
          />
        </TresBufferGeometry>
        <TresPointsMaterial 
          :color="'#ffffff'"
          :size="0.02"
          :sizeAttenuation="false"
        />
      </TresPoints>
      
      <TresOrbitControls
        :enable-damping="true"
        :damping-factor="0.05"
        :enable-zoom="enableControls"
        :enable-rotate="enableControls"
        :enable-pan="enableControls"
      />
    </TresCanvas>
    
    <div v-if="showInfo" class="planet-info">
      <h3>{{ selectedPlanet.name }}</h3>
      <p>{{ selectedPlanet.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { TresOrbitControls } from '@tresjs/cientos'

interface PlanetInfo {
  name: string
  description: string
}

interface Props {
  enableControls?: boolean
  showInfo?: boolean
  animationSpeed?: number
  earthColor?: string
  marsColor?: string
  jupiterColor?: string
  saturnColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  enableControls: true,
  showInfo: true,
  animationSpeed: 1,
  earthColor: '#6B93D6',
  marsColor: '#CD5C5C',
  jupiterColor: '#D2691E',
  saturnColor: '#FAD5A5'
})

const emit = defineEmits<{
  planetClick: [planet: string]
}>()

// Refs for planet meshes
const earthRef = ref()
const marsRef = ref()
const jupiterRef = ref()
const saturnRef = ref()

// Selected planet info
const selectedPlanet = ref<PlanetInfo>({
  name: '',
  description: ''
})

// Planet data
const planetData: Record<string, PlanetInfo> = {
  earth: {
    name: 'Tierra',
    description: 'Nuestro hogar, el planeta azul lleno de vida y posibilidades.'
  },
  mars: {
    name: 'Marte',
    description: 'El planeta rojo, destino de futuras exploraciones espaciales.'
  },
  jupiter: {
    name: 'Júpiter',
    description: 'El gigante gaseoso, protector del sistema solar interior.'
  },
  saturn: {
    name: 'Saturno',
    description: 'El señor de los anillos, una joya celestial única.'
  }
}

// Stars for background
const starsPositions = ref<Float32Array>(new Float32Array())

// Generate random stars
const generateStars = (count: number = 1000) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    positions[i3] = (Math.random() - 0.5) * 50
    positions[i3 + 1] = (Math.random() - 0.5) * 50
    positions[i3 + 2] = (Math.random() - 0.5) * 50
  }
  return positions
}

// WebGL settings
const gl = computed(() => ({
  clearColor: '#0a0a0a',
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance' as const
}))

// Animation
let animationId: number | null = null

const animate = () => {
  if (earthRef.value) {
    earthRef.value.rotation.y += 0.01 * props.animationSpeed
    earthRef.value.rotation.x += 0.005 * props.animationSpeed
  }
  
  if (marsRef.value) {
    marsRef.value.rotation.y += 0.008 * props.animationSpeed
    marsRef.value.rotation.x += 0.003 * props.animationSpeed
  }
  
  if (jupiterRef.value) {
    jupiterRef.value.rotation.y += 0.015 * props.animationSpeed
    jupiterRef.value.rotation.x += 0.007 * props.animationSpeed
  }
  
  if (saturnRef.value) {
    saturnRef.value.rotation.y += 0.012 * props.animationSpeed
    saturnRef.value.rotation.x += 0.006 * props.animationSpeed
  }
  
  animationId = requestAnimationFrame(animate)
}

// Event handlers
const onPlanetClick = (planet: string) => {
  selectedPlanet.value = planetData[planet] || { name: '', description: '' }
  emit('planetClick', planet)
}

// Lifecycle
onMounted(() => {
  starsPositions.value = generateStars(800)
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.vue-planets-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(circle at 50% 50%, #001122 0%, #000000 100%);
}

.planet-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #333;
  max-width: 300px;
  backdrop-filter: blur(10px);
  font-family: 'Inter', sans-serif;
}

.planet-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #00d4ff;
}

.planet-info p {
  margin: 0;
  font-size: 14px;
  color: #cccccc;
  line-height: 1.4;
}
</style>