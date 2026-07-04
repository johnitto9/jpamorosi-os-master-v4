// lib/i18n/translate.ts
// -----------------------------------------------------------------------------
// CONTENT translation layer — the piece that makes i18n actually complete.
// The chrome dictionaries (dictionaries.ts) cover fixed strings; this module
// translates the LIVING content: project docs (oneLiner, proof, highlights,
// category, aiSummary) and the capability names in the hero matrix.
//
// Design (same house rules as everything else):
//   - EN is canonical: lang "en" is a passthrough, always.
//   - Postgres cache (content_translations) keyed by (cache_key, lang) with a
//     source hash — editing a project in the admin invalidates its entry alone.
//   - Cache misses translate in ONE batched LLM completion (strict JSON in and
//     out, shape-validated). First render in a new language pays a few seconds
//     ONCE; every visitor after that reads the cache.
//   - No DB or no LLM or any failure -> English. The site never breaks or
//     waits forever because of a translation.
// -----------------------------------------------------------------------------

import { createHash } from "node:crypto";
import type { Project } from "@/content/projects";
import { capabilities, type Capability } from "@/content/capabilities";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { chatCompletion, isLlmConfigured } from "@/lib/agent/llm";
import { LANGS, type Lang } from "./dictionaries";

/** Translatable unit: flat map of strings / string arrays, same shape out. */
export type Fields = Record<string, string | string[]>;

const hashOf = (fields: Fields) =>
  createHash("sha256").update(JSON.stringify(fields)).digest("hex").slice(0, 24);

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

/** Same shape back? (strings stay strings, arrays keep their length) */
function sameShape(src: Fields, out: unknown): out is Fields {
  if (!out || typeof out !== "object") return false;
  for (const [k, v] of Object.entries(src)) {
    const o = (out as Record<string, unknown>)[k];
    if (typeof v === "string" && typeof o !== "string") return false;
    if (Array.isArray(v) && (!Array.isArray(o) || o.length !== v.length)) return false;
  }
  return true;
}

/**
 * Translate a batch of units into `lang`, cache-first.
 * Returns a map key -> translated fields; entries that could not be
 * translated come back as the English source (silent, by design).
 */
export async function translateBatch(
  lang: Lang,
  entries: Array<{ key: string; fields: Fields }>,
): Promise<Map<string, Fields>> {
  const result = new Map(entries.map((e) => [e.key, e.fields])); // EN floor
  if (lang === "en" || entries.length === 0) return result;
  // translation without a cache would re-pay the LLM on every request — the
  // cache is a hard requirement, not an optimization
  if (!(await dbReady())) return result;

  const hashes = new Map(entries.map((e) => [e.key, hashOf(e.fields)]));
  const cached = await tryQuery<{ cacheKey: string; sourceHash: string; payload: Fields }>(
    `SELECT cache_key AS "cacheKey", source_hash AS "sourceHash", payload
     FROM content_translations WHERE lang = $1 AND cache_key = ANY($2)`,
    [lang, entries.map((e) => e.key)],
  );
  const misses: Array<{ key: string; fields: Fields }> = [];
  const fresh = new Map(
    (cached?.rows ?? [])
      .filter((r) => r.sourceHash === hashes.get(r.cacheKey))
      .map((r) => [r.cacheKey, r.payload]),
  );
  for (const e of entries) {
    const hit = fresh.get(e.key);
    if (hit && sameShape(e.fields, hit)) result.set(e.key, hit);
    else misses.push(e);
  }
  if (misses.length === 0 || !isLlmConfigured()) return result;

  // batched completions in small chunks so no reply outgrows its token budget
  // (a whole project translates to ~250 output tokens; 3 per call is safe)
  const language = LANGS[lang].label;
  const CHUNK = 3;
  for (let i = 0; i < misses.length; i += CHUNK) {
    const chunk = misses.slice(i, i + CHUNK);
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            `You are a precise translator for a premium software portfolio. Translate every string value from English to ${language}. ` +
            `Keep: product names (LumenScript, BuenPick, BBN, Delibot, Delify…), tech terms (WhatsApp, RAG, LLM, stack names), numbers and metrics EXACTLY as they are. ` +
            `Tone: technical, confident, no marketing fluff added. Arrays keep the same length and order. ` +
            `Reply with STRICT JSON only — the same object shape you received, translated values, no commentary.`,
        },
        {
          role: "user",
          content: JSON.stringify(Object.fromEntries(chunk.map((m) => [m.key, m.fields]))),
        },
      ],
      { maxTokens: 2200, timeoutMs: 45_000 },
    );

    try {
      const parsed = JSON.parse(
        (raw ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
      ) as Record<string, unknown>;
      for (const m of chunk) {
        const out = parsed[m.key];
        if (!sameShape(m.fields, out)) continue; // EN floor stays for this one
        result.set(m.key, out);
        await tryQuery(
          `INSERT INTO content_translations (cache_key, lang, source_hash, payload)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (cache_key, lang)
           DO UPDATE SET source_hash = EXCLUDED.source_hash, payload = EXCLUDED.payload, created_at = now()`,
          [m.key, lang, hashes.get(m.key), JSON.stringify(out)],
        );
      }
    } catch {
      /* bad LLM output -> English floor for this chunk, next request retries */
    }
  }
  return result;
}

// ---- domain helpers ---------------------------------------------------------

/** What we translate of a project. Title/labTitle/stack/status stay canonical
 *  (brand identity + StatusBadge color keys + tech names). */
function projectFields(p: Project): Fields {
  return {
    category: p.category,
    oneLiner: p.oneLiner,
    proof: p.proof,
    highlights: p.highlights,
    aiSummary: p.aiSummary,
  };
}

/** Localized copies of the given projects (EN passthrough, cache-first). */
export async function localizeProjects(
  projects: Project[],
  lang: Lang,
): Promise<Project[]> {
  if (lang === "en" || projects.length === 0) return projects;
  const translated = await translateBatch(
    lang,
    projects.map((p) => ({ key: `project:${p.slug}`, fields: projectFields(p) })),
  );
  return projects.map((p) => {
    const t = translated.get(`project:${p.slug}`);
    if (!t) return p;
    return {
      ...p,
      category: (t.category as string) ?? p.category,
      oneLiner: (t.oneLiner as string) ?? p.oneLiner,
      proof: (t.proof as string) ?? p.proof,
      highlights: (t.highlights as string[]) ?? p.highlights,
      aiSummary: (t.aiSummary as string) ?? p.aiSummary,
    };
  });
}

/** Localized capability names for the hero matrix / room chips. */
export async function localizeCapabilities(lang: Lang): Promise<Capability[]> {
  if (lang === "en") return capabilities;
  const translated = await translateBatch(lang, [
    { key: "capabilities", fields: { names: capabilities.map((c) => c.capability) } },
  ]);
  const names = translated.get("capabilities")?.names as string[] | undefined;
  if (!names || names.length !== capabilities.length) return capabilities;
  return capabilities.map((c, i) => ({ ...c, capability: names[i] }));
}
