// lib/agent/scout-strategy.ts
// -----------------------------------------------------------------------------
// The scout's STRATEGY layer — its general intelligence.
//
// ARCHITECTURE (REFAC 2026-07-09 — "la chispa"): a two-tempo brain.
//
//   WEEKLY — the GENOME. One LLM completion regenerates the query groups from
//   three LIVE inputs: (1) Juan's real identity (profile + capability matrix,
//   read from code — never hardcoded queries), (2) a MARKET PULSE (two bounded
//   web searches about current AI-hiring/automation demand), and (3) the
//   measured yield of past queries (exploitation happens HERE, where the LLM
//   can reason about it). The result — three groups × four languages — is
//   persisted as an `agent.scout_genome` event and reused for a week.
//
//   DAILY — the DRAW. planScoutQueries() samples the cached genome with a
//   seeded rotation that guarantees every run mixes the three groups, filtered
//   by the 21-day no-repeat window. ZERO tokens, zero searches: the daily
//   orchestration can never over-saturate the budget because all spend is
//   concentrated in the weekly regeneration (1 completion + 2 searches).
//
//   FLOOR — a bootstrap genome (static banks) serves when there is no DB or
//   no LLM, and seeds day one. Same shape, so the draw code has one path.
//
// Groups: specific (Juan's exact skills, phrased as real buyers search),
// broad (demand × vertical × geo), stack (teams found by their technology).
// Languages: es/en dominate; pt/fr open adjacent markets.
// -----------------------------------------------------------------------------

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { profile } from "@/content/profile";
import { capabilities } from "@/content/capabilities";
import { recordEvent } from "@/lib/events";
import { runWebSearchRaw, webSearchEnabled } from "./tools-server";
import { chatCompletion, isLlmConfigured } from "./llm";

export type QueryGroup = "specific" | "broad" | "stack";

export type ScoutGenome = {
  version: number;
  generatedAt: string; // ISO
  rationale?: string;
  groups: Record<QueryGroup, string[]>;
};

export type QueryPerformance = {
  query: string;
  ingested: number;
  withEmail: number;
  reachedContact: number;
  avgScore: number;
};

export type ScoutPlan = {
  queries: string[];
  /** how the plan was produced — lands in the digest so Juan sees the brain */
  strategy: "genome" | "genome-fresh" | "static-floor";
  /** the genome's own one-line strategy (LLM path only) */
  rationale?: string;
};

const GENOME_TTL_DAYS = 7;
const GROUP_CYCLE: QueryGroup[] = ["specific", "broad", "stack"];

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// ---- 1. memory: what has worked, what is exhausted ---------------------------

/** Per-query yield, from the prospects the scout already ingested. */
export async function getQueryPerformance(limit = 24): Promise<QueryPerformance[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<QueryPerformance>(
    `SELECT raw->>'query' AS query,
            count(*)::int AS ingested,
            count(*) FILTER (WHERE email IS NOT NULL)::int AS "withEmail",
            count(*) FILTER (WHERE stage IN ('contact','contacted'))::int AS "reachedContact",
            COALESCE(round(avg(score)))::int AS "avgScore"
     FROM prospects
     WHERE source = 'scout' AND raw->>'query' IS NOT NULL
     GROUP BY raw->>'query'
     ORDER BY "withEmail" DESC, "reachedContact" DESC, ingested DESC
     LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}

/** Queries fired in the last `days` — the "do not repeat yet" window. */
export async function getRecentQueries(days = 21): Promise<string[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<{ queries: unknown }>(
    `SELECT payload->'queries' AS queries FROM events
     WHERE type = 'agent.daily_scout'
       AND created_at > now() - ($1 || ' days')::interval
     ORDER BY created_at DESC LIMIT 60`,
    [String(days)],
  );
  const out = new Set<string>();
  for (const row of res?.rows ?? []) {
    if (Array.isArray(row.queries)) {
      for (const q of row.queries) if (typeof q === "string") out.add(q);
    }
  }
  return [...out];
}

/** How many prospects did the LAST run ingest? Drives adaptive volume. */
export async function getLastRunIngested(): Promise<number | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<{ n: string | number | null }>(
    `SELECT payload->>'prospectsIngested' AS n FROM events
     WHERE type = 'agent.daily_scout'
     ORDER BY created_at DESC LIMIT 1`,
  );
  const raw = res?.rows[0]?.n;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ---- 2. the bootstrap genome (floor: no DB / no LLM / day one) ----------------
// Curated seeds per group, es/en/pt/fr mixed IN the strings. The weekly LLM
// genome replaces these; they are the shape-compatible fallback, never the norm.

const BOOTSTRAP: Record<QueryGroup, string[]> = {
  specific: [
    "empresa busca implementar chatbot de whatsapp con ia",
    "necesito automatizar atención al cliente con inteligencia artificial",
    "quiero integrar un llm en mi producto quien contratar",
    "consultor para implementar rag con documentos de la empresa",
    "company looking to build whatsapp ai agent",
    "hire developer for llm integration in saas product",
    "fine-tuning dataset preparation service for ai models",
    "multi-model llm orchestration consultant needed",
    "empresa precisa automatizar atendimento com ia",
    "entreprise cherche développeur agent ia sur mesure",
  ],
  broad: [
    "empresas de logística contratando desarrollador ia argentina",
    "pymes digitalizando procesos méxico",
    "companies hiring ai engineers healthcare remote",
    "smb automation demand e-commerce usa",
    "startup fintech hiring founding engineer europe remote",
    "empresas que necesitan automatizar hotelería españa",
    "startups de educação buscando programador brasil",
    "pme immobilier automatisation france",
  ],
  stack: [
    "busco programador next.js react para proyecto",
    "equipo busca desarrollador python ia",
    "startup hiring next.js typescript developer remote",
    "companies integrating openai api hiring developer",
    "fastapi python ai engineer job",
    "team using postgres redis hiring backend engineer",
    "vaga desenvolvedor next.js typescript remoto",
    "recrute développeur ia python télétravail",
  ],
};

function bootstrapGenome(): ScoutGenome {
  return {
    version: 0,
    generatedAt: new Date(0).toISOString(),
    rationale: "bootstrap seeds (no LLM genome yet)",
    groups: BOOTSTRAP,
  };
}

// ---- 3. the weekly genome: identity + market pulse + yield → LLM --------------

async function loadGenome(): Promise<ScoutGenome | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<{ payload: ScoutGenome }>(
    `SELECT payload FROM events
     WHERE type = 'agent.scout_genome'
     ORDER BY created_at DESC LIMIT 1`,
  );
  const g = res?.rows[0]?.payload;
  return g && g.groups ? g : null;
}

function genomeIsFresh(g: ScoutGenome): boolean {
  const age = Date.now() - new Date(g.generatedAt).getTime();
  return age < GENOME_TTL_DAYS * 86_400_000;
}

/** Bounded market pulse: TWO searches (searxng-first via the router), titles+
 *  snippets only. This is the genome's window into "what the market is asking
 *  for THIS month" — the anti-hardcode ingredient. */
async function marketPulse(): Promise<string> {
  if (!webSearchEnabled()) return "";
  const now = new Date();
  const stamp = `${now.toLocaleString("en", { month: "long" })} ${now.getFullYear()}`;
  const qs = [
    `AI automation hiring demand trends ${stamp}`,
    `empresas buscan automatizar con inteligencia artificial ${now.getFullYear()}`,
  ];
  const lines: string[] = [];
  for (const q of qs) {
    const hits = await runWebSearchRaw(q, 5);
    for (const h of hits ?? []) {
      lines.push(`- ${h.title ?? ""}: ${(h.snippet ?? "").slice(0, 160)}`);
    }
  }
  return lines.slice(0, 12).join("\n");
}

function validQuery(q: unknown): q is string {
  return typeof q === "string" && q.trim().length >= 8 && q.trim().length <= 110;
}

// one regeneration at a time per process (the scout runs once a day, but a
// manual admin trigger could race it)
let genomeRegenInFlight = false;

/** Regenerate the genome: ONE completion, fed by identity + market + yield. */
async function regenerateGenome(
  performance: QueryPerformance[],
): Promise<ScoutGenome | null> {
  if (!isLlmConfigured() || genomeRegenInFlight) return null;
  genomeRegenInFlight = true;
  try {
    // identity straight from code — the CV is the source, not a query list
    const skills = capabilities.map((c) => c.capability).join("; ");
    const pulse = await marketPulse();

    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            `You design the WEEKLY search-query genome for the autonomous prospecting scout of ${profile.name} (${profile.role}). ` +
            `His provable skills (from his live capability matrix): ${skills}. ` +
            `He sells small, concrete AI systems to companies with operational pain; ideal catches are pages exposing a reachable company/founder (job posts, "we need automation" threads, vendor searches, SME digitalization news, hiring pages). ` +
            `TARGET SIZE — bias hard toward SMALL, founder-led / bootstrapped teams, indie makers, boutique agencies and niche SMBs, where a generic inbox (info@, hola@) actually reaches the person who decides. DE-PRIORITIZE large enterprises and unicorns (their only public contact is a support/HR queue that never reads cold mail) and AVOID mega job-boards/aggregators (LinkedIn, Indeed, Glassdoor) — phrase queries to surface a company's OWN site/careers page, not a listing on a platform. Prefer signals like "small team", "startup", "founder", "we're a team of", "indie", "boutique". ` +
            `Produce THREE groups of web-search queries:\n` +
            `"specific" (10): his exact skills phrased the way a REAL BUYER searches (first person: "empresa busca…", "need ai agent for…").\n` +
            `"broad" (8): general demand — hiring AI engineers / SMB automation — each combined with a concrete vertical and geography.\n` +
            `"stack" (8): teams identified by the technology they already use (Next.js, TypeScript, Postgres, FastAPI, Python, LLM APIs).\n` +
            `LANGUAGE MIX inside every group: mostly Spanish and English, plus 1-2 in Portuguese or French. ` +
            `Use the market pulse to angle queries toward what is being asked for RIGHT NOW, and the past-yield table to repeat winning PATTERNS (not literal queries) and abandon dead ones. ` +
            `Queries read like real search-engine queries, 4-12 words, no boolean operators, no quotes. ` +
            `Reply STRICT JSON only: {"rationale": one line on this week's strategy, "specific": string[], "broad": string[], "stack": string[]}.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            marketPulse: pulse || "(no search provider — rely on skills + yield)",
            pastYield: performance.slice(0, 16),
          }),
        },
      ],
      { maxTokens: 1400, timeoutMs: 45_000 },
    );

    const parsed = JSON.parse(
      (raw ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    ) as { rationale?: unknown; specific?: unknown; broad?: unknown; stack?: unknown };

    const pick = (v: unknown, min: number): string[] | null => {
      const arr = (Array.isArray(v) ? v : []).filter(validQuery).map((q) => q.trim());
      return arr.length >= min ? arr : null;
    };
    const specific = pick(parsed.specific, 6);
    const broad = pick(parsed.broad, 5);
    const stack = pick(parsed.stack, 5);
    if (!specific || !broad || !stack) return null;

    const prev = await loadGenome();
    const genome: ScoutGenome = {
      version: (prev?.version ?? 0) + 1,
      generatedAt: new Date().toISOString(),
      rationale:
        typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 240) : undefined,
      groups: { specific, broad, stack },
    };
    await recordEvent("agent.scout_genome", genome);
    return genome;
  } catch {
    return null; // floor/previous genome keeps the scout alive
  } finally {
    genomeRegenInFlight = false;
  }
}

/** Current genome: cached if fresh; regenerated (bounded) when stale; floor
 *  otherwise. Returns whether this call minted a fresh one (observability). */
async function getGenome(
  performance: QueryPerformance[],
): Promise<{ genome: ScoutGenome; fresh: boolean }> {
  const cached = await loadGenome();
  if (cached && genomeIsFresh(cached)) return { genome: cached, fresh: false };
  const regenerated = await regenerateGenome(performance);
  if (regenerated) return { genome: regenerated, fresh: true };
  // stale genome still beats the bootstrap seeds
  return { genome: cached ?? bootstrapGenome(), fresh: false };
}

// ---- 4. the daily draw: sample the genome, zero tokens ------------------------

/** Seeded, group-balanced draw from a genome, skipping the recent window. */
export function drawFromGenome(
  genome: ScoutGenome,
  count: number,
  recent: string[],
  seed = Math.floor(Date.now() / 86_400_000),
): string[] {
  const recentSet = new Set(recent.map((q) => q.toLowerCase()));
  const out: string[] = [];
  let i = seed * 7 + 3;
  let guard = 0;
  while (out.length < count && guard < 400) {
    guard += 1;
    i += 13;
    const group = GROUP_CYCLE[(out.length + seed) % GROUP_CYCLE.length];
    const bank = genome.groups[group];
    if (!bank?.length) continue;
    const q = bank[i % bank.length];
    if (q && !recentSet.has(q.toLowerCase()) && !out.includes(q)) out.push(q);
  }
  return out;
}

/** Back-compat helper (tests): draw from the bootstrap seeds. */
export function deterministicQueries(
  count: number,
  recent: string[],
  seed = Math.floor(Date.now() / 86_400_000),
): string[] {
  return drawFromGenome(bootstrapGenome(), count, recent, seed);
}

/**
 * Today's plan. All intelligence spend lives in the weekly genome; the daily
 * path is a pure draw — cheap enough to never saturate anything.
 */
export async function planScoutQueries(count: number): Promise<ScoutPlan> {
  const [performance, recent] = await Promise.all([
    getQueryPerformance(),
    getRecentQueries(),
  ]);
  const { genome, fresh } = await getGenome(performance);
  const queries = drawFromGenome(genome, count, recent);
  if (queries.length === 0) {
    // genome fully burned by the recent window (tiny genome edge case)
    return { queries: deterministicQueries(count, recent), strategy: "static-floor" };
  }
  return {
    queries,
    strategy: genome.version === 0 ? "static-floor" : fresh ? "genome-fresh" : "genome",
    rationale: genome.rationale
      ? `genome v${genome.version}: ${genome.rationale}`
      : undefined,
  };
}

/** Adaptive volume: lean when the net comes back full, wider when it starves.
 *  With 3 groups × 4 languages, fewer than 5 slots under-samples the mix. */
export function adaptiveQueryCount(lastIngested: number | null): number {
  if (lastIngested == null) return 5; // first run / no history
  if (lastIngested <= 2) return 8;    // starving -> cast a much wider net
  if (lastIngested <= 6) return 6;
  return 5;                           // healthy -> keep costs lean
}
