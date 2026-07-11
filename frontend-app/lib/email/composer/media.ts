// lib/email/composer/media.ts — server-only. Resolves the profile avatar and
// the secondary proof visual from admin site settings, with the SAME public
// fallbacks the autonomous outreach path uses (lib/agent/prospects.ts). Both
// the preview and send endpoints call this, so media is identical across them.
import { getSiteSettings } from "@/lib/media/store";
import type { ComposerMedia } from "./types";

const PUBLIC_SITE = "https://jpamorosi.dev";

export async function resolveComposerMedia(): Promise<ComposerMedia> {
  const settings = await getSiteSettings();
  return {
    avatarUrl: settings.profileImage ?? new URL("/imgs/img-profile-jpa.jpg", PUBLIC_SITE).toString(),
    visualUrl: settings.interludes?.proof1 ?? new URL("/og.jpg", PUBLIC_SITE).toString(),
  };
}
