// lib/media/image-optimizer.ts
// Server-only image optimization for admin uploads.
//
// Policy:
// - Optimize heavy browser images to WebP (broad web support, faster/lighter
//   than AVIF to encode, much safer operationally for admin uploads).
// - Preserve small/already-efficient files when conversion does not save enough.
// - Never touch GIFs here; animated GIF handling needs a different pipeline.

import path from "node:path";

export type OptimizedImage = {
  buffer: Buffer;
  ext: string;
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
  width?: number;
  height?: number;
  reason: "below_threshold" | "unsupported" | "converted_webp" | "not_smaller" | "error";
};

const OPTIMIZE_THRESHOLD_BYTES = 420 * 1024;
const MAX_DIMENSION = 1800;
const MIN_SAVINGS_RATIO = 0.92;

const OPTIMIZABLE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

export function isOptimizableImageExt(ext: string): boolean {
  return OPTIMIZABLE_EXT.has(ext.toLowerCase());
}

export async function optimizeUploadedImage(input: {
  buffer: Buffer;
  ext: string;
}): Promise<OptimizedImage> {
  const ext = input.ext.toLowerCase();
  const originalBytes = input.buffer.length;

  if (!isOptimizableImageExt(ext)) {
    return keepOriginal(input.buffer, ext, "unsupported");
  }

  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(input.buffer, { animated: false }).rotate();
    const meta = await image.metadata();
    const width = meta.width;
    const height = meta.height;
    const tooLargeDimension =
      typeof width === "number" && typeof height === "number"
        ? Math.max(width, height) > MAX_DIMENSION
        : false;

    if (originalBytes < OPTIMIZE_THRESHOLD_BYTES && !tooLargeDimension) {
      return { ...keepOriginal(input.buffer, ext, "below_threshold"), width, height };
    }

    const optimized = await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        alphaQuality: 90,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer();

    if (optimized.length >= Math.round(originalBytes * MIN_SAVINGS_RATIO)) {
      return {
        ...keepOriginal(input.buffer, ext, "not_smaller"),
        width,
        height,
      };
    }

    return {
      buffer: optimized,
      ext: ".webp",
      optimized: true,
      originalBytes,
      outputBytes: optimized.length,
      width,
      height,
      reason: "converted_webp",
    };
  } catch (err) {
    console.warn("[media] image optimization skipped:", (err as Error).message.slice(0, 160));
    return keepOriginal(input.buffer, ext, "error");
  }
}

function keepOriginal(
  buffer: Buffer,
  ext: string,
  reason: OptimizedImage["reason"],
): OptimizedImage {
  return {
    buffer,
    ext: path.extname(`file${ext}`).toLowerCase() || ext,
    optimized: false,
    originalBytes: buffer.length,
    outputBytes: buffer.length,
    reason,
  };
}
