// app/api/assistant/lead/route.ts
// Session-scoped lead capture from Omni cards. It merges into the same lead row
// used by the agent brain, recovery flow and admin dossier.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { leadPatchSchema, getLead, upsertLead, updateLeadStage } from "@/lib/agent/leads";
import { touchSession } from "@/lib/agent/memory";
import { computeStage, scoreLead } from "@/lib/agent/playbooks";
import { recordEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/email/service";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "al_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readSessionId(request: Request): string | null {
  const value = (request.headers.get("cookie") ?? "").match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  )?.[1];
  return value && UUID_RE.test(value) ? value : null;
}

export async function POST(request: Request) {
  const existing = readSessionId(request);
  const sessionId = existing ?? randomUUID();

  const parsed = leadPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const patch = parsed.data;
  if (!patch.email && !patch.phone && !patch.company && !patch.need && !patch.name) {
    return NextResponse.json({ error: "empty_lead" }, { status: 422 });
  }

  const priorLead = await getLead(sessionId);
  await touchSession(sessionId, { hasLead: true, leadCaptureAt: new Date().toISOString() });
  await upsertLead(sessionId, patch);

  const finalLead = await getLead(sessionId);
  if (finalLead) {
    const stage = computeStage(finalLead, 1);
    const score = scoreLead(finalLead);
    await updateLeadStage(sessionId, stage, score);
    await recordEvent(priorLead ? "lead.updated" : "lead.created", {
      sessionId,
      via: "assistant-lead-card",
      stage,
      score,
    });
    await recordEvent("lead.scored", { sessionId, score, stage });

    const newContact =
      (patch.email && !priorLead?.email) || (patch.phone && !priorLead?.phone);
    if (newContact) {
      void notifyAdmin("lead_received", {
        ...finalLead,
        stage,
        score,
        sessionId,
        adminUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/sessions/${sessionId}`,
      });
    }
  }

  const res = NextResponse.json({ ok: true });
  if (!existing) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }
  return res;
}
