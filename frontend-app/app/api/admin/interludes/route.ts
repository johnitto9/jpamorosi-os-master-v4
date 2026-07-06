// app/api/admin/interludes/route.ts
// Save the home interlude card images (URLs already produced by
// /api/admin/upload → storeFile, R2 or local). Merges into site settings so the
// home reads them via resolveMediaUrl. Admin-guarded; each key optional.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { getSiteSettings, saveSiteSettings } from "@/lib/media/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  before1: z.string().max(500).optional(),
  before2: z.string().max(500).optional(),
  proof1: z.string().max(500).optional(),
  living1: z.string().max(500).optional(),
  profileImage: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const settings = await getSiteSettings();
  // empty string clears a key; undefined leaves it as-is
  const next = { ...(settings.interludes ?? {}) };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "profileImage") continue;
    if (v === "") delete (next as Record<string, string>)[k];
    else (next as Record<string, string>)[k] = v;
  }
  const profileImage =
    parsed.data.profileImage === undefined
      ? settings.profileImage
      : parsed.data.profileImage === ""
        ? undefined
        : parsed.data.profileImage;
  await saveSiteSettings({ ...settings, interludes: next, profileImage });
  return NextResponse.json({ ok: true, interludes: next, profileImage });
}
