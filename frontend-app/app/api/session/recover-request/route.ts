// app/api/session/recover-request/route.ts
// POST { email } -> if a lead with that email exists, emails a single-use
// signed link that restores their session on any device (leg 4 of the
// loginless identity: total-loss recovery). Anti-enumeration: always {ok}.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { sendEmail } from "@/lib/email/service";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS = 30;

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", env.ADMIN_SESSION_SECRET ?? "no-secret")
    .update(payload)
    .digest("base64url");
}

/** Signed recovery code embedding the session id (30d expiry). */
function makeRecoveryCode(sessionId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ s: sessionId, exp: Math.floor(Date.now() / 1000) + DAYS * 86400 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function POST(request: Request) {
  const parsed = z
    .object({ email: z.string().email().max(200) })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const generic = NextResponse.json({ ok: true }); // reveal nothing

  if (!isDbConfigured() || !env.ADMIN_SESSION_SECRET) return generic;
  try {
    await ensureSchema();
  } catch {
    return generic;
  }
  const res = await tryQuery<{ session_id: string }>(
    `SELECT session_id FROM leads
     WHERE lower(email) = lower($1) AND session_id IS NOT NULL
     ORDER BY updated_at DESC LIMIT 1`,
    [parsed.data.email],
  );
  const sessionId = res?.rows[0]?.session_id;
  if (!sessionId) return generic;

  const link = `${env.NEXT_PUBLIC_SITE_URL}/api/session/recover?code=${encodeURIComponent(makeRecoveryCode(sessionId))}`;
  await sendEmail({
    template: "session_recovery",
    to: parsed.data.email,
    data: { link, days: DAYS },
  });
  await recordEvent("session.started", { sessionId, via: "recovery-request" });
  return generic;
}
