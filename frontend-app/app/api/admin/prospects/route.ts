// app/api/admin/prospects/route.ts
// Admin surface of the prospecting dragnet (lib/agent/prospects.ts).
//   GET               -> { prospects }               (kanban data)
//   POST {action}     -> "ingest"  { text }          drop an email/raw text
//                        "process" { limit? }        advance a pipeline batch
//                        "stage"   { id, stage }     manual move (contacted/discard)
//                        "outreach"{ id }            send tracked outbound email
// Session-cookie admin auth (same guard as the rest of the backoffice).
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { isDbConfigured } from "@/lib/db/pool";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/service";
import { getSiteSettings } from "@/lib/media/store";
import {
  getProspect,
  listBoardProspects,
  listProspects,
  listMailingCandidates,
  ingestDroppedText,
  markProspectOutreachSent,
  processPipelineBatch,
  prospectStats,
  setProspectStage,
  buildProspectOutreachData,
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
  z.object({
    action: z.literal("outreach"),
    id: z.number().int().positive(),
    body: z.string().min(40).max(2400).optional(),
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

function toJsonl(rows: Prospect[]): string {
  return rows.map((p) => JSON.stringify(p)).join("\n");
}

export async function GET(request: Request) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const scope = url.searchParams.get("scope");

  // ?format=csv -> download the mailing DB (qualified prospects with an email)
  if (format === "csv") {
    const rows = scope === "all" ? await listProspects(10_000) : await listMailingCandidates();
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${scope === "all" ? "prospects-snapshot" : "mailing-candidates"}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  // ?format=jsonl&scope=all -> simple append/file-friendly snapshot for large
  // daily bags. The UI should stay card-light; files can be huge.
  if (format === "jsonl") {
    const jsonl = toJsonl(await listProspects(10_000));
    return new NextResponse(jsonl, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "content-disposition": `attachment; filename="prospects-snapshot-${new Date()
          .toISOString()
          .slice(0, 10)}.jsonl"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    dbOn: isDbConfigured(),
    stats: await prospectStats(),
    prospects: await listBoardProspects(),
  });
}

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
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

  if (body.action === "outreach") {
    const prospect = await getProspect(body.id);
    if (!prospect) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (prospect.stage !== "contact") {
      return NextResponse.json({ error: "not_contact_stage" }, { status: 409 });
    }
    if (!prospect.email) {
      return NextResponse.json({ error: "missing_email" }, { status: 409 });
    }

    // Single coherent generator — language, subject, body and chrome all derive
    // from the same stored signals, so manual and autonomous paths never drift.
    const settings = await getSiteSettings();
    const outreach = buildProspectOutreachData(prospect, env.NEXT_PUBLIC_SITE_URL, {
      visualUrl: settings.interludes?.proof1,
    });
    const sent = await sendEmail({
      template: "prospect_outreach",
      to: prospect.email,
      data: {
        ...outreach,
        body: body.body?.trim() || outreach.body,
      },
      tracking: {
        prospectId: prospect.id,
        campaign: "prospect_outreach",
      },
    });

    if (!sent.ok || sent.skipped) {
      return NextResponse.json(
        { error: sent.error ?? "email_not_sent", skipped: sent.skipped === true },
        { status: sent.skipped ? 503 : 502 },
      );
    }

    const marked = await markProspectOutreachSent(prospect.id, sent.id);
    return NextResponse.json(marked ? { ok: true, providerId: sent.id } : { error: "not_marked" }, {
      status: marked ? 200 : 409,
    });
  }

  const moved = await setProspectStage(body.id, body.stage);
  return NextResponse.json(moved ? { ok: true } : { error: "not_moved" }, {
    status: moved ? 200 : 400,
  });
}
