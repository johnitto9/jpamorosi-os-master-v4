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

export type SiteSettings = {
  heroVideo?: HeroVideo;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(settingsFile(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SiteSettings) : {};
  } catch {
    return {};
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
