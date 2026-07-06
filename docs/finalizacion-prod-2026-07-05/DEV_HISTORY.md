# Dev History - Finiquitacion Real

## 2026-07-06 - Segunda capa de testeo

Estado base antes de esta capa:

- Runtime correcto: `amorosi-backend` en `localhost:3001`.
- `web` apagado y protegido por `--profile web`.
- SearXNG corriendo como servicio interno `searxng:8080`.
- Serper preservado como fallback premium.
- `OUTBOUND_LEAD_EMAILS_ENABLED=false` activo en Docker local.

Cambios aplicados:

- Compuerta central en `lib/email/service.ts`.
  - Bloquea `lead_followup`.
  - Bloquea `prospect_outreach`.
  - No bloquea `notifyAdmin`.
- Variable documentada:
  - `.env.example`
  - `.env.docker.local.example`
  - `.env.production.dokploy.example`
- Documento principal de salida:
  - `06-finiquitacion-real-test-gate.md`
- Tests agregados:
  - `tests/email_gate.spec.ts`
  - `tests/search_providers.spec.ts`
  - `tests/prospect_harvest.spec.ts`
  - `tests/search_router_fallback.spec.ts`
  - `tests/assistant_lead_route.spec.ts`
  - `tests/prospect_pipeline.spec.ts`

Verificaciones ejecutadas:

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/search_router.spec.ts tests/email_gate.spec.ts
pnpm exec vitest run tests/search_router.spec.ts tests/email_gate.spec.ts tests/search_providers.spec.ts tests/prospect_harvest.spec.ts
pnpm exec vitest run tests/search_router.spec.ts tests/search_router_fallback.spec.ts tests/search_providers.spec.ts tests/prospect_harvest.spec.ts tests/email_gate.spec.ts tests/assistant_lead_route.spec.ts
pnpm exec vitest run tests/search_router.spec.ts tests/search_router_fallback.spec.ts tests/search_providers.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts tests/email_gate.spec.ts tests/assistant_lead_route.spec.ts
```

Resultado actual:

- TypeScript: OK.
- Vitest focalizado: 7 files, 22 tests, OK.
- SearXNG/provider fixtures normalizan resultados.
- Router manda critical verification directo a Serper.
- Router hace fallback SearXNG -> Serper una sola vez cuando esta habilitado.
- Harvesting encuentra emails en texto, `mailto:` y `/contact`.
- Gate outbound bloquea `prospect_outreach` y `lead_followup` con `OUTBOUND_LEAD_EMAILS_ENABLED=false`.
- Gate habilitado cae al check normal de Resend, probando que la compuerta no tapa el flujo cuando se decida activar.
- `/api/assistant/lead` rechaza payloads invalidos/vacios antes de tocar persistencia.
- Pipeline decision helpers:
  - señales relevantes pasan de `ingest` a `filter`.
  - dominios basura se descartan aunque parezcan relevantes.
  - `email_drop` pasa aunque tenga pocos keywords.
  - solo score >= 55 pasa a `contact`.
- Se mantuvo el filtro anti-junk de emails (`example.*` no entra como lead real); los fixtures usan dominios plausibles.

Metricas locales post-test:

```txt
prospects total: 52
with email: 7
ready/contact: 8
high score: 6
outbound_blocked rows in email_logs: 0
```

Interpretacion: hay datos/prospects reales en la DB local y el gate esta probado por unit tests. `outbound_blocked=0` significa que no hubo intentos reales de outreach a leads/prospects durante esta corrida; no se disparo ningun envio outbound accidental.

Proxima tanda inmediata:

- Siguiente hardening: test de `processPipelineBatch` completo con DB fixture o testcontainer.
- Ejecutar lote controlado de scout/pipeline y registrar metricas antes/despues.

## 2026-07-06 - Serper Augmented / premium scalpel

Objetivo de esta tanda:

- Reposicionar Serper como motor premium de enriquecimiento, no como fallback plano.
- Mantener SearXNG como radar amplio de bajo costo.
- Evitar que miles de resultados diarios generen miles de llamadas premium o miles de cards.

Carpeta aislada:

- `docs/serper-augmented-2026-07-06/README.md`

Implementacion:

- `frontend-app/lib/opportunity-discovery/types.ts`
- `frontend-app/lib/opportunity-discovery/score.ts`
- `frontend-app/lib/opportunity-discovery/planner.ts`
- `frontend-app/lib/opportunity-discovery/pipeline.ts`

Conciliacion con el pipeline actual:

- `prospects.ts` ahora usa `premiumEnrichCandidate()` en `filter -> enrich`.
- Serper solo se gasta si el candidato tiene score suficiente, le faltan datos y queda presupuesto.
- El enrichment guarda trazas tipo `premium:serper:<query>` o `premium:skipped:<reason>`.

Tests nuevos:

- `frontend-app/tests/opportunity_discovery.spec.ts`

Verificaciones ejecutadas:

```bash
pnpm exec vitest run tests/opportunity_discovery.spec.ts tests/prospect_pipeline.spec.ts tests/search_router.spec.ts tests/search_router_fallback.spec.ts
pnpm exec vitest run tests/search_router.spec.ts tests/search_router_fallback.spec.ts tests/search_providers.spec.ts tests/opportunity_discovery.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts tests/email_gate.spec.ts tests/assistant_lead_route.spec.ts
pnpm exec tsc --noEmit
```

Resultado:

- TypeScript: OK.
- Vitest focalizado: 8 files, 27 tests, OK.
- Docker antes de rebuild: `amorosi-backend` publica solo `localhost:3001`; SearXNG queda interno como `searxng:8080`; no hay servicio `web` activo ni puerto `3000` publicado por compose.
- Rebuild ejecutado: `docker.exe compose --profile backend --profile search up --build -d amorosi-backend worker searxng searxng-valkey`.
- Docker post-rebuild:
  - `amorosi-backend`: healthy, `0.0.0.0:3001->3000/tcp`.
  - `searxng`: healthy, `8080/tcp` interno sin host port.
  - `worker`: running.
  - `web`: no activo.
  - `ss -ltnp`: solo `*:3001`; no listener en `3000`.
- Health: `curl http://localhost:3001/api/health` => `{"ok":true}`.

Test post-rebuild de esta capa:

- `pnpm exec vitest run ...`: 8 files, 27 tests, OK.
- `pnpm exec tsc --noEmit`: OK.
- Smoke interno SearXNG desde `amorosi-backend`:
  - `GET http://searxng:8080/search?q=AI%20automation%20startup&format=json`
  - status `200`
  - `37` resultados.
- Env runtime confirmado:
  - `SEARCH_PRIMARY_PROVIDER=searxng`
  - `SEARCH_PREMIUM_PROVIDER=serper`
  - `SEARXNG_ENABLED=true`
  - `SEARXNG_FALLBACK_TO_SERPER=true`
  - `OUTBOUND_LEAD_EMAILS_ENABLED=false`
- Metricas DB local:
  - prospects total: `52`
  - con email: `7`
  - ready/contact: `8`
  - high score: `6`
  - eventos `prospect.email_found`: `6`
- No se ejecuto `processPipelineBatch` sobre DB real en esta prueba para evitar mutar stages y gastar Serper real sin una ventana de prueba controlada.
- Se agrego test live opt-in:
  - `frontend-app/tests/opportunity_discovery_live.spec.ts`
  - default: skipped.
  - live: usa fixture de broad discovery + Serper real para gastar exactamente una llamada premium.
- Comando live ejecutado con key tomada del contenedor backend sin imprimirla:
  - `LIVE_OPPORTUNITY_DISCOVERY=true ... pnpm exec vitest run tests/opportunity_discovery_live.spec.ts`
- Resultado live: `1 passed`, `1.5s`.
- Suite focalizada post-live: `9 files`, `27 passed`, `1 skipped`.
- Prueba sistema real sobre DB local:
  - Baseline antes:
    - prospects total: `52`
    - con email: `7`
    - ready/contact: `8`
    - high score: `6`
    - stages: `contact 8`, `discarded 29`, `enrich 3`, `filter 1`, `ingest 8`, `qualify 3`
  - `POST /api/cron/daily-scout`: skipped por `already_ran_today` (proteccion correcta).
  - `POST /api/cron/heartbeat` #1:
    - `prospectsMoved: 8`
    - movio principalmente `ingest -> filter`; todavia no ejecuto premium enrichment.
    - stages despues: `filter 9`, `ingest 0`.
  - `POST /api/cron/heartbeat` #2:
    - `prospectsMoved: 8`
    - ejecuto el paso nuevo `filter -> enrich` sobre candidatos reales.
    - Post-run:
      - prospects total: `52`
      - con email: `7`
      - ready/contact: `9`
      - high score: `7`
      - stages: `contact 9`, `discarded 31`, `enrich 2`, `filter 7`, `qualify 3`
    - Premium traces:
      - `premium:serper`: `1`
      - `premium:skipped`: `1`
    - Caso Serper real:
      - Prospect `137`: `AI Talent in LATAM: Where Are the Best AI Engineers Coming From?`
      - Query premium: `Latamcent latamcent.com ... hiring AI automation developer founder contact email careers about product`
      - Resultado: enrichment publico de LatamCent guardado, company `LatamCent`; no encontro email nuevo.
    - Caso skip:
      - Prospect `138`: `Best Places to Hire AI Operations Specialists in 2026 - HiresLink`
      - Motivo: `premium:skipped:score-below-threshold`
  - No hubo emails outbound hacia leads/prospects:
    - `OUTBOUND_LEAD_EMAILS_ENABLED=false`
    - heartbeat reporto `followupsSent: 0`, `clickedFollowupsSent: 0`, `followupsEnabled: false`

## 2026-07-06 - Serper scalpel v2: premium scrape real

Motivo:

- La prueba real mostro que Serper como SERP enriquecia contexto, pero no necesariamente emails.
- Eso vuelve el gasto dudoso: si no abre paginas scrapeables, es caro para lo que aporta.

Cambios:

- `selectPremiumHarvestUrls()` filtra resultados Serper y elige hasta 2 URLs de alto valor para scraping.
- Se rechazan hosts de bajo valor como redes sociales y agregadores generalistas.
- El pipeline `filter -> enrich` ahora harvestea:
  - URL original;
  - URLs premium seleccionadas desde Serper.
- Se agregan trazas:
  - `premium:scrape:<urls>`
  - `contact:source:<url>`
- Se ajusto limpieza ATS:
  - `jobs.lever.co/jam-loop/...` infiere company `Jam Loop`.
  - En ATS compartidos, no alcanza compartir host: la URL debe matchear company/titulo del candidato.
  - Se corrigio falso positivo observado con `jobs.lever.co/jobgether`.

Prueba real post-refuerzo:

- Antes de heartbeat reforzado:
  - con email: `7`
  - ready/contact: `9`
  - `premium_scrape`: `0`
  - `contact_source`: `0`
  - stages: `contact 9`, `discarded 31`, `enrich 2`, `filter 7`, `qualify 3`
- Heartbeat reforzado:
  - `prospectsMoved: 8`
  - `followupsSent: 0`
  - `clickedFollowupsSent: 0`
  - `followupsEnabled: false`
- Despues:
  - con email: `8`
  - ready/contact: `9`
  - high score: `7`
  - `premium_serper`: `6`
  - `premium_skipped`: `3`
  - `premium_scrape`: `4`
  - `contact_source`: `6`
  - eventos `prospect.email_found`: `7`
- Resultado: el refuerzo si produjo +1 email real y dejo evidencia de scraping premium. Tambien expuso la necesidad de limpieza ATS, ya corregida y testeada.

Verificaciones:

```bash
pnpm exec vitest run tests/opportunity_discovery.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts
pnpm exec vitest run tests/search_router.spec.ts tests/search_router_fallback.spec.ts tests/search_providers.spec.ts tests/opportunity_discovery.spec.ts tests/opportunity_discovery_live.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts tests/email_gate.spec.ts tests/assistant_lead_route.spec.ts
pnpm exec tsc --noEmit
```

Resultado:

- Suite focalizada final: `9 files`, `30 passed`, `1 skipped`.
- TypeScript: OK.

## 2026-07-06 - Comparacion rapida: Serper vs SearXNG adaptado

Pregunta:

- Si excluimos Serper y usamos SearXNG adaptado con el mismo algoritmo de
  seleccion/scraping, podemos reproducir el `+1 email`?

Resultado:

- Si. El `+1 email` anterior no fue causado por Serper.
- El prospect que sumo email fue:
  - `143`: `359+ Remote Next.js Jobs, July 2026`
  - enrichment: `premium:skipped:score-below-threshold`
  - `contact:source:https://reactjobs.io/jobs/nextjs/remote`
  - email: `hi@reactjobs.io`
- Eso significa que salio del scraping directo de la URL original, no de la
  busqueda premium.

Prueba dentro del contenedor backend:

```txt
reactjobs_original_harvest:
  source=https://reactjobs.io/jobs/nextjs/remote
  email=hi@reactjobs.io

searxng_reactjobs_count: 35
searxng_reactjobs_top1:
  https://reactjobs.io/jobs/nextjs/remote

searxng_searchatlas_count: 20
searxng_searchatlas_top1:
  https://searchatlas.na.teamtailor.com/jobs/595729-senior-full-stack-engineer-django-next-js

searchatlas_harvest:
  email=null
```

Interpretacion:

- SearXNG adaptado con queries cortas/directas encuentra las mismas URLs
  importantes.
- Para ReactJobs, el mismo email se consigue sin Serper.
- Para SearchAtlas, ni Serper ni SearXNG resolvieron email porque la pagina
  scrapeada no expone uno.
- El problema ya no es solo provider; es estrategia de extraccion/contacto:
  cuando la pagina no expone email, hay que decidir si:
  - buscar dominio corporativo/contact page;
  - inferir canal no-email;
  - guardar como `no_public_email` y no gastar mas.

Nota tecnica:

- La query larga del planner funciona mejor en Serper que en SearXNG.
- SearXNG respondio mejor con queries adaptadas mas cortas:
  - `ReactJobs remote Next.js jobs contact email`
  - `Search Atlas careers Senior Full-Stack Engineer Next.js contact email`
- Proxima mejora razonable: provider-aware query planner barato:
  - SearXNG: query corta + `site:` cuando hay dominio confiable.
  - Serper: query enriquecida solo para candidatos de alto valor sin contacto.

## 2026-07-06 - Politica final aplicada: SearXNG primero, Serper ultimo

Decision implementada:

```txt
SearXNG discovery
-> scraping directo
-> SearXNG enrichment adaptado
-> scraping de URLs SearXNG
-> Serper solo si SearXNG no deja URLs scrapeables y el candidato merece gasto
```

Cambios:

- `buildSearxngEnrichmentQuery(candidate)`:
  - query corta;
  - `site:<domain>` cuando existe dominio;
  - terminos de rol;
  - `contact email careers`.
- `premiumEnrichCandidate()`:
  - corre SearXNG primero con query adaptada;
  - si encuentra URLs scrapeables, evita Serper;
  - mantiene `premiumCallsUsed` como metrica de Serper real;
  - Serper queda como fallback premium final.

Verificaciones:

```bash
pnpm exec vitest run tests/opportunity_discovery.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts tests/search_router.spec.ts tests/search_router_fallback.spec.ts
pnpm exec tsc --noEmit
pnpm exec vitest run tests/search_router.spec.ts tests/search_router_fallback.spec.ts tests/search_providers.spec.ts tests/opportunity_discovery.spec.ts tests/opportunity_discovery_live.spec.ts tests/opportunity_discovery_searxng_live.spec.ts tests/prospect_harvest.spec.ts tests/prospect_pipeline.spec.ts tests/email_gate.spec.ts tests/assistant_lead_route.spec.ts
docker.exe compose --profile backend --profile search up --build -d amorosi-backend worker searxng searxng-valkey
curl http://localhost:3001/api/health
```

Resultado:

- TypeScript: OK.
- Vitest final: `10 files`, `32 passed`, `3 skipped` (live opt-in).
- Docker rebuild: OK.
- Backend: healthy en `localhost:3001`.
- Puerto `3000`: sin listener host.
- SearXNG: healthy interno.
- DB post-prueba: `filter_count=0`, `with_email=8`; no se dispara heartbeat porque no quedan candidatos `filter` donde probar el nuevo paso sin mover otras etapas.

Criterio cubierto:

- candidato flojo no usa Serper;
- candidato fuerte e incompleto usa Serper una vez;
- candidato fuerte con email/company no usa Serper;
- discovery amplio respeta presupuesto premium;
- la query premium contiene identidad + keywords de contacto/hiring/contexto.

## 2026-07-06 - Docs deploy/prod y outbound gate

Docs revisadas/actualizadas:

- `docs/secrets-and-deploy.md`
- `docs/deploy-vps.md`
- `docs/resend-email-system.md`
- `docs/finalizacion-prod-2026-07-05/01-plan-prod-deploy.md`
- `docs/finalizacion-prod-2026-07-05/05-runbook-dokploy-cutover.md`
- `docs/final-refactor/RELEASE_PROD_READINESS.md`
- `docs/final-refactor/tasks/T00_BASELINE_REPORT_2026-07-04.md`

Puntos agregados:

- `OUTBOUND_LEAD_EMAILS_ENABLED=false` como default de staging/cutover.
- `OUTBOUND_LEAD_EMAILS_ENABLED=true` solo para outreach real aprobado.
- Checklist para levantar compuerta:
  - dominio Resend verificado;
  - email logs sanos;
  - `/admin/prospects` revisado;
  - export CSV revisado;
  - primer envio manual a 1 prospect.
- Rollback inmediato:
  - volver a `OUTBOUND_LEAD_EMAILS_ENABLED=false`;
  - reiniciar backend/worker;
  - no requiere rollback de DB.
- Se actualizo documentacion vieja que decia que el scout no extraia emails autonomamente; ahora queda marcada como baseline historico superado.
