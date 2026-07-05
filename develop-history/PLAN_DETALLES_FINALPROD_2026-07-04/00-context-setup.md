# 00 — Contexto, setup y mapa de arquitectura

## Repo

- Raíz: `C:\Users\jamor\Downloads\jpamorosi-os-master-v4` (WSL:
  `/mnt/c/Users/jamor/Downloads/jpamorosi-os-master-v4`).
- Frontend: `frontend-app/` (Next.js 15 + Tailwind v4.1.11 + GSAP + Lenis).
- Branch actual: `v4final`.
- Referencia "hecho bien": `lumenscriot14-slim/` (patrón de vault/canon inline
  que el usuario quiere emular en las salas de chat).

## Cómo correr / verificar

El `:3001` es el **backend real containerizado** (con IA, Postgres, R2). El
código está HORNEADO en la imagen (Dockerfile `COPY . .` + `pnpm build`
standalone) — reiniciar el contenedor NO recompila. Secuencia real de rebuild
(docker.exe desde WSL):

```bash
docker.exe compose --profile backend build amorosi-backend
docker.exe compose --profile backend up -d amorosi-backend
curl -s http://127.0.0.1:3001/api/health   # -> {"ok":true}
```

- `:3000` = espejo estático sin IA. NO usarlo para probar flujos reales.
- El bundle de la home cambia de hash en cada build; para confirmar que tu
  código llegó: `curl -s http://127.0.0.1:3001/ | grep -oE 'page-[a-z0-9]+\.js'`
  y grepear un marcador dentro del chunk.
- tsc: `cd frontend-app && npx tsc --noEmit` (0 errores es el gate).
- vitest NO corre en WSL (bug rollup native, ajeno al código).

## Variables de entorno relevantes

- `OPENROUTER_API_KEY` — habilita generación (texto + imagen). Sin ella,
  `mockupsEnabled()` es false y los endpoints devuelven 503.
- `OPENROUTER_IMAGE_MODEL` — `bytedance-seed/seedream-4.5` en docker.local;
  gemini en otros. **Confirmar cuál carga la instancia viva** antes de asumir.
- `R2_*` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`, `R2_PUBLIC_BASE_URL`) — si están, `storeFile()` sube a
  Cloudflare R2; si no, guarda local. Ver `lib/media/storage.ts` + `lib/env.ts`
  (`isR2Configured`).
- `NEXT_PUBLIC_MEDIA_CDN_BASE` / `NEXT_PUBLIC_VIDEO_CDN_BASE` — si están,
  `resolveMediaUrl()`/`resolveVideoUrl()` sirven todo desde el CDN. Rutas
  absolutas (http/data/blob) pasan sin tocar.

## Restricción Seedream 4.5 (ya resuelta, no romper)

Seed exige tamaño derivado ≥ 3.686.400 px. `2K` sólo lo supera en 1:1;
cualquier no-cuadrado necesita `4K`. Manejado por `sizedRequest()` en
`lib/agent/tools-server.ts:198`. NO revertir.

## Mapa de arquitectura del asistente / branding

Flujo guiado por una **máquina de fases** en la columna `phase` del proyecto:
`created → branding → decisions → consolidated → generating → ready`.

Componentes (todos en `frontend-app/components/assistant/`):

| Componente | Rol |
|-----------|-----|
| `AssistantWidget.tsx` (1160 líneas) | Contenedor del chat. Tabs omni/project/branding, scroll container (`scrollRef`), monta `AssetVault`, decide qué board mostrar por fase. |
| `AssistantFlow.tsx` (592) | Boards por fase: `PhaseCreatedCard`, `BrandingWizard`, `DecisionsBoard`, `GenerationBoard`, `BrandingDone`, etc. |
| `AssistantProjectOrbit.tsx` (674) | `ProjectStrip` (cards de proyectos creados) + `ProjectSetup` (wizard de fundaciones 6 pasos). |
| `AssetVault.tsx` (359) | Panel lateral derecho (lg+) con palette/DNA/assets/decisiones. Gated por `active`. |
| `AssistantProjectCard.tsx` (33) | Card estática del seed (proyectos públicos del portfolio). NO es la card que crece. |

Rutas API (`frontend-app/app/api/assistant/`):

| Ruta | Qué hace |
|------|----------|
| `branding/route.ts` | Genera/sube 1 asset por rol (logo/reference/storyboard). **Aquí vive el bug #1.** |
| `generate/route.ts` | map / home (plan-driven) / screen / mockup. Alimenta los 3 botones. |
| `decisions/route.ts` | Persiste StackDecisions. |
| `projects/route.ts` | CRUD + PATCH de fase. |
| `workspace/route.ts` | Lee el workspace (assets/DNA/decisions) — lo que el vault muestra. |
| `upload/route.ts` | Sube imagen a la media dir de sesión. |

Lib del agente (`frontend-app/lib/agent/`):

- `tools-server.ts` — `generateImageToSession()` (core Seedream), `describePalette()`,
  `ASSET_ROLE_CAPS`, `sizedRequest()`. **El fix del logo-chain toca este archivo.**
- `project-workspace.ts` — `addAsset`, `listAssets`, `createVisualPlan`,
  `listStackDecisions`, `countGeneratedAssets`.
- `projects.ts` — `listSessionProjects`, `updateSessionProject`, `setProjectPhase`.

Media / R2:

- `lib/media/storage.ts` — `storeFile()` (R2 o local).
- `lib/media/resolve.ts` — `resolveMediaUrl()` / `resolveVideoUrl()` (seam CDN).
- `app/api/admin/upload/route.ts` — upload genérico admin (magic-byte sniff).

Home / interludios / cards:

- `components/hall/Interludes.tsx` — 3 interludios (BEFORE THE SYSTEMS,
  INSIDE THE PROOF, LIVING LAYER) + `IMG` const con paths hardcodeados +
  `InterludeImage` (fallback emoji) + `MobileDebugIndicator` (a borrar).
- `components/hall/HallOfFameGrid.tsx` — carrusel Embla coverflow (bug #9/#10).
- `components/hall/FeaturedSystemsGrid.tsx` — "Systems in Orbit".
- `components/hall/LabArchiveGrid.tsx` — "Lab Fragments".
- `components/ui/card-carousel.tsx` — carrusel reutilizable (Featured/Archive).
- `content/projects.ts` — seed estático de proyectos (`assets.heroImage`, etc.).

## Estado previo (claude_state.json)

`phase: "FINALPROD_S12_BRANDING_16x9_FIXED"`. Las 12 sesiones previas fueron
sobre animaciones mobile de interludios (resueltas en S10) y el fix 16:9 de
Seedream (S12). Ver `develop-history/HANDOFF_FINALPROD_MOBILE_2026-07-04.md`
para ese historial.
