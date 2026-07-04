// lib/events.ts
// -----------------------------------------------------------------------------
// Internal event bus — MVP edition: one Postgres table, one function.
// Every meaningful thing that happens in the portfolio (lead created, email
// sent, tool called…) becomes a row the future Amorosi Labs ecosystem can
// consume. Fire-and-forget: recording an event NEVER breaks the caller —
// without a DB it degrades to a structured console line.
//
// Event shape (docs/internal-api.md):
//   { source: "portfolio", type: "lead.created", actorId, project, payload, ts }
// -----------------------------------------------------------------------------

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export type EventType =
  | "lead.created"
  | "lead.updated"
  | "lead.scored"
  | "session.started"
  | "session.message.created"
  | "session.summarized"
  | "ai.response.generated"
  | "ai.tool.called"
  | "ai.tool.failed"
  | "project.viewed"
  | "project.created"
  | "mockup.generated"
  | "prospect.created"
  | "prospect.advanced"
  | "prospect.updated"
  | "prospect.email_found"
  | "agent.heartbeat"
  | "lead.followup.sent"
  | "admin.login.requested"
  | "admin.login.success"
  | "email.sent"
  | "email.failed"
  | "media.uploaded"
  | "storage.r2.uploaded"
  | "storage.local.uploaded";

export async function recordEvent(
  type: EventType,
  payload: Record<string, unknown> = {},
  actorId: string | null = null,
): Promise<void> {
  // structured log line either way — greppable, secret-free by convention
  console.log(`[event] ${type}`, JSON.stringify(payload).slice(0, 300));
  if (!isDbConfigured()) return;
  try {
    await ensureSchema();
    await tryQuery(
      `INSERT INTO events (source, type, actor_id, project, payload)
       VALUES ('portfolio', $1, $2, 'amorosi-portfolio', $3::jsonb)`,
      [type, actorId, JSON.stringify(payload)],
    );
  } catch {
    /* events are best-effort by design */
  }
}

export type EventRow = {
  id: number;
  source: string;
  type: string;
  actorId: string | null;
  project: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

/** Admin/inspection listing, newest first, optional type filter. */
export async function listEvents(limit = 100, type?: string): Promise<EventRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
  } catch {
    return [];
  }
  const res = type
    ? await tryQuery<EventRow>(
        `SELECT id, source, type, actor_id AS "actorId", project, payload,
                created_at::text AS "createdAt"
         FROM events WHERE type = $2 ORDER BY id DESC LIMIT $1`,
        [limit, type],
      )
    : await tryQuery<EventRow>(
        `SELECT id, source, type, actor_id AS "actorId", project, payload,
                created_at::text AS "createdAt"
         FROM events ORDER BY id DESC LIMIT $1`,
        [limit],
      );
  return res?.rows ?? [];
}

/** One session's activity trail (payload.sessionId), oldest first — feeds the
 *  admin dossier timeline. Noisy per-message events are excluded by default. */
export async function listSessionEvents(
  sessionId: string,
  limit = 120,
): Promise<EventRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
  } catch {
    return [];
  }
  const res = await tryQuery<EventRow>(
    `SELECT id, source, type, actor_id AS "actorId", project, payload,
            created_at::text AS "createdAt"
     FROM events
     WHERE payload->>'sessionId' = $2
       AND type NOT IN ('session.message.created')
     ORDER BY id ASC LIMIT $1`,
    [limit, sessionId],
  );
  return res?.rows ?? [];
}
