// app/admin/prospects/page.tsx
// The dragnet console: outbound prospecting kanban. Cards enter from the
// daily scout's serper sweeps AND from emails the admin drops here; code
// advances them left to right (see lib/agent/prospects.ts). The board is a
// client component so ingesting/processing updates in place.

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { isDbConfigured } from "@/lib/db/pool";
import { ProspectBoard } from "@/components/admin/ProspectBoard";

export const dynamic = "force-dynamic";

export default async function AdminProspects() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prospects — outbound (dragnet)</h1>
          <p className="mt-1 text-sm text-white/50">
            Red de pesca <span className="text-white/70">outbound</span>: capturas crudas del scout diario + emails que dropeás acá.
            El pipeline filtra, enriquece y califica — las cards avanzan solas;
            vos solo decidís a quién contactar. Click en una card → detalle
            completo + botón para promover al pipeline inbound.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/prospects?format=csv"
            download
            className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"
            title="Descargá los prospectos calificados que tienen email (mailing DB)"
          >
            Export CSV
          </a>
          <Link href="/admin/pipeline" className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm text-violet-300 hover:bg-violet-400/10">
            Inbound pipeline
          </Link>
          <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30">
            ← Backoffice
          </Link>
        </div>
      </header>

      {!isDbConfigured() && (
        <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          Postgres is not configured — the dragnet needs <code>DATABASE_URL</code>{" "}
          (docker compose backend profile).
        </p>
      )}

      <ProspectBoard />
    </div>
  );
}
