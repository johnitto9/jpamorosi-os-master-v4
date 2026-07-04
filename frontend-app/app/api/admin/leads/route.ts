// app/api/admin/leads/route.ts
// GET  -> leads JSON (admin session required).
// POST -> insert a standalone lead (no session) — used by the prospect
//         board's "promote to lead" action and by future manual imports.
//         The body is validated by leadPatchSchema (lib/agent/leads.ts);
//         empty strings are stripped before insert so existing rows are
//         never overwritten with blanks.
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { insertLead, leadPatchSchema, listLeads } from "@/lib/agent/leads";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, leads: await listLeads(200) });
}

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const parsed = leadPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  // `source` travels in a header so the body schema stays strict;
  // admin/manual imports + prospect promotions both flow through here.
  const source = request.headers.get("x-lead-source")?.slice(0, 80) ?? "admin_manual";

  const id = await insertLead(parsed.data, source);
  if (id === null) {
    return NextResponse.json({ error: "db_unavailable_or_empty" }, { status: 503 });
  }

  await recordEvent("lead.created", { id, source, fields: Object.keys(parsed.data) });
  return NextResponse.json({ ok: true, id });
}