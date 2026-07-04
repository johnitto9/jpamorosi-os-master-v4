import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { getProjectRepository } from "@/lib/projects/repository";
import { ProjectForm } from "@/components/admin/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const repo = getProjectRepository();

  return (
    <div>
      <Link href="/admin" className="text-sm text-cyan-300 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-3 text-2xl font-bold">New project</h1>
      {!repo.writable && (
        <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-300">
          Storage driver <code>{repo.driver}</code> is read-only. Set
          <code> PROJECT_STORAGE_DRIVER=local-json</code> to persist new projects.
        </p>
      )}
      <div className="mt-6">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
