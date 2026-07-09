# REFAC CIERRE PROD — 2026-07-07

Última refacción antes de producción. Carpeta aislada: todo el plan y el
develop-history de esta tanda vive acá. Ejecutada con Fable 5 (último día
disponible de forma limitada).

## Contexto de partida

- Home = Hall of Fame con 3 escenas GSAP (Interludes) intercaladas con
  3 secciones de cards (HallOfFameGrid / FeaturedSystemsGrid / LabArchiveGrid).
- i18n propio (`lib/i18n/dictionaries.ts`): 7 idiomas hardcodeados en 6
  diccionarios (DICTS, ROOM, WIZARD, COOKIE, FLOW, ASSISTANT) + contenido de
  proyectos traducido por LLM con cache Postgres (`translate.ts`).
- Scout diario (`/api/cron/daily-scout`) con 7 queries estáticas rotadas por
  día de semana + pipeline kanban (`prospects.ts`) + heartbeat nocturno.
- Emails Resend con templates propios (`lib/email/templates.ts`).
- Deploy objetivo: VPS con Dokploy (docs previas en
  `docs/finalizacion-prod-2026-07-05/` y `docs/deploy-vps.md`).

## Frentes (7)

### F1 — Mobile: eliminar la "pausa" de las secciones de cards
Causa: en `app/page.tsx` cada grid está envuelta en
`<div class="relative min-h-[110vh]"><div class="sticky top-0 ...">`.
El exceso sobre 100vh (6–10vh) es scroll muerto: la sección queda clavada
("piso") antes de soltar. Fix: el alto extra + sticky quedan sólo en `lg:`;
en mobile la sección fluye sin pin.

### F2 — Reescribir copy de las 3 escenas GSAP
Nuevo sistema narrativo (spec de Juan):
- **Scene 01 · BEFORE THE SYSTEMS** — "The builder came first." + secuencia
  5 palabras: First, sell. / Reality doesn't compile. / Build what was
  missing. / From Bahía Blanca to the world. / One build at a time.
- **Scene 02 · INSIDE THE PROOF** — "This portfolio is running too." +
  4 layers: Public interface / Orbe · activation / Memory · continuity /
  Scout · autonomy.
- **Scene 03 · THE LIVING LAYER** — "Don't start from scratch again." +
  secuencia 8 beats: Bring an idea. / Tell it however it comes. / Orbe finds
  the signal. / The system remembers. / Your project takes shape. / Every
  decision leaves context. / There is always a next step. / Ready to begin?
Se traduce a los 11 idiomas (7 existentes + 4 nuevos).

### F3 — i18n: agregar he / ja / ko / hi + revisión del sistema
- Agregar 4 idiomas a `LANGS` y completar los 6 diccionarios (el type system
  `Record<Lang, …>` obliga cobertura total → no hay huecos posibles).
- `server.ts`: mapear países IL→he, JP→ja, KR→ko, IN→hi.
- RTL: hebreo se suma al tratamiento de árabe (verificar cómo se maneja dir).
- Diagnóstico del sistema: NO es i18next ("i118"); es un sistema propio de
  2 capas (chrome hardcodeado + contenido LLM-cacheado). Veredicto: correcto
  para esta escala, 0 tokens en runtime para el chrome, cache-first para el
  contenido. Cuello de botella real: primer render de un idioma nuevo paga
  la traducción LLM del contenido (~segundos, una vez). Mitigación: se puede
  precalentar visitando la home con cada cookie de idioma tras el deploy.

### F4 — Email outreach: texto preset del visual
`templates.ts > OUTREACH_LANG.visualAlt/visualCaption`: el visual es la card
"INSIDE THE PROOF" (Orbe · Start a project with AI). Nuevo caption invita:
"Pasate por mi CV interactivo y conocé a Orbe — empecemos juntos un nuevo
proyecto con IA" (es/en).

### F5 — Consola limpia / ofuscación para prod
- `layout.tsx` duplica security headers como `<meta httpEquiv>` → el browser
  rechaza X-Frame-Options en meta y loguea error. Ya están en
  `next.config.js` como headers HTTP reales → borrar las meta.
- `__IL_DEBUG__` / `__IL_MOBILE_RAN__` (Interludes) quedan gateados a
  NODE_ENV !== 'production'.
- Nota: `contentscript.js / ObjectMultiplex` y los 2 "Uncaught (in promise)
  Object" en (index):1 son de una extensión del navegador (MetaMask-like),
  no del sitio. Verificar en ventana incógnito sin extensiones.
- Barrido de console.log en componentes cliente.

### F6 — Camino a prod: dump DB + media Cloudflare → Dokploy
Doc operativa + script: pg_dump de la DB local (proyectos, traducciones,
prospects, leads, sesiones, settings con links R2) → restore en el Postgres
del stack Dokploy. La media ya vive en R2/CDN (`media.jpamorosi.dev`), así
que migra "gratis": misma bucket + mismas envs. Ver
`MIGRACION_DOKPLOY.md` en esta carpeta.

### F7 — Scout 100% autónomo: capa de estrategia
Diagnóstico del decaimiento: 7 ANGLES fijas rotando por weekday → tras la
primera semana los SERPs devuelven lo mismo y el dedup por URL filtra todo
→ ingest≈0 → "se cae". El sistema no tiene noción de rendimiento propio ni
de exploración.
Fix (nuevo `lib/agent/scout-strategy.ts`):
1. **Memoria de rendimiento**: agrega por query (desde `prospects.raw->>'query'`)
   ingested / emails / avg score / llegadas a contact.
2. **Planner LLM**: genera queries frescas cada corrida a partir del perfil,
   la tabla de rendimiento (qué funcionó), y las queries recientes (a evitar).
   Mezcla es/en, verticales, geos y plataformas.
3. **Fallback determinístico**: generador combinatorio seedeado por fecha
   (plantillas × verticales × geos) — espacio grande, sin repetición corta,
   funciona sin LLM.
4. **Volumen adaptativo**: si la última corrida ingirió poco, la siguiente
   tira más queries (bounded).
5. **Cierre del círculo**: paso opcional de outreach autónomo en el heartbeat
   (prospects en stage=contact con email), doble-gateado por
   `OUTBOUND_LEAD_EMAILS_ENABLED` + `AGENT_PROSPECT_OUTREACH_ENABLED`,
   máx 2 por ciclo, mismo `buildProspectOutreachData` que el camino manual.

## Orden de ejecución
F1 → F5 → F4 → F2 → F3 → F7 → F6 (código primero, doc de migración al final)

## Registro
Cada frente deja su sección en `DEV_HISTORY.md` de esta carpeta.
