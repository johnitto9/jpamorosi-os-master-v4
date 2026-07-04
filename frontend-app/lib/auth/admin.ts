// lib/auth/admin.ts
// -----------------------------------------------------------------------------
// Admin authentication (credentials + signed HTTP-only session cookie).
// Uses Node's built-in crypto only — no new dependency.
//
// Password hash format (ADMIN_PASSWORD_HASH):  scrypt:<saltHex>:<hashHex>
//   Generate: node scripts/generate-admin-hash.mjs "password"
// Session cookie: base64url(payload) . base64url(HMAC-SHA256(payload, secret))
//
// Server-only. Never import from a client component.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env, isAdminConfigured } from "@/lib/env";

export const ADMIN_COOKIE = "amorosi_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// --- password ---------------------------------------------------------------

function timingSafeEqualBuf(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Verify a plaintext password against a stored scrypt hash. */
export function verifyPassword(password: string, stored?: string): boolean {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = crypto.scryptSync(password, salt, expected.length);
  return timingSafeEqualBuf(actual, expected);
}

/** Verify username + password against configured admin credentials. */
export function verifyCredentials(username: string, password: string): boolean {
  if (!isAdminConfigured()) return false;
  const expectedUser = env.ADMIN_USERNAME ?? "";
  const userOk = timingSafeEqualBuf(
    Buffer.from(username),
    Buffer.from(expectedUser),
  );
  const passOk = verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  // Evaluate both regardless of short-circuit to keep timing stable-ish.
  return userOk && passOk;
}

// --- session token ----------------------------------------------------------

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken(username: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payloadObj = { u: username, exp };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const secret = env.ADMIN_SESSION_SECRET ?? "";
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the username if the token is valid and unexpired, else null. */
export function verifyToken(token?: string): string | null {
  if (!token) return null;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);
  if (!timingSafeEqualBuf(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof obj?.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return typeof obj?.u === "string" ? obj.u : null;
  } catch {
    return null;
  }
}

// --- cookie helpers (route handlers / server components) ---------------------

/** Read the current admin username from the session cookie, or null. */
export async function getAdminSession(): Promise<string | null> {
  if (!isAdminConfigured()) return null;
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/** True when the caller is an authenticated admin. */
export async function isAuthenticated(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** Set the session cookie after a successful login (route handler only). */
export async function setSessionCookie(username: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, createToken(username), {
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
