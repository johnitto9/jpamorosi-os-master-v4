// lib/media/resolve.ts
// Media URL resolver — the single seam for the future Cloudflare switch.
// Safe in both server and client components (only reads NEXT_PUBLIC_* env).
//
// Today: every asset path stays local ("/imgs/...", "/api/media/...").
// Tomorrow (Cloudflare): set the env vars below and every image/video the UI
// renders is served from R2/Stream — no component changes.
//
//   NEXT_PUBLIC_MEDIA_CDN_BASE   e.g. https://media.amorosilabs.com
//                                (Cloudflare R2 bucket behind a custom domain,
//                                 or Cloudflare Images delivery URL)
//   NEXT_PUBLIC_VIDEO_CDN_BASE   e.g. https://customer-<id>.cloudflarestream.com
//                                (Cloudflare Stream; falls back to MEDIA base)
//
// Contract: absolute URLs (http/https/data:) pass through untouched, so a
// project can already store a full Cloudflare URL today and it just works.

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE ?? "";
const VIDEO_BASE = process.env.NEXT_PUBLIC_VIDEO_CDN_BASE ?? MEDIA_BASE;

function isAbsolute(src: string): boolean {
  return /^(https?:)?\/\//.test(src) || src.startsWith("data:") || src.startsWith("blob:");
}

function join(base: string, src: string): string {
  if (!base) return src;
  return `${base.replace(/\/+$/, "")}/${src.replace(/^\/+/, "")}`;
}

/** Resolve an image asset path (heroImage, logo, screenshots, posters). */
export function resolveMediaUrl(src?: string): string | undefined {
  if (!src) return undefined;
  if (isAbsolute(src)) return src;
  return join(MEDIA_BASE, src);
}

/** Resolve a video asset path (heroVideo, background loops). */
export function resolveVideoUrl(src?: string): string | undefined {
  if (!src) return undefined;
  if (isAbsolute(src)) return src;
  return join(VIDEO_BASE, src);
}
