// app/api/admin/logout/route.ts — POST -> clears session cookie
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
