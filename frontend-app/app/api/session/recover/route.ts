// app/api/session/recover/route.ts
// GET ?code=... -> validates the signed recovery code and re-issues the
// al_sid cookie for that session on THIS device, then sends the visitor home.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { touchSession } from "@/lib/agent/memory";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const home = new URL("/", env.NEXT_PUBLIC_SITE_URL);
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const dot = code.lastIndexOf(".");
  if (dot <= 0 || !env.ADMIN_SESSION_SECRET) return NextResponse.redirect(home);

  const payload = code.slice(0, dot);
  const expected = crypto
    .createHmac("sha256", env.ADMIN_SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  const sig = Buffer.from(code.slice(dot + 1));
  if (sig.length !== Buffer.from(expected).length || !crypto.timingSafeEqual(sig, Buffer.from(expected))) {
    return NextResponse.redirect(home);
  }

  let obj: { s?: string; exp?: number };
  try {
    obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(home);
  }
  if (
    typeof obj.s !== "string" ||
    !UUID_RE.test(obj.s) ||
    typeof obj.exp !== "number" ||
    obj.exp < Math.floor(Date.now() / 1000)
  ) {
    return NextResponse.redirect(home);
  }

  await touchSession(obj.s, { recoveredAt: new Date().toISOString() });
  await recordEvent("session.started", { sessionId: obj.s, via: "recovery" });

  const res = NextResponse.redirect(home);
  res.cookies.set("al_sid", obj.s, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}
