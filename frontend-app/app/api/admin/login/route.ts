// app/api/admin/login/route.ts — POST { username, password } -> sets session cookie
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminConfigured, adminMissingVars } from "@/lib/env";
import { verifyCredentials, setSessionCookie } from "@/lib/auth/admin";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "admin_not_configured", missing: adminMissingVars() },
      { status: 503 },
    );
  }

  // brute-force guard: 8 attempts / 10 min per IP (T07, spec 17)
  const limited = rateLimited(request, "admin-login", 8, 10 * 60_000);
  if (limited) return limited;

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

  const { username, password } = parsed.data;
  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await setSessionCookie(username);
  return NextResponse.json({ ok: true });
}
