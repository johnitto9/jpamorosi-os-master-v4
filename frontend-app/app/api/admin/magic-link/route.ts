// app/api/admin/magic-link/route.ts
// POST { email } -> sends a single-use admin sign-in link via Resend.
// Anti-enumeration: ALWAYS answers { ok: true } regardless of the email, and
// only actually sends when it matches ADMIN_EMAIL. Without RESEND_API_KEY the
// link is logged to the server console (controlled dev fallback) and, outside
// production, returned as devLink for local usability.
import { NextResponse } from "next/server";
import { z } from "zod";
import { env, isAdminEnabled, isEmailConfigured } from "@/lib/env";
import {
  createMagicToken,
  isAllowedAdminEmail,
  MAGIC_LINK_TTL_MINUTES,
} from "@/lib/auth/magic-link";
import { sendEmail } from "@/lib/email/service";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().email().max(200) });

export async function POST(request: Request) {
  // magic link needs the session secret (cookie signing) + admin switch
  if (!isAdminEnabled() || !env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = parsed.data.email;
  if (!isAllowedAdminEmail(email)) {
    // same shape as success — reveal nothing about the allowlist
    return NextResponse.json({ ok: true });
  }

  const token = await createMagicToken(email);
  const link = `${env.NEXT_PUBLIC_SITE_URL}/api/admin/verify?token=${encodeURIComponent(token)}`;
  await recordEvent("admin.login.requested", { method: "magic_link" });

  if (isEmailConfigured()) {
    await sendEmail({
      template: "magic_link",
      to: email,
      data: { link, minutes: MAGIC_LINK_TTL_MINUTES },
    });
    return NextResponse.json({ ok: true });
  }

  // Controlled fallback: never a full secret in shared logs — but the link IS
  // the credential here, so it goes to the local server console only.
  console.warn(`[auth] RESEND not configured — magic link (local only): ${link}`);
  return NextResponse.json(
    process.env.NODE_ENV !== "production" ? { ok: true, devLink: link } : { ok: true },
  );
}
