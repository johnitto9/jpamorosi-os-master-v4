// scripts/export-projects-static.ts
// Deterministic export: Postgres (source of truth) -> content/projects.data.json
// (the static seed Vercel compiles). Run before every push that should update
// the public static front:
//
//   DATABASE_URL=postgres://amorosi:amorosi@localhost:5433/amorosi \
//     pnpm projects:export-static
//
// Guarantees: zod-validated docs, stable ordering (tier -> sortOrder -> slug),
// stable key order (schema shape), trailing newline — clean Git diffs. FAILS
// if any critical project is missing, so a broken export can never silently
// ship a shrunken portfolio.

import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { projectSchema } from "../lib/projects/validators";

const CRITICAL = ["lumenscript", "buenpick", "bbn", "delify", "trading-ecosystem", "recapp-azure", "dataset-creator"];
const TIER_ORDER: Record<string, number> = { hall_of_fame: 0, featured: 1, archive: 2 };
const OUT = "content/projects.data.json";

async function main() {
  const DB = process.env.DATABASE_URL;
  if (!DB) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: DB });
  await client.connect();
  try {
    const { rows } = await client.query<{ doc: unknown }>(
      "SELECT doc FROM projects ORDER BY sort_order ASC, slug ASC",
    );
    if (rows.length === 0) throw new Error("projects table is EMPTY — refusing to export");

    const projects = rows
      .map((r) => projectSchema.parse(r.doc))
      .sort(
        (a, b) =>
          (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) ||
          (a.sortOrder ?? 100) - (b.sortOrder ?? 100) ||
          a.slug.localeCompare(b.slug),
      );

    const slugs = new Set(projects.map((p) => p.slug));
    const missing = CRITICAL.filter((s) => !slugs.has(s));
    if (missing.length > 0) {
      throw new Error(`critical project(s) missing from DB: ${missing.join(", ")}`);
    }

    writeFileSync(OUT, JSON.stringify(projects, null, 2) + "\n");
    console.log(`[export-static] wrote ${OUT} — ${projects.length} projects ✓`);
    console.log(`[export-static] slugs: ${projects.map((p) => p.slug).join(", ")}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[export-static] FAILED:", (e as Error).message);
  process.exit(1);
});
