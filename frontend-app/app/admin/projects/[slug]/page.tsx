import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { getProjectRepository } from "@/lib/projects/repository";
import { ProjectForm } from "@/components/admin/ProjectForm";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { slug } = await params;
  const repo = getProjectRepository();
  const project = await repo.getProject(slug);
  if (!project) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-cyan-300 hover:underline">
          ← Back
        </Link>
        <Link
          href={`/preview/projects/${project.slug}`}
          target="_blank"
          className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/10"
        >
          View live preview ↗
        </Link>
      </div>
      <h1 className="mt-3 text-2xl font-bold">Edit: {project.title}</h1>
      {!repo.writable && (
        <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-300">
          Storage driver <code>{repo.driver}</code> is read-only. Changes cannot
          be saved until <code>PROJECT_STORAGE_DRIVER=local-json</code>.
        </p>
      )}
      <div className="mt-6">
        <ProjectForm mode="edit" initial={project} />
      </div>
    </div>
  );
}
