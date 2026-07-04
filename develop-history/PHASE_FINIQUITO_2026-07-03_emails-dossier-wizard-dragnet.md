# Change Log: 2026-07-03 — FINIQUITO: emails ricos, dossier admin, wizard de cimientos, dragnet de prospección

## 1. Objetivo
Última refacción de cierre pedida por el usuario:
1. Emails de reporte escuetos → contextuales y evolutivos (usar identidad: cookie/ip/localstorage).
2. Panel admin "lista sin detalles" → dossier pro por sesión/lead, que se autocompleta.
3. Chat: pantalla PRE-creación de proyecto por steps (no lista scrolleable) + chat bloqueado hasta crear cimientos.
4. Kanban de prospección outbound: ingesta del "dragado" serper + drop de emails del admin, filtrado → enriquecido → calificado → contactar, avanzando solo.
5. Test de flujo total mínimo probando serper en vivo y cómo se interpreta.

## 2. Revisión previa
Estado post-ORBIT (PHASE_ORBIT_2026-07-03): session_started era solo id+page; /admin/sessions/[id] solo lead+transcript; ProjectSetup era un form único scrolleable con chat habilitado; serper solo alimentaba al agente y al digest del scout.

## 3. Cambios aplicados (paths)
### Emails (lib/email/templates.ts, lib/agent/orchestrator.ts, app/api/assistant/route.ts, app/api/assistant/projects/route.ts)
- `session_started`: subject con país/campaña/lead conocido ("💬 New conversation — visitor from AR"), primer mensaje citado, chips lang/country/device/campaign/entry, botón "Watch it live →" al dossier. Detecta lead que vuelve (rebind) y lo nombra.
- Nuevos templates: `project_created` (cimientos: nombre/kind/concepto/stack/paleta + leadName) y `mockup_generated` (branding milestone con link a la imagen).
- `lead_received` y alert de close ahora llevan botón/link directo al dossier.
- Ruta del asistente captura `country` (x-vercel-ip-country/cf-ipcountry) y `device` (new visitor / device rebind / returning cookie); orchestrator persiste country+lang en meta de sesión.
- helpers nuevos en templates: quote(), chips(), paletteBar().

### Dossier admin (app/admin/sessions/[id]/page.tsx + helpers)
- Página reescrita como dossier: chips de identidad (lang, country, campaign, deviceId, ipHash, lastPage, first/last seen), lead intel con **score breakdown explicable** (espejo de WEIGHTS de playbooks), botón mailto, cards del orbe (concept/stack/paleta/fechas), mockups generados (grid), **timeline de actividad** curada del event bus, transcript.
- Helpers: `getLeadRow()` (leads.ts), `getSession()` (memory.ts), `listSessionMockups()` (tools-server.ts), `listSessionEvents()` (events.ts).
- /admin/leads: filas clickeables → dossier (nombre + botón "Dossier →"); nav a Pipeline/Prospects. Backoffice home: links Pipeline/Prospects/Sessions.

### Wizard de cimientos (components/assistant/AssistantProjectOrbit.tsx, AssistantWidget.tsx)
- ProjectSetup → wizard de 3 steps (nombre+tipo / stack quick-picks / visión en textarea) con dots de progreso, transiciones, skip en stack.
- Al confirmar: secuencia "creando cimientos" (4 líneas con spinner→check en beat de 650ms) mientras corre el POST real; el done espera a AMBOS (el teatro nunca miente).
- Gating: en tabs project/branding SIN proyecto pinneado, el wizard REEMPLAZA la conversación (pantalla pre-creación) y el composer queda disabled (placeholder "Primero los cimientos… 🏗"); guard también dentro de send(). Si hay proyectos pero ninguno pinneado: pantalla "elegí o creá" con CTA.

### Dragnet de prospección (nuevo subsistema)
- DDL `prospects` en lib/db/bootstrap.ts (stage/source/title/company/contact/email/url/snippet/enrichment/fit_reason/next_action/score/raw, dedupe único por URL).
- lib/agent/prospects.ts: `ingestSearchHits` (scout), `ingestDroppedText` (email drop: LLM parse con piso regex), `processPipelineBatch` (ingest→filter heurístico por keywords/junk-domains; filter→enrich con búsqueda fina serper; enrich→qualify con LLM escéptico JSON {score,fitReason,nextAction} y fallback determinista; qualify→contact si score≥55, sino discarded), `setProspectStage` (contacted/discard manual).
- tools-server.ts: `runWebSearchRaw()` (hits estructurados) y runWebSearch reimplementado encima.
- daily-scout: cada barrida ingesta sus hits al dragnet + corre batch de 8.
- API: app/api/admin/prospects/route.ts (GET list; POST ingest/process/stage; guardAdmin; zod discriminated union).
- UI: app/admin/prospects/page.tsx + components/admin/ProspectBoard.tsx — kanban 5 columnas (Ingesta/Filtrado/Enriquecido/Calificado/Contactar), intake bar con textarea + drag&drop .eml/.txt, botón "Avanzar pipeline", cards con contenido por etapa, score ring, next action, mailto "Escribir", marcar contactado, descartar. Animaciones layout de framer-motion (las cards SE VEN rotar).
- Eventos nuevos: project.created, mockup.generated, prospect.created/advanced/updated.

## 4. Implicancias técnicas
- Sin dependencias nuevas. Todo degrada: sin DB no-op, sin serper pass-through, sin LLM fallback determinista (score por keywords).
- Costos acotados: pipeline procesa máx N por batch (default 6, scout 8, API máx 12).
- El kanban NO se draggea: el código mueve las cards (misma filosofía que /admin/pipeline).

## 5. Testing (comandos y resultados)
- `pnpm exec tsc --noEmit` limpio · `pnpm exec vitest run` **42/42** · `pnpm build` OK.
- Serper crudo: query "startups hiring AI systems architect LATAM" → 4 hits reales (incl. post de hiring en Reddit).
- E2E vivo (dev :3100 + postgres compose :5433, Resend LIVE):
  - 1er mensaje (Marina/Rioplatense, header AR) → **el agente usó web_search y encontró que Rioplatense es un frigorífico real de Gral. Pacheco**, fundamentó la respuesta; lead stage=close score=75; meta con lang/country/deviceId/ipHash; 3 emails entregados (session_started contextual, lead_received, close alert).
  - POST projects → email "🚀 Project foundations laid: PedidosYa Mayorista Bot — by Marina" entregado.
  - daily-scout ×4 → 24 prospects ingresados (dedupe URL activo: corridas siguientes +2, +0).
  - Drop de email (AgroTech Sur) vía API admin (cookie HMAC firmada localmente) → parseado por LLM: company/contactName/email/gist perfectos.
  - Pipeline hasta estado final: 15 discarded / **5 en Contactar** — AgroTech Sur score 85 con fit y next action precisos; también detectó un rol de Anthropic (68) sugiriendo postulación.
- OJO: los test runs mandaron 4 digests "Scout diario" reales al inbox (esperado).

## 6. Referencias
- scheme005-sales-agent.md, PHASE_ORBIT_2026-07-03, delibot patterns (no-silence, tool-first).

## 7. Persistencia
- claude_state.json → phase FINIQUITO_COMPLETE; TODO_queue.md actualizado; memoria actualizada.
