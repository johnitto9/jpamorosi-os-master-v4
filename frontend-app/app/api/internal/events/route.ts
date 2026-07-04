// app/api/internal/events/route.ts — POST: record an event from another
// Amorosi Labs service (bearer INTERNAL_API_TOKEN / SERVICE_API_TOKEN).
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardInternal } from "@/lib/auth/internal";
import { recordEvent, type EventType } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional(),
  actorId: z.string().max(120).nullable().optional(),
});

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
  await recordEvent(
    parsed.data.type as EventType,
    parsed.data.payload ?? {},
    parsed.data.actorId ?? null,
  );
  return NextResponse.json({ ok: true });
}
