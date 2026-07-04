// lib/projects/types.ts
// -----------------------------------------------------------------------------
// Canonical project types for the repository layer.
//
// The public Project shape is defined in content/projects.ts (Phase 1) and is
// re-exported here so the repository/admin and the public site never diverge.
//
// NOTE on ordering: the canonical ordering field is `sortOrder` (Phase 1). The
// playbook/admin spec calls it "order" — treat them as the same concept.
// -----------------------------------------------------------------------------

export type {
  Project,
  ProjectTier,
  ProjectStatus,
  ProjectTheme,
  ProjectAssets,
} from "@/content/projects";

import type { Project } from "@/content/projects";
import type { CreateProjectSchema, UpdateProjectSchema } from "./validators";

// Input types are the zod-inferred shapes, so the admin API and the repository
// can never drift apart (single source of truth = validators.ts).

/** Input accepted when creating a project (server assigns id/timestamps). */
export type CreateProjectInput = CreateProjectSchema;

/** Partial patch accepted when updating a project. Slug is the key, not patched here. */
export type UpdateProjectInput = UpdateProjectSchema;

/**
 * Storage-agnostic repository contract.
 * Implementations: static (read-only), local-json (read/write file).
 */
export interface ProjectRepository {
  readonly driver: "static" | "local-json" | "postgres" | "remote-api";
  readonly writable: boolean;

  listProjects(): Promise<Project[]>;
  getProject(slug: string): Promise<Project | null>;
  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(slug: string, patch: UpdateProjectInput): Promise<Project>;
  deleteProject(slug: string): Promise<void>;
}

/** Thrown when a write is attempted against a read-only driver. */
export class ReadOnlyRepositoryError extends Error {
  constructor(driver: string) {
    super(
      `Project storage driver "${driver}" is read-only. Set PROJECT_STORAGE_DRIVER=local-json (with a durable PROJECTS_JSON_PATH) to enable writes.`,
    );
    this.name = "ReadOnlyRepositoryError";
  }
}

/** Thrown when a slug is not found. */
export class ProjectNotFoundError extends Error {
  constructor(slug: string) {
    super(`Project not found: ${slug}`);
    this.name = "ProjectNotFoundError";
  }
}

/** Thrown when a create would collide with an existing slug. */
export class ProjectConflictError extends Error {
  constructor(slug: string) {
    super(`A project with slug "${slug}" already exists.`);
    this.name = "ProjectConflictError";
  }
}
