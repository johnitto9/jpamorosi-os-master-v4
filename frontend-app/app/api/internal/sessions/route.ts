// app/api/internal/sessions/route.ts — POST: create a session from another service.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { guardInternal } from "@/lib/auth/internal";
import { touchSession } from "@/lib/agent/memory";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  const meta = await request.json().catch(() => ({}));
  const sessionId = randomUUID();
  await touchSession(
    sessionId,
    meta && typeof meta === "object"
      ? { ...(meta as object), createdVia: "internal" }
      : { createdVia: "internal" },
  );
  await recordEvent("session.started", { sessionId, via: "internal" });
  return NextResponse.json({ ok: true, sessionId });
}
