// app/api/media/[...path]/route.ts
// PUBLIC read-only media server (hero video, poster). Serves files from the
// media dir on the durable volume. Supports HTTP range for video seeking.
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { safeMediaPath } from "@/lib/media/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const name = (parts ?? []).join("/");
  const full = safeMediaPath(name);
  if (!full) return NextResponse.json({ error: "bad_path" }, { status: 400 });

  let stat;
  try {
    stat = await fs.stat(full);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const type = TYPES[ext] ?? "application/octet-stream";
  const size = stat.size;
  const range = request.headers.get("range");

  const data = await fs.readFile(full);
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    const chunk = new Uint8Array(data.subarray(start, end + 1));
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunk.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
