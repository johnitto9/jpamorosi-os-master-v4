# Search Intelligence con SearXNG

## Filosofia

SearXNG = radar amplio, barato y soberano.

Serper = proveedor premium, selectivo, para verificacion critica, enriquecimiento de alto valor y fallback.

El backend no debe depender directamente de SearXNG ni Serper. Debe depender de una interfaz interna.

## Estado implementado en esta fase

Archivos agregados:

- `frontend-app/lib/search/types.ts`
- `frontend-app/lib/search/canonicalize.ts`
- `frontend-app/lib/search/normalize.ts`
- `frontend-app/lib/search/providers/searxng-provider.ts`
- `frontend-app/lib/search/providers/serper-provider.ts`
- `frontend-app/lib/search/router.ts`
- `frontend-app/tests/search_router.spec.ts`

Integraciones:

- `frontend-app/lib/agent/tools-server.ts` conserva `runWebSearchRaw` y `runWebSearch`, pero ahora pasan por el router interno.
- `frontend-app/app/api/cron/daily-scout/route.ts` ya no asume que solo existe `WEB_SEARCH_API_KEY`; saltea por `no_search_provider` si no hay SearXNG ni Serper.
- `docker-compose.yml` agrega `searxng` y `searxng-valkey` como servicios privados bajo perfil `search` para que no se levanten por accidente junto al backend actual.
- `deploy/searxng/settings.yml` habilita `format=json`.
- `.env.example` y `.env.docker.local.example` documentan `SEARXNG_*` y `SEARCH_*`.
- `frontend-app/app/api/assistant/lead/route.ts` permite que Omni capture datos de lead desde una card contextual y los una al dossier de sesion.
- `frontend-app/app/api/admin/prospects/route.ts` separa board curado de snapshots grandes: el admin no renderiza miles de capturas crudas como cards.
- `frontend-app/components/admin/ProspectBoard.tsx` muestra metricas del archivo bruto y export JSONL/CSV completo.
- `frontend-app/app/api/cron/daily-scout/route.ts` envia `scout_digest` enriquecido con stats, top oportunidades y links a board/export.

Regla runtime actual: el server correcto para desarrollo backend/admin es `:3001`. `web` queda detras de `--profile web` y no se levanta salvo que se pida un smoke puntual de mirror publico.

Para probar solo SearXNG, usar servicios por nombre:

```bash
docker.exe compose --profile search up -d searxng searxng-valkey
```

Para backend actual, seguir usando servicios por nombre:

```bash
docker.exe compose --profile backend up --build -d amorosi-backend worker
```

## Superficie admin para alto volumen

Decision: la bolsa diaria de busqueda puede crecer a miles de resultados, pero no debe convertirse en miles de cards. El sistema ahora diferencia:

- Archivo/snapshot: `GET /api/admin/prospects?format=jsonl&scope=all`.
- CSV completo: `GET /api/admin/prospects?format=csv&scope=all`.
- Mailing CSV calificado: `GET /api/admin/prospects?format=csv`.
- Board curado: `GET /api/admin/prospects` devuelve stats + maximo 20 items de ingesta cruda como preview + oportunidades que avanzaron (`filter/enrich/qualify/contact/contacted`).

Criterio: las cards son para oportunidades unicas accionables o en avance; el bruto queda como archivo simple para auditoria, analisis masivo y futura inteligencia longitudinal.

## Estado previo auditado

Serper esta acoplado en:

- `frontend-app/lib/agent/tools-server.ts`
  - `webSearchEnabled()`
  - `runWebSearchRaw(query, num)`
  - `runWebSearch(query)`
- `frontend-app/app/api/cron/daily-scout/route.ts`
  - usa `runWebSearchRaw` para discovery diario.
- `frontend-app/lib/agent/prospects.ts`
  - usa `runWebSearchRaw` para enrichment.

## Abstraccion propuesta

Crear `frontend-app/lib/search/`:

- `types.ts`
- `providers/search-provider.ts`
- `providers/searxng-provider.ts`
- `providers/serper-provider.ts`
- `router.ts`
- `normalize.ts`
- `canonicalize.ts`
- `cache.ts`
- `score.ts`

Tipos conceptuales:

```ts
export type SearchIntent =
  | "broad-discovery"
  | "general-web-search"
  | "job-discovery"
  | "github-signal"
  | "critical-verification"
  | "enrichment";

export type SearchInput = {
  query: string;
  intent: SearchIntent;
  limit?: number;
  locale?: string;
  categories?: string[];
  timeRange?: "day" | "month" | "year";
  critical?: boolean;
};

export type NormalizedSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  provider: "searxng" | "serper" | "github" | "rss" | string;
  publishedAt?: string;
  score?: number;
  canonicalUrl: string;
  hash: string;
  metadata?: Record<string, unknown>;
};

export interface SearchProvider {
  name: string;
  enabled(): boolean;
  search(input: SearchInput): Promise<NormalizedSearchResult[]>;
}
```

No forzar nombres si el codigo final pide ajustes, pero mantener el contrato.

## Routing por intencion

Reglas iniciales:

- `broad-discovery`: SearXNG primario; fallback Serper si error o resultados pobres.
- `general-web-search`: SearXNG primario.
- `job-discovery`: SearXNG primario ahora; luego ATS/direct APIs.
- `github-signal`: futuro GitHub provider; ahora SearXNG con query site/github o directo si se implementa.
- `critical-verification`: Serper directo.
- `enrichment`: SearXNG primero si no es caro; Serper solo para top candidatos o baja confianza.

Evitar:

- Hacer siempre SearXNG + Serper.
- Fallback infinito.
- Retries agresivos.

## SearXNG provider

Configuracion:

- `SEARXNG_ENABLED`
- `SEARXNG_BASE_URL=http://searxng:8080`
- `SEARXNG_TIMEOUT_MS=8000`

Consumo verificado:

- Endpoint: `/search`
- Metodo: `GET` o `POST`.
- Parametros:
  - `q`
  - `format=json`
  - `categories`
  - `language`
  - `pageno`
  - `time_range`
  - `safesearch`

Requisito config SearXNG:

- Habilitar `json` en `search.formats` del `settings.yml`. Si no, SearXNG responde `403`.

Manejo de errores:

- `403`: config mal; log claro y fallback si habilitado.
- `429`/captcha/engine errors: degradar sin romper.
- Timeout: abortar y fallback segun intent.
- Respuesta sin resultados: baja confianza.

## Serper provider

Extraer el codigo existente de `runWebSearchRaw` a provider.

Mantener compatibilidad:

- `runWebSearchRaw` puede quedar como wrapper temporal que llama al router con `intent: "general-web-search"` o directamente a `SerperProvider` hasta migrar callers.
- No eliminar `WEB_SEARCH_API_KEY`.

## Normalizacion

SearXNG JSON devuelve estructura propia con `results`. Serper devuelve `organic`.

Normalizar ambos a `NormalizedSearchResult`.

Campos minimos:

- `title`
- `url`
- `snippet`
- `provider`
- `source`
- `canonicalUrl`
- `hash`
- `metadata.rawRank`

## Canonicalizacion y dedupe

Implementar:

- Lowercase host.
- Remover `www.`.
- Remover trailing slash.
- Remover tracking params:
  - `utm_*`
  - `fbclid`
  - `gclid`
  - `mc_cid`
  - `mc_eid`
  - `ref`
  - `source`
- Ordenar query params restantes.
- Normalizar http/https con preferencia https cuando sea obvio.
- Hash estable: `sha256(canonicalUrl).slice(0, 32)`.

Dedupe por batch:

- `canonicalUrl` exacto.
- Fallback por `host + normalized title` si URLs difieren mucho.

Dedupe persistente fase 2:

- Tabla `search_results` o `opportunity_signals` con `canonical_url` unico.

## Persistencia longitudinal

Agregar despues de provider/router estable.

Tabla conceptual:

```sql
CREATE TABLE opportunity_signals (
  id bigserial PRIMARY KEY,
  canonical_url text NOT NULL UNIQUE,
  title text,
  snippet text,
  source text,
  signal_type text,
  entity_name text,
  confidence integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  providers_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);
```

No meter embeddings todavia. Primero URL/canonical/entity heuristica.

## Cache

Si no existe cache general, empezar simple con Postgres o in-memory per process:

- Key: `provider:intent:normalizedQuery:locale:categories:timeRange`.
- TTL:
  - trends/discovery: 6h.
  - general: 24h.
  - critical verification: corto o sin cache segun caso.

Mejor fase 1: in-memory con TTL para no meter migracion grande.
Mejor fase 2: tabla `search_cache` si el worker y backend deben compartir.

## Docker/Dokploy SearXNG

Servicio interno:

```yaml
searxng:
  image: searxng/searxng:latest
  restart: unless-stopped
  environment:
    SEARXNG_BASE_URL: http://searxng:8080/
  volumes:
    - ./deploy/searxng/settings.yml:/etc/searxng/settings.yml:ro
    - searxng_cache:/var/cache/searxng
  depends_on:
    - searxng-valkey
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/config >/dev/null || exit 1"]
    interval: 30s
    timeout: 5s
    retries: 5

searxng-valkey:
  image: valkey/valkey:9-alpine
  command: valkey-server --save 30 1 --loglevel warning
  restart: unless-stopped
  volumes:
    - searxng_valkey:/data
```

No publicar `ports` en prod. El backend llama `http://searxng:8080`.

`settings.yml` minimo:

```yaml
use_default_settings: true

server:
  secret_key: "${SEARXNG_SECRET_KEY}"
  image_proxy: false
  limiter: true

search:
  formats:
    - html
    - json
```

Verificar si la imagen expande env vars dentro de settings; si no, generar el archivo por template en deploy/Dokploy o usar secret montado.

## Tests requeridos

Unit:

- canonicalize elimina tracking params.
- dedupe fusiona URL equivalente.
- SearxngProvider normaliza respuesta fixture.
- SerperProvider normaliza respuesta fixture.
- Router:
  - broad-discovery usa SearXNG.
  - critical-verification usa Serper.
  - SearXNG error + fallback habilitado llama Serper una vez.
  - SearXNG resultados suficientes no llama Serper.

Integration:

- daily-scout usa SearchRouter y no Serper directo para discovery.
- enrichment usa fallback premium solo para candidatos filtrados.
- sin SearXNG y sin Serper: no rompe, devuelve skipped/degraded.

Acceptance:

- Con SearXNG local prendido y Serper apagado, `daily-scout` ingesta resultados.
- Con SearXNG caido y Serper prendido, `daily-scout` completa con fallback y registra evento.
- Con ambos prendidos, Serper no se usa para discovery amplio cuando SearXNG trae resultados suficientes.
