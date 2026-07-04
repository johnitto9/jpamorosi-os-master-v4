// app/api/admin/upload/route.ts
// Generic admin media upload (drag & drop from the project editor). Saves the
// file as-is to the durable media volume under uploads/ and returns a URL the
// existing /api/media server (and the Cloudflare-ready resolver) understands.
// Unlike /api/admin/media (hero video + ffmpeg transcode), this is a plain
// byte store: images and short mp4/webm loops the editor references by path.
import { NextResponse } from "next/server";
import path from "node:path";
import { guardAdmin } from "@/lib/auth/guard";
import { getProjectRepository } from "@/lib/projects/repository";
import { storeFile } from "@/lib/media/storage";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// SVG is deliberately NOT allowed: it can carry <script>/onload XSS and is
// served inline. Re-add only behind a sanitizer (e.g. DOMPurify) if ever needed.
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

/** Magic-byte sniff — trust file CONTENT, not the attacker-controlled name.
 *  Returns the real kind, or null if the bytes match no allowed format. */
function sniffKind(b: Buffer): "image" | "video" | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image"; // PNG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image"; // JPEG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image"; // GIF8
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image"; // WEBP
  if (b.toString("ascii", 4, 8) === "ftyp") {
    // ISO-BMFF: AVIF/HEIC are images, everything else (isom/mp42/…) is mp4 video
    const brand = b.toString("ascii", 8, 12);
    return ["avif", "avis", "mif1", "heic", "heix"].includes(brand) ? "image" : "video";
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video"; // WEBM/Matroska
  return null;
}

function safeName(original: string): { base: string; ext: string } {
  const ext = path.extname(original).toLowerCase();
  const base = path
    .basename(original, path.extname(original))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return { base: base || "file", ext };
}

export async function POST(request: Request) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  if (!getProjectRepository().writable) {
    return NextResponse.json(
      { error: "read_only", message: "Uploads require a writable driver (PROJECT_STORAGE_DRIVER=local-json)." },
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const { base, ext } = safeName(file.name || "file");
  const isImage = IMAGE_EXT.has(ext);
  const isVideo = VIDEO_EXT.has(ext);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "bad_type", message: `Unsupported extension "${ext}". Images: ${[...IMAGE_EXT].join(", ")} — videos: ${[...VIDEO_EXT].join(", ")}.` },
      { status: 415 },
    );
  }
  const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > cap) {
    return NextResponse.json({ error: "too_large", maxBytes: cap }, { status: 413 });
  }

  // Trust CONTENT, not the filename: the real bytes must match the declared
  // kind. Blocks a ".png" that is actually an HTML/SVG/script payload.
  const buf = Buffer.from(await file.arrayBuffer());
  const declared = isVideo ? "video" : "image";
  if (sniffKind(buf) !== declared) {
    return NextResponse.json(
      { error: "content_mismatch", message: `File content is not a valid ${declared}.` },
      { status: 415 },
    );
  }

  // storageService: R2 when configured (R2_* env), durable local volume
  // otherwise — same URL contract either way (docs/storage-r2.md).
  const key = `uploads/${Date.now()}-${base}${ext}`;
  const stored = await storeFile(key, buf);
  await recordEvent("media.uploaded", {
    key: stored.key,
    storage: stored.storage,
    bytes: stored.bytes,
  });

  return NextResponse.json({
    ok: true,
    url: stored.url,
    storage: stored.storage,
    kind: isVideo ? "video" : "image",
    bytes: file.size,
  });
}
