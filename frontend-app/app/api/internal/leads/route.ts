// app/api/internal/leads/route.ts — POST: create a lead from another service.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardInternal } from "@/lib/auth/internal";
import { insertLead, leadPatchSchema } from "@/lib/agent/leads";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = leadPatchSchema.extend({ source: z.string().max(60).optional() });

export async function POST(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
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
  const id = await insertLead(patch, source ?? "internal");
  await recordEvent("lead.created", { source: source ?? "internal", id });
  return NextResponse.json({ ok: true, id });
}
