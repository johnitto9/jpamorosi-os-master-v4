# puldioappcv.md — Playbook integral (CV OS + 3D + Vue CE)

**Lee este archivo completo antes de tocar nada.** Ejecuta **una fase por vez**. Al terminar cada fase, **detenete** y reportá.

## 0) Contexto & rutas (obligatorio)
- **Estoy situado en:** `C:\Users\jamor\Downloads\jpamorosi-os`
- **App de v0:** `C:\Users\jamor\Downloads\jpamorosi-os\frontend-app`
- **Gestor:** PNPM (Corepack). Fijar en `frontend-app/package.json` → `"packageManager": "pnpm@9.12.0"`

En el mismo nivel donde estoy (no dentro de `frontend-app`), deben existir:
develop-history/
tests/
docs/
scripts/
frontend-app/

markdown
Copiar
Editar

## 1) Invariantes (no negociables)
- **Tailwind v4 real** (confirmado por README); si aparece v3, migrar o documentar y adaptar sintaxis (slash opacity en v4).
- **3D progresivo:** React Three Fiber por defecto con **lazy import**; fallback sin 3D para `prefers-reduced-motion`, mobile o `?no3d=true`.
- **Switch de renderer:** `?renderer=react|vue` (default: `react`). Vue/TresJS corre como **Web Component** (`<vue-planets/>`).
- **Anti-contextloss:** Todo se persiste en `develop-history/`. Si hay reinicio, re-leer `puldioappcv.md` + historial.
- **Nada de imports fantasma:** si falta un paquete, creá **stubs que compilen** y documentá.

## 2) Presupuestos de performance & A11y
- TTI desktop < 2.5s; main bundle < 300 KB gzip (sin contar 3D async).
- 3D es **decorativo**: `aria-hidden`, sin foco, sin scroll-trap.
- Opacidad de colores con sintaxis `color/NN`; variables HSL/OKLCH permitidas via `[...]`.

## 3) Contratos 3D
Archivo a crear: `frontend-app/packages/three-react/src/scene.contract.ts`
```ts
export type SceneProps = {
  density?: number;   // 200–5000
  color?: string;     // CSS color (hsl/oklch/hex)
  speed?: number;     // 0.0–1.0
  className?: string;
};
export interface SceneContract {
  (props: SceneProps): JSX.Element;
}
4) Ramas, commits, persistencia
Rama local: main (o feat/phase-2-ui-os si hace falta).

Commits tipo: feat:, fix:, docs:, chore:, refactor:.

NO squash del historial en develop-history/.

Estado vivo en develop-history/claude_state.json.

FASE 1 — Estabilización y base compilable
Meta
pnpm dev arranca sin errores. Tailwind v4 verificado. Stubs mínimos listos.

Pasos
Carpetas & estado

Crear: develop-history/, tests/, docs/, scripts/ (si faltan).

develop-history/claude_state.json:

json
Copiar
Editar
{ "phase": 1, "tailwind": "unknown", "decisions": [] }
Auditoría Next

Solo debe haber una app Next dentro de frontend-app (p.ej. apps/web). Si existe otra /app fuera, renombrar a /_app_backup (no borrar).

Tailwind check

Dentro de frontend-app: pnpm ls tailwindcss --depth=0.

Si v4: reemplazar *-opacity-* por color/NN. Tokens shadcn via ring-[hsl(var(--ring))]/NN, etc.

Confirmar @tailwind base; @tailwind components; @tailwind utilities; en el CSS global.

Stubs para compilar

Si packages/desktop no existe → crearlo con src/index.tsx que exporte <Desktop/> mínimo.

Si packages/three-react no exporta aún → crear src/index.tsx con placeholder (radial-gradient) y exportar Background3D.

Agregar src/scene.contract.ts como arriba.

Scripts útiles

scripts/check-tailwind-version.mjs: imprime versión y escanea utilidades prohibidas.

Smoke test

pnpm install && pnpm -w dev (o pnpm --filter web dev según workspace).

Home carga, sin “unknown utility class”, sin imports rotos.

Entregables
develop-history/scheme001-initial.md (árbol, deps, tailwind, decisiones)

docs/MIGRACION_TAILWIND.md (qué migró y por qué)

develop-history/PHASE1_[YYYY-MM-DD_HHMM]-stabilization.md

develop-history/claude_state.json actualizado (phaseDone:1, tailwind:"4.x")

Criterios de aceptación
Dev corre sin errores.

Tailwind v4 documentado.

Stubs presentes, página visible.

FASE 2 — UI OS: ventanas + estado + 3D React (progresivo)
Meta
“Escritorio” funcional: abrir/cerrar/mover/redimensionar/focus; Dock/Topbar; store Zustand; 3D React con lazy + toggles.

Pasos
Store (Zustand)

useDesktopStore: { windows[], open(appId), close(id), focus(id), resize(id,{w,h}), move(id,{x,y}) }

Apps (About, Skills, Timeline, Projects, Contact) desde content/*.json.

Componentes

<Window/>: header (título + cerrar), body; min 280x180; ring accesible; animaciones sutiles (framer-motion).

<Dock/> o <Topbar/>: botones que llaman open(appId).

3D React (R3F)

Instalar: three @react-three/fiber @react-three/drei.

Background3D: esfera Fibonacci (Points) con props de SceneProps.

Lazy import + apagado por ?no3d=true, mobile o prefers-reduced-motion.

Tests

tests/desktop_store.spec.ts (Vitest/RTL): open/close/focus.

(Opcional) test de flags 3D.

Entregables
develop-history/scheme002-ui3d.md

develop-history/PHASE2_[fecha]-ui-os-3d.md

docs/INTEGRACION_3D.md (contratos, toggles, props, presupuesto)

Criterios de aceptación
Ventanas operativas completas.

3D visible en desktop; apagado con flags.

Tests pasan.

FASE 3 — Integraciones: Contact API + Vue/TresJS CE + SEO/Perf + Deploy
Meta
/api/contact (zod + Resend stub).

<vue-planets> (CE con TresJS) + flag ?renderer=vue.

SEO/perf > 90 (Lighthouse), docs y DEPLOY.md (Vercel).

Pasos
API

app/api/contact/route.ts: POST {name,email,message} validado con zod.

Si RESEND_API_KEY no existe → {ok:true} + log.

Vue CE

packages/vue-widgets (o src/ce): Planets.ce.vue con TresJS.

Build CE con Vite → dist/planets.ce.js.

Registro dinámico en Next (client) y uso <vue-planets density="1200" speed="0.05" />.

SEO/Perf

metadata completa, OG, robots.txt, sitemap.xml.

webp, lazy images, a11y.

Docs/Deploy

Actualizar README.md.

docs/DEPLOY.md con pasos Vercel + envs.

Entregables
develop-history/scheme003-integrations.md

develop-history/PHASE3_[fecha]-integrations.md

docs/DEPLOY.md + README actualizados

Criterios de aceptación
API responde.

CE Vue funciona con flag.

Lighthouse ≥ 90.

Repo listo para deploy manual.

Apéndice A — Snippets que deben crearse
scripts/check-tailwind-version.mjs
js
Copiar
Editar
import { readFileSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
function grep(dir, re, files = []) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${f.name}`
    if (f.isDirectory()) grep(p, re, files)
    else if (/\.(ts|tsx|js|jsx|css)$/.test(f.name)) {
      const txt = readFileSync(p, 'utf8')
      if (re.test(txt)) files.push(p)
    }
  }
  return files
}
const version = execSync('pnpm ls tailwindcss --depth=0').toString().trim()
const offenders = grep('./', /(ring|bg|text|from|to)-opacity-\d+/)
console.log('Tailwind:', version || 'unknown')
console.log('Opacity offenders:', offenders.length)
offenders.forEach(f => console.log(' -', f))
packages/desktop/src/index.tsx (stub)
tsx
Copiar
Editar
import * as React from 'react'
export function Desktop() {
  return (
    <div className="min-h-screen relative z-10 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          <span className="text-accent-cyan">jp</span>
          <span className="text-accent-magenta">amorosi</span>
          <span className="text-accent-purple">.os</span>
        </h1>
        {/* TODO: ventanas */}
      </div>
    </div>
  )
}
export default Desktop
packages/three-react/src/index.tsx (placeholder antes de R3F)
tsx
Copiar
Editar
import * as React from 'react'
import type { SceneProps } from './scene.contract'
export function Background3D({ color = '#00f2ff' }: SceneProps) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: `radial-gradient(1200px 600px at 50% 40%, ${color}20, transparent 60%)` }}
    />
  )
}
export default Background3D
Python opcional (pedido del autor)
requirements.txt (placeholder, por si más adelante generamos PDFs o tooling):

ini
Copiar
Editar
reportlab==4.2.2
scripts/make_venv.bat:

bat
Copiar
Editar
@echo off
set VENV_DIR=.venv
py -m venv %VENV_DIR%
call %VENV_DIR%\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
echo Venv listo. Para activar: %VENV_DIR%\Scripts\activate
Protocolo anti context-loss
Si el agente se “resetea”, volver a leer docs/puldioappcv.md + todo develop-history/.

Recalcular estado desde develop-history/claude_state.json.

Confirmar: “contexto recargado y consistente” y recién ahí continuar.
