// lib/projects/local-json-project-repository.ts
// -----------------------------------------------------------------------------
// Read/write repository backed by a JSON file at PROJECTS_JSON_PATH.
//
// Rules honored:
// - If the JSON file does not exist, it is SEEDED from content/projects.ts.
// - Writes go ONLY to the JSON file. content/projects.ts is never modified.
// - Every write is validated against the zod schema first.
// - Writes are serialized in-process and written atomically (tmp + rename).
//
// Durability note: only durable where the filesystem is durable (VPS/Docker
// volume). On serverless/Vercel this data is ephemeral — see docs/ENVIRONMENTS.md.
// -----------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import path from "node:path";
import { projects as seed } from "@/content/projects";
import type {
  Project,
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "./types";
import {
  ProjectConflictError,
  ProjectNotFoundError,
} from "./types";
import { projectSchema } from "./validators";

const filePath = () =>
  path.resolve(process.cwd(), process.env.PROJECTS_JSON_PATH || "./data/projects.json");

export class LocalJsonProjectRepository implements ProjectRepository {
  readonly driver = "local-json" as const;
  readonly writable = true;

  // In-process write serialization to reduce corruption risk.
  private queue: Promise<unknown> = Promise.resolve();

  private async ensureFile(): Promise<string> {
    const file = filePath();
    try {
      await fs.access(file);
    } catch {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const seeded = [...seed].sort((a, b) => a.sortOrder - b.sortOrder);
      await fs.writeFile(file, JSON.stringify(seeded, null, 2), "utf8");
    }
    return file;
  }

  private async readAll(): Promise<Project[]> {
    const file = await this.ensureFile();
    const raw = await fs.readFile(file, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Corrupt project store at ${file}: ${(e as Error).message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Project store at ${file} must be a JSON array.`);
    }
    // Validate/normalize each record; drop nothing silently — surface errors.
    // Cast: projectSchema mirrors Project; parse guarantees the runtime shape.
    return parsed.map((p) => projectSchema.parse(p) as Project);
  }

  private async writeAll(projects: Project[]): Promise<void> {
    const file = filePath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(projects, null, 2), "utf8");
    await fs.rename(tmp, file);
  }

  /** Run a mutation exclusively (serialized). */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    // keep the chain alive regardless of individual result
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async listProjects(): Promise<Project[]> {
    const all = await this.readAll();
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProject(slug: string): Promise<Project | null> {
    const all = await this.readAll();
    return all.find((p) => p.slug === slug) ?? null;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.serialize(async () => {
      const all = await this.readAll();
      const slug = input.slug;
      if (all.some((p) => p.slug === slug)) throw new ProjectConflictError(slug);

      const now = new Date().toISOString();
      const candidate = projectSchema.parse({
        ...input,
        id: input.id || slug,
        createdAt: now,
        updatedAt: now,
      }) as Project;

      all.push(candidate);
      await this.writeAll(all);
      return candidate;
    });
  }

  async updateProject(slug: string, patch: UpdateProjectInput): Promise<Project> {
    return this.serialize(async () => {
      const all = await this.readAll();
      const idx = all.findIndex((p) => p.slug === slug);
      if (idx === -1) throw new ProjectNotFoundError(slug);

      const cur = all[idx];
      const merged = projectSchema.parse({
        ...cur,
        ...patch,
        // deep-merge nested objects so a partial patch never wipes required fields
        theme: patch.theme ? { ...cur.theme, ...patch.theme } : cur.theme,
        assets: patch.assets ? { ...cur.assets, ...patch.assets } : cur.assets,
        architecture: patch.architecture
          ? {
              nodes: patch.architecture.nodes ?? cur.architecture?.nodes ?? [],
              flow: patch.architecture.flow ?? cur.architecture?.flow ?? [],
            }
          : cur.architecture,
        // immutable
        id: cur.id,
        slug: cur.slug,
        createdAt: cur.createdAt,
        updatedAt: new Date().toISOString(),
      }) as Project;

      all[idx] = merged;
      await this.writeAll(all);
      return merged;
    });
  }

  async deleteProject(slug: string): Promise<void> {
    return this.serialize(async () => {
      const all = await this.readAll();
      const next = all.filter((p) => p.slug !== slug);
      if (next.length === all.length) throw new ProjectNotFoundError(slug);
      await this.writeAll(next);
    });
  }
}
