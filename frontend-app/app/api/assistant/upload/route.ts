// app/api/assistant/upload/route.ts
// PUBLIC image intake for the chat (visitor shares a screenshot/reference).
// Guards: al_sid session cookie required, images only, 10 MB, max 5 per
// session (same media dir the mockups use: media/sessions/<sid>/).
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureMediaDir } from "@/lib/media/store";
import { recordEvent } from "@/lib/events";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_SESSION = 5;

export async function POST(request: Request) {
  // per-IP burst guard on the public intake
  const limited = await rateLimited(request, "assistant-upload", 10, 10 * 60_000);
  if (limited) return limited;

  const cookie = request.headers.get("cookie") ?? "";
  const existing = cookie.match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  // an image can be the visitor's FIRST interaction — mint the session here
  // exactly like /api/assistant does
  const sid = existing && UUID_RE.test(existing) ? existing : randomUUID();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  const ext = path.extname(file.name || "").toLowerCase();
  if (!IMAGE_EXT.has(ext)) {
    return NextResponse.json({ error: "images_only" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }

  const root = await ensureMediaDir();
  const dir = path.join(root, "sessions", sid);
  await fs.mkdir(dir, { recursive: true });
  const sharedCount = (await fs.readdir(dir)).filter((f) => f.startsWith("shared-")).length;
  if (sharedCount >= MAX_PER_SESSION) {
    return NextResponse.json({ error: "session_limit" }, { status: 429 });
  }

  const name = `shared-${Date.now()}${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const url = `/api/media/sessions/${sid}/${name}`;
  await recordEvent("media.uploaded", { via: "chat", sessionId: sid, bytes: file.size });

  const res = NextResponse.json({ ok: true, url });
  if (!existing || existing !== sid) {
    res.cookies.set("al_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }
  return res;
}
