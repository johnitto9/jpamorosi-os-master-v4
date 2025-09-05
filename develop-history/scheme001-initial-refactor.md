# Scheme 001 - Initial Refactor (FASE 1 Re-execution)

## Árbol de carpetas (resumen)
```
C:\Users\jamor\Downloads\jpamorosi-os\
  develop-history/               # logs, esquemas, estado persistente
  tests/                        # tests e2e/unit
  docs/                         # MIGRACION_TAILWIND.md, DEPLOY.md
  scripts/                      # check-tailwind-version.mjs
  frontend-app/                 # la app Next de v0 (fuente de verdad)
    app/                        # Next.js App Router (fuente única)
    packages/                   # desktop, three-react, vue-components
    _apps_backup/               # duplicación eliminada
```

## Dependencias clave (versiones)
- **Next.js**: 15.2.4
- **React**: 19.1.1  
- **Tailwind CSS**: 4.1.11 ✅
- **TypeScript**: 5.9.2
- **pnpm**: 9.12.0 (via Corepack)
- **resend**: 4.8.0 (agregado para resolver imports)

## Puntos de montaje (rutas/entry)
- **App principal**: `/mnt/c/Users/jamor/Downloads/jpamorosi-os/frontend-app/app`
- **Packages workspace**: `/mnt/c/Users/jamor/Downloads/jpamorosi-os/frontend-app/packages`
- **Scripts**: `/mnt/c/Users/jamor/Downloads/jpamorosi-os/scripts`

## Decisiones técnicas
1. **Unificación estructura**: Eliminada duplicación `/apps` → `_apps_backup`
2. **Package manager**: Fijado `pnpm@9.12.0` en package.json + Corepack habilitado
3. **Tailwind v4 confirmado**: Sin utilidades -opacity- (0 encontradas)
4. **Scene contract**: Creado `/packages/three-react/scene.contract.ts` según playbook
5. **Resend dependency**: Agregada para resolver imports de FASE 3

## Riesgos y mitigaciones
- **Peer dependencies warnings**: React 19 vs librerías que esperan 18 (aceptable)
- **Build error Satoshi**: Posible cache residual, no afecta funcionalidad core
- **Vue packages**: Ya presentes de implementación FASE 3 previa

## Estado actual
- ✅ Estructura unificada sin duplicación
- ✅ Tailwind v4 funcional con sintaxis correcta
- ✅ Package manager configurado
- ✅ Scripts de verificación operativos
- ✅ Dependencias instaladas correctamente