// app/api/admin/media/route.ts
// Admin-only hero video upload + transcode (F2). Saves the upload to the durable
// volume and uses ffmpeg (present in the Docker image) to produce a web-optimized
// 720p MP4 (H.264, no audio, faststart) + a WebP poster. Updates site settings.
//
// Guards: admin auth + a writable storage driver (local-json). On serverless /
// static (Vercel) this is intentionally unavailable. Cloudflare offload is a
// future step — for now everything runs in-container.
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { guardAdmin } from "@/lib/auth/guard";
import { getProjectRepository } from "@/lib/projects/repository";
import {
  ensureMediaDir,
  getSiteSettings,
  saveSiteSettings,
} from "@/lib/media/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 250 * 1024 * 1024; // 250 MB upload cap

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", (e) =>
      reject(new Error(`ffmpeg not available: ${(e as Error).message}`)),
    );
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-400)}`)),
    );
  });
}

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  if (!getProjectRepository().writable) {
    return NextResponse.json(
      { error: "read_only", message: "Media upload requires a writable driver (PROJECT_STORAGE_DRIVER=local-json)." },
      { status: 409 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }

  const dir = await ensureMediaDir();
  const tmp = path.join(dir, `upload-${Date.now()}.src`);
  const mp4 = path.join(dir, "hero.mp4");
  const poster = path.join(dir, "hero-poster.webp");

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmp, buf);

    // 720p, drop audio, fast-start for web streaming
    await runFfmpeg([
      "-i", tmp,
      "-an",
      "-vf", "scale=-2:720",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "26",
      "-movflags", "+faststart",
      mp4,
    ]);
    // poster frame
    await runFfmpeg(["-i", mp4, "-frames:v", "1", "-q:v", "3", poster]);

    const heroVideo = {
      mp4: "/api/media/hero.mp4",
      poster: "/api/media/hero-poster.webp",
      updatedAt: new Date().toISOString(),
    };
    const settings = await getSiteSettings();
    await saveSiteSettings({ ...settings, heroVideo });

    return NextResponse.json({ ok: true, heroVideo });
  } catch (e) {
    return NextResponse.json(
      { error: "transcode_failed", message: (e as Error).message },
      { status: 500 },
    );
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

export async function DELETE(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;
  const settings = await getSiteSettings();
  await saveSiteSettings({ ...settings, heroVideo: undefined });
  return NextResponse.json({ ok: true });
}
