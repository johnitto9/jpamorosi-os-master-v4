// app/admin/email/page.tsx — Outreach Studio. Server shell: admin guard, live
// guardrail state (Resend / outbound gate / DB), the composer catalogue, and an
// optional prospect preload (?prospectId=&template=). The editor + preview run
// client-side in <OutreachStudio/>.
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured, env, outboundLeadEmailsEnabled } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { isDbConfigured } from "@/lib/db/pool";
import { composerCatalogue } from "@/lib/email/composer/registry";
import { getProspect, detectProspectLang, type Prospect } from "@/lib/agent/prospects";
import { OutreachStudio, type StudioPreload } from "@/components/admin/OutreachStudio";

export const dynamic = "force-dynamic";

const clip = (s: string | null | undefined, max: number) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Distribute a prospect's stored signals across the fields of a category with
// criterion — never dump everything into one paragraph.
function preloadFromProspect(p: Prospect, template: string): StudioPreload {
  const lang = detectProspectLang(p);
  const common = {
    lang,
    contactName: clip(p.contactName, 120),
    email: p.email ?? "",
    company: clip(p.company, 160),
  };
  if (template === "opportunity_fit") {
    return {
      template,
      prospectId: p.id,
      data: {
        ...common,
        roleNeed: clip(p.title, 200),
        why: clip(p.snippet, 1200),
        fit: clip(p.fitReason, 1200),
        system: clip(p.enrichment, 1200),
        value: "",
        cta: clip(p.nextAction, 500),
        sourceUrl: p.url ?? "",
        showVisual: true,
      },
    };
  }
  if (template === "warm_followup") {
    return {
      template,
      prospectId: p.id,
      data: {
        ...common,
        context: clip(p.snippet, 1200),
        update: clip(p.fitReason, 1200),
        nextStep: clip(p.nextAction, 800),
        showVisual: false,
      },
    };
  }
  // default: founder_direct
  return {
    template: "founder_direct",
    prospectId: p.id,
    data: {
      ...common,
      title: clip(p.title, 160),
      opening: "",
      observed: clip(p.snippet, 1400),
      reading: clip(p.fitReason, 1400),
      proposal: "",
      proof: "",
      cta: clip(p.nextAction, 500),
      sourceUrl: p.url ?? "",
      showVisual: true,
    },
  };
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ prospectId?: string; template?: string }>;
}) {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const sp = await searchParams;
  const requestedTemplate = sp.template ?? "founder_direct";
  let preload: StudioPreload | null = null;
  if (sp.prospectId) {
    const id = Number.parseInt(sp.prospectId, 10);
    if (Number.isFinite(id) && id > 0) {
      const prospect = await getProspect(id);
      if (prospect) preload = preloadFromProspect(prospect, requestedTemplate);
    }
  }

  const status = {
    resendConfigured: !!env.RESEND_API_KEY && !!env.RESEND_FROM_EMAIL,
    outboundEnabled: outboundLeadEmailsEnabled(),
    dbConfigured: isDbConfigured(),
    adminTo: env.RESEND_ADMIN_TO_EMAIL,
  };

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outreach Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Redactá, previsualizá y enviá un email de outreach por vez. El preview
            usa el mismo renderer que el envío — lo que ves es exactamente lo que
            sale. Human-in-the-loop: sin campañas masivas, sin generación
            automática.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/prospects" className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-400/10">
            Prospects
          </Link>
          <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            ← Backoffice
          </Link>
        </div>
      </header>

      <OutreachStudio
        catalogue={composerCatalogue()}
        status={status}
        preload={preload}
        initialTemplate={requestedTemplate}
      />
    </div>
  );
}
