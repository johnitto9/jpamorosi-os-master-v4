// app/api/admin/sessions/route.ts — GET: visitor sessions (admin only).
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { listSessions } from "@/lib/agent/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, sessions: await listSessions(200) });
}
