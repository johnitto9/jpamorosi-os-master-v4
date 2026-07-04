// app/api/sessions/[id]/messages/route.ts — post a message into a session and
// get the agent's reply. Same single brain as the widget (runAgent), keyed by
// an explicit session id instead of the cookie.
import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import { ASSISTANT_LIMITS, type AssistantRequestMessage } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }
  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const clientHistory: AssistantRequestMessage[] = Array.isArray(body.history)
    ? (body.history as AssistantRequestMessage[]).slice(-ASSISTANT_LIMITS.maxHistory)
    : [];
  const response = await runAgent({
    sessionId: id,
    message: typeof body.message === "string" ? body.message : "",
    clientHistory,
  });
  return NextResponse.json(response);
}
