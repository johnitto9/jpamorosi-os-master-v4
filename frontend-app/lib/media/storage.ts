// lib/media/storage.ts
// -----------------------------------------------------------------------------
// storageService — one write path for every uploaded asset.
//
//   R2 configured (R2_* env)  -> uploads to Cloudflare R2 (S3-compatible) and
//                                returns the public URL (R2_PUBLIC_BASE_URL/key,
//                                or the endpoint path as fallback).
//   otherwise                 -> durable local volume (mediaDir()/uploads),
//                                served by /api/media/[...path].
//
// Errors are logged WITHOUT secrets (no keys, no signed params) and fall back
// to local storage so an R2 outage never blocks the admin. Emits
// storage.r2.uploaded / storage.local.uploaded events.
// -----------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import path from "node:path";
import { env, isR2Configured } from "@/lib/env";
import { ensureMediaDir } from "@/lib/media/store";
import { recordEvent } from "@/lib/events";

export type StoredFile = {
  url: string;
  storage: "r2" | "local";
  key: string;
  bytes: number;
};

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

async function storeR2(key: string, buf: Buffer): Promise<StoredFile> {
  // dynamic import keeps the SDK out of every other route's bundle
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    },
  });
  const ext = path.extname(key).toLowerCase();
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buf,
      ContentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
    }),
  );
  const base = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const url = base
    ? `${base}/${key}`
    : `${env.R2_ENDPOINT?.replace(/\/$/, "")}/${env.R2_BUCKET_NAME}/${key}`;
  await recordEvent("storage.r2.uploaded", { key, bytes: buf.length });
  return { url, storage: "r2", key, bytes: buf.length };
}

async function storeLocal(key: string, buf: Buffer): Promise<StoredFile> {
  const root = await ensureMediaDir();
  const full = path.join(root, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  await recordEvent("storage.local.uploaded", { key, bytes: buf.length });
  return { url: `/api/media/${key}`, storage: "local", key, bytes: buf.length };
}

/** Store a file under `key` (e.g. "uploads/123-hero.webp"). Never throws for
 *  an R2 failure — logs (secret-free) and falls back to the local volume. */
export async function storeFile(key: string, buf: Buffer): Promise<StoredFile> {
  if (isR2Configured()) {
    try {
      return await storeR2(key, buf);
    } catch (err) {
      console.error(
        `[storage] R2 upload failed for ${key} (falling back to local):`,
        (err as Error).message.slice(0, 200),
      );
    }
  }
  return storeLocal(key, buf);
}
