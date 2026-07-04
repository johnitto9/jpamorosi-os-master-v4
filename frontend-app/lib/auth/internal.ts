// lib/auth/internal.ts
// Bearer-token guard for /api/internal/* — service-to-service surface for the
// future Amorosi Labs ecosystem (BuenPick, BBN, Codes4All). Accepts either
// INTERNAL_API_TOKEN or SERVICE_API_TOKEN. When neither is configured the
// whole internal surface is OFF (503), never open.

import { NextResponse } from "next/server";
import { isInternalToken, env } from "@/lib/env";

/** Returns a blocking response, or null when the caller may proceed. */
export function guardInternal(request: Request): NextResponse | null {
  if (!env.INTERNAL_API_TOKEN && !env.SERVICE_API_TOKEN) {
    return NextResponse.json(
      { error: "internal_api_disabled", message: "Set INTERNAL_API_TOKEN to enable /api/internal." },
      { status: 503 },
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!isInternalToken(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
