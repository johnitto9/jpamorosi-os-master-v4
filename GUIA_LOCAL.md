# 🚀 Guía de Deployment Local - jpamorosi.os

## Requisitos del Sistema

### Software Necesario
- **Node.js**: v18.0.0 o superior
- **pnpm**: v8.0.0 o superior (recomendado) 
- **Git**: Para clonar el repositorio
- **Windows 10/11**: Para ejecutar el .bat launcher

### Verificar Instalaciones
```bash
node --version    # Debe ser v18+
pnpm --version    # Debe ser v8+
git --version     # Cualquier versión reciente
```

## 🔧 Setup Automático (.bat)

### Opción 1: Launcher Automático (Recomendado)
1. Doble click en `start-jpamorosi-os.bat`
2. El script automáticamente:
   - Verifica Node.js y pnpm
   - Instala dependencias si es necesario
   - Levanta el servidor de desarrollo
   - Abre el navegador en localhost:3000

### Opción 2: Setup Manual
Si prefieres control manual, sigue estos pasos:

```bash
# 1. Navegar al directorio del proyecto
cd /path/to/jpamorosi-os/frontend-app

# 2. Instalar dependencias
pnpm install

# 3. Verificar que todo esté instalado correctamente
pnpm build

# 4. Ejecutar en modo desarrollo
pnpm dev
```

## 📁 Estructura del Proyecto

```
jpamorosi-os/
├── frontend-app/                 # Aplicación Next.js principal
│   ├── app/                      # App Router (Next.js 15)
│   │   ├── globals.css          # Estilos globales + Tailwind
│   │   ├── layout.tsx           # Layout raíz con metadata SEO
│   │   ├── page.tsx             # Homepage con Desktop component
│   │   ├── robots.txt           # SEO robots
│   │   ├── sitemap.ts           # SEO sitemap
│   │   ├── manifest.ts          # PWA manifest
│   │   └── api/
│   │       └── contact/         # API endpoint contacto
│   ├── packages/
│   │   └── desktop/             # Sistema de escritorio
│   │       ├── components/      # Desktop, Window, Dock, Background3D
│   │       ├── apps/           # AboutApp, SkillsApp, etc.
│   │       ├── store.ts        # Zustand state management
│   │       └── types.ts        # TypeScript definitions
│   ├── content/                # Datos JSON de las apps
│   ├── hooks/                  # Custom React hooks
│   ├── tests/                  # Tests con Vitest
│   └── docs/                   # Documentación técnica
├── develop-history/            # Logs de desarrollo
├── start-jpamorosi-os.bat     # 🚀 LAUNCHER PRINCIPAL
└── README.md                  # Documentación general
```

## 🎮 URLs y Funcionalidades

### URLs Principales
- **Homepage**: http://localhost:3000
- **API Contact**: http://localhost:3000/api/contact
- **Manifest PWA**: http://localhost:3000/manifest.webmanifest
- **Robots**: http://localhost:3000/robots.txt
- **Sitemap**: http://localhost:3000/sitemap.xml

### Flags de URL Disponibles
- `?no3d=true` - Deshabilita rendering 3D
- `?renderer=vue` - Usa renderer Vue (experimental)
- `?density=800` - Controla cantidad de partículas 3D

**Ejemplos**:
- http://localhost:3000?no3d=true
- http://localhost:3000?density=500

## 🖱️ Cómo Usar la Interfaz

### Desktop Interactivo
1. **Dock**: Íconos en la parte inferior para abrir apps
2. **Ventanas**: Clic en ícono del dock para abrir
3. **Drag & Drop**: Arrastra ventanas desde la barra de título
4. **Resize**: Arrastra desde la esquina inferior derecha
5. **Close**: Clic en el botón rojo de cerrar
6. **Minimize**: Clic en el botón amarillo (guión)

### Apps Disponibles
- 📄 **About**: Información personal y bio
- ⚡ **Skills**: Habilidades técnicas con barras de progreso
- 📅 **Timeline**: Experiencia profesional y educación
- 🚀 **Projects**: Portfolio de proyectos destacados
- 📧 **Contact**: Formulario de contacto (pendiente configuración)

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests unitarios (Vitest)
pnpm test

# Tests en modo watch
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Tests Disponibles
- ✅ **Desktop Store**: 20 tests unitarios
- ✅ **Window Management**: Abrir/cerrar/focus/resize
- ✅ **State Management**: Zustand store integrity

## 🔧 Configuración Avanzada

### Variables de Entorno (.env.local)
```bash
# Opcional: Para API de contacto
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=contact@yourdomain.com
TO_EMAIL=your@email.com

# Opcional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Opcional: Performance monitoring
NEXT_PUBLIC_3D_ENABLED=true
NEXT_PUBLIC_DEFAULT_RENDERER=react
```

### Customización
- **Colores**: Editar `app/globals.css` (CSS custom properties)
- **Contenido**: Modificar archivos `content/*.json`
- **3D Settings**: Ajustar `hooks/use-3d-settings.ts`

## 🐛 Troubleshooting

### Problemas Comunes

**1. "Command not found: pnpm"**
```bash
# Instalar pnpm globalmente
npm install -g pnpm

# O usar npx
npx pnpm install
```

**2. "Module not found" errors**
```bash
# Limpiar cache y reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**3. "Build failed" en Windows**
```bash
# Ejecutar como administrador
# O usar PowerShell en lugar de CMD
```

**4. Puerto 3000 ocupado**
```bash
# Next.js automáticamente usará puerto 3001, 3002, etc.
# O especificar puerto manualmente:
pnpm dev -p 3001
```

**5. Performance lenta con 3D**
- Usar `?no3d=true` en URL
- Reducir density con `?density=500`
- Verificar que no hay otras apps pesadas corriendo

### Logs de Debug
- **Development**: Consola del navegador (F12)
- **Server**: Terminal donde corre `pnpm dev`
- **Build**: Output de `pnpm build`

## 📊 Performance

### Métricas Actuales
```
Route (app)              Size    First Load JS
┌ ○ /                 42.3 kB       143 kB
└ ○ /_not-found       975 B        102 kB
+ First Load JS shared            101 kB
```

### Optimizaciones Implementadas
- ✅ **Lazy Loading**: Componentes 3D cargados bajo demanda
- ✅ **Code Splitting**: Bundles optimizados por ruta
- ✅ **Image Optimization**: WebP/AVIF automático
- ✅ **Caching**: Headers optimizados para assets
- ✅ **Minification**: SWC minification habilitado

## 🔄 Development Workflow

### Para Desarrolladores
```bash
# Modo desarrollo con hot reload
pnpm dev

# Build de producción local
pnpm build

# Previsualizar build
pnpm start

# Linting
pnpm lint

# Tests
pnpm test
```

### Git Workflow
```bash
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nueva-funcionalidad
```

## 📞 Soporte

### Si tienes problemas:
1. Revisa la **sección Troubleshooting** arriba
2. Verifica los **logs en consola** (F12)
3. Ejecuta `pnpm build` para verificar errores
4. Consulta `docs/REACT_COMPATIBILITY.md` para problemas de versiones

### Archivos de Logs
- `develop-history/` - Historial de desarrollo
- `docs/` - Documentación técnica completa
- `.next/` - Build cache (se puede eliminar si hay problemas)

---

**🎉 ¡Listo!** Tu entorno local de jpamorosi.os debería estar funcionando en http://localhost:3000