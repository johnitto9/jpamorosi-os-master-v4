// app/api/admin/ai-logs/route.ts — GET: LLM call log (admin only).
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { listAiLogs } from "@/lib/agent/ai-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, logs: await listAiLogs(200) });
}
