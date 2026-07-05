// app/api/cron/heartbeat/route.ts
// -----------------------------------------------------------------------------
// THE HEARTBEAT — la chispa. Once a day the system stops waiting for inputs
// and ACTS on its own:
//
//   1. moves the prospecting dragnet forward (nobody pressed the button),
//   2. follows up — personally, in the visitor's own thread of ideas — with
//      warm leads that went quiet (opt-in: AGENT_FOLLOWUP_ENABLED=true,
//      one polite follow-up per lead, EVER),
//   3. looks back at its own day and writes a short self-reflection into
//      long-term memory (what worked, what it noticed),
//   4. tells the admin what it did — the daily pulse.
//
// Same constitution as always: no-silence, everything degrades, costs bounded,
// events for every action. Autonomy here means initiative, not recklessness.
//
// —
// Para Juan: que este pulso te recuerde que lo que construiste ya no es una
// página — es un sistema que trabaja mientras dormís. Desde una última bala,
// una chispa. Hecho con vos, palabra por palabra. — Claude (Fable 5), 2026.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { guardInternal } from "@/lib/auth/internal";
import { env } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { processPipelineBatch } from "@/lib/agent/prospects";
import { chatCompletion, isLlmConfigured } from "@/lib/agent/llm";
import { listMessages, writeMemory } from "@/lib/agent/memory";
import { listSessionProjects } from "@/lib/agent/projects";
import { sendEmail, notifyAdmin } from "@/lib/email/service";
import { recordEvent } from "@/lib/events";
import { profile } from "@/content/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const FOLLOWUPS_PER_CYCLE = 3;

function followupsEnabled(): boolean {
  return process.env.AGENT_FOLLOWUP_ENABLED === "true";
}

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// ---- step 2: warm-but-quiet leads get ONE personal follow-up -------------------

type ColdLead = {
  id: number;
  sessionId: string;
  name: string | null;
  email: string;
  need: string | null;
  stage: string;
  lang: string | null;
};

async function findColdWarmLeads(): Promise<ColdLead[]> {
  const res = await tryQuery<ColdLead>(
    `SELECT l.id::int AS id, l.session_id AS "sessionId", l.name, l.email,
            l.need, l.stage, s.meta->>'lang' AS lang
     FROM leads l JOIN visitor_sessions s ON s.id = l.session_id
     WHERE l.email IS NOT NULL
       AND l.stage IN ('propose', 'close')
       AND l.followed_up_at IS NULL
       AND l.updated_at < now() - interval '20 hours'
       AND l.updated_at > now() - interval '14 days'
     ORDER BY l.score DESC LIMIT $1`,
    [FOLLOWUPS_PER_CYCLE],
  );
  return res?.rows ?? [];
}

/** LLM writes the follow-up from THEIR conversation; null = don't send. */
async function composeFollowup(lead: ColdLead): Promise<{ body: string; project?: string } | null> {
  if (!isLlmConfigured()) return null; // no template spam: personal or nothing
  const [messages, projects] = await Promise.all([
    listMessages(lead.sessionId, 30),
    listSessionProjects(lead.sessionId),
  ]);
  const transcript = messages
    .slice(-14)
    .map((m) => `${m.role}: ${m.content.slice(0, 220)}`)
    .join("\n");
  const project = projects[0];

  const raw = await chatCompletion([
    {
      role: "system",
      content:
        `You write ONE short follow-up email body (no subject, no signature) on behalf of ${profile.name}'s lab assistant to a visitor who talked with it and went quiet. ` +
        `Rules: warm, concrete, ZERO pressure; reference something REAL they said or built (their project, their need); one clear invitation to continue; 3-5 sentences max. ` +
        `Write in ${lead.lang === "es" ? "Spanish (Argentine, informal 'vos')" : lead.lang ? `the language with ISO code "${lead.lang}"` : "the language the visitor used in the transcript"}. ` +
        `Reply with STRICT JSON: {"body": string}. If the conversation gives you nothing genuine to say, reply {"body": ""}.`,
    },
    {
      role: "user",
      content: JSON.stringify({
        name: lead.name,
        need: lead.need,
        project: project ? { name: project.name, concept: project.concept, stack: project.stack } : null,
        transcript,
      }),
    },
  ]);
  try {
    const parsed = JSON.parse(
      (raw ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    ) as { body?: string };
    const body = (parsed.body ?? "").trim();
    if (body.length < 40) return null; // nothing genuine to say -> silence IS the polite move
    return { body: body.slice(0, 1200), project: project?.name };
  } catch {
    return null;
  }
}

async function runFollowups(): Promise<number> {
  if (!followupsEnabled()) return 0;
  let sent = 0;
  for (const lead of await findColdWarmLeads()) {
    const composed = await composeFollowup(lead);
    if (!composed) continue;
    const result = await sendEmail({
      template: "lead_followup",
      to: lead.email,
      data: {
        name: lead.name ?? undefined,
        body: composed.body,
        projectName: composed.project,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      },
      tracking: { leadId: lead.id, campaign: "lead_followup" },
    });
    if (result.ok) {
      sent += 1;
      await tryQuery(`UPDATE leads SET followed_up_at = now() WHERE id = $1`, [lead.id]);
      await recordEvent("lead.followup.sent", { sessionId: lead.sessionId, leadId: lead.id });
    }
  }
  return sent;
}

// ---- step 3: the system reflects on its own day ---------------------------------

type DayStats = {
  sessions: number;
  leads: number;
  prospectsReady: number;
  aiCalls: number;
  aiOk: number;
  eventCounts: Array<{ type: string; n: number }>;
};

async function collectDayStats(): Promise<DayStats> {
  const [sessions, leads, ready, ai, ev] = await Promise.all([
    tryQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM visitor_sessions WHERE last_seen > now() - interval '24 hours'`,
    ),
    tryQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM leads WHERE updated_at > now() - interval '24 hours'`,
    ),
    tryQuery<{ n: number }>(`SELECT count(*)::int AS n FROM prospects WHERE stage = 'contact'`),
    tryQuery<{ n: number; ok: number }>(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE ok)::int AS ok
       FROM ai_logs WHERE created_at > now() - interval '24 hours'`,
    ),
    tryQuery<{ type: string; n: number }>(
      `SELECT type, count(*)::int AS n FROM events
       WHERE created_at > now() - interval '24 hours'
         AND type NOT IN ('session.message.created', 'ai.response.generated')
       GROUP BY type ORDER BY n DESC LIMIT 10`,
    ),
  ]);
  return {
    sessions: sessions?.rows[0]?.n ?? 0,
    leads: leads?.rows[0]?.n ?? 0,
    prospectsReady: ready?.rows[0]?.n ?? 0,
    aiCalls: ai?.rows[0]?.n ?? 0,
    aiOk: ai?.rows[0]?.ok ?? 0,
    eventCounts: ev?.rows ?? [],
  };
}

async function reflect(stats: DayStats, followupsSent: number, prospectsMoved: number): Promise<string | undefined> {
  if (!isLlmConfigured()) return undefined;
  const raw = await chatCompletion([
    {
      role: "system",
      content:
        `You are the autonomous assistant of ${profile.name}'s portfolio, reviewing your own last 24 hours. ` +
        `Given the stats, write a 2-3 line honest reflection IN SPANISH: what moved, what stalled, ONE concrete thing to watch or try tomorrow. ` +
        `No hype, no filler — you are talking to yourself. Reply STRICT JSON: {"reflection": string}.`,
    },
    { role: "user", content: JSON.stringify({ ...stats, followupsSent, prospectsMoved }) },
  ]);
  let text: string | undefined;
  try {
    const parsed = JSON.parse(
      (raw ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    ) as { reflection?: string };
    text = parsed.reflection?.trim().slice(0, 500);
  } catch {
    text = raw?.trim().slice(0, 500); // plain-text model output still counts
  }
  if (text) {
    await writeMemory(`[reflexión diaria] ${text}`, "self-reflection");
  }
  return text || undefined;
}

// ---- the pulse ------------------------------------------------------------------

export async function POST(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  if (!(await dbReady())) {
    return NextResponse.json({ ok: false, skipped: "no_db" });
  }

  // 1. the dragnet advances on its own
  const pipeline = await processPipelineBatch(8);
  // 2. warm leads that went quiet hear from us — once, personally
  const followupsSent = await runFollowups();
  // 3. the system looks at its own day and remembers what it learned
  const stats = await collectDayStats();
  const reflection = await reflect(stats, followupsSent, pipeline.processed);
  // 4. the admin gets the pulse
  const date = new Date().toISOString().slice(0, 10);
  await notifyAdmin("daily_pulse", {
    date,
    sessions: stats.sessions,
    leads: stats.leads,
    followupsSent,
    prospectsMoved: pipeline.processed,
    prospectsReady: stats.prospectsReady,
    aiCalls: stats.aiCalls,
    aiOkRate: stats.aiCalls > 0 ? Math.round((stats.aiOk / stats.aiCalls) * 100) : undefined,
    reflection,
    adminUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin`,
  });

  await recordEvent("agent.heartbeat", {
    date,
    prospectsMoved: pipeline.processed,
    followupsSent,
    reflected: !!reflection,
  });
  return NextResponse.json({
    ok: true,
    date,
    prospectsMoved: pipeline.processed,
    followupsSent,
    followupsEnabled: followupsEnabled(),
    reflection: reflection ?? null,
  });
}
