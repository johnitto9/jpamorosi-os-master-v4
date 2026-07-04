// app/api/assistant/projects/route.ts
// The visitor's pre-projects (session cookie scoped).
//   GET  -> { projects }        POST { name, kind?, concept?, stack?, palette? }
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createSessionProject,
  listSessionProjects,
  projectPatchSchema,
} from "@/lib/agent/projects";
import { getLead } from "@/lib/agent/leads";
import { touchSession } from "@/lib/agent/memory";
import { recordEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/email/service";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

export async function GET(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ ok: true, projects: [] });
  return NextResponse.json({ ok: true, projects: await listSessionProjects(sessionId) });
}

export async function POST(request: Request) {
  // creating a project can be the FIRST interaction — mint the session
  const existing = sid(request);
  const sessionId = existing ?? randomUUID();

  const parsed = projectPatchSchema
    .extend({ name: z.string().min(1).max(80) })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !parsed.data.name) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await touchSession(sessionId, { hasProject: true });
  const project = await createSessionProject(sessionId, {
    ...parsed.data,
    name: parsed.data.name,
  });
  await recordEvent("project.created", {
    sessionId,
    name: parsed.data.name,
    kind: parsed.data.kind,
  });
  // foundations laid = strongest intent signal — the admin hears it right away
  const lead = await getLead(sessionId);
  void notifyAdmin("project_created", {
    sessionId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    concept: parsed.data.concept,
    stack: parsed.data.stack,
    palette: parsed.data.palette,
    leadName: lead?.name || lead?.email || undefined,
    adminUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/sessions/${sessionId}`,
  });

  const res = NextResponse.json({ ok: true, project });
  if (!existing) {
    res.cookies.set("al_sid", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }
  return res;
}
