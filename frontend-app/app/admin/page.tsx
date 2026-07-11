import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isAdminEnabled,
  isAdminConfigured,
  adminMissingVars,
  getStorageDriver,
  getPublicContentMode,
} from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { getProjectRepository } from "@/lib/projects/repository";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { TierReorder, type TierRow } from "@/components/admin/TierReorder";
import type { Project } from "@/content/projects";

export const dynamic = "force-dynamic";

function SetupNotice() {
  const missing = adminMissingVars();
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
      <h1 className="text-xl font-bold text-amber-300">Admin not configured</h1>
      <p className="mt-2 text-sm text-white/70">
        The backoffice is disabled until these environment variables are set in{" "}
        <code className="text-white/90">frontend-app/.env.local</code> (or{" "}
        <code>.env.docker.local</code>):
      </p>
      <ul className="mt-3 list-disc pl-5 text-sm text-white/80">
        {missing.map((m) => (
          <li key={m}>
            <code>{m}</code>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-white/50">
        See <code>docs/ENVIRONMENTS.md</code>. Generate a password hash with{" "}
        <code>node scripts/generate-admin-hash.mjs &quot;password&quot;</code>.
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-2xl font-bold text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

export default async function AdminHome() {
  if (!isAdminEnabled() || !isAdminConfigured()) return <SetupNotice />;
  if (!(await isAuthenticated())) redirect("/admin/login");

  const repo = getProjectRepository();
  const projects = await repo.listProjects();
  const driver = getStorageDriver();
  const publicMode = getPublicContentMode();

  const byOrder = (a: Project, b: Project) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.title.localeCompare(b.title);
  const rows = (list: Project[]): TierRow[] =>
    [...list].sort(byOrder).map((p) => ({
      slug: p.slug,
      title: p.title,
      status: p.status,
      sortOrder: p.sortOrder ?? 100,
      stackCount: p.stack.length,
      published: p.published !== false,
    }));
  const hall = projects.filter((p) => p.tier === "hall_of_fame");
  const featured = projects.filter((p) => p.tier === "featured");
  const archive = projects.filter((p) => p.tier === "archive");
  const published = projects.filter((p) => p.published);

  const staticPublicWarning = publicMode === "static";

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Amorosi Labs — Backoffice</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
              data source: <b className={repo.writable ? "text-emerald-400" : "text-amber-400"}>{driver}</b>
              {repo.writable ? " (writable)" : " (read-only)"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
              public mode: <b className={publicMode === "live" ? "text-emerald-400" : "text-cyan-300"}>{publicMode}</b>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/projects/new" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/80">+ New project</Link>
          <Link href="/admin/media" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">Home media ↗</Link>
          <Link href="/admin/leads" className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10">Leads ↗</Link>
          <Link href="/admin/pipeline" className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm text-violet-300 hover:bg-violet-400/10">Pipeline ↗</Link>
          <Link href="/admin/prospects" className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-400/10">Prospects ↗</Link>
          <Link href="/admin/email" className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10">Outreach Studio ↗</Link>
          <Link href="/admin/sessions" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">Sessions ↗</Link>
          <Link href="/preview" target="_blank" className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-300 hover:bg-amber-400/10">Live preview ↗</Link>
          <Link href="/" target="_blank" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">Public site ↗</Link>
          <LogoutButton />
        </div>
      </header>

      {staticPublicWarning && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
          ⚠ Public content mode is <b>static</b>: the public site (<code>/</code>,{" "}
          <code>/projects</code>) reads the compiled seed and will <b>not</b> reflect
          these edits. Use <b>Live preview</b> to see local-json changes. On Vercel
          this is intentional. To make public pages live locally, set{" "}
          <code>PROJECT_PUBLIC_CONTENT_MODE=live</code> (Docker only).
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={projects.length} />
        <StatCard label="Hall of Fame" value={hall.length} accent="#f0a500" />
        <StatCard label="Featured" value={featured.length} accent="#00e0a4" />
        <StatCard label="Archive" value={archive.length} accent="#8b5cf6" />
        <StatCard label="Published" value={published.length} accent="#00ff88" />
      </div>

      <TierReorder title="Hall of Fame" items={rows(hall)} accent="#f0a500" />
      <TierReorder title="Featured Systems" items={rows(featured)} accent="#00e0a4" />
      <TierReorder title="Lab Archive" items={rows(archive)} accent="#8b5cf6" />

      {projects.length === 0 && (
        <p className="mt-8 text-center text-white/50">No projects yet. Create your first one.</p>
      )}
    </div>
  );
}
