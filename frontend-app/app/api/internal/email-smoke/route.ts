// app/api/internal/email-smoke/route.ts — protected smoke test for the real
// email renderer/transport path. This never enables autonomous lead outreach.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardInternal } from "@/lib/auth/internal";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/service";
import { templates } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TEST_EMAIL = "jpamorosi14@gmail.com";

const bodySchema = z.object({
  to: z.string().email().default(DEFAULT_TEST_EMAIL),
  leadEmail: z.string().email().default(DEFAULT_TEST_EMAIL),
});

function buildLeadReceivedData(input: z.infer<typeof bodySchema>) {
  const adminUrl = new URL("/admin/leads", env.NEXT_PUBLIC_SITE_URL).toString();
  return {
    name: "Lucia Torres",
    email: input.leadEmail,
    phone: "+54 9 11 5555-0142",
    company: "Northstar AI Operations",
    budget: "USD 6k-10k MVP discovery",
    need:
      "Queremos automatizar la calificacion de leads, priorizar oportunidades y conectar el CRM con un asistente operativo.",
    stage: "smoke-test-company-interest",
    score: 87,
    sessionId: `smoke-${Date.now()}`,
    adminUrl,
  };
}

function hasJsonArtifacts(rendered: { html: string; text: string }) {
  const sample = `${rendered.html}\n${rendered.text}`;
  return /(\{\\?"|\\?"[a-zA-Z0-9_]+\\?":|\[\s*\{)/.test(sample);
}

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
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = buildLeadReceivedData(parsed.data);
  const rendered = templates.lead_received(data);
  const result = await sendEmail({
    template: "lead_received",
    to: parsed.data.to,
    data,
  });

  return NextResponse.json({
    ok: result.ok,
    skipped: result.skipped ?? false,
    error: result.error,
    providerId: result.id,
    template: "lead_received",
    to: parsed.data.to,
    leadEmail: parsed.data.leadEmail,
    subject: rendered.subject,
    textPreview: rendered.text.slice(0, 700),
    htmlHasJsonArtifacts: hasJsonArtifacts(rendered),
  });
}
