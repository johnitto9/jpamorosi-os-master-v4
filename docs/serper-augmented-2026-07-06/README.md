# Serper Augmented - Plan y Conciliacion Tecnica

Fecha: 2026-07-06

Objetivo: dejar de usar Serper como fallback plano y convertirlo en un motor premium de enriquecimiento selectivo. SearXNG queda como radar amplio; Serper queda como bisturi para candidatos que ya demostraron fit o que necesitan datos criticos: contacto, contexto de hiring, founders, pagina oficial, careers/about/contact.

## Estado del proyecto

- `frontend-app/lib/search/router.ts` ya desacopla proveedores con `SearchProvider`.
- SearXNG corre como provider primario para discovery amplio.
- Serper existe como provider premium y ya puede recibir busquedas `critical` o `enrichment`.
- `frontend-app/lib/agent/prospects.ts` todavia enriquecia cards con una query generica `company product`, lo cual no expresa presupuesto, fit ni intencion.
- El admin ya evita miles de cards de bolsa diaria: solo muestra una muestra de ingest y cards avanzadas/unicas.
- La compuerta `OUTBOUND_LEAD_EMAILS_ENABLED=false` bloquea emails hacia leads/prospects; admin notifications siguen activas.

## Decision

Crear una capa chica en `frontend-app/lib/opportunity-discovery/`:

- `score.ts`: puntua candidatos baratos con titulo, snippet y URL.
- `planner.ts`: decide si vale gastar Serper y construye queries premium con contexto.
- `pipeline.ts`: corre discovery amplio, selecciona top candidatos y usa Serper solo dentro de presupuesto.
- `types.ts`: contratos internos para no acoplar la inteligencia a una pantalla o job puntual.

No se agrega una IA nueva. El planner inicial es deterministico y testeable.

## Regla de gasto premium

Serper se usa cuando:

- el candidato tiene score suficiente;
- falta email o company confiable;
- la URL/contexto sugiere oportunidad real: jobs, careers, hiring, AI, automation, startup, founder, product;
- queda presupuesto premium para esa corrida.

Serper no se usa cuando:

- el candidato es flojo;
- ya tiene email y company razonables;
- el presupuesto se agoto;
- la busqueda es discovery masivo.

## Query premium

La query de Serper se arma como investigacion precisa:

```txt
<company/title/domain> hiring AI automation developer founder contact email careers about product
```

La idea no es buscar mas resultados, sino conseguir datos que faltan y contexto accionable para outreach.

## Conciliacion con prospects

El stage `filter -> enrich` ahora puede llamar a `premiumEnrichCandidate()`:

- mantiene el harvesting local de paginas (`harvestContact`) porque muchas veces el email esta en `/contact` o `mailto:`;
- agrega Serper como enriquecimiento selectivo antes del harvest;
- deja trazas en `enrichment` con `premium:serper`, `premium:skipped:*` o `premium:unavailable`;
- conserva compatibilidad si no hay provider o API key.

## Tests requeridos

- candidato flojo no consume Serper;
- candidato fuerte sin email consume Serper una vez;
- candidato fuerte con email/company no consume Serper;
- discovery amplio respeta presupuesto premium;
- query premium contiene senales utiles para busqueda ideal.

## Test live controlado

El test real queda apagado por defecto para no gastar Serper en CI/local por accidente:

```bash
pnpm exec vitest run tests/opportunity_discovery_live.spec.ts
```

Resultado esperado: `1 skipped`.

Para gastar exactamente una llamada premium y probar el flujo completo con Serper real:

```bash
WEB_SEARCH_API_KEY="$(docker.exe compose exec -T amorosi-backend printenv WEB_SEARCH_API_KEY)" \
LIVE_OPPORTUNITY_DISCOVERY=true \
SEARCH_PRIMARY_PROVIDER=searxng \
SEARCH_PREMIUM_PROVIDER=serper \
pnpm exec vitest run tests/opportunity_discovery_live.spec.ts
```

Lo que valida:

- broad discovery entra por provider `searxng` fixtureado para que el test no dependa del azar;
- el candidato fuerte e incompleto pasa el score gate;
- se ejecuta exactamente una llamada real a Serper;
- la llamada premium usa `intent=enrichment`, `critical=true`, `limit=3`;
- la query contiene `hiring`, `contact`, `email`;
- Serper devuelve enrichment real.

## Ajuste post-prueba real

La primera prueba real mostro una debilidad correcta de marcar: Serper estaba
aportando contexto, pero no necesariamente mas emails. El bisturi no puede
terminar en snippets caros.

Refuerzo aplicado:

- Serper devuelve resultados premium.
- El planner filtra hosts de bajo valor (`linkedin`, `indeed`, `glassdoor`,
  `ziprecruiter`, redes sociales, etc.).
- El planner selecciona hasta 2 URLs scrapeables con mayor valor:
  - mismo dominio que el candidato;
  - paginas `contact`, `about`, `careers`, `jobs`, `company`;
  - textos con `contact`, `email`, `founder`, `hiring`.
- El pipeline de prospects ahora harvestea:
  - URL original;
  - URLs premium seleccionadas desde Serper.
- El enrichment guarda trazas:
  - `premium:serper:<query>`;
  - `premium:scrape:<urls>`;
  - `contact:source:<url>` cuando encontro datos desde una pagina.

Esto mantiene Serper como gasto acotado, pero lo obliga a abrir una oportunidad
real de extraccion de email/company, no solo un resumen.

Segundo ajuste de limpieza:

- ATS/job boards pueden compartir host para muchas empresas (`jobs.lever.co`,
  `teamtailor`, `greenhouse`, etc.).
- El selector premium ya no scrapea una URL ATS solo por compartir host.
- En ATS exige match de identidad contra company/titulo/path del candidato.
- Para Lever se infiere company desde el primer segmento del path
  (`jobs.lever.co/jam-loop/...` => `Jam Loop`) en vez de usar `Jobs`.

Ultima corrida local:

- default sin flag: `1 skipped`.
- live con flag/key: `1 passed`.
- suite focalizada post-live: `9 files`, `27 passed`, `1 skipped`.

## Para produccion

Mantener:

```env
SEARXNG_ENABLED=true
SEARXNG_BASE_URL=http://searxng:8080
SEARCH_PRIMARY_PROVIDER=searxng
SEARCH_PREMIUM_PROVIDER=serper
SEARXNG_FALLBACK_TO_SERPER=true
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Activar `OUTBOUND_LEAD_EMAILS_ENABLED=true` solo cuando el runbook de salida a prod este cerrado, con opt-out/unsubscribe y revision manual del primer batch.

## Politica final aplicada

Conclusion pragmatica tras las pruebas:

```txt
SearXNG discovery
-> limpieza/canonicalizacion
-> scoring barato
-> scraping directo de URL original
-> SearXNG enrichment adaptado con query corta
-> scraping de URLs SearXNG seleccionadas
-> Serper solo si todavia falta contacto y el candidato tiene alto fit
```

Implementacion actual:

- `buildSearxngEnrichmentQuery()` genera queries cortas, provider-aware:
  - usa `site:<domain>` cuando hay dominio confiable;
  - conserva terminos de rol;
  - agrega `contact email careers`;
  - evita la query larga pensada para Serper.
- `premiumEnrichCandidate()` prueba primero SearXNG soberano.
- Si SearXNG devuelve URLs scrapeables, Serper no se llama.
- `premiumCallsUsed` queda reservado para Serper/pago.
- Si SearXNG no encuentra URLs utiles, recien ahi corre Serper como ultimo bisturi.
- Serper no queda eliminado: queda como herramienta de rescate acotada.

Razon:

- El email `hi@reactjobs.io` se reprodujo sin Serper.
- SearXNG encontro ReactJobs y SearchAtlas como top result con queries cortas.
- SearchAtlas no expuso email aun scrapeando la URL correcta; ahi el problema no era provider sino falta de contacto publico.
- Por costo/beneficio, SearXNG + scraping debe ser el carril principal.
