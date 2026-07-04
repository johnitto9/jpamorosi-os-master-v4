// app/api/assistant/decisions/route.ts
// The decisions phase's write path (Fase 2d): the visitor picks an option on a
// decision card (deterministic presets or agent-proposed via propose_decisions)
// and it persists as a confirmed StackDecision — the same T05 log the vault,
// the orchestrator's context and the admin dossier already read.
//
//   POST { projectId, category, option, reason? } -> { ok, decision }
//
// Session-cookie scoped + ownership-checked like the sibling routes.
import { NextResponse } from "next/server";
import { z } from "zod";
import { listSessionProjects } from "@/lib/agent/projects";
import { addStackDecision } from "@/lib/agent/project-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

const bodySchema = z.object({
  projectId: z.number().int().positive(),
  category: z.string().min(1).max(60),
  option: z.string().min(1).max(120),
  reason: z.string().max(240).optional(),
});

export async function POST(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { projectId, category, option, reason } = parsed.data;

  const own = await listSessionProjects(sessionId);
  if (!own.some((p) => p.id === projectId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const decision = await addStackDecision(projectId, {
    category,
    option,
    reason,
    source: "user",
    confirmed: true,
  });
  if (!decision) return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, decision });
}
