// app/api/admin/track-link/route.ts
// Admin mints a trackable link to paste into an outreach email. Given a target
// URL (+ optional lead/prospect/campaign) it returns a jpamorosi.dev/api/track
// URL whose clicks are recorded and attributed. This is how the outbound loop
// closes: harvested email (prospects) → email with tracked link → click shows
// up in events/dossier → the lead is no longer orphaned.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { createTrackedLink, type TrackedLinkInput } from "@/lib/email/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  target: z.string().url().max(500),
  campaign: z.string().max(60).optional(),
  leadId: z.number().int().positive().optional(),
  prospectId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const link = await createTrackedLink(parsed.data as TrackedLinkInput);
  if (!link) return NextResponse.json({ error: "mint_failed" }, { status: 502 });
  return NextResponse.json({ ok: true, ...link });
}
