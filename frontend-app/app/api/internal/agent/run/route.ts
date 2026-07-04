// app/api/internal/agent/run/route.ts — POST: run the agent brain from another
// service: { sessionId?, message, page? } -> AssistantResponse + sessionId.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { guardInternal } from "@/lib/auth/internal";
import { runAgent } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  let body: { sessionId?: unknown; message?: unknown; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const sessionId =
    typeof body.sessionId === "string" && UUID_RE.test(body.sessionId)
      ? body.sessionId
      : randomUUID();
  const response = await runAgent({
    sessionId,
    message: typeof body.message === "string" ? body.message : "",
    clientHistory: [],
    page: typeof body.page === "string" && body.page.startsWith("/") ? body.page : undefined,
  });
  return NextResponse.json({ sessionId, ...response });
}
