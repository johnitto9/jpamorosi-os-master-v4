// scripts/migrate-projects-json-to-postgres.ts
// One-shot, idempotent migration: live projects JSON -> Postgres `projects`
// table (the schema PostgresProjectRepository already uses). Validates every
// project with the app's own zod schema, upserts by slug in ONE transaction,
// logs inserted/updated/failed, aborts on serious corruption.
//
// Lives in frontend-app/scripts (resolves pg/zod from this package):
//   pnpm projects:migrate:dry-run   # reads + validates + reports, writes nothing
//   pnpm projects:migrate           # real run (transactional)
//
// Env: DATABASE_URL (e.g. postgres://amorosi:amorosi@localhost:5433/amorosi)
//      PROJECTS_JSON (path to the exported live JSON; default ../backups/tmp/projects-live.json)

import { readFileSync } from "node:fs";
import { Client } from "pg";
import { projectSchema } from "../lib/projects/validators";

const DRY = process.argv.includes("--dry-run");
const FILE =
  process.env.PROJECTS_JSON ?? "../backups/tmp/projects-live.json";
const DB = process.env.DATABASE_URL;

async function main() {
  if (!DB) throw new Error("DATABASE_URL is required");
  const raw = JSON.parse(readFileSync(FILE, "utf8")) as unknown;
  const items = Array.isArray(raw)
    ? raw
    : (raw as { projects?: unknown[] }).projects;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`no projects found in ${FILE}`);
  }
  console.log(`[migrate] source: ${FILE} (${items.length} projects) — ${DRY ? "DRY RUN" : "REAL RUN"}`);

  // validate ALL before touching the DB — corruption aborts the whole run
  const valid: Array<ReturnType<typeof projectSchema.parse>> = [];
  const failed: string[] = [];
  for (const it of items) {
    try {
      valid.push(projectSchema.parse(it));
    } catch (e) {
      failed.push(`${(it as { slug?: string })?.slug ?? "?"}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  if (failed.length > 0) {
    console.error(`[migrate] ${failed.length} project(s) FAILED validation:`);
    failed.forEach((f) => console.error("  ✗", f));
    throw new Error("aborting — fix the source data first");
  }
  console.log(`[migrate] all ${valid.length} projects validate against projectSchema ✓`);

  const client = new Client({ connectionString: DB });
  await client.connect();
  try {
    const before = await client.query("SELECT slug FROM projects");
    const existing = new Set(before.rows.map((r: { slug: string }) => r.slug));

    if (DRY) {
      for (const p of valid) {
        console.log(`  ${existing.has(p.slug) ? "would UPDATE" : "would INSERT"}  ${p.slug} (tier=${p.tier}, sort=${p.sortOrder}, published=${p.published})`);
      }
      console.log(`[migrate] dry run complete — table currently has ${existing.size} row(s)`);
      return;
    }

    await client.query("BEGIN");
    let inserted = 0;
    let updated = 0;
    for (const p of valid) {
      const res = await client.query(
        `INSERT INTO projects (slug, tier, published, sort_order, doc, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb,
                 COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))
         ON CONFLICT (slug) DO UPDATE SET
           tier = EXCLUDED.tier,
           published = EXCLUDED.published,
           sort_order = EXCLUDED.sort_order,
           doc = EXCLUDED.doc,
           updated_at = COALESCE(EXCLUDED.updated_at, now())
         RETURNING (xmax = 0) AS inserted`,
        [
          p.slug,
          p.tier,
          p.published ?? true,
          p.sortOrder ?? 100,
          JSON.stringify(p),
          (p as { createdAt?: string }).createdAt ?? null,
          (p as { updatedAt?: string }).updatedAt ?? null,
        ],
      );
      if (res.rows[0]?.inserted) inserted += 1;
      else updated += 1;
    }
    await client.query("COMMIT");
    const after = await client.query("SELECT count(*)::int AS n FROM projects");
    console.log(`[migrate] DONE — inserted: ${inserted}, updated: ${updated}, table rows: ${after.rows[0].n}`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[migrate] FAILED:", (e as Error).message);
  process.exit(1);
});
