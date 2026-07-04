// lib/auth/guard.ts
// -----------------------------------------------------------------------------
// Shared authorization guard for admin API routes.
// Returns a NextResponse to short-circuit, or null when the request may proceed.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isAdminConfigured, adminMissingVars } from "@/lib/env";
import { getAdminSession } from "@/lib/auth/admin";

/** 503 if admin isn't configured, 401 if not authenticated, else null. */
export async function guardAdmin(): Promise<NextResponse | null> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "admin_not_configured", missing: adminMissingVars() },
      { status: 503 },
    );
  }
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
