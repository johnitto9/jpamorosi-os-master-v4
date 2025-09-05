# 🔧 Comandos Útiles - jpamorosi.os

## 🚀 Inicio Rápido

```bash
# Ejecutar launcher automático (Windows)
start-jpamorosi-os.bat

# Inicio manual
cd frontend-app
pnpm install
pnpm dev
```

## 📦 Gestión de Dependencias

```bash
# Instalar dependencias
pnpm install

# Actualizar dependencias
pnpm update

# Auditar seguridad
pnpm audit

# Limpiar cache y node_modules
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Verificar versiones instaladas
pnpm ls next react three
```

## 🏗️ Build y Testing

```bash
# Build completo
pnpm build

# Previsualizar build
pnpm start

# Tests unitarios
pnpm test

# Tests en modo watch
pnpm test --watch

# Tests con coverage
pnpm test --coverage

# Linting
pnpm lint
pnpm lint --fix
```

## 🧪 Development y Debug

```bash
# Servidor desarrollo con debug
pnpm dev --turbo

# Build con análisis de bundle
pnpm build --analyze

# Verificar tipos TypeScript
pnpm tsc --noEmit

# Formatear código
pnpm prettier --write .
```

## 📊 Performance y Análisis

```bash
# Analizar tamaño de bundle
npx @next/bundle-analyzer

# Lighthouse CI (si está configurado)
npx lhci autorun

# Verificar accesibilidad
npx @axe-core/cli http://localhost:3000
```

## 🔄 Git Workflow

```bash
# Setup inicial
git clone <repo-url>
cd jpamorosi-os
start-jpamorosi-os.bat

# Workflow de features
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nueva-funcionalidad

# Actualizar desde main
git checkout main
git pull origin main
git checkout feature/mi-feature
git rebase main
```

## 🛠️ Troubleshooting

```bash
# Limpiar build cache de Next.js
rm -rf .next

# Reinstalación completa
rm -rf node_modules pnpm-lock.yaml .next
pnpm install

# Verificar puertos ocupados
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Debug de memoria
node --max-old-space-size=4096 node_modules/.bin/next dev
```

## 🌐 URLs de Testing Local

```bash
# Principales
http://localhost:3000                    # Homepage
http://localhost:3000/api/contact        # API endpoint

# SEO y PWA
http://localhost:3000/robots.txt         # Robots
http://localhost:3000/sitemap.xml        # Sitemap  
http://localhost:3000/manifest.webmanifest # PWA

# Con flags
http://localhost:3000?no3d=true          # Sin 3D
http://localhost:3000?density=500        # Menos partículas
http://localhost:3000?renderer=vue       # Renderer Vue
```

## 🔧 Variables de Entorno

Crear `.env.local` en `frontend-app/`:

```bash
# API de contacto (opcional)
RESEND_API_KEY=re_xxxxxxxxxxxxxxx
FROM_EMAIL=contact@jpamorosi.com
TO_EMAIL=juan.pablo@example.com

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# 3D settings (opcional)
NEXT_PUBLIC_3D_ENABLED=true
NEXT_PUBLIC_DEFAULT_RENDERER=react
NEXT_PUBLIC_PERFORMANCE_MODE=balanced
```

## 📱 Testing Mobile

```bash
# Obtener IP local
ipconfig | findstr IPv4

# Acceder desde móvil
http://192.168.1.XXX:3000

# Testing PWA
# 1. Abrir Chrome DevTools
# 2. Application > Manifest
# 3. Verificar "Add to Home Screen"
```

## 🚀 Deploy Local (Testing)

```bash
# Build estático
pnpm build
pnpm start

# Servir estático con serve
npx serve out -l 3000

# Docker local (si existe Dockerfile)
docker build -t jpamorosi-os .
docker run -p 3000:3000 jpamorosi-os
```

## 📋 Checklist Pre-Deploy

- [ ] `pnpm build` exitoso
- [ ] `pnpm test` 100% passing  
- [ ] No errores de TypeScript
- [ ] SEO metadata configurado
- [ ] PWA manifest válido
- [ ] Variables de entorno configuradas
- [ ] Performance > 90 en Lighthouse
- [ ] Testing manual en mobile
- [ ] API endpoints funcionando

## 🔍 Debug Específicos

### Errores de React/3D
```bash
# Verificar versiones React
pnpm ls react react-dom @react-three/fiber

# Forzar React 18 si hay problemas
pnpm remove react react-dom @types/react @types/react-dom
pnpm add react@^18.2.0 react-dom@^18.2.0 @types/react@^18.2.0 @types/react-dom@^18.2.0
```

### Errores de Build
```bash
# Verificar next.config.js
node -c next.config.js

# Debug de Tailwind
npx tailwindcss -i ./app/globals.css -o ./debug.css --watch
```

### Problemas de Performance  
```bash
# Profilear con React DevTools
NEXT_PUBLIC_DEBUG=true pnpm dev

# Analizar bundle
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

---

💡 **Tip**: Mantén este archivo a mano para referencia rápida durante el desarrollo.