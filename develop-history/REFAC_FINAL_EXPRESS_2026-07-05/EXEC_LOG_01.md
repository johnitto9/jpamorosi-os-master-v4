# EXEC LOG 01 — 2026-07-05 (P4/P5 + R5 primer golpe)

## Objetivo
Ejecutar arquitectónicamente lo más posible del plan: el bug histórico del
carrusel del Hall (P4/P5) y el arranque de prospecting real (R5).

## Cambios aplicados

### P5 + P4 — Hall of Fame carrusel (coverflow desync + centrado mobile)
`components/hall/HallOfFameGrid.tsx`:
- Root cause del bug histórico (cards se enciman y "reinician"): el coverflow se
  calculaba con `offset = ((i - selected + total + floor(total/2)) % total) -
  floor(total/2)` — índice DOM vs `selectedScrollSnap()`. Con `loop:true` Embla
  reordena los slides en el wrap → el offset desincroniza → pile-up → reset.
- FIX: recipe canónico de Embla (tween por engine). Nuevo `useEffect` que en cada
  `scroll`/`reInit` recalcula transform/opacity/zIndex de CADA slide desde
  `emblaApi.scrollProgress()` + `scrollSnapList()` + `slideRegistry`, con
  corrección de wrap vía `engine.slideLooper.loopPoints` (target()/index). Refs a
  los nodos (`nodesRef`). Continuo y loop-correcto → sin encimado ni reset.
- P4 centrado mobile: `containScroll:false` en el init (el default trimSnaps
  descentraba a la derecha) + basis mobile 86%→90%.
- Limpieza: removido `import { cn }` (quedó sin uso). `will-change-transform` +
  `[transform-style:preserve-3d]` en los nodos animados.

### R5 — Prospecting real (extracción de contacto + trigger + scheduling)
1. `lib/agent/prospects.ts`: `discoverEmail` (sólo fetcheaba la URL del listing,
   donde los job boards NO exponen email) reemplazado por `harvestContact(url,
   extraText)`:
   - fetchea hasta 3 páginas: la URL + candidatas de contacto del MISMO host
     (`/contact`, `/contacto`, `/about`, `/nosotros`) — donde viven los emails.
   - extrae email (mailto preferido, luego regex, con `cleanEmail`) Y company
     (`og:site_name` / `<title>` / dominio). Enfoque portado del fetcher liviano
     de BBN (`BBNfinalrepo/services/scripting_v9/bbn/downloader.py`).
   - El stage `filter→enrich` ahora persiste email **y** company (antes company
     quedaba null siempre). `advance()` ya soportaba `company`.
2. `scripts/worker.mjs`: gate del scout arreglado. Antes: `hour===9 &&
   dayOfYear%3===0 && lastScoutDate(RAM)!==hoy` → casi nunca disparaba. Ahora:
   `hour >= SCOUT_HOUR && lastScoutDate!==hoy` (una vez/día, con catch-up tras
   restart). Sin el every-3-days.
3. `app/api/admin/scout-run/route.ts` (NUEVO): endpoint admin (guardAdmin) que
   llama internamente `/api/cron/daily-scout` con el INTERNAL token → correr el
   scout a demanda desde el panel.
4. `components/admin/ProspectBoard.tsx`: botón "🛰 Correr scout" (handler
   `runScout` → POST /api/admin/scout-run → refresh + reporte). Al lado de
   "Avanzar pipeline".

## Verificación (pendiente/parcial)
- tsc: 0 errores (todo el batch).
- Rebuild backend + recreate backend+worker: en curso.
- PENDIENTE post-rebuild: correr scout + N pasadas de pipeline y confirmar que
  `SELECT count(email) FROM prospects` sube (antes 1/32) y que aparecen companies.
  El harvest fetchea sitios reales; puede fallar por sitios que bloquean bots o
  sin /contact — es best-effort, no todos rendirán email.

## Notas / riesgos
- R2 sigue sin envs en la instancia → uploads locales (no afecta prospecting).
- El harvest hace fetches salientes reales (bounded ≤3, timeout corto) — costo/
  latencia acotados por el batch cap (8/pass).
- worker.mjs: verificar que la imagen del worker toma el archivo nuevo (rebuild/
  restart del worker incluido en el `up -d`).

## Verificación (HECHA, en vivo :3001)
- tsc 0 errores. Rebuild backend+worker OK, health ok.
- **P5**: bundle contiene `slideLooper`/`loopPoints` (4 chunks) → engine-tween
  deployado. (Prueba visual del carrusel pendiente del usuario.)
- **R5 PROBADO**: corrí scout + varias pasadas de pipeline. Resultado DB:
  - ANTES: total 32, con_email 1, con_company 0.
  - DESPUÉS: total 40, **con_email 4, con_company 9** (y subiendo mientras
    procesa; las pasadas ahora son más lentas PORQUE el harvest fetchea páginas
    reales). Emails reales capturados: `sales-enquiries@interakt.ai`,
    `support@remoterocketship.com`. → **la máquina ahora sí consigue emails.**

## Endurecido (2do golpe, mismo día)
- `cleanEmail`: ahora exige local-part >=2 chars + TLD plausible (`PLAUSIBLE_TLD`)
  → rechaza el `n@app.route` y fragmentos JS pegados por el regex.
- `companyFromHtml`: prioriza `og:site_name`; usa `<title>` sólo si parece marca
  corta (<=4 palabras, sin puntuación de oración); si no, cae al dominio
  (`companyFromDomain`). Evita "What Are WhatsApp AI Agents..." como company.
- tsc 0, rebuild backend en curso.

## Próximo
- (opcional) endurecer harvest (junk email + company heurística).
- P1 (admin interludios R2), R1/R2 (embudo: captura implícita + card de sesión
  con email/permanencia), R6 (email tracking jpamorosi.dev).
