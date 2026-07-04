// app/admin/leads/page.tsx
// Lightweight lead-qualification board: everything the assistant learned about
// each visitor session (contact, company, budget, need) at a glance.
// Requires the Postgres backend (DATABASE_URL); shows a setup notice otherwise.

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { isDbConfigured } from "@/lib/db/pool";
import { listLeads } from "@/lib/agent/leads";

export const dynamic = "force-dynamic";

function Cell({ value }: { value?: string | null }) {
  return value ? (
    <span className="text-white/85">{value}</span>
  ) : (
    <span className="text-white/25">—</span>
  );
}

export default async function AdminLeads() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const dbOn = isDbConfigured();
  const leads = dbOn ? await listLeads() : [];

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads — assistant qualification</h1>
          <p className="mt-1 text-sm text-white/50">
            What Orbe learned per visitor session. Contact data is only
            stored when the visitor shares it in conversation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/pipeline"
            className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm text-violet-300 hover:bg-violet-400/10"
          >
            Pipeline
          </Link>
          <Link
            href="/admin/prospects"
            className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-400/10"
          >
            Prospects
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30"
          >
            ← Backoffice
          </Link>
        </div>
      </header>

      {!dbOn && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-6 text-sm text-amber-200">
          <b>Postgres is not configured.</b> Lead capture needs{" "}
          <code>DATABASE_URL</code> — start the backend stack with{" "}
          <code>docker compose --profile backend up --build</code> (the compose
          file wires the DB automatically). Without it the assistant still
          works, but memory-lite: nothing is persisted.
        </div>
      )}

      {dbOn && leads.length === 0 && (
        <p className="mt-8 text-sm text-white/50">
          No leads yet. They&apos;ll appear here as soon as the assistant captures
          an email, phone, company, budget or project need.
        </p>
      )}

      {leads.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Need</th>
                <th className="px-4 py-2">Budget</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Msgs</th>
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2" aria-label="Open dossier" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((l) => (
                <tr key={l.id} className="align-top hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        l.stage === "close"
                          ? "border-emerald-400/50 text-emerald-300"
                          : l.stage === "propose"
                            ? "border-cyan-400/50 text-cyan-300"
                            : l.stage === "qualify"
                              ? "border-violet-400/50 text-violet-300"
                              : "border-white/20 text-white/50"
                      }`}
                    >
                      {l.stage}
                    </span>
                    <div className="mt-1.5 text-xs text-white/45">score {l.score}</div>
                  </td>
                  <td className="px-4 py-3">
                    {l.sessionId ? (
                      <Link href={`/admin/sessions/${l.sessionId}`} className="group/name">
                        <div className="font-medium text-white group-hover/name:text-cyan-300 group-hover/name:underline">
                          {l.name || "Anonymous"}
                        </div>
                      </Link>
                    ) : (
                      <div className="font-medium text-white">{l.name || "Anonymous"}</div>
                    )}
                    <div className="text-xs text-cyan-300">{l.email || ""}</div>
                    <div className="text-xs text-white/50">{l.phone || ""}</div>
                  </td>
                  <td className="px-4 py-3"><Cell value={l.company} /></td>
                  <td className="max-w-[260px] px-4 py-3 text-xs leading-relaxed">
                    <Cell value={l.need} />
                  </td>
                  <td className="px-4 py-3"><Cell value={l.budget} /></td>
                  <td className="max-w-[220px] px-4 py-3 text-xs leading-relaxed">
                    <Cell value={l.notes} />
                  </td>
                  <td className="px-4 py-3 text-white/60">{l.messages}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/45">
                    {l.updatedAt?.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.sessionId && (
                      <Link
                        href={`/admin/sessions/${l.sessionId}`}
                        className="whitespace-nowrap rounded-full border border-cyan-400/40 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-400/10"
                      >
                        Dossier →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
