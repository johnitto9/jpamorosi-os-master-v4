# HANDOFF — 2026-07-05 (leer esto primero) · v4

## Leer en orden (5 min)
1. Este archivo.
2. `develop-history/REFAC_FINAL_EXPRESS_2026-07-05/00-verified-findings.md`
   (todo medido en vivo — no re-investigar).
3. `develop-history/claude_state.json` → claves `phaseDoneRefacExec01..09`.
4. Specs por bloque: `01-polish-items.md`, `02-chat-funnel-intelligence.md`,
   `03-prospecting-and-email-tracking.md`. Logs: `EXEC_LOG_01..09.md`.

## Dónde estamos
CV interactivo tipo OS (Next.js 15 + Tailwind v4 + GSAP/Lenis). Backend REAL
containerizado en **:3001** (imagen HORNEADA — rebuild obligatorio tras cambios):
```
docker.exe compose --profile backend build amorosi-backend
docker.exe compose --profile backend up -d amorosi-backend
curl -s http://127.0.0.1:3001/api/health   # {"ok":true}
```
`:3000` = espejo estático sin IA (NO usar). Gate: `cd frontend-app &&
npx tsc --noEmit` (0 errores). Sin curl dentro del contenedor → `node -e` + fetch.
DB: `node -e` + `pg` + `process.env.DATABASE_URL`.

Env viva: OPENROUTER/SERPER/RESEND/INTERNAL_TOKEN = SET. **R2 y MEDIA_CDN
VACÍOS** → uploads locales (código R2-ready, sólo faltan envs).

## De dónde venimos
12 sesiones FINALPROD (animaciones interludios mobile + fix Seedream 16:9), 2
tandas de pulido (vault inline, botones generate separados, decisiones
deseleccionables, scrollbar, project card), y esta REFAC final (exec01→09).

## Qué se hizo en esta refac (TODO VIVO y verificado salvo aclaración)
- **R5 prospecting REAL** (exec01): `lib/agent/prospects.ts` `harvestContact()`
  fetchea URL + /contact,/about y extrae email+company (portado del fetcher
  liviano de BBN). worker.mjs gate arreglado. `/api/admin/scout-run` + botón
  "Correr scout" en ProspectBoard. Probado: emails 1/32 → 4/40+. Endurecido
  (junk email + company heurística).
- **R3 omni hilbanador** (exec02): `orchestrator.ts` systemPrompt recibe
  `universe` (TODOS los proyectos de sesión, cross-tab) + bloque SESSION UNIVERSE.
- **R6 email tracking** (exec03): tabla `tracked_links`, `lib/email/tracking.ts`,
  `GET /api/track/[token]` (302 no-store), `POST /api/admin/track-link`. Probado
  E2E (click → clicks=1, evento `lead.link.clicked`).
- **P1 admin interludios** (exec04): SiteSettings.interludes,
  `POST /api/admin/interludes`, `InterludePanel.tsx` (4 dropzones auto-save),
  read-side en `Interludes.tsx` (context + reverse-src-a-key + `resolveMediaUrl`,
  sin tocar callers). Verificado.
- **Admin media cleanup** (exec04b): botón nav "Hero video" → **"Home media"**;
  ELIMINADO el upload de hero video global (ya no existe ese video; ahora el
  fondo del Hall es el video de la card seleccionada). La página /admin/media es
  ahora sólo "Interlude card images". `settings.heroVideo` queda huérfano en
  settings.json (sin lectores, inofensivo).
- **Pulido previo**: canon inline en el chat (`InlineCanon.tsx`, reemplazó el
  AssetVault flotante), fade Systems/Lab afinado (`.carousel-edge-fade`), debug
  banner fuera, scrollbar on-brand, project card (logo+alto).
- **Hall of Fame** (exec05/06): resuelto y aprobado por usuario. Embla se
  conserva (`loop:true`) como motor de drag/selección, pero la capa visible del
  coverflow se renderiza separada en slots circulares fijos con Framer Motion por
  `project.id`. Esto eliminó el amontonamiento progresivo y recuperó animación de
  carrusel/swipe.
- **R6 email tracking core conectado** (exec06): `sendEmail` soporta tracking
  opcional y reescribe CTAs; `lead_followup` y `session_recovery` ya usan links
  trackeados; `/api/track` bindea cookie `al_sid` cuando el token pertenece a un
  lead con sesión; timeline admin muestra `lead.link.created/clicked`. Smoke E2E
  probado: 302 + Set-Cookie + clicks=1 + evento con sessionId.
- **R6 outbound avanzado** (exec07): `/admin/prospects` tiene accion explicita
  `outreach` desde el drawer para prospects en `contact` con email; manda
  `prospect_outreach` via Resend con tracking `prospectId` y solo marca
  `contacted` si el envio real fue OK. Heartbeat suma secuencia
  `clicked-but-no-return`: si un lead clickea un tracked link y no vuelve a la
  sesion, dispara segundo toque con campaña `clicked_no_return`, limitado e
  idempotente por evento `lead.click_followup.sent`.
- **R2 permanencia loginless** (exec08): `AssistantWidget` tiene card compacta
  "Guardar esta sesion"; `POST /api/session/recover-request` ahora, si hay
  `al_sid`, ata el email al lead de la sesion y manda el resume link existente
  con tracking por `leadId`.
- **R1 captura inicial** (exec09): `ProjectSetup` step 0 captura opcionalmente
  nombre/persona, empresa y email; `/api/assistant/projects` valida `lead` con
  `leadPatchSchema` y hace `upsertLead(sessionId, lead)` al crear el proyecto.
  Verificado con `tsc`; falta rebuild para verlo vivo en `:3001`.

## Qué queda (por prioridad, specs listas)
1. **R4** cards interactivas (tool `show_card`, respuestas en bloques).
2. **P3** "Living Layer" vibra al scrollear (GPU-promote / sólo transform).
3. **Worker scout**: persistir `lastScoutDate` en DB si se quiere evitar reset
   diario por restart.

## Archivos clave
- Chat: `components/assistant/{AssistantWidget,AssistantFlow,InlineCanon,
  AssistantProjectOrbit}.tsx`; `app/api/assistant/*`.
- Agente: `lib/agent/{orchestrator,prospects,tools-server,leads,projects,
  project-workspace}.ts`.
- Prospecting/email: `lib/agent/prospects.ts`, `lib/email/{tracking,service}.ts`,
  `app/api/track/[token]/route.ts`, `app/api/admin/scout-run/route.ts`,
  `scripts/worker.mjs`, `app/api/cron/{daily-scout,heartbeat}/route.ts`.
- Home/cards/interludios: `components/hall/{HallOfFameGrid,Interludes,
  FeaturedSystemsGrid,LabArchiveGrid}.tsx`, `components/ui/card-carousel.tsx`,
  `app/page.tsx`.
- Admin media: `app/admin/media/page.tsx`, `components/admin/InterludePanel.tsx`,
  `app/api/admin/interludes/route.ts`.
- Infra: `lib/db/bootstrap.ts` (DDL: nueva tabla `tracked_links`),
  `lib/media/{storage,resolve,store.ts}` (SiteSettings.interludes), `lib/env.ts`.

## Riesgos operativos (importante)
- Refac previa ya fue commiteada en bloques locales y `main` apunta al mismo
  historial que `v4final` al cierre de exec06. Exec07/08 ya estan commiteados;
  exec09 debe commitearse antes de seguir si este handoff aparece con worktree
  sucio.
- **R2 sin envs**: uploads locales. Setear `R2_*` + `NEXT_PUBLIC_MEDIA_CDN_BASE`
  para servir de bucket (sin cambios de código).
- Cada cambio de front = rebuild ~3 min + verificación manual (no hay
  screenshots automatizados).

## Reglas
Una fase por vez, medir antes de codear, no apilar intentos, persistir en
develop-history + claude_state.
