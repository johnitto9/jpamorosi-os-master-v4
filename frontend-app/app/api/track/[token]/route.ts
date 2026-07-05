// app/api/track/[token]/route.ts
// Public click-tracking redirect. An outbound email link points here; we record
// the click (ties the touch to the lead/prospect) and 302 to the real target.
// No PII in the URL — just an opaque token. Cache-disabled so Cloudflare never
// serves a stale redirect and every click is counted.
import { NextResponse } from "next/server";
import { resolveAndRecordClick } from "@/lib/email/tracking";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const home = env.NEXT_PUBLIC_SITE_URL;

  const link = token ? await resolveAndRecordClick(token) : null;
  // unknown/expired token or DB down → send them to the home, never error out
  const target = link?.targetUrl ?? home;
  const response = NextResponse.redirect(target, { status: 302, headers: NO_STORE });
  if (link?.sessionId) {
    const secure = new URL(request.url).protocol === "https:";
    response.cookies.set("al_sid", link.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
