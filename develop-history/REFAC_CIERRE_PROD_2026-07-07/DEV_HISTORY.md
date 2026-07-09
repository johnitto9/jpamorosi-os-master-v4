# Dev History — REFAC CIERRE PROD 2026-07-07

Ejecutada completa en una sesión (Fable 5, último día). Build: `tsc --noEmit`
limpio + `next build` OK al cierre.

## F1 — Pausa mobile en secciones de cards ✅
`app/page.tsx`: los 3 wrappers de grids pasaron de
`min-h-[110vh]` + `sticky top-0` incondicional a `lg:min-h-[110vh]` +
`lg:sticky lg:top-0`. En mobile el wrapper mide lo que mide el contenido →
no hay recorrido de pin → no hay "piso". Desktop intacto (respiro entre
escenas GSAP conservado).

## F2 — Copy nuevo escenas GSAP ✅
`lib/i18n/dictionaries.ts` il1/il2/il3 reescritos en los 11 idiomas:
- **Scene 01 · BEFORE THE SYSTEMS** — "The builder came first." + 5 beats
  (First, sell. → One build at a time.)
- **Scene 02 · INSIDE THE PROOF** — "This portfolio is running too." +
  4 layers (Public interface / Orbe · activation / Memory · continuity /
  Scout · autonomy)
- **Scene 03 · THE LIVING LAYER** — "Don't start from scratch again." +
  8 beats terminando en "Ready to begin?"
Las timelines usan `items.length` dinámico — 5/4/8 items animan sin tocar
Interludes.tsx. Nota: la trust line "NO LOGIN REQUIRED · CONTEXT PERSISTS ·
YOU STAY IN CONTROL" NO se agregó como texto fijo (el spec pide usarla sólo
si las 3 afirmaciones son literalmente ciertas en prod — validar antes).

## F3 — i18n: he / ja / ko / hi ✅
- `LANGS` + entradas completas en DICTS, ROOM, WIZARD, COOKIE, FLOW,
  ASSISTANT (dictionaries.ts), COPY/NOTES (guided-tour.ts), OMNI_TOUR
  (omni-tour.ts), TOUR_CTA, SKIP_LABEL, DECISION_PRESETS, BUSINESS_NEEDS,
  KIND_META_LABELS, generatePrompt (componentes assistant).
- `server.ts`: IL→he, JP→ja, KR→ko, IN→hi en detección por IP.
- `RTL_LANGS` exportado (ar+he) como seam; el layout hoy no flipea `dir`
  (paridad con cómo ya convivía el árabe — cambiarlo a horas de prod era
  riesgo innecesario).
- Diagnóstico del sistema ("¿i118?"): NO es i18next; es un sistema propio de
  2 capas — chrome hardcodeado (0 tokens runtime, type-safe: `Record<Lang,…>`
  fuerza cobertura al compilar) + contenido de proyectos vía LLM con cache
  Postgres. Veredicto: sano. Único costo: primer render de idioma nuevo paga
  la traducción del contenido una vez → precalentar (ver MIGRACION_DOKPLOY.md).

## F4 — Caption del visual en outreach ✅
`lib/email/templates.ts` OUTREACH_LANG: visualAlt/visualCaption ahora invitan
("Pasate por mi CV interactivo y conocé a Orbe — empecemos juntos un nuevo
proyecto con IA" / EN equivalente), acordes a la imagen INSIDE THE PROOF
(card de Orbe) que el email usa como visual.

## F5 — Consola limpia / ofuscación ✅
- `app/layout.tsx`: eliminadas las 3 `<meta httpEquiv>` (X-Frame-Options en
  meta era el error rojo de consola; los headers reales ya están en
  next.config.js).
- `next.config.js`: `compiler.removeConsole` (excepto error/warn) — mata los
  console.log legacy del /os avatar en prod.
- `Interludes.tsx`: `__IL_DEBUG__` y `__IL_MOBILE_RAN__` gateados a
  NODE_ENV !== production.
- Los `contentscript.js ObjectMultiplex` y los 2 "Uncaught (in promise)
  Object" en (index):1 son de una EXTENSIÓN del navegador (wallet tipo
  MetaMask), no del sitio — verificar en incógnito.

## F6 — Migración de datos a Dokploy ✅ (doc + script)
- `scripts/dump-for-dokploy.sh` (pg_dump custom + tar del volumen backend +
  RESTORE.md autogenerado). WSL: `DOCKER=docker.exe`.
- `MIGRACION_DOKPLOY.md` en esta carpeta: inventario dato→destino, la media
  R2/CDN migra "sola" (mismas envs), orden de encendido de los gates de
  autonomía, precalentado de idiomas nuevos.

## F7 — Scout: capa de estrategia + círculo cerrado ✅
Diagnóstico del decaimiento: 7 queries estáticas rotadas por weekday → tras
una semana los SERPs se repiten y el dedup por URL deja ingest≈0.
- **Nuevo `lib/agent/scout-strategy.ts`**:
  - `getQueryPerformance()` — yield real por query desde `prospects.raw`
    (ingested / emails / llegadas a contact / score medio). 0 cambios de schema.
  - `getRecentQueries()` — ventana de no-repetición (21 días) desde eventos.
  - `planScoutQueries(n)` — estratega LLM: explota patrones que rindieron +
    explora ángulos nuevos (≥1/3 exploración), mezcla es/en, valida y
    completa con el floor.
  - Floor determinístico: 14 intents × 12 verticales × 10 geos (~1.700
    combinaciones) seedeado por fecha — sin LLM tampoco se repite.
  - `adaptiveQueryCount()` — 3 queries si ayer rindió, hasta 5 si se murió.
- **daily-scout**: usa el plan (queries frescas, 8 hits c/u), registra
  estrategia+rationale+perQuery en el evento (feedback loop del planner),
  registra corridas vacías (queman la ventana), digest muestra la estrategia,
  pipeline batch 8→12.
- **heartbeat**: paso 2.5 `runProspectOutreach()` — outreach frío autónomo a
  prospects stage=contact con email (máx 2/ciclo), mismo
  `buildProspectOutreachData` del camino manual (mismos visuales de settings),
  `markProspectOutreachSent` + evento `prospect.outreach.auto_sent`.
  DOBLE gate: `AGENT_PROSPECT_OUTREACH_ENABLED=true` **y** el master
  `OUTBOUND_LEAD_EMAILS_ENABLED` (enforced dentro de sendEmail).
- `lib/events.ts`: nuevo EventType `prospect.outreach.auto_sent`.

## F8 — Guardrails de generación / anti-abuso (post-refac, mismo día) ✅
Pedido: "no más de 20 imágenes por usuario, no más de tantas llamadas por
minuto, bien sanos".
- **Choke point único** (`generateImageToSession` en tools-server.ts — por ahí
  pasan TODAS las llamadas Seedream): techo global de **20 imágenes generadas
  por sesión** (cuenta `mockup-*` + `asset-*`, excluye uploads), **2/minuto** y
  **12/día** por sesión (via rateLimitShared → Upstash en prod, memoria en dev).
  Devuelve `{error:"limit"|"rate"}`; branding/generate mapean a 409/429 con
  `retry-after`. Eventos `ai.tool.failed` con causa.
- **Cap de proyectos por sesión: 5** (`/api/assistant/projects`) — era el
  multiplicador: sin esto cada proyecto nuevo desbloqueaba otro presupuesto
  completo de ASSET_ROLE_CAPS (~28 imágenes).
- **Rate limits por IP nuevos**: generación de imágenes (branding+generate,
  ventana compartida) 8/10min; upload público 10/10min; creación de proyectos
  6/10min; chat assistant suma techo diario 150/día (además del 20/10min).
- **Dedup de outreach por EMAIL** (`listOutreachReady`): DISTINCT ON (email) +
  exclusión de emails ya `contacted` + re-validación cleanEmail (en la DB real
  había un "n@app.route" legacy en cola que habría rebotado). Validado con
  query contra la DB local viva.

## F9 — Ajustes GSAP desktop (feedback con screenshot) ✅
- Scene 1 desktop: banda de palabras danzantes `bottom-32` → `bottom-8` — en
  viewports bajos pisaba el título ("Una construcción a la vez." sobre
  "Primero estuvo el constructor.").
- Velocidad: más recorrido de scroll en las 3 escenas desktop (mismo timeline,
  scrub más lento): scene1 300→350vh, scene2 280→325vh, scene3 312→375vh
  (la 3 lleva 8 beats, recibe más pista). Mobile sin tocar (aprobado).

## F10 — Últimos detalles (feedback con screenshots) ✅
- **Bug idioma×GSAP** (palabras amontonadas en LA CAPA VIVA tras cambiar
  idioma): router.refresh() recrea los spans (key=palabra) y la timeline vieja
  queda sobre nodos muertos. Fix: `copyRevision(t)` en las deps de useGSAP →
  revert+rebuild al cambiar el copy; + `opacity-0` defensivo en `.il-flow`
  desktop.
- **Handoff de palabras sin superposición**: scene1 spacing 0.62→0.95 (out
  +0.55/0.4), scene3 spacing 0.66→0.85 (out +0.5/0.35, backdrop 7.6, rail 7.0).
- **Título scene1**: eliminado el drift ascendente (y:-26×5) — se endereza al
  entrar y se queda.
- **Hero card i18n**: `heroStart` y `heroLangs` nuevos en Dict (11 idiomas);
  HallHero usa t.heroStart (antes "Let's started" hardcodeado) y t.heroLangs
  (antes profile.languages sin traducir).
- **tech-badge.tsx**: +marcas simple-icons (GSAP/Greensock, Qt/PySide6,
  NVIDIA, OpenRouter, HuggingFace, LangChain, Kubernetes, Stripe, Tailwind CSS)
  + mapa de conceptos con glifos lucide (RAG, AI Agents, ETL, FinTech,
  Payments, Marketplace, Admin, MLOps, etc.) + fallback Boxes — toda chip
  lleva icono, sin JS extra al cliente (RSC).
- **Stack del CV en INSIDE THE PROOF (desktop)**: TechStack server-rendered
  pasado como slot `stack` a PortfolioSystemInterlude, cascada `.il-stack`
  staggered dentro de la misma timeline (t=0.6, stagger 0.07).

## F11 — Scout: genoma de estrategia (2026-07-09) ✅
Reemplaza queries hardcodeadas por un cerebro de dos tempos:
- **SEMANAL (el genoma)**: 1 completion LLM regenera los 3 grupos de queries
  (specific/broad/stack, ~26 queries, es/en+pt/fr) alimentada por: identidad
  real (profile + capability matrix desde código), **pulso de mercado** (2
  búsquedas acotadas vía router searxng/serper sobre demanda actual) y la
  tabla de rendimiento de queries pasadas (la explotación vive acá).
  Persistido como evento `agent.scout_genome` (TTL 7 días, lock anti-carrera).
- **DIARIO (el draw)**: muestreo seeded del genoma cacheado, balanceado por
  grupo, filtrado por ventana de no-repetición — **0 tokens, 0 búsquedas**.
  Imposible sobresaturar: todo el gasto está concentrado en la regeneración.
- **FLOOR**: genoma bootstrap (seeds curados) para día uno / sin LLM / sin DB.
- Volumen adaptativo 5→8 queries/día. `strategy` reporta
  genome/genome-fresh/static-floor + rationale del genoma en el digest.

## Pendiente / notas para Juan
- Rebuild manual del Docker :3001 para ver todo esto vivo (memoria: los
  commits no llegan solos al contenedor).
- Probar mobile real: scroll por las 3 grids (sin piso) + las 3 escenas GSAP
  con el copy nuevo.
- Los idiomas nuevos: el CHROME ya sale traducido; el contenido de proyectos
  se traduce on-demand con cache (primera visita por idioma tarda unos seg).
- Encendido de outreach autónomo: recién al final del cutover (ver
  MIGRACION_DOKPLOY.md, orden de gates).
