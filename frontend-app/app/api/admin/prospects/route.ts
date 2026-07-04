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
  listMailingCandidates,
  ingestDroppedText,
  processPipelineBatch,
  setProspectStage,
  type Prospect,
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

const CSV_COLS: Array<[string, (p: Prospect) => unknown]> = [
  ["email", (p) => p.email],
  ["contactName", (p) => p.contactName],
  ["company", (p) => p.company],
  ["title", (p) => p.title],
  ["score", (p) => p.score],
  ["stage", (p) => p.stage],
  ["fitReason", (p) => p.fitReason],
  ["nextAction", (p) => p.nextAction],
  ["url", (p) => p.url],
  ["createdAt", (p) => p.createdAt],
];

/** RFC-4180-ish CSV: quote every field, double internal quotes. */
function toCsv(rows: Prospect[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = CSV_COLS.map(([name]) => esc(name)).join(",");
  const body = rows.map((p) => CSV_COLS.map(([, get]) => esc(get(p))).join(","));
  return [header, ...body].join("\r\n");
}

export async function GET(request: Request) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  // ?format=csv -> download the mailing DB (qualified prospects with an email)
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const csv = toCsv(await listMailingCandidates());
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="mailing-candidates-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

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
