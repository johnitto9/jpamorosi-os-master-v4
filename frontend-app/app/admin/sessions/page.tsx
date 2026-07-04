// app/admin/sessions/page.tsx
// Session-tracking console: every visitor conversation, newest activity first,
// enriched with whatever the lead row already learned (name/company/stage).
// Rows fill in as the agent captures data — click through for the transcript.

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { isDbConfigured } from "@/lib/db/pool";
import { listSessions } from "@/lib/agent/memory";
import { listLeads } from "@/lib/agent/leads";

export const dynamic = "force-dynamic";

export default async function AdminSessions() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const dbOn = isDbConfigured();
  const [sessions, leads] = dbOn
    ? await Promise.all([listSessions(200), listLeads(200)])
    : [[], []];
  const leadBySession = new Map(leads.map((l) => [l.sessionId, l]));

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sessions — conversation tracking</h1>
          <p className="mt-1 text-sm text-white/50">
            Every visitor session, completing itself as the agent learns. Click
            one for the full transcript.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/leads" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            Leads
          </Link>
          <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            ← Backoffice
          </Link>
        </div>
      </header>

      {!dbOn && (
        <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          Postgres is not configured — sessions need <code>DATABASE_URL</code>.
        </p>
      )}
      {dbOn && sessions.length === 0 && (
        <p className="mt-8 text-sm text-white/50">No sessions yet.</p>
      )}

      {sessions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-2">Session</th>
                <th className="px-4 py-2">Visitor</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Msgs</th>
                <th className="px-4 py-2">Last page</th>
                <th className="px-4 py-2">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessions.map((s) => {
                const lead = leadBySession.get(s.id);
                return (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/sessions/${s.id}`}
                        className="font-mono text-xs text-cyan-300 hover:underline"
                      >
                        {s.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{lead?.name || <span className="text-white/25">—</span>}</div>
                      <div className="text-xs text-white/45">
                        {[lead?.company, lead?.email].filter(Boolean).join(" · ")}
                      </div>
                      {typeof (s.meta as Record<string, unknown>)?.campaign === "string" && (
                        <span className="mt-1 inline-block rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                          📣 {String((s.meta as Record<string, unknown>).campaign)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead ? (
                        <span className="rounded-full border border-cyan-400/40 px-2 py-0.5 font-mono text-[10px] uppercase text-cyan-300">
                          {lead.stage} · {lead.score}
                        </span>
                      ) : (
                        <span className="text-white/25">browsing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{s.messages}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/45">
                      {String((s.meta as Record<string, unknown>)?.lastPage ?? "—")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-white/45">
                      {s.lastSeen?.slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
