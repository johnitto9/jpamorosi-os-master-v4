// lib/auth/guard.ts
// -----------------------------------------------------------------------------
// Shared authorization guard for admin API routes.
// Returns a NextResponse to short-circuit, or null when the request may proceed.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isAdminConfigured, adminMissingVars, env } from "@/lib/env";
import { getAdminSession } from "@/lib/auth/admin";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF defense-in-depth on top of the SameSite=Lax session cookie: a state-
 *  changing request whose Origin host differs from the host it's actually
 *  hitting (or the canonical site) is a cross-site forgery. Compares against the
 *  REQUEST host — not a fixed URL — so local/docker admin is never locked out.
 *  A missing Origin (same-origin fetches, native clients) is allowed. */
function originOk(request: Request): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const hostHeader = request.headers.get("host") ?? "";
    let siteHost = "";
    try { siteHost = new URL(env.NEXT_PUBLIC_SITE_URL).host; } catch { /* ignore */ }
    return originHost === hostHeader || (siteHost !== "" && originHost === siteHost);
  } catch {
    return false;
  }
}

/** 503 if admin isn't configured, 403 on cross-site mutation (when `request` is
 *  passed), 401 if not authenticated, else null. Pass `request` from mutation
 *  routes (POST/PUT/PATCH/DELETE) to enable the origin check. */
export async function guardAdmin(request?: Request): Promise<NextResponse | null> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "admin_not_configured", missing: adminMissingVars() },
      { status: 503 },
    );
  }
  if (request && !originOk(request)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
