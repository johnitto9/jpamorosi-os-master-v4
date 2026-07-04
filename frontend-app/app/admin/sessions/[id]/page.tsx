// app/admin/sessions/[id]/page.tsx — the DOSSIER: one visitor's full story.
// Identity signals (device/ip/country/lang/campaign), lead intel with the
// score breakdown the playbook actually computes, the orbit (pre-projects),
// generated mockups, the activity timeline (events bus) and the transcript.
// Everything on this page fills itself in as the agent learns — no manual entry.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { listMessages, getSession } from "@/lib/agent/memory";
import { getLeadRow } from "@/lib/agent/leads";
import { listSessionProjects } from "@/lib/agent/projects";
import { getProjectWorkspace, type ProjectWorkspace } from "@/lib/agent/project-workspace";
import { listSessionMockups } from "@/lib/agent/tools-server";
import { listSessionEvents } from "@/lib/events";
import type { LeadPatch } from "@/lib/agent/leads";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// mirror of playbooks.ts WEIGHTS — shown so the score is explainable, not neon
const SCORE_PARTS: Array<[keyof LeadPatch, string, number]> = [
  ["need", "Need", 30],
  ["email", "Email", 20],
  ["budget", "Budget", 20],
  ["company", "Company", 15],
  ["phone", "Phone", 5],
  ["name", "Name", 5],
  ["notes", "Notes", 5],
];

const STAGE_COLOR: Record<string, string> = {
  discover: "#9aa3b2",
  qualify: "#8b5cf6",
  propose: "#00f2ff",
  close: "#34d399",
};

// human labels for the timeline — the raw event bus, curated
const EVENT_META: Record<string, { icon: string; label: string }> = {
  "session.started": { icon: "👋", label: "Conversation started" },
  "lead.created": { icon: "✨", label: "Lead created" },
  "lead.updated": { icon: "📈", label: "Lead updated" },
  "lead.scored": { icon: "🎯", label: "Lead re-scored" },
  "project.created": { icon: "🚀", label: "Project foundations laid" },
  "mockup.generated": { icon: "🎨", label: "Visual concept generated" },
  "ai.tool.called": { icon: "🛠", label: "Tool used" },
  "ai.tool.failed": { icon: "⚠️", label: "Tool failed" },
  "email.sent": { icon: "📧", label: "Email sent" },
  "media.uploaded": { icon: "📎", label: "Image shared" },
  "palette.confirmed": { icon: "🎨", label: "Palette confirmed" },
  "branddna.updated": { icon: "🧬", label: "Brand DNA updated" },
  "asset.created": { icon: "🖼", label: "Asset added" },
  "stack.decided": { icon: "🧱", label: "Stack decision" },
  "visualplan.created": { icon: "🗺", label: "Visual plan created" },
};

// T06 dossier: the shared Brand Foundation (T04 project-workspace) — the SAME
// truth the user vault reads. Renders nothing until the workspace has content.
function BrandFoundation({ ws }: { ws?: ProjectWorkspace }) {
  if (!ws) return null;
  const { brandDNA, assets, stackDecisions } = ws;
  if (!brandDNA && assets.length === 0 && stackDecisions.length === 0) return null;
  const byRole = assets.reduce<Record<string, number>>((m, a) => {
    m[a.role] = (m[a.role] ?? 0) + 1;
    return m;
  }, {});
  return (
    <div className="mt-2 space-y-2 rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2">
      {brandDNA && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">Brand DNA</p>
          {(brandDNA.personality || brandDNA.tone) && (
            <p className="mt-0.5 text-[11px] text-white/70">
              {[brandDNA.personality, brandDNA.tone].filter(Boolean).join(" · ")}
            </p>
          )}
          {brandDNA.keywords.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {brandDNA.keywords.slice(0, 8).map((k) => (
                <span key={k} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/60">{k}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {stackDecisions.length > 0 && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-violet-300">Stack decisions</p>
          <ul className="mt-0.5 space-y-0.5">
            {stackDecisions.slice(0, 6).map((d) => (
              <li key={d.id} className="text-[11px] text-white/65">
                <b className="text-white/45">{d.category}:</b> {d.option}
                {d.confirmedAt ? " ✓" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {assets.length > 0 && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">Assets ({assets.length})</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(byRole).map(([role, n]) => (
              <span key={role} className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/60">{role} ×{n}</span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {assets.filter((a) => a.url).slice(0, 6).map((a) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={a.id} src={a.url as string} alt={a.role} className="h-10 w-10 rounded object-cover ring-1 ring-white/10" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
      <b className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">{k}</b>
      {v}
    </span>
  );
}

export default async function AdminSessionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [messages, lead, session, projects, mockups, events] = await Promise.all([
    listMessages(id),
    getLeadRow(id),
    getSession(id),
    listSessionProjects(id),
    listSessionMockups(id),
    listSessionEvents(id),
  ]);

  // T06: the unified Brand Foundation per orbit project (same source as the vault)
  const workspaces = projects.length
    ? await Promise.all(projects.map((p) => getProjectWorkspace(p.id)))
    : [];
  const wsById = new Map<number, ProjectWorkspace>();
  projects.forEach((p, i) => wsById.set(p.id, workspaces[i]));

  const meta = (session?.meta ?? {}) as Record<string, unknown>;
  const metaStr = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : undefined);
  const stageColor = STAGE_COLOR[lead?.stage ?? "discover"] ?? "#9aa3b2";
  const timeline = events.filter((e) => EVENT_META[e.type]);

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {lead?.name || lead?.company || "Anonymous visitor"}{" "}
            <span className="font-mono text-sm text-white/35">· {id.slice(0, 8)}…</span>
          </h1>
          {/* identity strip — the loginless tripod + soft signals, at a glance */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip k="lang" v={metaStr("lang")} />
            <Chip k="country" v={metaStr("country")} />
            <Chip k="campaign" v={metaStr("campaign")} />
            <Chip k="device" v={metaStr("deviceId")?.slice(0, 8)} />
            <Chip k="ip#" v={metaStr("ipHash")?.slice(0, 8)} />
            <Chip k="last page" v={metaStr("lastPage")} />
            <Chip k="first seen" v={session?.firstSeen?.slice(0, 16).replace("T", " ")} />
            <Chip k="last seen" v={session?.lastSeen?.slice(0, 16).replace("T", " ")} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pipeline" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            Pipeline
          </Link>
          <Link href="/admin/sessions" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            ← Sessions
          </Link>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---- left rail: lead intel + orbit + mockups + timeline ---- */}
        <aside className="space-y-4">
          {/* lead intel + explainable score */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Lead intel
              </p>
              {lead && (
                <span
                  className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                  style={{ borderColor: `${stageColor}80`, color: stageColor }}
                >
                  {lead.stage} · {lead.score}
                </span>
              )}
            </div>
            {lead ? (
              <>
                <dl className="mt-3 space-y-2 text-sm">
                  {(
                    [
                      ["Name", lead.name],
                      ["Email", lead.email],
                      ["Phone", lead.phone],
                      ["Company", lead.company],
                      ["Budget", lead.budget],
                      ["Need", lead.need],
                      ["Notes", lead.notes],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] uppercase tracking-wider text-white/40">{k}</dt>
                      <dd className={v ? "text-white/85" : "text-white/20"}>{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
                {/* score breakdown — what the machine counted and what's missing */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/35">
                    Score breakdown
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {SCORE_PARTS.map(([key, label, w]) => {
                      const got = typeof lead[key] === "string" && (lead[key] as string).trim().length > 0;
                      return (
                        <div key={key} className="flex items-center gap-2 text-[11px]">
                          <span className={got ? "text-emerald-300" : "text-white/25"}>
                            {got ? "●" : "○"}
                          </span>
                          <span className={got ? "text-white/75" : "text-white/30"}>{label}</span>
                          <span className="ml-auto font-mono text-white/40">+{w}</span>
                        </div>
                      );
                    })}
                  </div>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="mt-3 block rounded-lg border border-cyan-400/40 px-3 py-2 text-center text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10"
                    >
                      ✉ Contact {lead.name || "this lead"}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/40">
                Nothing captured yet — still browsing. This panel fills itself in
                as the agent learns.
              </p>
            )}
          </section>

          {/* the orbit — pre-projects born in this session */}
          {projects.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Orbit — pre-projects ({projects.length})
              </p>
              <div className="mt-3 space-y-3">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                      <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase text-white/50">
                        {p.kind}
                      </span>
                    </div>
                    {p.concept && (
                      <p className="mt-1.5 text-xs leading-relaxed text-white/60">{p.concept}</p>
                    )}
                    {p.stack.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.stack.map((s) => (
                          <span key={s} className="rounded border border-violet-400/30 px-1.5 py-0.5 text-[10px] text-violet-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.palette.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {p.palette.slice(0, 6).map((c, i) => (
                          <span key={i} title={c} className="h-3 w-6 rounded-sm border border-white/10" style={{ background: c }} />
                        ))}
                      </div>
                    )}
                    <BrandFoundation ws={wsById.get(p.id)} />
                    <p className="mt-2 text-[10px] text-white/30">
                      created {p.createdAt?.slice(5, 16).replace("T", " ")} · updated {p.updatedAt?.slice(5, 16).replace("T", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* generated mockups */}
          {mockups.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Generated concepts ({mockups.length})
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {mockups.map((src) => (
                  <a key={src} href={src} target="_blank" className="block overflow-hidden rounded-lg border border-white/10 hover:border-cyan-400/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Generated mockup" className="aspect-square w-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* activity timeline — the event bus, curated */}
          {timeline.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Activity timeline
              </p>
              <ol className="mt-3 space-y-0">
                {timeline.map((e, i) => {
                  const m = EVENT_META[e.type];
                  const detail =
                    (e.payload?.tool as string) ||
                    (e.payload?.name as string) ||
                    (e.payload?.template as string) ||
                    (e.payload?.project as string) ||
                    (typeof e.payload?.score === "number" ? `score ${e.payload.score}` : "");
                  return (
                    <li key={e.id} className="relative flex gap-3 pb-3">
                      {i < timeline.length - 1 && (
                        <span aria-hidden className="absolute left-[9px] top-5 h-full w-px bg-white/10" />
                      )}
                      <span aria-hidden className="z-10 mt-0.5 text-xs">{m.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-white/75">
                          {m.label}
                          {detail ? <span className="text-white/40"> — {detail}</span> : null}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {e.createdAt?.slice(5, 16).replace("T", " ")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </aside>

        {/* ---- transcript ---- */}
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Transcript · {messages.length} messages
          </p>
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-white/50">No messages persisted.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-cyan-500/15 text-white"
                      : "rounded-bl-sm bg-white/[0.05] text-white/85"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className="mt-1 text-right text-[10px] text-white/30">
                    {m.intent ? `${m.intent} · ` : ""}
                    {m.createdAt?.slice(5, 16).replace("T", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
