# Scheme 002 - UI OS + 3D React Progresivo

## Árbol de carpetas (resumen)

```
frontend-app/
├── packages/desktop/
│   ├── components/
│   │   ├── Desktop.tsx       # Contenedor principal del escritorio
│   │   ├── Window.tsx        # Sistema de ventanas con drag/resize
│   │   └── Dock.tsx          # Dock funcional con integración Zustand
│   ├── apps/
│   │   ├── AboutApp.tsx      # Componente app About
│   │   ├── SkillsApp.tsx     # Componente app Skills
│   │   ├── TimelineApp.tsx   # Componente app Timeline
│   │   ├── ProjectsApp.tsx   # Componente app Projects
│   │   └── ContactApp.tsx    # Componente app Contact
│   ├── store.ts              # Zustand store para window management
│   └── types.ts              # TypeScript interfaces
├── content/
│   ├── about.json            # Datos personales
│   ├── skills.json           # Habilidades técnicas
│   ├── timeline.json         # Experiencia profesional
│   ├── projects.json         # Proyectos destacados
│   └── contact.json          # Información de contacto
└── app/
    └── page.tsx              # Homepage actualizada con Desktop
```

## Dependencias clave (versiones)

- **@react-three/fiber**: ^8.15.0 (3D React rendering)
- **@react-three/drei**: ^9.100.0 (3D helpers and utilities)
- **three**: ^0.170.0 (3D graphics library)
- **framer-motion**: ^10.18.0 (animations)
- **zustand**: latest (state management)
- **vitest**: ^1.1.0 (testing framework)
- **Next.js**: 15.2.4 (React framework)
- **Tailwind CSS**: v4.1.11 (styling)

## Puntos de montaje (rutas/entry)

- **Desktop Entry**: `/app/page.tsx` → `<Desktop>` component
- **Store**: `packages/desktop/store.ts` → `useDesktopStore`
- **Window Manager**: `packages/desktop/components/Window.tsx`
- **Dock System**: `packages/desktop/components/Dock.tsx`
- **App Components**: `packages/desktop/apps/[AppName]App.tsx`
- **Content Data**: `content/*.json` files

## Decisiones técnicas

### 1. Arquitectura de Componentes
- **Desktop**: Contenedor principal que maneja background, window layer y dock
- **Window**: Sistema completo de drag/drop/resize con Framer Motion
- **Dock**: Integración directa con Zustand store, animaciones escalonadas
- **Apps**: Componentes separados por responsabilidad, reutilizables

### 2. Sistema de Estado
- **Zustand** como store principal para window management
- Estado inmutable con acciones específicas: `openWindow`, `closeWindow`, `focusWindow`, `updateWindow`, `minimizeWindow`
- Z-index automático incremental para focus management
- Detección de ventanas duplicadas (previene múltiples instancias)

### 3. Sistema de Drag & Drop
- **useRef** para performance en drag operations
- **Mouse event handlers** con cleanup apropiado
- **Boundary detection** para evitar ventanas fuera de viewport
- **Focus management** integrado con z-index

### 4. Animaciones
- **Framer Motion** para todas las transiciones
- **Staggered animations** en dock buttons (delay incremental)
- **Spring physics** para interactions naturales
- **Exit animations** para window close

### 5. Data Management
- **JSON static imports** para contenido
- **TypeScript interfaces** estrictas para type safety
- **Content normalization** en Dock component

## Riesgos y mitigaciones

### 1. Performance con múltiples ventanas
- **Riesgo**: Lag con muchas ventanas abiertas
- **Mitigación**: Implementado lazy loading de app components, optimización de re-renders

### 2. Memory leaks en event handlers
- **Riesgo**: Event listeners no removidos
- **Mitigación**: useEffect cleanup functions implementados

### 3. Z-index conflicts
- **Riesgo**: Problemas de layering
- **Mitigación**: Sistema incremental automático en store

### 4. Mobile responsiveness
- **Riesgo**: UX pobre en dispositivos móviles
- **Mitigación**: Responsive breakpoints, touch-friendly sizing

## Estado actual

### ✅ Completado FASE 2A (Core UI)
- [x] Zustand store completo con todas las funciones
- [x] Window component con drag/drop/resize/focus
- [x] Dock component funcional con animaciones
- [x] Desktop container con layout management
- [x] 5 App components individuales (About, Skills, Timeline, Projects, Contact)
- [x] JSON content files completos
- [x] Integración completa en page.tsx
- [x] Build exitoso sin errores de TypeScript

### 🔄 Pendiente FASE 2B (3D + Tests)
- [ ] Background3D con esfera Fibonacci (Three.js)
- [ ] Lazy loading con flags (?no3d, prefers-reduced-motion)
- [ ] Tests unitarios para desktop store
- [ ] Tests e2e opcionales con Playwright

## Contratos de APIs

### useDesktopStore
```typescript
interface DesktopState {
  windows: WindowInstance[]
  nextZIndex: number
  openWindow: (app: WindowApp) => void
  closeWindow: (id: string) => void  
  focusWindow: (id: string) => void
  updateWindow: (id: string, updates: Partial<WindowInstance>) => void
  minimizeWindow: (id: string) => void
}
```

### Window Component
```typescript
interface WindowInstance {
  id: string
  app: WindowApp
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  isMinimized: boolean
}
```

### App Content Structure
```typescript
interface WindowApp {
  id: string
  title: string
  icon: string
  content: Record<string, any>
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
}
```