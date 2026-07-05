// app/api/admin/scout-run/route.ts
// Admin-triggered market scout: lets Juan run the dragnet ON DEMAND from
// /admin/prospects instead of waiting for the worker's daily window. Guards
// with the admin session, then calls the SAME /api/cron/daily-scout internally
// (server-to-server on the container's own port) so all scout logic stays in
// one place. Returns the cron's report ({ ingested, advanced } or a skip).
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const token = process.env.INTERNAL_API_TOKEN ?? process.env.SERVICE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "no_internal_token" }, { status: 503 });
  }

  // internal port (the container serves on :3000; :3001 is the host mapping)
  try {
    const res = await fetch("http://localhost:3000/api/cron/daily-scout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(115_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, ...data }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message.slice(0, 200) },
      { status: 502 },
    );
  }
}
