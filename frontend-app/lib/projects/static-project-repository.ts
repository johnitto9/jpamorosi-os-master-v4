// lib/projects/static-project-repository.ts
// -----------------------------------------------------------------------------
// Read-only repository backed by the Phase 1 static seed (content/projects.ts).
// Safe everywhere (incl. serverless). All write methods throw.
// -----------------------------------------------------------------------------

import { projects as seed } from "@/content/projects";
import type {
  Project,
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "./types";
import { ReadOnlyRepositoryError } from "./types";

export class StaticProjectRepository implements ProjectRepository {
  readonly driver = "static" as const;
  readonly writable = false;

  async listProjects(): Promise<Project[]> {
    return [...seed].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProject(slug: string): Promise<Project | null> {
    return seed.find((p) => p.slug === slug) ?? null;
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
