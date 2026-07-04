// lib/agent/memory.ts
// -----------------------------------------------------------------------------
// Conversation memory (Delibot conversation_service pattern, ported):
// - persist every turn per visitor session,
// - inject recent history before the AI call,
// - degrade to memory-lite when the DB is missing/down — the assistant must
//   NEVER fail because persistence failed (no-silence pact).
// Server-only. All PII stays in our own Postgres, never in third parties.
// -----------------------------------------------------------------------------

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import type { AssistantRequestMessage } from "@/lib/assistant/types";

const HISTORY_LIMIT = 12;

/** Best-effort schema guard: false means "operate memory-lite". */
async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch (err) {
    console.error("[agent:memory] schema unavailable, memory-lite mode:", (err as Error).message);
    return false;
  }
}

/** Upsert the visitor session row, bump last_seen, merge visit metadata
 *  (e.g. lastPage) into the jsonb meta — feedback signal for the brain. */
export async function touchSession(
  sessionId: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!(await dbReady())) return;
  await tryQuery(
    `INSERT INTO visitor_sessions (id, meta) VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE
     SET last_seen = now(), meta = visitor_sessions.meta || $2::jsonb`,
    [sessionId, JSON.stringify(meta ?? {})],
  );
}

/** Load the recent conversation for a session+thread (oldest first). */
export async function loadHistory(
  sessionId: string,
  thread = 0,
): Promise<AssistantRequestMessage[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, id FROM agent_messages
       WHERE session_id = $1 AND thread = $3 ORDER BY id DESC LIMIT $2
     ) t ORDER BY id ASC`,
    [sessionId, HISTORY_LIMIT, thread],
  );
  return res?.rows ?? [];
}

/** Append one turn. Fire-and-forget semantics: failures only log. */
export async function saveTurn(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  intent?: string,
  thread = 0,
): Promise<void> {
  if (!(await dbReady())) return;
  await tryQuery(
    `INSERT INTO agent_messages (session_id, role, content, intent, thread)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, role, content.slice(0, 4000), intent ?? null, thread],
  );
}

// ---- long-term memory items (MVP: keyword search; pgvector-ready seam) --------
// The write/search API below is what tools and /api/internal/memory/* consume.
// Today search is ILIKE keyword matching; when an embedding provider lands,
// only the SELECT changes (vector similarity) — callers stay untouched.

export type MemoryItem = {
  id: number;
  sessionId: string | null;
  kind: string;
  content: string;
  createdAt: string;
};

export async function writeMemory(
  content: string,
  kind = "note",
  sessionId: string | null = null,
): Promise<boolean> {
  if (!content.trim() || !(await dbReady())) return false;
  const res = await tryQuery(
    `INSERT INTO memory_items (session_id, kind, content) VALUES ($1, $2, $3)`,
    [sessionId, kind, content.slice(0, 4000)],
  );
  return res !== null;
}

export async function searchMemory(
  queryText: string,
  limit = 8,
  sessionId?: string,
): Promise<MemoryItem[]> {
  if (!queryText.trim() || !(await dbReady())) return [];
  // split into terms, require each somewhere in the content (AND of ILIKEs)
  const terms = queryText.trim().split(/\s+/).slice(0, 5);
  const clauses = terms.map((_, i) => `content ILIKE $${i + 2}`).join(" AND ");
  const params: unknown[] = [limit, ...terms.map((t) => `%${t}%`)];
  let sql = `SELECT id, session_id AS "sessionId", kind, content,
                    created_at::text AS "createdAt"
             FROM memory_items WHERE ${clauses}`;
  if (sessionId) {
    params.push(sessionId);
    sql += ` AND session_id = $${params.length}`;
  }
  sql += ` ORDER BY id DESC LIMIT $1`;
  const res = await tryQuery<MemoryItem>(sql, params);
  return res?.rows ?? [];
}

/** Identity leg 2: latest session bound to this device id (cookie lost). */
export async function findSessionByDevice(deviceId: string): Promise<string | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<{ id: string }>(
    `SELECT id FROM visitor_sessions
     WHERE meta->>'deviceId' = $1 ORDER BY last_seen DESC LIMIT 1`,
    [deviceId],
  );
  return res?.rows[0]?.id ?? null;
}

/** One session row with its identity meta (admin dossier header). */
export async function getSession(
  sessionId: string,
): Promise<{ id: string; firstSeen: string; lastSeen: string; meta: Record<string, unknown> } | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<{
    id: string; firstSeen: string; lastSeen: string; meta: Record<string, unknown>;
  }>(
    `SELECT id, first_seen::text AS "firstSeen", last_seen::text AS "lastSeen", meta
     FROM visitor_sessions WHERE id = $1`,
    [sessionId],
  );
  return res?.rows[0] ?? null;
}

/** Full transcript of one session (admin console), oldest first. */
export async function listMessages(
  sessionId: string,
  limit = 200,
): Promise<Array<{ id: number; role: string; content: string; intent: string | null; createdAt: string }>> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<{
    id: number; role: string; content: string; intent: string | null; createdAt: string;
  }>(
    `SELECT id, role, content, intent, created_at::text AS "createdAt"
     FROM agent_messages WHERE session_id = $1 ORDER BY id ASC LIMIT $2`,
    [sessionId, limit],
  );
  return res?.rows ?? [];
}

/** Admin/internal listing of visitor sessions, newest activity first. */
export async function listSessions(limit = 100): Promise<
  Array<{ id: string; firstSeen: string; lastSeen: string; meta: Record<string, unknown>; messages: number }>
> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<{
    id: string; firstSeen: string; lastSeen: string; meta: Record<string, unknown>; messages: number;
  }>(
    `SELECT s.id, s.first_seen::text AS "firstSeen", s.last_seen::text AS "lastSeen",
            s.meta, COALESCE(m.n, 0)::int AS messages
     FROM visitor_sessions s
     LEFT JOIN (SELECT session_id, count(*) AS n FROM agent_messages GROUP BY session_id) m
       ON m.session_id = s.id
     ORDER BY s.last_seen DESC LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}
