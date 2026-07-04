// app/api/admin/email-logs/route.ts — GET: email attempt log (admin only).
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { listEmailLogs } from "@/lib/email/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, logs: await listEmailLogs(200) });
}
