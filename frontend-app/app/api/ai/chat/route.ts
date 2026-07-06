// app/api/ai/chat/route.ts — thin stable alias over the agent brain for
// programmatic clients: { message, sessionId? } -> AssistantResponse.
// (The web widget keeps using /api/assistant with its cookie session.)
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runAgent } from "@/lib/agent/orchestrator";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  // Programmatic public alias: stricter than the widget endpoint.
  const limited = await rateLimited(request, "ai-chat", 10, 10 * 60_000);
  if (limited) return limited;

  let body: { message?: unknown; sessionId?: unknown };
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
  });
  return NextResponse.json({ sessionId, ...response });
}
