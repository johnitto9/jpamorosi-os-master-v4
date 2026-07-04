// app/api/admin/events/route.ts — GET: internal event stream (admin only).
// Optional ?type=lead.created filter.
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { listEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  const type = new URL(request.url).searchParams.get("type") ?? undefined;
  return NextResponse.json({ ok: true, events: await listEvents(200, type) });
}
