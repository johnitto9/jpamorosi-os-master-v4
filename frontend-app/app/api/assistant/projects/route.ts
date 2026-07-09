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
  setProjectPhase,
  isProjectPhase,
} from "@/lib/agent/projects";
import { getLead, leadPatchSchema, upsertLead } from "@/lib/agent/leads";
import { touchSession, findSessionByDevice } from "@/lib/agent/memory";
import { recordEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/email/service";
import { env } from "@/lib/env";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-session project ceiling. Without it every other cap multiplies: each
// project unlocks its own ASSET_ROLE_CAPS budget, so unlimited projects meant
// unlimited paid generations. 5 is generous for a genuine visitor.
const PROJECTS_PER_SESSION = 5;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

function deviceIdOf(request: Request): string | null {
  const d = request.headers.get("x-device-id");
  return d && UUID_RE.test(d) ? d : null;
}

/** (Re)issue the session cookie — the tripod's leg 1. This route used to mint
 *  session ids WITHOUT setting the cookie, creating "phantom" sessions whose
 *  projects were only visible in the creating tab's memory. */
function withSessionCookie(res: NextResponse, sessionId: string): NextResponse {
  res.cookies.set("al_sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}

export async function GET(request: Request) {
  let sessionId = sid(request);
  let recovered = false;
  if (!sessionId) {
    // leg 2: cookie wiped/absent -> rebind by device id (localStorage leg)
    const device = deviceIdOf(request);
    sessionId = device ? await findSessionByDevice(device) : null;
    recovered = !!sessionId;
  }
  if (!sessionId) return NextResponse.json({ ok: true, projects: [] });
  const res = NextResponse.json({ ok: true, projects: await listSessionProjects(sessionId) });
  return recovered ? withSessionCookie(res, sessionId) : res;
}

export async function POST(request: Request) {
  // per-IP burst guard (project creation fans out emails + DB writes)
  const limited = await rateLimited(request, "assistant-projects", 6, 10 * 60_000);
  if (limited) return limited;

  // creating a project can be the FIRST interaction — resolve the session
  // through the full tripod: cookie -> device rebind -> mint new
  const existing = sid(request);
  const device = deviceIdOf(request);
  const rebound = !existing && device ? await findSessionByDevice(device) : null;
  const sessionId = existing ?? rebound ?? randomUUID();

  if ((await listSessionProjects(sessionId)).length >= PROJECTS_PER_SESSION) {
    return NextResponse.json(
      { error: "project_limit", cap: PROJECTS_PER_SESSION },
      { status: 409 },
    );
  }

  const parsed = projectPatchSchema
    .extend({
      name: z.string().min(1).max(80),
      lead: leadPatchSchema.pick({ name: true, company: true, email: true }).optional(),
    })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !parsed.data.name) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await touchSession(sessionId, { hasProject: true, ...(device ? { deviceId: device } : {}) });
  if (parsed.data.lead) {
    await upsertLead(sessionId, parsed.data.lead);
  }
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

// Advance the guided-flow state machine for a project.
//   PATCH { id: number, phase: ProjectPhase }
// Session-guarded (no cookie -> nothing to own -> 401). The flow calls this at
// each transition (created -> branding -> decisions -> consolidated -> ...).
export async function PATCH(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: unknown; phase?: unknown };
  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!Number.isInteger(id) || !isProjectPhase(body.phase)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const project = await setProjectPhase(sessionId, id, body.phase);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return withSessionCookie(NextResponse.json({ ok: true, project }), sessionId);
}
