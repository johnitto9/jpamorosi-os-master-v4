// app/admin/pipeline/page.tsx
// Kanban view of the funnel: leads flow AUTOMATICALLY between columns because
// the stage is computed by code (playbooks.ts) from captured facts — the
// board IS the state machine, no manual dragging needed at this scale.

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { isDbConfigured } from "@/lib/db/pool";
import { listLeads, type Lead } from "@/lib/agent/leads";

export const dynamic = "force-dynamic";

const COLUMNS: Array<{ stage: string; label: string; color: string }> = [
  { stage: "discover", label: "Discover", color: "rgba(255,255,255,0.35)" },
  { stage: "qualify", label: "Qualify", color: "#8b5cf6" },
  { stage: "propose", label: "Propose", color: "#00f2ff" },
  { stage: "close", label: "Close 🔥", color: "#34d399" },
];

function LeadCard({ lead }: { lead: Lead & { messages: number } }) {
  return (
    <Link
      href={lead.sessionId ? `/admin/sessions/${lead.sessionId}` : "/admin/leads"}
      className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-cyan-400/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">
          {lead.name || lead.company || lead.email || "Anonymous"}
        </p>
        <span className="shrink-0 font-mono text-[10px] text-cyan-300">{lead.score}</span>
      </div>
      {lead.company && lead.name && (
        <p className="mt-0.5 truncate text-xs text-white/50">{lead.company}</p>
      )}
      {lead.need && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-white/60">{lead.need}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
        <span>{lead.messages} msgs · {lead.source}</span>
        <span>{lead.updatedAt?.slice(5, 10)}</span>
      </div>
    </Link>
  );
}

export default async function AdminPipeline() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const leads = isDbConfigured() ? await listLeads(200) : [];

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline — inbound</h1>
          <p className="mt-1 text-sm text-white/50">
            Funnel comercial <span className="text-white/70">inbound</span>: gente que ya te escribió. Las cards avanzan solas porque la
            stage la calcula el código desde los hechos capturados (no se
            arrastran). Click en una card → sesión completa.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/sessions" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            Sessions
          </Link>
          <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            ← Backoffice
          </Link>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.stage === col.stage);
          return (
            <section
              key={col.stage}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2
                  className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: col.color }}
                >
                  {col.label}
                </h2>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                  {items.length}
                </span>
              </header>
              <div className="space-y-2.5">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-white/25">empty</p>
                ) : (
                  items.map((l) => <LeadCard key={l.id} lead={l} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
