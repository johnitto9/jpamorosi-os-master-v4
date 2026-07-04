// lib/db/pool.ts
// -----------------------------------------------------------------------------
// Postgres pool — the single DB entry point (server-only).
//
// Design rules (Delibot lessons applied):
// - Lazy singleton: no connection is opened until something actually needs it.
// - The DB is OPTIONAL: every consumer must survive DATABASE_URL being absent
//   or the DB being down (graceful degradation, never a crashed request).
//   Use `isDbConfigured()` for cheap checks and `tryQuery()` when a failure
//   should degrade instead of throw.
// - No ORM: plain SQL over `pg`, jsonb documents where the shape is fluid.
//
// DATABASE_URL examples:
//   docker compose:  postgres://amorosi:amorosi@postgres:5432/amorosi
//   local host:      postgres://amorosi:amorosi@localhost:5433/amorosi
// -----------------------------------------------------------------------------

import { Pool, types, type QueryResult, type QueryResultRow } from "pg";

// pg returns BIGINT (OID 20) as a string by default to preserve precision for
// arbitrary-sized integers. Every id we expose to clients/UI fits in JS safe
// integer range, so we coerce to Number at the driver boundary — without this,
// every `RETURNING id` arrived as "23" instead of 23 and downstream `typeof ===
// "number"` checks blew up.
types.setTypeParser(20, (val) => (val === null ? null : Number(val)));

let pool: Pool | null = null;

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getPool(): Pool {
  if (!isDbConfigured()) {
    throw new Error(
      "DATABASE_URL is not set. Start the postgres service (docker compose --profile backend up) or configure the env var.",
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // small app, small pool
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 4_000,
    });
    // Never let an idle-client error take the process down.
    pool.on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Degradation-friendly query: returns null instead of throwing when the DB is
 * unconfigured or unreachable. Callers keep working memory-lite (no-silence).
 */
export async function tryQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T> | null> {
  if (!isDbConfigured()) return null;
  try {
    return await query<T>(text, params);
  } catch (err) {
    console.error("[db] query failed (degrading gracefully):", (err as Error).message);
    return null;
  }
}
