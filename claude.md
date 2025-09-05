claude.md — jpamorosi.os (CV interactivo tipo OS)
0) Modo de operación (obligatorio)
Leé este archivo COMPLETO antes de tocar nada.

Ejecutás UNA FASE por vez. Al finalizar, te detenés y pedís autorización para la siguiente.

No borres nada sensible: si algo molesta, renombrá con sufijo ._backup.

Persistencia obligatoria: cada cambio se registra en develop-history/ y el estado vivo en develop-history/claude_state.json.

Protocolo anti context-loss: si reiniciás, re-leé claude.md + todo develop-history/ antes de hablar.

1) Objetivo
Dejar un CV interactivo estilo “OS personal” (ventanas, dock, fondo animado 3D) sobre Next.js + Tailwind v4, compilando y corriendo estable en local, con base lista para:

3D en React (@react-three/fiber) y alternancia a Vue/TresJS vía Web Components.

API /api/contact (Resend-ready).

Buen SEO, a11y y performance.

2) Suposiciones y paths
Tu working dir (Claude): C:\Users\jamor\Downloads\jpamorosi-os

Código de v0: C:\Users\jamor\Downloads\jpamorosi-os\frontend-app

Gestor: pnpm (si aparece bun.lockb, ignoralo/elimínalo).

Node 18+.

3) Estructura que vas a mantener/crear
En el mismo nivel donde estás parado (no dentro de frontend-app), crear:

makefile
Copiar
Editar
C:\Users\jamor\Downloads\jpamorosi-os\
  develop-history\           # logs, esquemas, estado persistente
  tests\                     # tests e2e/unit (Vitest/RTL opcional)
  docs\                      # MIGRACION_TAILWIND.md, DEPLOY.md, etc.
  scripts\                   # utilidades (generate-pdf, checks)
  frontend-app\              # la app Next de v0 (fuente de verdad)
Archivos de control mínimos a crear en la raíz:

develop-history/claude_state.json (estado actual, versión, fase, decisiones)

develop-history/scheme001-initial.md (esquema inicial)

docs/MIGRACION_TAILWIND.md (resumen cambios Tailwind)

docs/INTEGRACION_3D.md (contratos de props + toggles React/Vue)

docs/CONTRIBUTING.md (guía corta de ramas/commits)

4) Reglas duras
Tailwind v4 real: verificá versión. Si es v3, migrá (o documentá por qué no). En v4 NO uses *-opacity-*; usá color/NN.

Nada de imports fantasma: si se importan paquetes inexistentes, creá stubs que compilen.

Sin features nuevas fuera de fase. Si algo es tentador pero no está en la fase, lo anotas en develop-history/TODO_queue.md.

FASE 1 — Estabilización del repo y base compilable
Meta
Que pnpm dev corra sin errores. Tailwind v4 verificado. Estructura limpia. Stubs listos para 3D y Desktop.

Pasos
Preparación & carpetas

Crear: develop-history/, tests/, docs/, scripts/ (en la raíz donde estás).

Crear develop-history/claude_state.json con: { "phase": 1, "tailwind": "unknown", "decisions": [] }

Auditoría rápida

Detectar si hay dos apps Next (una raíz y otra en frontend-app). La fuente de verdad es frontend-app.

Si hay /app en raíz externa a frontend-app, renombrarla a _app_backup (no borrar).

Tailwind v4 check + normalización

Comando: pnpm ls tailwindcss --depth=0 dentro de frontend-app.

Si v4:

Reemplazar ring-opacity-*, bg-opacity-*, text-opacity-*, from-opacity-*, to-opacity-* por formato color/NN.

Asegurar @tailwind base; @tailwind components; @tailwind utilities; en CSS global.

Si hay tokens shadcn: usar ring-[hsl(var(--ring))]/XX etc.

Si v3:

Documentar en docs/MIGRACION_TAILWIND.md y migrar a v4 o adaptar todas las utilidades para v3 (elige UNA línea y documentá).

Stubs mínimos para compilar

Si existen imports tipo desktop, three-react o vue-widgets que no resuelven:

Crear subcarpetas dentro de frontend-app bajo packages/ o fallback simple src/lib/stubs/ (elige 1 y documentá).

Stubs:

Desktop: componente React mínimo que renderiza un h1 y un contenedor.

Background3D: div con radial-gradient (placeholder sin three).

Registrar lazy import para Background3D.

Scripts útiles (root del proyecto y/o dentro de frontend-app)

"dev": "next dev"

"build": "next build"

"lint": "next lint"

"preflight:tailwind": "node ./scripts/check-tailwind-version.mjs" (creá script simple que imprime versión y busca utilidades prohibidas)

Smoke test

pnpm install && pnpm dev

Home carga, sin “unknown utility class”, sin imports rotos.

Entregables
develop-history/scheme001-initial.md (mapa de carpetas, dependencias, versión de Tailwind, decisiones)

docs/MIGRACION_TAILWIND.md (qué se migró y por qué)

develop-history/PHASE1_[YYYY-MM-DD_HHMM]-stabilization.md (log de cambios)

develop-history/claude_state.json actualizado (phaseDone: 1, tailwind: "4.x")

Criterios de aceptación
pnpm dev corre sin errores.

Tailwind v4 confirmado/documentado.

Stubs presentes y página visible.

FASE 2 — UI OS: ventanas + estado + 3D React (progresivo)
Meta
Tener el “escritorio” funcional: ventanas (abrir/cerrar/focus/resize), dock/topbar, store Zustand, y fondo 3D (React Three Fiber) cargado lazy con fallback sin 3D para mobile/prefers-reduced-motion.

Pasos
Store

useDesktopStore (Zustand): { windows[], open(appId), close(id), focus(id), resize(id,{w,h}), move(id,{x,y}) }

apps (About, Skills, Timeline, Projects, Contact) definidas en content/*.json.

Componentes

<Window/>: header (título + cerrar), body con slot; min 280x180; focus ring accesible; Motion para open/close.

<Dock/> o <Topbar/>: botones para abrir “apps” (usa store).

Tipografías (Satoshi/JetBrains Mono) y tema noir/cyber ya integrados.

3D React (R3F)

Instalar three, @react-three/fiber, @react-three/drei.

Background3D: puntos en esfera Fibonacci rotando lento; props { density=1500, color='#00f2ff', speed=0.05 }.

Lazy import + toggle por ?no3d=true y prefers-reduced-motion.

A11y y performance

Roles/aria, tab order, focus visible.

En mobile: auto fallback sin 3D.

Tests mínimos

Vitest/RTL para useDesktopStore (abrir/cerrar/focus).

(Opcional) Playwright smoke: abrir ventana About y cerrarla.

Entregables
develop-history/scheme002-ui3d.md (diagramas simples de componentes y flujos)

develop-history/PHASE2_[fecha]-ui-os-3d.md

docs/INTEGRACION_3D.md (contrato de props + toggles)

tests/desktop_store.spec.ts (mínimo)

Criterios de aceptación
Ventanas operativas (abrir/mover/resize/cerrar/focus).

3D en desktop, fallback en mobile/reduced-motion.

Tests pasan local.

FASE 3 — Integraciones: Contact API, Vue/TresJS CE, SEO/Perf, docs y deploy
Meta
/api/contact con zod validación y stub Resend (si no hay key → responde {ok:true} y loguea).

Web Component Vue/TresJS (<vue-planets>), registro client-side, flag ?renderer=vue.

Ajustes SEO (metadata, OG), Lighthouse > 90 (perf, a11y, best practices).

Docs finales + guías + deploy a Vercel (manual).

Pasos
API Contact

app/api/contact/route.ts: POST {name,email,message} con zod.

Si existe RESEND_API_KEY: enviar; sino stub y log “received (local)”.

Vue/TresJS como CE

Paquete sencillo vue-widgets (o carpeta src/ce):

Planets.ce.vue con TresJS → build Vite CE → dist/planets.ce.js

Registrar dinámicamente en Next (client) con import('.../planets.ce.js')

Uso: <vue-planets density="1200" speed="0.05" />

Toggle ?renderer=vue para usar CE en vez de React 3D.

SEO/Perf

metadata en layout.tsx, OG images, robots.txt, sitemap.xml.

Imágenes en webp, lazy.

A11y: aria-*, prefers-reduced-motion, focus.

Docs y deploy

Actualizar README.md (rutas, flags, envs).

docs/DEPLOY.md (Vercel pasos + vars).

Smoke test en prod.

Entregables
develop-history/scheme003-integrations.md

develop-history/PHASE3_[fecha]-integrations.md

docs/DEPLOY.md y README actualizado.

Criterios de aceptación
Form Contacto valida y responde.

<vue-planets> funciona con flag.

Lighthouse local ≥ 90.

Repo listo para deploy (manual).

5) Protocolo de persistencia y logs (plantillas)
Schema inicial/cambios (develop-history/schemeNNN-*.md)

shell
Copiar
Editar
# Scheme NNN - [nombre]
## Árbol de carpetas (resumen)
## Dependencias clave (versiones)
## Puntos de montaje (rutas/entry)
## Decisiones técnicas
## Riesgos y mitigaciones
Change Log (develop-history/YYYY-MM-DD_HHMM-[desc].md)

shell
Copiar
Editar
# Change Log: [fecha hora] - [desc]
## 1. Objetivo
## 2. Revisión previa
## 3. Cambios aplicados (con paths)
## 4. Implicancias técnicas
## 5. Testing (comandos y resultados)
## 6. Referencias
## 7. Persistencia (estado actualizado en claude_state.json)
claude_state.json (siempre actualizado)

json
Copiar
Editar
{
  "phase": 1,
  "tailwind": "4.0.0",
  "decisions": [
    "unificada app en frontend-app",
    "tokens HSL para ring/opacity"
  ],
  "flags": {
    "no3d": false,
    "renderer": "react"
  }
}
Ante context-loss

Parás y notificás.

Re-leés claude.md + todo develop-history/.

Confirmás “contexto recargado” y continúas.

6) Convenciones de ramas y commits
Rama única main en local; si vas a tocar mucho, crea feat/phase-2-ui-os.

Commits: chore:, fix:, feat:, docs:, refactor:…

No squashees historial de develop-history/.

