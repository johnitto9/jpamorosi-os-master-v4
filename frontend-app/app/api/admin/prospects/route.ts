// app/api/admin/prospects/route.ts
// Admin surface of the prospecting dragnet (lib/agent/prospects.ts).
//   GET               -> { prospects }               (kanban data)
//   POST {action}     -> "ingest"  { text }          drop an email/raw text
//                        "process" { limit? }        advance a pipeline batch
//                        "stage"   { id, stage }     manual move (contacted/discard)
// Session-cookie admin auth (same guard as the rest of the backoffice).
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { isDbConfigured } from "@/lib/db/pool";
import {
  listProspects,
  ingestDroppedText,
  processPipelineBatch,
  setProspectStage,
} from "@/lib/agent/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // a process batch may hold serper + LLM calls

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ingest"), text: z.string().min(10).max(20000) }),
  z.object({ action: z.literal("process"), limit: z.number().int().min(1).max(12).optional() }),
  z.object({
    action: z.literal("stage"),
    id: z.number().int().positive(),
    stage: z.enum(["contact", "contacted", "discarded"]),
  }),
]);

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({
    ok: true,
    dbOn: isDbConfigured(),
    prospects: await listProspects(),
  });
}

export async function POST(request: Request) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === "ingest") {
    const prospect = await ingestDroppedText(body.text);
    if (!prospect) {
      return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, prospect });
  }

  if (body.action === "process") {
    const report = await processPipelineBatch(body.limit ?? 6);
    return NextResponse.json({ ok: true, ...report });
  }

  const moved = await setProspectStage(body.id, body.stage);
  return NextResponse.json(moved ? { ok: true } : { error: "not_moved" }, {
    status: moved ? 200 : 400,
  });
}
