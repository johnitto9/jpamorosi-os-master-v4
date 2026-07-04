# pgvector & memoria del agente — estado REAL

## Auditoría (2026-07-02)
| Pregunta | Respuesta |
|---|---|
| ¿El backend usaba pgvector? | **No.** Nada lo referenciaba. |
| ¿Migraciones con CREATE EXTENSION vector? | **No existían.** Ahora: bootstrap guardado (`tryEnableVector`). |
| ¿El contenedor soportaba pgvector? | **No** — era `postgres:16-alpine` (sin la extensión). |
| ¿Imagen actual? | **`pgvector/pgvector:pg16`** (postgres 16 Debian + extensión). Volumen local recreado (alpine→debian cambia collations; data dev descartable). |
| ¿La memoria usa embeddings/FTS/keyword? | **Keyword.** Historial por sesión (agent_messages) + `memory_items` con búsqueda ILIKE (AND de términos). Sin embeddings, sin pg_trgm, sin FTS. |
| ¿Tablas con columnas vector? | **No todavía** (a propósito — no hay proveedor de embeddings configurado). |

## Camino mínimo viable (elegido)
MVP = keyword + historial (funciona sin ninguna key). La extensión `vector`
ya queda **instalada y verificada** (`/api/status → pgvector:true`), así que
el upgrade a memoria semántica es solo:

1. Elegir proveedor de embeddings (OpenRouter/OpenAI) y su env var.
2. `ALTER TABLE memory_items ADD COLUMN embedding vector(1024);`
3. En `writeMemory`: calcular embedding (si hay key) y guardarlo.
4. En `searchMemory`: `ORDER BY embedding <=> $query_embedding` cuando la
   columna y la key existan; si no, keyword como hoy.

La API (`writeMemory`/`searchMemory`, `/api/internal/memory/*`) **no cambia**.

## Guardas
- `CREATE EXTENSION IF NOT EXISTS vector` corre en el bootstrap dentro de un
  try/catch: sobre un postgres sin la extensión solo loguea un warning y todo
  sigue (keyword-only). Nunca rompe el arranque.
- No se mete vector DB externa: Postgres alcanza a esta escala.
