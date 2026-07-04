// app/api/sessions/route.ts — create a conversation session explicitly
// (programmatic clients; the web widget gets its session implicitly via the
// al_sid cookie on /api/assistant).
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { touchSession } from "@/lib/agent/memory";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const meta = await request.json().catch(() => ({}));
  const sessionId = randomUUID();
  await touchSession(
    sessionId,
    meta && typeof meta === "object" ? { ...(meta as object), createdVia: "api" } : { createdVia: "api" },
  );
  await recordEvent("session.started", { sessionId, via: "api" });
  return NextResponse.json({ ok: true, sessionId });
}
