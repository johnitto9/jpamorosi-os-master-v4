// lib/agent/projects.ts
// Pre-projects per loginless session — the visitor's ORBIT. The chat tabs
// pin one (project/branding) or several (omni); the agent reads them as
// context and UPDATES them via the update_project tool (stack decisions,
// concept refinements, palette). Degrades to empty without DB.

import { z } from "zod";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";

// Guided-flow state machine. The Project Room reads `phase` to decide what to
// offer (preset "Generate branding" → branding wizard → decision cards →
// generation), instead of a free rambling chat. Ordered; the flow advances it.
export const PROJECT_PHASES = [
  "created",       // wizard done (name+kind+concept+colors). Offers "Generate branding".
  "branding",      // working the Branding tab (logo/representative/storyboard).
  "decisions",     // resolving doubts + stack/features/core via cards.
  "consolidated",  // decisions locked; generation unlocked.
  "generating",    // map/home/screens being produced.
  "ready",         // consolidated + generated; freer conversation.
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];
export function isProjectPhase(v: unknown): v is ProjectPhase {
  return typeof v === "string" && (PROJECT_PHASES as readonly string[]).includes(v);
}

export const projectPatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    kind: z.string().max(40).optional(),
    concept: z.string().max(1200).optional(),
    stack: z.array(z.string().max(40)).max(20).optional(),
    palette: z.array(z.string().regex(/^#[0-9a-fA-F]{3,8}$/)).max(8).optional(),
    logoUrl: z.string().max(300).optional(),
  })
  .strict();
export type ProjectPatch = z.infer<typeof projectPatchSchema>;

export type SessionProject = {
  id: number;
  sessionId: string;
  name: string;
  kind: string;
  concept: string | null;
  stack: string[];
  palette: string[];
  logoUrl: string | null;
  status: string;
  phase: ProjectPhase;
  createdAt: string;
  updatedAt: string;
};

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// id::int — node-postgres returns bigserial as STRING; cast so ids are
// numbers end-to-end (client pinning, route validation, orbit filtering)
const SELECT = `id::int AS id, session_id AS "sessionId", name, kind, concept, stack, palette,
  logo_url AS "logoUrl", status, phase, created_at::text AS "createdAt", updated_at::text AS "updatedAt"`;

export async function createSessionProject(
  sessionId: string,
  input: ProjectPatch & { name: string },
): Promise<SessionProject | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<SessionProject>(
    `INSERT INTO session_projects (session_id, name, kind, concept, stack, palette, logo_url)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7) RETURNING ${SELECT}`,
    [
      sessionId,
      input.name,
      input.kind ?? "app",
      input.concept ?? null,
      JSON.stringify(input.stack ?? []),
      JSON.stringify(input.palette ?? []),
      input.logoUrl ?? null,
    ],
  );
  return res?.rows[0] ?? null;
}

export async function listSessionProjects(sessionId: string): Promise<SessionProject[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<SessionProject>(
    `SELECT ${SELECT} FROM session_projects
     WHERE session_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 12`,
    [sessionId],
  );
  return res?.rows ?? [];
}

/** Advance the guided-flow state machine. Own-session guard; validated value.
 *  Idempotent (setting the same phase is a no-op). Emits a project.phase event. */
export async function setProjectPhase(
  sessionId: string,
  id: number,
  phase: ProjectPhase,
): Promise<SessionProject | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<SessionProject>(
    `UPDATE session_projects SET phase = $3, updated_at = now()
     WHERE id = $2 AND session_id = $1 RETURNING ${SELECT}`,
    [sessionId, id, phase],
  );
  const project = res?.rows[0] ?? null;
  if (project) await recordEvent("project.phase", { sessionId, id, phase });
  return project;
}

/** Partial update — only own-session projects (id + session guard). */
export async function updateSessionProject(
  sessionId: string,
  id: number,
  patch: ProjectPatch,
): Promise<SessionProject | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<SessionProject>(
    `UPDATE session_projects SET
       name     = COALESCE($3, name),
       kind     = COALESCE($4, kind),
       concept  = COALESCE($5, concept),
       stack    = COALESCE($6::jsonb, stack),
       palette  = COALESCE($7::jsonb, palette),
       logo_url = COALESCE($8, logo_url),
       updated_at = now()
     WHERE id = $2 AND session_id = $1
     RETURNING ${SELECT}`,
    [
      sessionId,
      id,
      patch.name ?? null,
      patch.kind ?? null,
      patch.concept ?? null,
      patch.stack ? JSON.stringify(patch.stack) : null,
      patch.palette ? JSON.stringify(patch.palette) : null,
      patch.logoUrl ?? null,
    ],
  );
  return res?.rows[0] ?? null;
}
