// lib/projects/remote-api-project-repository.ts
// -----------------------------------------------------------------------------
// FUTURE BRIDGE (read-only): lets a Vercel public frontend read project data
// from a remote Docker/Dokploy backend over HTTP.
//
// Status: implemented but NOT enabled by default. Activated only when
// PROJECT_STORAGE_DRIVER=remote-api AND PROJECTS_API_URL is set.
//
// It consumes the public read-only content endpoints:
//   GET {PROJECTS_API_URL}/api/content/projects
//   GET {PROJECTS_API_URL}/api/content/projects/{slug}
// which return only PUBLISHED projects. Writes are intentionally unsupported
// here (admin/mutation lives on the backend itself, not through this bridge).
// -----------------------------------------------------------------------------

import type {
  Project,
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "./types";
import { ReadOnlyRepositoryError } from "./types";
import { projectSchema } from "./validators";

function baseUrl(): string {
  const url = process.env.PROJECTS_API_URL;
  if (!url) {
    throw new Error(
      "PROJECT_STORAGE_DRIVER=remote-api requires PROJECTS_API_URL to be set.",
    );
  }
  return url.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const token = process.env.PROJECTS_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class RemoteApiProjectRepository implements ProjectRepository {
  readonly driver = "remote-api" as const;
  // Read-only bridge: mutations happen on the backend, not through this client.
  readonly writable = false;

  async listProjects(): Promise<Project[]> {
    const res = await fetch(`${baseUrl()}/api/content/projects`, {
      headers: { Accept: "application/json", ...authHeaders() },
      // Always fetch fresh; caching policy is decided by the caller/route.
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`remote-api listProjects failed: ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data?.projects) ? data.projects : [];
    return arr.map((p: unknown) => projectSchema.parse(p) as Project);
  }

  async getProject(slug: string): Promise<Project | null> {
    const res = await fetch(
      `${baseUrl()}/api/content/projects/${encodeURIComponent(slug)}`,
      { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`remote-api getProject failed: ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!data?.project) return null;
    return projectSchema.parse(data.project) as Project;
  }

  async createProject(_input: CreateProjectInput): Promise<Project> {
    throw new ReadOnlyRepositoryError(this.driver);
  }
  async updateProject(_slug: string, _patch: UpdateProjectInput): Promise<Project> {
    throw new ReadOnlyRepositoryError(this.driver);
  }
  async deleteProject(_slug: string): Promise<void> {
    throw new ReadOnlyRepositoryError(this.driver);
  }
}
