# jpamorosi.os

CV interactivo estilo "sistema operativo personal" construido con Next.js, React y tecnologías 3D.

## Estructura del Monorepo

- `apps/web` - Aplicación Next.js principal
- `packages/desktop` - Componentes del sistema de ventanas y dock
- `packages/three-react` - Componentes 3D con React Three Fiber
- `packages/vue-widgets` - Widgets Vue con TresJS como web components

## Desarrollo

\`\`\`bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build completo
pnpm build

# Linting
pnpm lint
\`\`\`

## Configuración de Tailwind y Colores Custom

### Versión de Tailwind

Este proyecto utiliza **TailwindCSS v4.0.0**. Para verificar la versión instalada:

\`\`\`bash
pnpm ls tailwindcss --depth=0
\`\`\`

**⚠️ Importante**: Si detectas una versión v3 o inferior, debes migrar a v4 antes de continuar, o adaptar la sintaxis de opacidad (`ring-opacity-*`) a esa versión.

### Colores Custom Definidos

Las siguientes variables CSS personalizadas están definidas en `app/globals.css` y son necesarias para el tema futurista del OS:

\`\`\`css
:root {
  /* Colores de acento del tema futurista */
  --accent-cyan: oklch(0.8 0.15 200);
  --accent-magenta: oklch(0.7 0.2 320);
  --accent-purple: oklch(0.65 0.18 280);
  
  /* Colores del tema oscuro */
  --dark-bg: oklch(0.1 0 0);
  --primary-text: oklch(0.95 0 0);
  --secondary-text: oklch(0.7 0 0);
  
  /* Efectos de cristal */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.3);
}
\`\`\`

### Cómo Usar Colores Custom en Tailwind v4

**❌ INCORRECTO** - En Tailwind v4 NO se pueden usar directamente como `ring-accent-cyan/50` si no están registrados en `tailwind.config.js`:

\`\`\`html
<div class="ring-accent-cyan/50">❌ Error</div>
\`\`\`

**✅ CORRECTO** - Para usar variables custom en v4, emplea la sintaxis con `oklch()` o `var()`:

\`\`\`html
<!-- Usando variables CSS directamente -->
<div class="ring-[oklch(var(--accent-cyan))]/50">✅ Correcto</div>

<!-- Ejemplos para diferentes propiedades -->
<div class="bg-[oklch(var(--accent-magenta))]/80">Fondo con opacidad</div>
<p class="text-[oklch(var(--accent-purple))]">Texto de acento</p>
<div class="border-[oklch(var(--accent-cyan))]">Borde de acento</div>
<button class="ring-[oklch(var(--accent-cyan))]/50 focus:ring-2">Botón con focus ring</button>
\`\`\`

### Colores Registrados en Tailwind

Los siguientes colores están registrados en el tema de Tailwind y se pueden usar directamente:

\`\`\`html
<!-- Colores del sistema de diseño -->
<div class="bg-accent-cyan text-primary-text">Usando colores registrados</div>
<div class="border-accent-magenta ring-accent-purple/50">Múltiples acentos</div>
\`\`\`

### Reglas para Agregar Nuevos Colores

1. **Para nombres tipo `ring-miColor`**: Agrégalos en `tailwind.config.js` dentro de `theme.extend.colors`
2. **Para variables CSS**: Defínelas en `:root` y úsalas con la sintaxis `[oklch(var(--mi-color))]`
3. **Mantén consistencia**: Usa el prefijo `accent-` para colores de acento del tema

### Buenas Prácticas para Evitar Errores

- ✅ **NO inventes clases** `ring-*` o `bg-*` sin asegurarte que el color exista
- ✅ **En Tailwind v4**, siempre usa la sintaxis `color/NN` para opacidades, NO `*-opacity-NN`
- ✅ **Mantén sincronizados** `globals.css` y `tailwind.config.js` en cuanto a colores
- ✅ **Usa nombres consistentes** para los acentos (`accent-cyan`, `accent-magenta`, `accent-purple`)
- ✅ **Prefiere oklch()** sobre hex o rgb para mejor consistencia de color

### Comando de Verificación

Antes de hacer commit, ejecuta:

\`\`\`bash
pnpm dev
\`\`\`

Y abre la aplicación. **No debe aparecer ningún error** de `unknown utility class` en la consola.

### Ejemplos de Uso Común

\`\`\`html
<!-- Botones con efectos de cristal -->
<button class="glass-card focus-ring bg-[oklch(var(--accent-cyan))]/20 hover:bg-[oklch(var(--accent-cyan))]/30">
  Botón futurista
</button>

<!-- Cards con bordes de acento -->
<div class="glass-card border-[oklch(var(--accent-magenta))]/50">
  <h3 class="text-[oklch(var(--primary-text))]">Título</h3>
  <p class="text-[oklch(var(--secondary-text))]">Descripción</p>
</div>

<!-- Iconos con colores de acento -->
<svg class="text-[oklch(var(--accent-purple))]">...</svg>
\`\`\`

## Configuración

### Activar 3D React
Los fondos 3D se cargan automáticamente en desktop. Para desactivar, usar `?no3d=true` en la URL.

### Activar Web Components Vue
Los componentes Vue se registran automáticamente. Para alternar entre React y Vue 3D, usar `?renderer=vue`.

### Activar Resend
1. Copiar `.env.example` a `.env.local`
2. Agregar tu API key de Resend
3. Configurar el email de origen

### Deploy a Vercel
1. Conectar el repositorio
2. Configurar las variables de entorno
3. Deploy automático desde main

## Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: TailwindCSS 4, shadcn/ui
- **Estado**: Zustand
- **Animaciones**: Framer Motion
- **3D**: React Three Fiber, TresJS
- **Formularios**: React Hook Form + Zod
- **Monorepo**: pnpm workspaces
