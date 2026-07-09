// lib/media/store.ts
// Server-only helpers for media storage + site settings, persisted next to the
// local-json project store (same durable volume). Used by the admin hero-video
// upload/transcode (F2). Never import from a client component.

import { promises as fs } from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const jsonPath = process.env.PROJECTS_JSON_PATH || "./data/projects.json";
  return path.dirname(path.resolve(process.cwd(), jsonPath));
}

export function mediaDir(): string {
  return path.join(dataDir(), "media");
}

function settingsFile(): string {
  return path.join(dataDir(), "settings.json");
}

export type HeroVideo = {
  mp4?: string;
  webm?: string;
  poster?: string;
  updatedAt?: string;
};

// Interlude card images (home scroll scenes). Each is a /api/media or R2 URL
// set from /admin/media; the home reads them via resolveMediaUrl with a static
// fallback. Keys: before1/before2 (BEFORE THE SYSTEMS), proof1 (INSIDE THE
// PROOF), living1 (THE LIVING LAYER).
export type InterludeImages = {
  before1?: string;
  before2?: string;
  proof1?: string;
  living1?: string;
};

export type SiteSettings = {
  heroVideo?: HeroVideo;
  interludes?: InterludeImages;
  profileImage?: string;
};

// Bundled snapshot of the admin-curated settings (profile image, interlude
// media — absolute R2/CDN URLs). Static surfaces (Vercel) have NO writable
// volume, so without this fallback the hero/interludes rendered their bare
// defaults in production. Refresh it when those change in the admin:
//   docker exec <backend> cat /app/data/settings.json  (drop heroVideo)
import bundledSettings from "@/content/site-settings.data.json";

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(settingsFile(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SiteSettings) : {};
  } catch {
    // no volume (Vercel/static builds) -> the bundled admin snapshot
    return bundledSettings as SiteSettings;
  }
}

export async function saveSiteSettings(next: SiteSettings): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${settingsFile()}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, settingsFile());
}

export async function ensureMediaDir(): Promise<string> {
  const dir = mediaDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Prevent path traversal when serving media by name.
export function safeMediaPath(name: string): string | null {
  const clean = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(mediaDir(), clean);
  if (!full.startsWith(mediaDir())) return null;
  return full;
}
