// lib/agent/leads.ts
// -----------------------------------------------------------------------------
// Lead capture + qualification state, one lead row per visitor session.
// Two capture paths, merged:
//   1. deterministic extraction (email/phone regex) — works without any LLM,
//   2. structured `lead` field returned by the LLM (validated with zod).
// Only NEW information is written; existing fields are never overwritten with
// empty values. Degrades to no-op without a DB.
// -----------------------------------------------------------------------------

import { z } from "zod";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export const leadPatchSchema = z
  .object({
    name: z.string().max(120).optional(),
    email: z.string().max(200).optional(),
    phone: z.string().max(60).optional(),
    company: z.string().max(160).optional(),
    budget: z.string().max(160).optional(),
    need: z.string().max(400).optional(),
    notes: z.string().max(600).optional(),
  })
  .strict();

export type LeadPatch = z.infer<typeof leadPatchSchema>;

export type Lead = LeadPatch & {
  id: number;
  sessionId: string | null;
  source: string;
  status: string;
  stage: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// permissive intl phone: 8+ digits allowing spaces/dashes/parens, avoids years
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

/** Cheap deterministic signal extraction from a raw user message. */
export function extractLeadSignals(text: string): LeadPatch {
  const patch: LeadPatch = {};
  const email = text.match(EMAIL_RE)?.[0];
  if (email) patch.email = email.toLowerCase();
  const phone = text.match(PHONE_RE)?.[0];
  if (phone && phone.replace(/\D/g, "").length >= 8) patch.phone = phone.trim();
  return patch;
}

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

/** Current qualification state for a session (null = nothing yet / no DB). */
export async function getLead(sessionId: string): Promise<LeadPatch | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<LeadPatch>(
    `SELECT name, email, phone, company, budget, need, notes
     FROM leads WHERE session_id = $1`,
    [sessionId],
  );
  return res?.rows[0] ?? null;
}

/** Full lead row for a session (stage/score/source included) — the dossier. */
export async function getLeadRow(sessionId: string): Promise<Lead | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<Lead>(
    `SELECT id, session_id AS "sessionId", name, email, phone, company, budget,
            need, notes, source, status, stage, score,
            created_at::text AS "createdAt", updated_at::text AS "updatedAt"
     FROM leads WHERE session_id = $1`,
    [sessionId],
  );
  return res?.rows[0] ?? null;
}

/** Merge new info into the session's lead (insert on first signal). */
export async function upsertLead(sessionId: string, patch: LeadPatch): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => typeof v === "string" && v.trim().length > 0),
  ) as LeadPatch;
  if (Object.keys(clean).length === 0) return;
  if (!(await dbReady())) return;

  await tryQuery(
    `INSERT INTO leads (session_id, name, email, phone, company, budget, need, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (session_id) WHERE session_id IS NOT NULL DO UPDATE SET
       name    = COALESCE(NULLIF(EXCLUDED.name, ''),    leads.name),
       email   = COALESCE(NULLIF(EXCLUDED.email, ''),   leads.email),
       phone   = COALESCE(NULLIF(EXCLUDED.phone, ''),   leads.phone),
       company = COALESCE(NULLIF(EXCLUDED.company, ''), leads.company),
       budget  = COALESCE(NULLIF(EXCLUDED.budget, ''),  leads.budget),
       need    = COALESCE(NULLIF(EXCLUDED.need, ''),    leads.need),
       notes   = COALESCE(NULLIF(EXCLUDED.notes, ''),   leads.notes),
       updated_at = now()`,
    [
      sessionId,
      clean.name ?? null,
      clean.email ?? null,
      clean.phone ?? null,
      clean.company ?? null,
      clean.budget ?? null,
      clean.need ?? null,
      clean.notes ?? null,
    ],
  );
}

/** Insert a standalone lead (no visitor session — public API / integrations). */
export async function insertLead(
  patch: LeadPatch,
  source = "api",
): Promise<number | null> {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => typeof v === "string" && v.trim().length > 0),
  ) as LeadPatch;
  if (Object.keys(clean).length === 0) return null;
  if (!(await dbReady())) return null;
  const res = await tryQuery<{ id: number }>(
    `INSERT INTO leads (session_id, name, email, phone, company, budget, need, notes, source)
     VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      clean.name ?? null,
      clean.email ?? null,
      clean.phone ?? null,
      clean.company ?? null,
      clean.budget ?? null,
      clean.need ?? null,
      clean.notes ?? null,
      source,
    ],
  );
  return res?.rows[0]?.id ?? null;
}

/** Persist the code-computed sales stage + score (playbooks.ts). */
export async function updateLeadStage(
  sessionId: string,
  stage: string,
  score: number,
): Promise<void> {
  if (!(await dbReady())) return;
  await tryQuery(
    `UPDATE leads SET stage = $2, score = $3, updated_at = now()
     WHERE session_id = $1`,
    [sessionId, stage, score],
  );
}

/** Admin listing: hottest first (score), then recency; message count per session. */
export async function listLeads(limit = 100): Promise<Array<Lead & { messages: number }>> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Lead & { messages: number }>(
    `SELECT l.id, l.session_id AS "sessionId", l.name, l.email, l.phone, l.company,
            l.budget, l.need, l.notes, l.source, l.status, l.stage, l.score,
            l.created_at::text AS "createdAt", l.updated_at::text AS "updatedAt",
            COALESCE(m.n, 0)::int AS messages
     FROM leads l
     LEFT JOIN (
       SELECT session_id, count(*) AS n FROM agent_messages GROUP BY session_id
     ) m ON m.session_id = l.session_id
     ORDER BY l.score DESC, l.updated_at DESC
     LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}
