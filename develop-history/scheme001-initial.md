# Scheme 001 - Initial Stabilization

## Árbol de carpetas (resumen)
```
C:\Users\jamor\Downloads\jpamorosi-os\
├── develop-history/           # Logs, esquemas, estado persistente
├── tests/                     # Tests e2e/unit (preparado para Vitest/RTL)
├── docs/                      # Documentación técnica
├── scripts/                   # Utilidades y scripts de automatización
├── frontend-app/              # App Next.js principal (fuente de verdad)
│   ├── app/                   # App Router de Next.js
│   ├── packages/              # Workspace packages
│   │   ├── desktop/           # Componentes Desktop (stubs)
│   │   └── three-react/       # Background3D (placeholder)
│   ├── components/            # Componentes shadcn/ui
│   └── styles/                # CSS global y Tailwind
├── requirements.txt           # Dependencias Python para scripts
└── setup_venv.bat            # Configuración automática de venv
```

## Dependencias clave (versiones)
- **Next.js**: 15.2.4
- **React**: 19.x
- **Tailwind CSS**: 4.1.9 (✅ Verificado)
- **TypeScript**: 5.x
- **Radix UI**: Múltiples componentes v1.x-2.x
- **Zustand**: latest (para state management)

## Puntos de montaje (rutas/entry)
- **Main App**: `frontend-app/app/page.tsx`
- **Desktop Package**: `frontend-app/packages/desktop/index.ts`
- **Background3D**: `frontend-app/packages/three-react/Background3D.tsx`
- **Global Styles**: `frontend-app/app/globals.css`

## Decisiones técnicas
1. **Estructura unificada**: Solo `frontend-app/` como fuente de verdad
2. **Tailwind v4**: Verificado y migrado formato de opacidad
3. **Stubs creados**: Desktop y Background3D listos para Phase 2
4. **Monorepo**: Preparado con workspace packages
5. **Dependencias fantasma eliminadas**: Limpiado package.json

## Riesgos y mitigaciones
- **Conflictos de dependencias**: Resuelto eliminando packages inexistentes
- **Tailwind migration**: ✅ Completado (1 cambio: ring-opacity → ring-cyan/50)
- **Imports rotos**: ✅ Creados stubs funcionales
- **Build failures**: ✅ Smoke test pasado