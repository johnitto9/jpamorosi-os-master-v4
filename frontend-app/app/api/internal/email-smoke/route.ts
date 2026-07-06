// app/api/internal/email-smoke/route.ts — protected smoke test for the real
// email renderer/transport path. This never enables autonomous lead outreach.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardInternal } from "@/lib/auth/internal";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/service";
import { templates } from "@/lib/email/templates";
import {
  buildProspectOutreachData,
  detectProspectLang,
  type Prospect,
} from "@/lib/agent/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ADMIN_EMAIL = "jpamorosi14@gmail.com";
const DEFAULT_LEAD_EMAIL = "amorosijp@gmail.com";

const bodySchema = z.object({
  to: z.string().email().default(DEFAULT_ADMIN_EMAIL),
  leadEmail: z.string().email().default(DEFAULT_LEAD_EMAIL),
  mode: z.enum(["admin_only", "full_lead_cycle", "scout_outreach", "showcase"]).default("scout_outreach"),
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
    avatarUrl: "https://media.jpamorosi.dev/uploads/1783349431385-56e26a95-6456-4eac-b8cd-9b02609793a5-1.png",
    lang: "es" as const,
  };
}

// Showcase leads — built as real Prospect objects so the SAME path that processes
// autonomous scout leads (detectProspectLang → buildProspectOutreachData) decides
// the language. This proves the coherence principle: the stored signals drive the
// email language, not a hardcoded flag.
function buildShowcaseLeads(): Prospect[] {
  const base = {
    stage: "contact" as const,
    source: "scout",
    score: 80,
    email: null,
    contactName: null,
    url: null,
    raw: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [
    {
      ...base,
      id: 1,
      title: "Buscamos AI Engineer para automatizar clasificacion de leads",
      company: "Dataflow Labs",
      snippet:
        "B2B SaaS con CRM manual. Publicaron busqueda para AI Operations Engineer. El pipeline comercial no tiene scoring ni priorizacion automatica.",
      enrichment:
        "El producto tiene onboarding manual y clasificacion de leads hecha a mano. El equipo ya tiene datos de clientes pero no los usa para priorizar.",
      fitReason:
        "Strong overlap: construi sistemas de scoring de leads y automatizacion de CRM que quedan operando en produccion.",
      nextAction:
        "Mirar un flujo concreto de clasificacion o scoring y devolver una propuesta corta.",
    },
    {
      ...base,
      id: 2,
      title: "Startup de media local necesita editorial automation con LLMs",
      company: "Diario Sur",
      snippet:
        "Plataforma de medios locales. Publican contenido editorial manualmente. Buscan reducir costo editorial con IA para clasificar y priorizar noticias.",
      enrichment:
        "El sitio publica contenido sin ranking ni priorizacion automatica. Tienen volumen editorial diario que consume horas de clasificacion manual.",
      fitReason:
        "Adjacent experience: construi agent workflows para editorial automation y ranking de contenido con costo bajo por articulo.",
      nextAction:
        "Revisar un caso de contenido concreto y mostrar como un agent workflow podria clasificar y priorizar.",
    },
    {
      ...base,
      id: 3,
      title: "Fintech busca ingeniero para sistema de trading con LLM y risk management",
      company: "AlphaSignal Capital",
      snippet:
        "Fondo cuantitativo. Tienen datos de mercado pero falta pipeline de backtesting. Quieren una estrategia LLM gobernada por un risk manager estricto.",
      enrichment:
        "El equipo tiene experiencia en finanzas pero no en IA. Necesitan dataset enrichment y backtesting modular con risk gates.",
      fitReason:
        "Useful analogy: tengo R&D en LLM strategy con risk gates y dataset enrichment, pero no es un sistema en produccion — es exploracion.",
      nextAction:
        "Hablar del caso de R&D en trading y ver si el enfoque de risk gates aplica a su flujo.",
    },
    {
      ...base,
      id: 4,
      title: "Looking for a full-stack AI engineer to build production WhatsApp agents",
      company: "Greenfield Commerce",
      snippet:
        "Commerce platform looking to build WhatsApp-first storefronts with AI agents that handle catalog, orders and customer support.",
      enrichment:
        "The team wants a tool-first architecture where the LLM routes intent to deterministic tools. They have a product but no AI infrastructure.",
      fitReason:
        "Direct match: I built a production WhatsApp commerce agent with tool-first architecture that handles catalog and orders.",
      nextAction:
        "Look at a concrete flow from their product and show how a tool-first agent would handle it.",
    },
  ];
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

  if (parsed.data.mode === "showcase") {
    const leads = buildShowcaseLeads();
    const siteUrl = env.NEXT_PUBLIC_SITE_URL;
    const deliveries = [];

    for (const lead of leads) {
      const lang = detectProspectLang(lead);
      const outreach = buildProspectOutreachData(lead, siteUrl);
      const rendered = templates.prospect_outreach(outreach);
      const result = await sendEmail({
        template: "prospect_outreach",
        to: parsed.data.leadEmail,
        data: outreach,
        tracking: { campaign: "email_smoke_showcase" },
        smokeTestBypassOutboundGate: true,
      });
      deliveries.push({
        template: "prospect_outreach",
        to: parsed.data.leadEmail,
        ok: result.ok,
        skipped: result.skipped ?? false,
        error: result.error,
        providerId: result.id,
        subject: rendered.subject,
        detectedLang: lang,
        company: lead.company ?? undefined,
        seed: lead.id,
        htmlHasJsonArtifacts: hasJsonArtifacts(rendered),
        textPreview: rendered.text.slice(0, 600),
      });
    }

    return NextResponse.json({
      ok: deliveries.every((d) => d.ok),
      mode: "showcase",
      leadEmail: parsed.data.leadEmail,
      deliveries,
    });
  }

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
