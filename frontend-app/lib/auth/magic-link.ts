// lib/auth/magic-link.ts
// -----------------------------------------------------------------------------
// Passwordless admin sign-in (single allowed identity: ADMIN_EMAIL).
//
// Token design: STATELESS HMAC (same secret as the session cookie) so it
// works even without a DB — payload {email, exp, nonce} signed with
// ADMIN_SESSION_SECRET, 15 minute expiry. When Postgres is up we ALSO track
// redemption in magic_link_tokens (sha256 of the token) to enforce single
// use; without a DB the only guard is the short expiry (documented risk).
// No new dependencies — Node crypto only, mirroring lib/auth/admin.ts.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import { env } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export const MAGIC_LINK_TTL_MINUTES = 15;

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Emails allowed to receive an admin magic link. ADMIN_EMAIL accepts a
 *  comma-separated list (e.g. primary + the Resend-account address while the
 *  domain is unverified and Resend test mode only delivers to it). */
export function isAllowedAdminEmail(email: string): boolean {
  const allowed = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.trim().toLowerCase());
}

/** Create a signed, expiring magic-link token for the admin email. */
export async function createMagicToken(email: string): Promise<string> {
  const payloadObj = {
    e: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + MAGIC_LINK_TTL_MINUTES * 60,
    n: crypto.randomBytes(12).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const token = `${payload}.${sign(payload, env.ADMIN_SESSION_SECRET ?? "")}`;

  // best-effort single-use registry
  if (isDbConfigured()) {
    try {
      await ensureSchema();
      await tryQuery(
        `INSERT INTO magic_link_tokens (email, token_hash, expires_at)
         VALUES ($1, $2, to_timestamp($3))`,
        [payloadObj.e, sha256(token), payloadObj.exp],
      );
    } catch {
      /* stateless token still works */
    }
  }
  return token;
}

export type MagicVerify =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Verify signature + expiry, and burn the token if the DB is available. */
export async function verifyMagicToken(token: string): Promise<MagicVerify> {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return { ok: false, reason: "invalid" };

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "invalid" };
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "invalid" };
  }

  let obj: { e?: string; exp?: number };
  try {
    obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof obj.e !== "string" || !isAllowedAdminEmail(obj.e)) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof obj.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }

  // single-use enforcement (only possible with a DB)
  if (isDbConfigured()) {
    try {
      await ensureSchema();
      const res = await tryQuery<{ id: number }>(
        `UPDATE magic_link_tokens SET used_at = now()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING id`,
        [sha256(token)],
      );
      // row existed but was already used/expired -> reject; row missing (DB was
      // down at creation) -> accept on signature+expiry alone
      if (res && res.rows.length === 0) {
        const known = await tryQuery<{ id: number }>(
          `SELECT id FROM magic_link_tokens WHERE token_hash = $1`,
          [sha256(token)],
        );
        if (known && known.rows.length > 0) return { ok: false, reason: "used" };
      }
    } catch {
      /* degrade to stateless verification */
    }
  }

  return { ok: true, email: obj.e };
}
