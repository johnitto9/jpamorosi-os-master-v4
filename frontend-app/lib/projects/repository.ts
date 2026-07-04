// lib/projects/repository.ts
// -----------------------------------------------------------------------------
// Repository factory. Selects the storage driver from PROJECT_STORAGE_DRIVER.
//
//   static     -> read-only, content/projects.ts (default, safe everywhere)
//   local-json -> read/write JSON file (durable only on durable FS)
//   postgres   -> read/write Postgres via DATABASE_URL (docker compose)
//
// Admin/API code MUST go through this factory, never import content directly.
// -----------------------------------------------------------------------------

import type { ProjectRepository } from "./types";
import { StaticProjectRepository } from "./static-project-repository";
import { LocalJsonProjectRepository } from "./local-json-project-repository";
import { RemoteApiProjectRepository } from "./remote-api-project-repository";
import { PostgresProjectRepository } from "./postgres-project-repository";

let cached: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  if (cached) return cached;

  const driver = (process.env.PROJECT_STORAGE_DRIVER || "static").toLowerCase();

  switch (driver) {
    case "local-json":
      cached = new LocalJsonProjectRepository();
      break;
    case "remote-api":
      // Future bridge: Vercel frontend reads from a remote backend API.
      // Read-only; requires PROJECTS_API_URL. Not enabled by default.
      cached = new RemoteApiProjectRepository();
      break;
    case "postgres":
      if (!process.env.DATABASE_URL) {
        console.warn(
          "[repository] PROJECT_STORAGE_DRIVER=postgres but DATABASE_URL is missing; falling back to read-only static.",
        );
        cached = new StaticProjectRepository();
      } else {
        cached = new PostgresProjectRepository();
      }
      break;
    case "static":
    default:
      cached = new StaticProjectRepository();
      break;
  }

  return cached;
}

// Convenience re-exports for consumers.
export type {
  Project,
  ProjectTier,
  ProjectStatus,
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "./types";
