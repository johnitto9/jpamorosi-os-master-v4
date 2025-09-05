# Guía de Deployment - jpamorosi.os

Esta guía detalla el proceso completo de deployment en Vercel para el proyecto jpamorosi.os.

## 🚀 Deployment en Vercel

### Prerrequisitos

1. **Cuenta de Vercel**: [vercel.com/signup](https://vercel.com/signup)
2. **Repositorio en GitHub**: El código debe estar en un repositorio público o privado
3. **Build exitoso local**: Confirmar que `npm run build` ejecuta sin errores

### Paso 1: Preparación del Proyecto

```bash
# Verificar que el build funciona localmente
cd frontend-app
npm install
npm run build

# Verificar que no hay errores de TypeScript
npm run lint
```

### Paso 2: Conectar Repositorio a Vercel

1. **Acceder a Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Nuevo Proyecto**: Click en "New Project"
3. **Importar Repositorio**: 
   - Seleccionar el repositorio `jpamorosi-os`
   - Elegir "frontend-app" como directorio raíz
4. **Configuración del Framework**:
   - Framework Preset: `Next.js`
   - Root Directory: `frontend-app`
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`

### Paso 3: Variables de Entorno

En el Dashboard de Vercel, sección "Environment Variables":

#### Variables Requeridas

```bash
# Email API (opcional - modo stub si no se configura)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXX

# Configuración del sitio
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
NEXT_PUBLIC_APP_ENV=production
```

#### Variables Opcionales

```bash
# Analytics y monitoreo
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=tu_analytics_id

# Configuración personalizada
NEXT_PUBLIC_CONTACT_EMAIL=juan.amorosi@gmail.com
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_VUE=true
```

### Paso 4: Configuración de Dominio

#### Dominio Custom (opcional)

1. **Agregar Dominio**: Settings → Domains
2. **Configurar DNS**: Agregar registros CNAME o A
3. **SSL Automático**: Vercel maneja automáticamente

#### Subdominio Vercel (gratuito)

El proyecto estará disponible en:
- `https://tu-proyecto.vercel.app`
- `https://tu-proyecto-git-main-usuario.vercel.app`

### Paso 5: Optimizaciones de Performance

#### Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --production=false",
  "devCommand": "npm run dev"
}
```

#### Headers de Performance

El proyecto incluye configuración automática en `next.config.js`:

- Compresión Gzip/Brotli
- Cache headers optimizados
- Security headers
- Image optimization

### Paso 6: Verificación del Deployment

#### Checklist Post-Deployment

- [ ] **Build exitoso**: Sin errores en Vercel Dashboard
- [ ] **Sitio accesible**: URL principal carga correctamente
- [ ] **API funcionando**: `/api/contact` responde (modo stub ok)
- [ ] **SEO optimizado**: Meta tags, sitemap.xml, robots.txt
- [ ] **Performance**: Lighthouse score > 90
- [ ] **Funcionalidades**: 
  - [ ] Desktop interface funcional
  - [ ] Modo Vue: `?renderer=vue` 
  - [ ] Formulario de contacto
  - [ ] 3D backgrounds (desktop)

#### Comandos de Verificación

```bash
# Verificar sitemap
curl https://tu-dominio.vercel.app/sitemap.xml

# Verificar robots.txt
curl https://tu-dominio.vercel.app/robots.txt

# Verificar API de contacto
curl -X POST https://tu-dominio.vercel.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","subject":"Test","message":"Test message"}'

# Verificar manifesto PWA
curl https://tu-dominio.vercel.app/manifest.json
```

### Paso 7: Configuración de CI/CD

#### Auto-deployment

Vercel automáticamente:
- **Deploy en push a main**: Producción
- **Deploy en push a otras ramas**: Preview
- **Deploy en Pull Requests**: Preview

#### Branch Protection

Recomendado configurar en GitHub:

```yaml
# .github/workflows/vercel-build-check.yml
name: Vercel Build Check
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend-app && npm install
      - run: cd frontend-app && npm run build
      - run: cd frontend-app && npm run lint
```

## 🔧 Troubleshooting

### Errores Comunes

#### 1. Build Falla - Dependencias Vue

```bash
# Error: Cannot resolve '@tresjs/core'
# Solución: Instalar dependencias Vue en packages/vue-components
cd packages/vue-components && npm install
cd ../.. && npm run build
```

#### 2. Tailwind Classes No Reconocidas

```bash
# Error: class "ring-cyan-400/50" not found
# Verificar: globals.css tiene las variables CSS definidas
# Verificar: next.config.js tiene content paths correctos
```

#### 3. API Contact No Funciona

```bash
# Verificar variable de entorno RESEND_API_KEY
# En modo stub (sin key), debe loggar a consola
# Verificar formato JSON en la request
```

#### 4. 3D Components No Cargan

```bash
# Verificar: three, @react-three/fiber instalados
# Verificar: no3d=true en URL desactiva 3D
# Verificar: errores WebGL en consola del navegador
```

### Logs y Debugging

#### Vercel Functions Logs

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ver logs en tiempo real
vercel logs --follow

# Ver logs de una función específica
vercel logs --function=contact
```

#### Performance Monitoring

```bash
# Lighthouse CI (automático en Vercel)
# Core Web Vitals dashboard
# Vercel Analytics (si está habilitado)
```

## 🔒 Seguridad

### Headers de Seguridad

Configurados automáticamente en `next.config.js`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Variables Sensibles

⚠️ **NUNCA** commits:
- API keys en el código
- Emails personales en archivos públicos
- Configuraciones de desarrollo en producción

✅ **Usar siempre**:
- Variables de entorno en Vercel
- `.env.local` en desarrollo (gitignored)
- Validación de entrada en APIs

## 📊 Monitoring

### Métricas Importantes

1. **Core Web Vitals**
   - LCP < 2.5s
   - FID < 100ms  
   - CLS < 0.1

2. **Lighthouse Scores**
   - Performance > 90
   - Accessibility > 90
   - Best Practices > 90
   - SEO > 90

3. **API Response Times**
   - `/api/contact` < 500ms
   - Static assets < 100ms

### Alertas Recomendadas

- Build failures
- High error rates en APIs
- Performance degradation
- SSL certificate expiry

---

¿Questions sobre el deployment? Verificar logs en Vercel Dashboard o revisar este documento.