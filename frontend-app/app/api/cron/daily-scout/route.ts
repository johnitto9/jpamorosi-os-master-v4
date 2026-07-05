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
// Degrades: no WEB_SEARCH_API_KEY -> {skipped}; no LLM -> raw results digest;
// no RESEND -> digest lands in email_logs only.
import { NextResponse } from "next/server";
import { guardInternal } from "@/lib/auth/internal";
import { profile } from "@/content/profile";
import { webSearchEnabled, runWebSearchRaw } from "@/lib/agent/tools-server";
import { ingestSearchHits, processPipelineBatch } from "@/lib/agent/prospects";
import { chatCompletion, isLlmConfigured } from "@/lib/agent/llm";
import { notifyAdmin } from "@/lib/email/service";
import { recordEvent } from "@/lib/events";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Rotating angles so every day of the week scans a different corner of the
// market (trends shift; the scout adapts by design, not by framework).
const ANGLES = [
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
    console.warn("[scout] WEB_SEARCH_API_KEY missing — daily scout skipped");
    return NextResponse.json({ ok: false, skipped: "no_web_search_key" });
  }

  const day = new Date().getDay();
  const queries = [ANGLES[day % ANGLES.length], ANGLES[(day + 3) % ANGLES.length]];
  const results: string[] = [];
  let caught = 0;
  for (const q of queries) {
    const hits = await runWebSearchRaw(q, 6);
    if (!hits || hits.length === 0) continue;
    // every raw catch also lands in the prospects dragnet (URL-deduped) —
    // the kanban's ingest column fills itself from these sweeps
    caught += await ingestSearchHits(q, hits);
    results.push(
      `## ${q}\n${hits
        .map((h, i) => `${i + 1}. ${h.title ?? ""} — ${h.snippet ?? ""} (${h.link ?? ""})`)
        .join("\n")}`,
    );
  }
  if (results.length === 0) {
    return NextResponse.json({ ok: false, skipped: "no_results" });
  }

  // move yesterday's catches down the funnel while we're here (bounded batch)
  const pipeline = await processPipelineBatch(8);

  let digest = results.join("\n\n");
  if (isLlmConfigured()) {
    const summary = await chatCompletion([
      {
        role: "system",
        content: `You are a career scout for ${profile.name} (${profile.role}). Profile strengths: shipped AI orchestration engines, production WhatsApp agents, founder-built products; stack Next.js/TypeScript/Postgres/LLM systems. From the search results, pick the 3-5 MOST relevant opportunities/trends, explain the match in one line each, and suggest one concrete action (who to contact / what to send — his CV lives at jpamorosi.dev/cv). Plain text, short, actionable, in Spanish.`,
      },
      { role: "user", content: digest.slice(0, 6000) },
    ]);
    if (summary) digest = summary;
  }

  await notifyAdmin("admin_alert", {
    title: `Scout diario — oportunidades ${date}`,
    detail: digest.slice(0, 4000),
  });
  await recordEvent("ai.response.generated", { via: "daily-scout", queries });
  await recordEvent("agent.daily_scout", {
    date,
    queries,
    prospectsIngested: caught,
    prospectsAdvanced: pipeline.processed,
  });
  return NextResponse.json({
    ok: true,
    date,
    queries,
    prospects: { ingested: caught, advanced: pipeline.processed },
  });
}
