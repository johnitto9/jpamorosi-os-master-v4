// app/api/assistant/workspace/route.ts
// The visitor's Brand Foundation for one of their pre-projects (T05 vault).
//   GET ?projectId=N -> { workspace } — BrandDNA, assets, stack decisions, plan.
// Session-cookie scoped + ownership-checked: a session can only read a project
// it owns (mirrors /api/assistant/projects). Reads the SAME source as the admin
// dossier (getProjectWorkspace) — one truth, two viewers.
import { NextResponse } from "next/server";
import { listSessionProjects } from "@/lib/agent/projects";
import { getProjectWorkspace } from "@/lib/agent/project-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

export async function GET(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ ok: true, workspace: null });

  const projectId = Number(new URL(request.url).searchParams.get("projectId"));
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "bad_project" }, { status: 400 });
  }

  // ownership: only expose a project this session actually owns
  const own = await listSessionProjects(sessionId);
  if (!own.some((p) => p.id === projectId)) {
    return NextResponse.json({ ok: true, workspace: null });
  }

  return NextResponse.json({ ok: true, workspace: await getProjectWorkspace(projectId) });
}
