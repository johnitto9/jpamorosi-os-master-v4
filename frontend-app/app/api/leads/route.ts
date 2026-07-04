// app/api/leads/route.ts — public lead intake (contact forms, integrations).
// Requires at least one way to identify/reach the lead. Notifies the admin.
import { NextResponse } from "next/server";
import { z } from "zod";
import { insertLead, leadPatchSchema } from "@/lib/agent/leads";
import { recordEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/email/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = leadPatchSchema.extend({
  source: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { source, ...patch } = parsed.data;
  if (!patch.email && !patch.phone && !patch.need) {
    return NextResponse.json(
      { error: "empty_lead", message: "Provide at least email, phone or need." },
      { status: 422 },
    );
  }

  const id = await insertLead(patch, source ?? "api");
  await recordEvent("lead.created", { source: source ?? "api", id });
  await notifyAdmin("lead_received", patch);
  return NextResponse.json({ ok: true, id });
}
