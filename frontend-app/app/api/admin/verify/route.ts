// app/api/admin/verify/route.ts
// GET ?token=... -> validates the magic link, burns it (single use when DB is
// up), sets the same signed session cookie password login uses, redirects to
// /admin. Failures redirect to the login page with a readable error code.
import { NextResponse } from "next/server";
import { env, isAdminEnabled } from "@/lib/env";
import { verifyMagicToken } from "@/lib/auth/magic-link";
import { setSessionCookie } from "@/lib/auth/admin";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (code: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${code}`, env.NEXT_PUBLIC_SITE_URL));

  if (!isAdminEnabled() || !env.ADMIN_SESSION_SECRET) return back("not_configured");

  const token = url.searchParams.get("token");
  if (!token) return back("invalid");

  const res = await verifyMagicToken(token);
  if (res.ok !== true) return back(res.reason);

  await setSessionCookie(res.email);
  await recordEvent("admin.login.success", { method: "magic_link" });
  return NextResponse.redirect(new URL("/admin", env.NEXT_PUBLIC_SITE_URL));
}
