// lib/agent/ai-log.ts
// One row per LLM call — the agent's observability (Delibot health pattern).
// Best-effort: never throws, degrades to console without a DB.

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export async function logAiCall(input: {
  sessionId: string | null;
  model: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}): Promise<void> {
  const { sessionId, model, ok, latencyMs, error } = input;
  if (!ok) console.warn(`[ai] ${model} failed in ${latencyMs}ms: ${error?.slice(0, 120)}`);
  if (!isDbConfigured()) return;
  try {
    await ensureSchema();
    await tryQuery(
      `INSERT INTO ai_logs (session_id, model, ok, latency_ms, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, model, ok, latencyMs, error?.slice(0, 300) ?? null],
    );
  } catch {
    /* observability must never break the reply */
  }
}

export type AiLogRow = {
  id: number;
  sessionId: string | null;
  model: string | null;
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
};

export async function listAiLogs(limit = 100): Promise<AiLogRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
  } catch {
    return [];
  }
  const res = await tryQuery<AiLogRow>(
    `SELECT id, session_id AS "sessionId", model, ok, latency_ms AS "latencyMs",
            error, created_at::text AS "createdAt"
     FROM ai_logs ORDER BY id DESC LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}
