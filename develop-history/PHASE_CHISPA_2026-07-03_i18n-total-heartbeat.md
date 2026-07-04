# Change Log: 2026-07-03 — CHISPA: i18n total (chrome + contenido LLM) + heartbeat autónomo

## 1. Objetivo
1. Server dev accesible desde Windows (localhost:3000 tiraba vacío).
2. i18n "bien completo": cards, letras chiquitas del hero (capabilities), rooms
   y contenido de proyectos seguían en inglés al cambiar idioma.
3. La chispa: darle autonomía real al sistema — última huella.

## 2. Cambios aplicados

### Server (pedido 1)
- Dev server corriendo con `WATCHPACK_POLLING=true pnpm dev -p 3000 -H 0.0.0.0`
  → accesible desde Windows en http://localhost:3000 (fallback: IP de WSL).
- Aprendizaje: el dev server en /mnt/c NO recompila confiable con hot-reload —
  tras cambios grandes de server components, reiniciarlo.

### i18n capa 1 — chrome (lib/i18n/dictionaries.ts + componentes)
- Nuevo dict `ROOM` (Record<Lang, RoomDict>, 7 idiomas, ~40 claves): CTA de
  cards ("Entrar →"), headings de rooms (Prueba/Por qué importa, Qué demuestra,
  Arquitectura/Cómo está cableado, En movimiento, Muro de evidencia, Nota del
  founder/Desde el constructor, Conseguilo/Probalo donde vive, Sistemas
  relacionados), flip-backs (Probalo en vivo, Leé el código, Construido bajo
  fricción real, Hablá con Juan…), link pills, CTAs de cierre y la página
  /projects (título/desc/back).
- getDict() ahora devuelve `{ lang, t, r }`.
- Componentes convertidos a async server components con getDict propio:
  ProjectRoom, ProjectHero (dict como `rd`, `r` estaba tomado por role.map),
  ProjectProofCards (buildBacks(project, r)), FounderNotes, EvidenceWall,
  ProjectArchitecturePreview, ProjectMediaShowcase, ProjectLinksBlock.
- HallOfFameCard: prop `enterLabel` threaded por los 3 grids (HallOfFameGrid,
  FeaturedSystemsGrid, LabArchiveGrid) desde home y /projects.
- /projects ahora recibe headers traducidos (antes usaba defaults EN).

### i18n capa 2 — CONTENIDO (lib/i18n/translate.ts, nuevo)
- Tabla `content_translations (cache_key, lang, source_hash, payload)` en
  bootstrap — el hash invalida solo la entrada cuyo EN canónico cambió.
- `translateBatch(lang, entries)`: EN passthrough; cache-first; misses → LLM
  en chunks de 3 (maxTokens 2200, timeout 45s — chatCompletion ahora acepta
  opts), validación de forma (strings/arrays misma longitud), upsert. Sin DB
  o sin LLM o fallo → piso EN silencioso. SIN cache NO se traduce (evita
  pagar LLM por request en Vercel).
- `localizeProjects()`: traduce category/oneLiner/proof/highlights/aiSummary
  (title/labTitle/stack/status quedan canónicos: marca + colores StatusBadge).
- `localizeCapabilities()`: las "letras chiquitas" del hero.
- Cableado: home (hall/featured/archive), /projects, /projects/[slug]
  (proyecto + related), HallHero.

### La chispa — heartbeat autónomo (app/api/cron/heartbeat/route.ts, nuevo)
Una vez al día el sistema actúa solo:
1. `processPipelineBatch(8)` — el dragnet avanza sin botón.
2. Follow-ups a leads tibios que se enfriaron (email + stage propose/close +
   20h-14d sin actividad + nunca contactado): el LLM escribe UN email personal
   desde SU transcript/proyecto (si no tiene nada genuino que decir, no manda
   — el silencio es lo educado). Gate: `AGENT_FOLLOWUP_ENABLED=true` (default
   OFF), 1 por lead PARA SIEMPRE (leads.followed_up_at), cap 3/ciclo.
   Template `lead_followup`.
3. Self-reflection: mira sus stats de 24h y escribe 2-3 líneas honestas en
   memoria (`memory_items` kind self-reflection).
4. `daily_pulse` al admin: sesiones/leads/follow-ups/prospects/AI ok-rate +
   la reflexión del propio sistema. Template con grid de stats.
- worker.mjs: heartbeat diario a PULSE_HOUR (default 20:00; scout sigue cada
  3 días a SCOUT_HOUR). Eventos nuevos: agent.heartbeat, lead.followup.sent.
- Dedicatoria en el header del route — la huella pedida.

## 3. Testing
- tsc limpio · vitest 42/42 · `pnpm build` OK.
- Vivo (dev :3000 + postgres compose): home ES → hero capabilities traducidas
  ("Flujos de trabajo de agentes"), cards con oneLiner ES ("marketplace de
  rescate de alimentos"); room buenpick ES → 6 headings + proof/highlights en
  español ("fricción real" ×11); room lumenscript PT → chrome PT completo.
  Cache content_translations poblada (10 proyectos es + capabilities es/pt/fr/ar).
- Heartbeat ×2 en vivo: pulse email entregado (ok=t), reflexión en español
  escrita a memoria, followups correctamente gated (enabled:false).
- Residuo EN conocido: metadata SEO (canónica EN a propósito) y un blob JSON
  no visible en flight data.

## 4. Pendientes que deja esta fase
- Primer render en idioma nuevo paga el warm de cache (~7-17s una vez).
- AGENT_FOLLOWUP_ENABLED queda OFF: encenderlo cuando Juan quiera outreach real.
- Rebuild de imagen docker sigue pendiente para que el stack compose corra todo esto.

## 5. Persistencia
claude_state.json → CHISPA_COMPLETE · memoria actualizada · TODO_queue.md al día.
