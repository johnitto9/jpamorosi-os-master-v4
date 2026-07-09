// app/api/cron/daily-scout/route.ts
// Daily market scout: searches the web for opportunities matching Juan's
// profile (roles, stacks, markets), has the LLM rank the matches, and emails
// the digest to the admin inbox. Triggered once a day by the worker container
// (scripts/worker.mjs) with the internal bearer token.
//
// Deliberately NOT LangChain: the queries rotate by weekday and the single
// summarize call runs through our own logged LLM client — same no-silence,
// same observability, zero new dependencies.
//
// Degrades: no search provider -> {skipped}; no LLM -> raw results digest;
// no RESEND -> digest lands in email_logs only.
import { NextResponse } from "next/server";
import { guardInternal } from "@/lib/auth/internal";
import { profile } from "@/content/profile";
import { env } from "@/lib/env";
import { webSearchEnabled, runWebSearchRaw } from "@/lib/agent/tools-server";
import { ingestSearchHits, processPipelineBatch, prospectStats, topProspects } from "@/lib/agent/prospects";
import { planScoutQueries, adaptiveQueryCount, getLastRunIngested } from "@/lib/agent/scout-strategy";
import { chatCompletion, isLlmConfigured } from "@/lib/agent/llm";
import { notifyAdmin } from "@/lib/email/service";
import { recordEvent } from "@/lib/events";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Emergency floor if the strategy layer returns nothing (no DB at all): the
// old weekday-rotated angles. The REAL plan comes from lib/agent/scout-strategy
// — performance-aware, LLM-written, never repeating the recent window. This
// is what fixes the decay ("finds emails at first, then dries up"): static
// queries hit the same SERPs after a week and URL-dedup starves the funnel.
const STATIC_ANGLES = [
  "AI product engineer remote hiring",
  "startups hiring AI systems architect LATAM",
  "AI agent development freelance contract opportunities",
  "companies building WhatsApp AI agents hiring",
  "next.js AI full-stack engineer remote openings",
  "AI automation consulting demand trends",
  "founding engineer AI startup openings remote",
];

async function alreadyRanToday(date: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    const res = await tryQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM events
       WHERE type = 'agent.daily_scout'
         AND payload->>'date' = $1
       LIMIT 1`,
      [date],
    );
    return (res?.rows[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  const date = new Date().toISOString().slice(0, 10);

  if (await alreadyRanToday(date)) {
    return NextResponse.json({ ok: true, skipped: "already_ran_today", date });
  }

  if (!webSearchEnabled()) {
    console.warn("[scout] no search provider configured — daily scout skipped");
    return NextResponse.json({ ok: false, skipped: "no_search_provider" });
  }

  // Adaptive volume: when yesterday's net came back empty the scout casts
  // wider today (up to 5 queries); when it's healthy it stays lean (3).
  const lastIngested = await getLastRunIngested();
  const plan = await planScoutQueries(adaptiveQueryCount(lastIngested));
  const day = new Date().getDay();
  const queries =
    plan.queries.length > 0
      ? plan.queries
      : [STATIC_ANGLES[day % STATIC_ANGLES.length], STATIC_ANGLES[(day + 3) % STATIC_ANGLES.length]];
  const results: string[] = [];
  const perQuery: Array<{ query: string; hits: number; ingested: number }> = [];
  let caught = 0;
  for (const q of queries) {
    const hits = await runWebSearchRaw(q, 8);
    if (!hits || hits.length === 0) {
      perQuery.push({ query: q, hits: 0, ingested: 0 });
      continue;
    }
    // every raw catch also lands in the prospects dragnet (URL-deduped) —
    // the kanban's ingest column fills itself from these sweeps
    const ingested = await ingestSearchHits(q, hits);
    caught += ingested;
    perQuery.push({ query: q, hits: hits.length, ingested });
    results.push(
      `## ${q}\n${hits
        .map((h, i) => `${i + 1}. ${h.title ?? ""} — ${h.snippet ?? ""} (${h.link ?? ""})`)
        .join("\n")}`,
    );
  }
  if (results.length === 0) {
    // still record the run so today's queries enter the no-repeat window and
    // tomorrow's plan knows this angle starved (adaptive volume widens)
    await recordEvent("agent.daily_scout", {
      date,
      queries,
      strategy: plan.strategy,
      prospectsIngested: 0,
      prospectsAdvanced: 0,
    });
    return NextResponse.json({ ok: false, skipped: "no_results", queries });
  }

  // move yesterday's catches down the funnel while we're here — batch sized
  // for the wider adaptive net (a card takes 4 passes to reach contact)
  const pipeline = await processPipelineBatch(12);

  let digest = results.join("\n\n");
  let summary: string | undefined;
  if (isLlmConfigured()) {
    summary = await chatCompletion([
      {
        role: "system",
        content: `You are a career scout for ${profile.name} (${profile.role}). Profile strengths: shipped AI orchestration engines, production WhatsApp agents, founder-built products; stack Next.js/TypeScript/Postgres/LLM systems. From the search results, pick the 3-5 MOST relevant opportunities/trends, explain the match in one line each, and suggest one concrete action (who to contact / what to send — his CV lives at jpamorosi.dev/cv). Plain text, short, actionable, in Spanish.`,
      },
      { role: "user", content: digest.slice(0, 6000) },
    ]);
    if (summary) digest = summary;
  }

  const stats = await prospectStats();
  const top = await topProspects(5);
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  await notifyAdmin("scout_digest", {
    date,
    queries,
    ingested: caught,
    advanced: pipeline.processed,
    total: stats.total,
    rawIngest: stats.rawIngest,
    withEmail: stats.withEmail,
    readyToContact: stats.readyToContact,
    highScore: stats.highScore,
    summary: [
      plan.rationale ? `🧭 Estrategia del día (${plan.strategy}): ${plan.rationale}` : null,
      (summary ?? digest).slice(0, 4000),
    ].filter(Boolean).join("\n\n"),
    top,
    adminUrl: `${site}/admin/prospects`,
    exportUrl: `${site}/api/admin/prospects?format=jsonl&scope=all`,
  });
  await recordEvent("ai.response.generated", { via: "daily-scout", queries });
  await recordEvent("agent.daily_scout", {
    date,
    queries,
    strategy: plan.strategy,
    rationale: plan.rationale,
    perQuery,
    prospectsIngested: caught,
    prospectsAdvanced: pipeline.processed,
  });
  return NextResponse.json({
    ok: true,
    date,
    queries,
    strategy: plan.strategy,
    prospects: { ingested: caught, advanced: pipeline.processed },
  });
}
