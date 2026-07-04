// lib/projects/postgres-project-repository.ts
// -----------------------------------------------------------------------------
// Read/write repository backed by Postgres (PROJECT_STORAGE_DRIVER=postgres).
//
// Storage model: one row per project, the full zod-validated Project lives in
// a jsonb `doc` column; slug/tier/published/sort_order are mirrored as real
// columns for cheap filtering/sorting. No ORM.
//
// Rules honored (same contract as local-json):
// - Empty table is SEEDED from content/projects.ts on first touch.
// - Every write is validated against the zod schema first.
// - Immutable: id, slug, createdAt.
// - Schema bootstrap is lazy + idempotent (lib/db/bootstrap.ts).
// -----------------------------------------------------------------------------

import { projects as seed } from "@/content/projects";
import { query } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import type {
  Project,
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "./types";
import { ProjectConflictError, ProjectNotFoundError } from "./types";
import { projectSchema } from "./validators";

type Row = { doc: unknown };

function parseRow(row: Row): Project {
  return projectSchema.parse(row.doc) as Project;
}

export class PostgresProjectRepository implements ProjectRepository {
  readonly driver = "postgres" as const;
  readonly writable = true;

  private seeded = false;

  /** Bootstrap schema + seed the table from the static content once. */
  private async ready(): Promise<void> {
    await ensureSchema();
    if (this.seeded) return;
    const { rows } = await query<{ n: string }>("SELECT count(*)::text AS n FROM projects");
    if (rows[0]?.n === "0") {
      for (const p of seed) {
        await this.insert(projectSchema.parse(p) as Project);
      }
      console.log(`[repository:postgres] seeded ${seed.length} projects from static content`);
    }
    this.seeded = true;
  }

  private async insert(p: Project): Promise<void> {
    await query(
      `INSERT INTO projects (slug, tier, published, sort_order, doc, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb,
               COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))
       ON CONFLICT (slug) DO NOTHING`,
      [p.slug, p.tier, p.published, p.sortOrder, JSON.stringify(p), p.createdAt ?? null, p.updatedAt ?? null],
    );
  }

  async listProjects(): Promise<Project[]> {
    await this.ready();
    const { rows } = await query<Row>("SELECT doc FROM projects ORDER BY sort_order ASC, slug ASC");
    return rows.map(parseRow);
  }

  async getProject(slug: string): Promise<Project | null> {
    await this.ready();
    const { rows } = await query<Row>("SELECT doc FROM projects WHERE slug = $1", [slug]);
    return rows[0] ? parseRow(rows[0]) : null;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    await this.ready();
    const now = new Date().toISOString();
    const candidate = projectSchema.parse({
      ...input,
      id: input.id || input.slug,
      createdAt: now,
      updatedAt: now,
    }) as Project;

    const { rowCount } = await query(
      `INSERT INTO projects (slug, tier, published, sort_order, doc)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (slug) DO NOTHING`,
      [candidate.slug, candidate.tier, candidate.published, candidate.sortOrder, JSON.stringify(candidate)],
    );
    if (!rowCount) throw new ProjectConflictError(candidate.slug);
    return candidate;
  }

  async updateProject(slug: string, patch: UpdateProjectInput): Promise<Project> {
    await this.ready();
    const cur = await this.getProject(slug);
    if (!cur) throw new ProjectNotFoundError(slug);

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

    await query(
      `UPDATE projects
       SET tier = $2, published = $3, sort_order = $4, doc = $5::jsonb, updated_at = now()
       WHERE slug = $1`,
      [slug, merged.tier, merged.published, merged.sortOrder, JSON.stringify(merged)],
    );
    return merged;
  }

  async deleteProject(slug: string): Promise<void> {
    await this.ready();
    const { rowCount } = await query("DELETE FROM projects WHERE slug = $1", [slug]);
    if (!rowCount) throw new ProjectNotFoundError(slug);
  }
}
