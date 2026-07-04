// app/api/health/route.ts — liveness + dependency probe (docker healthcheck,
// uptime monitors). Always 200 while the process runs.
//
// SECURITY: the PUBLIC response is intentionally minimal ({"ok":true}) so it
// never leaks dependency topology. Detailed status (db, uptime) is returned
// only to callers presenting a valid internal bearer token. The docker
// healthcheck / uptime pings just need the 200 and work unauthenticated.
import { NextResponse } from "next/server";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { isInternalToken } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!isInternalToken(token)) {
    return NextResponse.json({ ok: true });
  }

  let db: "ok" | "down" | "off" = "off";
  if (isDbConfigured()) {
    db = (await tryQuery("SELECT 1")) ? "ok" : "down";
  }
  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    db,
    timestamp: new Date().toISOString(),
  });
}
