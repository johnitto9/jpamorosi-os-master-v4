// app/api/internal/memory/write/route.ts — POST: store a long-term memory item.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardInternal } from "@/lib/auth/internal";
import { writeMemory } from "@/lib/agent/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  content: z.string().min(1).max(4000),
  kind: z.string().max(40).optional(),
  sessionId: z.string().uuid().nullable().optional(),
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
  const ok = await writeMemory(
    parsed.data.content,
    parsed.data.kind ?? "note",
    parsed.data.sessionId ?? null,
  );
  return NextResponse.json({ ok });
}
