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

const DEFAULT_ADMIN_EMAIL = "jpamorosi14@gmail.com";
const DEFAULT_LEAD_EMAIL = "amorosijp@gmail.com";

const bodySchema = z.object({
  to: z.string().email().default(DEFAULT_ADMIN_EMAIL),
  leadEmail: z.string().email().default(DEFAULT_LEAD_EMAIL),
  mode: z.enum(["admin_only", "full_lead_cycle"]).default("full_lead_cycle"),
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

  const leadData = buildLeadReceivedData(parsed.data);
  const adminRendered = templates.lead_received(leadData);
  const adminResult = await sendEmail({
    template: "lead_received",
    to: parsed.data.to,
    data: leadData,
  });
  const deliveries = [
    {
      template: "lead_received",
      to: parsed.data.to,
      ok: adminResult.ok,
      skipped: adminResult.skipped ?? false,
      error: adminResult.error,
      providerId: adminResult.id,
      subject: adminRendered.subject,
      htmlHasJsonArtifacts: hasJsonArtifacts(adminRendered),
      textPreview: adminRendered.text.slice(0, 700),
    },
  ];

  if (parsed.data.mode === "full_lead_cycle") {
    const confirmationData = { name: leadData.name };
    const confirmationRendered = templates.contact_confirmation(confirmationData);
    const confirmationResult = await sendEmail({
      template: "contact_confirmation",
      to: parsed.data.leadEmail,
      data: confirmationData,
    });
    deliveries.push({
      template: "contact_confirmation",
      to: parsed.data.leadEmail,
      ok: confirmationResult.ok,
      skipped: confirmationResult.skipped ?? false,
      error: confirmationResult.error,
      providerId: confirmationResult.id,
      subject: confirmationRendered.subject,
      htmlHasJsonArtifacts: hasJsonArtifacts(confirmationRendered),
      textPreview: confirmationRendered.text.slice(0, 700),
    });
  }

  const ok = deliveries.every((delivery) => delivery.ok);

  return NextResponse.json({
    ok,
    mode: parsed.data.mode,
    adminTo: parsed.data.to,
    leadEmail: parsed.data.leadEmail,
    deliveries,
    htmlHasJsonArtifacts: deliveries.some((delivery) => delivery.htmlHasJsonArtifacts),
  });
}
