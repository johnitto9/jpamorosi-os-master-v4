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
  mode: z.enum(["admin_only", "full_lead_cycle", "scout_outreach"]).default("scout_outreach"),
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

function buildScoutOutreachData(input: z.infer<typeof bodySchema>) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  return {
    company: "Northstar AI Operations",
    contactName: "Lucia",
    body:
      "Vi que estan empujando automatizacion comercial y hiring para operaciones con IA. No te escribo con un pitch generico: el patron que aparece en sus paginas sugiere que estan en el momento exacto donde un sistema chico, bien integrado, puede ahorrar horas de clasificacion, follow-up y priorizacion.\n\nSoy Juan Pablo Amorosi. Construyo productos con agentes reales, Next.js, Postgres, integraciones y backoffices que quedan operando. Si sirve, puedo mirar un flujo puntual y devolverte una propuesta corta con arquitectura, costo y primer experimento medible.",
    siteUrl,
    sourceUrl: "https://example.com/northstar-ai-operations/careers",
    signals: [
      "Publicaron busquedas para AI Operations y Revenue Automation en la ultima ronda de scouting.",
      "La pagina de careers menciona CRM, lead qualification y customer operations como dolores activos.",
      "El sitio muestra un producto B2B con onboarding manual: buen candidato para agentes internos y scoring operativo.",
      "El email fue encontrado en una pagina publica de contacto, no comprado ni inferido.",
    ],
    fitReason:
      "El match es alto porque el problema mezcla producto, automatizacion comercial, datos operativos y agentes IA, justo el tipo de sistema que Juan ya shippea.",
    nextAction:
      "Responder con un flujo operativo concreto para auditar: intake de leads, scoring, CRM o follow-up.",
    visualUrl: new URL("/og.jpg", siteUrl).toString(),
  };
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
  if (parsed.data.mode === "scout_outreach") {
    const outreachData = buildScoutOutreachData(parsed.data);
    const rendered = templates.prospect_outreach(outreachData);
    const result = await sendEmail({
      template: "prospect_outreach",
      to: parsed.data.leadEmail,
      data: outreachData,
      tracking: { campaign: "email_smoke_prospect_outreach" },
      smokeTestBypassOutboundGate: true,
    });
    return NextResponse.json({
      ok: result.ok,
      mode: parsed.data.mode,
      adminTo: parsed.data.to,
      leadEmail: parsed.data.leadEmail,
      deliveries: [
        {
          template: "prospect_outreach",
          to: parsed.data.leadEmail,
          ok: result.ok,
          skipped: result.skipped ?? false,
          error: result.error,
          providerId: result.id,
          subject: rendered.subject,
          htmlHasJsonArtifacts: hasJsonArtifacts(rendered),
          textPreview: rendered.text.slice(0, 1000),
        },
      ],
      htmlHasJsonArtifacts: hasJsonArtifacts(rendered),
    });
  }

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
