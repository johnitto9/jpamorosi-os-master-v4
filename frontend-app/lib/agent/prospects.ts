// lib/agent/prospects.ts
// -----------------------------------------------------------------------------
// Outbound prospecting funnel — the "dragnet" behind /admin/prospects.
//
// Two intake mouths, one river:
//   ingestSearchHits   the daily scout throws serper nets into the market and
//                      every raw catch lands here (stage=ingest, deduped by URL)
//   ingestDroppedText  the admin drops a forwarded email / raw text about a
//                      lead; it's parsed (LLM when available, regex otherwise)
//                      and enters the SAME river as the scout's catches.
//
// processPipelineBatch advances cards ONE stage per pass — the kanban moves
// because code moves it:
//   ingest  -> filter     deterministic relevance filter (keywords vs junk)
//   filter  -> enrich     one fine serper search on the company/title
//   enrich  -> qualify    LLM scores fit 0-100 + reason + next action
//                         (deterministic keyword score without a key)
//   qualify -> contact    score >= threshold; below it -> discarded
//   contact -> contacted  manual (the admin actually reached out)
//
// Same house rules as everything else: degrades without DB, no-silence,
// every transition is an event, costs bounded per batch.
// -----------------------------------------------------------------------------

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";
import { profile } from "@/content/profile";
import { premiumEnrichCandidate } from "@/lib/opportunity-discovery/pipeline";
import { selectPremiumHarvestUrls } from "@/lib/opportunity-discovery/planner";
import { chatCompletion, isLlmConfigured } from "./llm";
import type { SearchHit } from "./tools-server";

export type ProspectStage =
  | "ingest" | "filter" | "enrich" | "qualify" | "contact" | "contacted" | "discarded";

export type Prospect = {
  id: number;
  stage: ProspectStage;
  source: string;
  title: string | null;
  company: string | null;
  contactName: string | null;
  email: string | null;
  url: string | null;
  snippet: string | null;
  enrichment: string | null;
  fitReason: string | null;
  nextAction: string | null;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type ProspectStats = {
  total: number;
  byStage: Record<string, number>;
  withEmail: number;
  readyToContact: number;
  highScore: number;
  rawIngest: number;
};

const QUALIFY_THRESHOLD = 55;

const SELECT = `id::int AS id, stage, source, title, company,
  contact_name AS "contactName", email, url, snippet, enrichment,
  fit_reason AS "fitReason", next_action AS "nextAction", score,
  created_at::text AS "createdAt", updated_at::text AS "updatedAt"`;

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// ---- intake --------------------------------------------------------------------

/** Scout catches: every serper hit becomes an ingest-stage card (URL-deduped). */
export async function ingestSearchHits(
  query: string,
  hits: SearchHit[],
): Promise<number> {
  if (!(await dbReady())) return 0;
  let created = 0;
  for (const h of hits) {
    if (!h.link) continue;
    const res = await tryQuery<{ id: number }>(
      `INSERT INTO prospects (stage, source, title, snippet, url, raw)
       VALUES ('ingest', 'scout', $1, $2, $3, $4::jsonb)
       ON CONFLICT (url) WHERE url IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        h.title?.slice(0, 200) ?? null,
        h.snippet?.slice(0, 500) ?? null,
        h.link.slice(0, 500),
        JSON.stringify({ query, hit: h }),
      ],
    );
    if (res?.rows[0]?.id) {
      created += 1;
      await recordEvent("prospect.created", { source: "scout", query, url: h.link });
    }
  }
  return created;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /https?:\/\/[^\s<>"')]+/i;

// Emails that are never a real human contact (asset filenames, tracking, boilerplate).
const EMAIL_JUNK =
  /(example\.|sentry|wixpress|godaddy|cloudflare|no-?reply|noreply|donotreply|postmaster|webmaster@|@2x|\.(png|jpe?g|gif|webp|svg))/i;
const EMAIL_DISCOVERY_TIMEOUT_MS = 7_000;

// Plausible TLDs — a regex glued from page JS/text can fabricate "x@app.route";
// requiring a real-ish ending (+ a >=2 char local part) rejects that noise.
const PLAUSIBLE_TLD =
  /^(com|org|net|io|ai|co|dev|app|info|biz|me|xyz|tech|store|online|site|edu|gov|us|uk|es|ar|mx|br|cl|pe|uy|de|fr|it|nl|pt|ca|au|in|eu|ch|se|no|fi|pl|ru|jp|kr|cn)$/;

function cleanEmail(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  const e = candidate.toLowerCase().trim();
  if (EMAIL_JUNK.test(e)) return null;
  const m = e.match(/^([^@\s]+)@[^@\s]+\.([a-z]{2,})$/);
  if (!m || m[1].length < 2 || !PLAUSIBLE_TLD.test(m[2])) return null;
  return e;
}

/** Best-effort email discovery for the mailing DB. Reuses text we already have,
 *  then fetches the SINGLE page the scout already found (not a crawler). Bounded
 *  by a timeout and a response cap; never throws, never blocks the pipeline. */
// Likely contact pages on the same host — job boards hide emails on the
// listing, but the company's /contact or /about usually exposes one. Ported
// from BBN's light fetcher approach (fetch + parse, no browser).
function contactPages(url: string): string[] {
  try {
    const u = new URL(url);
    const base = `${u.protocol}//${u.host}`;
    return [url, `${base}/contact`, `${base}/contacto`, `${base}/about`, `${base}/nosotros`];
  } catch {
    return [url];
  }
}

// Company name from og:site_name / <title> / the domain (best-effort).
function companyFromDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const name = host.split(".")[0];
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
  } catch {
    return null;
  }
}

function companyFromHtml(html: string, url: string): string | null {
  // og:site_name is the real brand — trust it first.
  const site = html.match(/property=["']og:site_name["']\s+content=["']([^"']{2,80})["']/i)?.[1];
  if (site) return site.trim().split(/[|\-–—·]/)[0].trim().slice(0, 80) || null;
  // <title> is often an article headline, not the company — only use it when it
  // reads like a short brand (<=4 words, no sentence punctuation); else domain.
  const title = html.match(/<title[^>]*>([^<]{2,80})<\/title>/i)?.[1];
  if (title) {
    const t = title.trim().split(/[|\-–—·]/)[0].trim();
    if (t && t.split(/\s+/).length <= 4 && !/[?.!]$/.test(t)) return t.slice(0, 80);
  }
  return companyFromDomain(url);
}

async function fetchTextSafe(url: string, ms: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; AmorosiScout/1.0; +https://jpamorosi.dev)",
      },
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 300_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Harvest a contact email + company for a prospect: scan the signals we
 *  already have, then fetch the listing URL and a couple of likely contact
 *  pages (where emails actually live). Bounded: <=3 network fetches, short
 *  timeout each. This is the step that was missing — serper SERPs carry no
 *  emails, so without fetching the pages the funnel produced hollow cards. */
export async function harvestContact(
  url: string | null,
  extraText: string | null,
): Promise<{ email: string | null; company: string | null }> {
  const fromText = cleanEmail(extraText?.match(EMAIL_RE)?.[0]) ?? null;
  if (!url) return { email: fromText, company: null };

  let email = fromText;
  let company: string | null = null;
  for (const page of contactPages(url).slice(0, 3)) {
    const html = await fetchTextSafe(page, EMAIL_DISCOVERY_TIMEOUT_MS);
    if (!html) continue;
    company = company ?? companyFromHtml(html, url);
    if (!email) {
      const mailto = cleanEmail(
        html.match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1],
      );
      email = mailto ?? cleanEmail(html.match(EMAIL_RE)?.[0]) ?? null;
    }
    if (email && company) break;
  }
  return { email, company };
}

export async function harvestContactFromUrls(
  urls: Array<string | null | undefined>,
  extraText: string | null,
): Promise<{ email: string | null; company: string | null; sourceUrl: string | null }> {
  let best: { email: string | null; company: string | null; sourceUrl: string | null } = {
    email: cleanEmail(extraText?.match(EMAIL_RE)?.[0]) ?? null,
    company: null,
    sourceUrl: null,
  };
  for (const url of urls) {
    if (!url) continue;
    const found = await harvestContact(url, extraText);
    best = {
      email: best.email ?? found.email,
      company: best.company ?? found.company,
      sourceUrl: found.email || found.company ? url : best.sourceUrl,
    };
    if (best.email && best.company) break;
  }
  return best;
}

/** Admin-dropped email/text about a lead. LLM parses when available; the
 *  regex fallback still produces a workable card. Never returns silence. */
export async function ingestDroppedText(
  text: string,
): Promise<Prospect | null> {
  const clean = text.trim().slice(0, 6000);
  if (!clean || !(await dbReady())) return null;

  // deterministic floor: whatever the LLM does, these signals are real
  const email = clean.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const url = clean.match(URL_RE)?.[0]?.slice(0, 500) ?? null;
  // "From: Name <mail>" is how forwarded emails carry the sender
  const fromLine = clean.match(/^\s*(?:from|de)\s*:\s*(.+)$/im)?.[1]?.trim();
  let contactName = fromLine ? fromLine.replace(/<[^>]*>/, "").trim().slice(0, 120) || null : null;
  let company = email ? (email.split("@")[1]?.split(".")[0] ?? null) : null;
  let title = clean.split(/\r?\n/).find((l) => l.trim().length > 8)?.trim().slice(0, 200) ?? "Dropped lead";
  let snippet = clean.slice(0, 400);

  if (isLlmConfigured()) {
    const parsed = await chatCompletion([
      {
        role: "system",
        content:
          `Extract lead data from a pasted email/text. Reply with STRICT JSON only: ` +
          `{"title": short one-line summary of the opportunity, "company"?: string, "contactName"?: string, "email"?: string, "snippet": 1-2 sentence gist}. ` +
          `No invention: omit fields you cannot ground in the text.`,
      },
      { role: "user", content: clean },
    ]);
    try {
      const j = JSON.parse(
        (parsed ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
      ) as Record<string, unknown>;
      if (typeof j.title === "string" && j.title.trim()) title = j.title.slice(0, 200);
      if (typeof j.company === "string" && j.company.trim()) company = j.company.slice(0, 160);
      if (typeof j.contactName === "string" && j.contactName.trim()) contactName = j.contactName.slice(0, 120);
      if (typeof j.snippet === "string" && j.snippet.trim()) snippet = j.snippet.slice(0, 500);
    } catch {
      /* regex floor already populated everything essential */
    }
  }

  const res = await tryQuery<Prospect>(
    `INSERT INTO prospects (stage, source, title, company, contact_name, email, url, snippet, raw)
     VALUES ('ingest', 'email_drop', $1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING ${SELECT}`,
    [title, company, contactName, email, url, snippet, JSON.stringify({ text: clean.slice(0, 3000) })],
  );
  const prospect = res?.rows[0] ?? null;
  if (prospect) {
    await recordEvent("prospect.created", { source: "email_drop", id: prospect.id });
  }
  return prospect;
}

// ---- listing / manual moves ------------------------------------------------------

export async function listProspects(limit = 300): Promise<Prospect[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Prospect>(
    `SELECT ${SELECT} FROM prospects ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}

/** Board surface: keep raw scout noise bounded. The archive/export can hold
 *  thousands; cards are only for active/advanced opportunities plus a small
 *  ingest preview so the admin sees the net is working without drowning. */
export async function listBoardProspects(): Promise<Prospect[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Prospect>(
    `(SELECT ${SELECT} FROM prospects
       WHERE stage = 'ingest'
       ORDER BY updated_at DESC
       LIMIT 20)
     UNION ALL
     (SELECT ${SELECT} FROM prospects
       WHERE stage IN ('filter','enrich','qualify','contact','contacted')
       ORDER BY
         CASE
           WHEN stage = 'contact' THEN 0
           WHEN stage = 'qualify' THEN 1
           WHEN stage = 'enrich' THEN 2
           WHEN stage = 'filter' THEN 3
           ELSE 4
         END,
         score DESC,
         updated_at DESC
       LIMIT 280)`,
  );
  return res?.rows ?? [];
}

export async function prospectStats(): Promise<ProspectStats> {
  if (!(await dbReady())) {
    return { total: 0, byStage: {}, withEmail: 0, readyToContact: 0, highScore: 0, rawIngest: 0 };
  }
  const res = await tryQuery<{
    total: number;
    withEmail: number;
    readyToContact: number;
    highScore: number;
    rawIngest: number;
    byStage: Record<string, number>;
  }>(
    `WITH totals AS (
       SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE email IS NOT NULL)::int AS with_email,
         count(*) FILTER (WHERE stage = 'contact')::int AS ready_to_contact,
         count(*) FILTER (WHERE score >= 70)::int AS high_score,
         count(*) FILTER (WHERE stage = 'ingest')::int AS raw_ingest
       FROM prospects
     ),
     stages AS (
       SELECT COALESCE(jsonb_object_agg(stage, n), '{}'::jsonb) AS by_stage
       FROM (SELECT stage, count(*)::int AS n FROM prospects GROUP BY stage) s
     )
     SELECT total AS "total",
            with_email AS "withEmail",
            ready_to_contact AS "readyToContact",
            high_score AS "highScore",
            raw_ingest AS "rawIngest",
            by_stage AS "byStage"
     FROM totals, stages`,
  );
  const row = res?.rows[0];
  return {
    total: row?.total ?? 0,
    byStage: row?.byStage ?? {},
    withEmail: row?.withEmail ?? 0,
    readyToContact: row?.readyToContact ?? 0,
    highScore: row?.highScore ?? 0,
    rawIngest: row?.rawIngest ?? 0,
  };
}

export async function topProspects(limit = 5): Promise<Prospect[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Prospect>(
    `SELECT ${SELECT} FROM prospects
     WHERE stage IN ('qualify','contact','contacted')
     ORDER BY score DESC, email IS NOT NULL DESC, updated_at DESC
     LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}

export async function getProspect(id: number): Promise<Prospect | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<Prospect>(
    `SELECT ${SELECT} FROM prospects WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res?.rows[0] ?? null;
}

/** Mailing DB: prospects that reached qualify+ AND have a discovered email —
 *  the export surface for warm/opt-in outreach. Highest fit first. */
export async function listMailingCandidates(): Promise<Prospect[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Prospect>(
    `SELECT ${SELECT} FROM prospects
     WHERE email IS NOT NULL AND stage IN ('qualify','contact','contacted')
     ORDER BY score DESC, updated_at DESC`,
  );
  return res?.rows ?? [];
}

/** Admin manual move (mark contacted / discard). Whitelisted stages only. */
export async function setProspectStage(
  id: number,
  stage: ProspectStage,
): Promise<boolean> {
  const allowed: ProspectStage[] = ["contacted", "discarded", "contact"];
  if (!allowed.includes(stage) || !(await dbReady())) return false;
  const res = await tryQuery(
    `UPDATE prospects SET stage = $2, updated_at = now() WHERE id = $1`,
    [id, stage],
  );
  if (res) await recordEvent("prospect.updated", { id, stage, by: "admin" });
  return res !== null;
}

export async function markProspectOutreachSent(
  id: number,
  providerId?: string,
): Promise<boolean> {
  if (!(await dbReady())) return false;
  const res = await tryQuery(
    `UPDATE prospects SET stage = 'contacted', updated_at = now()
     WHERE id = $1 AND stage = 'contact'`,
    [id],
  );
  if ((res?.rowCount ?? 0) > 0) {
    await recordEvent("prospect.outreach.sent", {
      id,
      providerId,
      stage: "contacted",
    });
  }
  return (res?.rowCount ?? 0) > 0;
}

// ---- the pipeline brain ----------------------------------------------------------

// what "relevant to Juan's market" means, deterministically
const RELEVANT = [
  "ai", "ia", "llm", "agent", "agente", "engineer", "developer", "dev",
  "software", "startup", "hiring", "contrata", "app", "automation",
  "automatización", "product", "saas", "web", "whatsapp", "chatbot",
  "full-stack", "fullstack", "next.js", "typescript", "freelance", "remote",
];
const JUNK_DOMAINS = ["youtube.com", "facebook.com", "pinterest.com", "tiktok.com"];

export function relevanceScore(p: Pick<Prospect, "title" | "snippet">): number {
  const hay = `${p.title ?? ""} ${p.snippet ?? ""}`.toLowerCase();
  return RELEVANT.filter((k) => hay.includes(k)).length;
}

export type ProspectLang = "es" | "en";

const ES_MARKERS = [
  "que", "con", "para", "por", "una", "del", "los", "las", "está", "como",
  "más", "pero", "su", "se", "al", "lo", "le", "sin", "sobre", "entre",
  "desde", "hasta", "también", "años", "experiencia", "buscamos", "equipo",
  "trabajo", "desarrollo", "empresa", "proyecto", "plataforma", "solución",
];
const EN_MARKERS = [
  "the", "and", "for", "with", "that", "this", "from", "they", "are", "was",
  "is", "in", "on", "at", "to", "of", "we", "you", "our", "your", "looking",
  "team", "work", "development", "company", "project", "platform", "solution",
  "years", "experience", "seeking", "join", "build",
];
const ES_CHARS = /[áéíóúñü¿¡]/i;

/** Detect prospect language from publication text — 0 tokens, keyword + accent analysis.
 *  Falls back to "es" (the system's default outreach language). */
export function detectProspectLang(
  p: Pick<Prospect, "title" | "snippet" | "enrichment" | "url">,
): ProspectLang {
  const text = `${p.title ?? ""} ${p.snippet ?? ""} ${p.enrichment ?? ""}`.toLowerCase();
  if (!text.trim()) return "es";

  let es = 0;
  let en = 0;

  if (ES_CHARS.test(text)) es += 3;

  for (const w of ES_MARKERS) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text)) es += 1;
  }
  for (const w of EN_MARKERS) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text)) en += 1;
  }

  if (p.url) {
    const tld = p.url.match(/\.(\w{2,4})(?:\/|$)/)?.[1];
    if (tld && ["es", "ar", "mx", "cl", "pe", "uy", "co", "ve", "ec"].includes(tld)) es += 2;
    if (tld && ["uk", "au", "nz", "ie"].includes(tld)) en += 2;
  }

  return en > es + 1 ? "en" : "es";
}

// ---- outreach generation (single source of truth) --------------------------
// Every outreach email — manual OR autonomously produced by the scout — flows
// through buildProspectOutreachData(). Language is derived once from the
// prospect's STORED signals (title/snippet/enrichment/url), so the same lead
// always yields the same coherent es/en email: subject, body and chrome never
// drift apart. 0 tokens, 0 extra cost, no schema change.

// 5 "what I've built" variants — rotated deterministically by prospect.id.
// No tech-stack name-dropping unless causally relevant; these describe outcomes.
const BUILT_VARIANTS_ES = [
  "He construido cosas parecidas — agent workflows y automatizaciones que quedan corriendo en producción.",
  "Trabajo en sistemas similares — pipelines de IA y backoffices que no son prototipos, sino herramientas que se usan.",
  "Tengo experiencia directa acá — agent workflows de bajo costo e integraciones que quedan operando.",
  "Construí sistemas en esta zona — multi-model orchestration y flujos de captura que aguantan uso real.",
  "He shippeado cosas en este espacio — automatizaciones con IA y asistentes que siguen corriendo.",
];
const BUILT_VARIANTS_EN = [
  "I've built similar things — agent workflows and automations that stay running in production.",
  "I work on similar systems — AI pipelines and backoffices that aren't prototypes, but tools people use.",
  "I have direct experience here — low-cost agent workflows and integrations that stay operational.",
  "I've built systems in this space — multi-model orchestration and capture flows that hold up under real use.",
  "I've shipped things in this area — AI automations and assistants that keep running.",
];

export function defaultOutreachBody(p: Prospect, lang: ProspectLang): string {
  const built = (lang === "en" ? BUILT_VARIANTS_EN : BUILT_VARIANTS_ES)[
    p.id % BUILT_VARIANTS_ES.length
  ];
  if (lang === "en") {
    const company = p.company ?? "your team";
    return [
      `I saw what ${company} is doing and it looked like a zone where a well-placed AI system can take operational work off the table.`,
      "",
      built,
      "",
      "If it makes sense, I can look at a concrete case and send you something small and measurable.",
      "",
      "Juan",
    ].join("\n");
  }
  const company = p.company ?? "tu equipo";
  return [
    `Vi lo que están haciendo en ${company} y me pareció una zona donde un sistema de IA bien puesto puede sacar trabajo operativo del medio.`,
    "",
    built,
    "",
    "Si tiene sentido, puedo mirar un caso concreto y mandarte algo chico y medible.",
    "",
    "Juan",
  ].join("\n");
}

export function prospectSignals(p: Prospect): string[] {
  // Only raw observations — fitReason and nextAction have their own cards.
  // This prevents repetition between body, signals, overlap and next step.
  return [p.snippet, p.enrichment]
    .map((s) => s?.replace(/\s+/g, " ").trim())
    .filter((s): s is string => Boolean(s))
    .map((s) => s.slice(0, 220));
}

export type ProspectOutreachData = {
  company?: string;
  contactName?: string;
  subjectSignal?: string;
  subjectReason?: string;
  body: string;
  siteUrl: string;
  sourceUrl?: string;
  signals?: string[];
  fitReason?: string;
  nextAction?: string;
  visualUrl?: string;
  avatarUrl?: string;
  lang: ProspectLang;
  seed: number;
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function subjectParts(p: Prospect, lang: ProspectLang): { signal: string; reason: string } {
  const company = p.company ?? (lang === "en" ? "your team" : "tu equipo");
  const text = `${p.title ?? ""} ${p.snippet ?? ""} ${p.enrichment ?? ""}`.toLowerCase();
  const isEn = lang === "en";

  if (includesAny(text, ["editorial", "contenido", "content", "news", "noticias", "ranking"])) {
    return isEn
      ? { signal: `Editorial sorting at ${company}`, reason: "low-cost agent workflows fit the job" }
      : { signal: `Clasificación editorial en ${company}`, reason: "un agent workflow de bajo costo encaja" };
  }
  if (includesAny(text, ["whatsapp", "commerce", "catalog", "catalogo", "orders", "ordenes", "e-commerce", "ecommerce", "storefront"])) {
    return isEn
      ? { signal: `WhatsApp commerce at ${company}`, reason: "tool-first agents are the useful layer" }
      : { signal: `Comercio por WhatsApp en ${company}`, reason: "un agente con herramientas es la capa útil" };
  }
  if (includesAny(text, ["trading", "risk", "backtesting", "market", "mercado", "fintech", "quant", "dataset"])) {
    return isEn
      ? { signal: `Risk-gated AI work at ${company}`, reason: "my closest overlap is modular R&D" }
      : { signal: `IA con control de riesgo en ${company}`, reason: "mi overlap más cercano es R&D modular" };
  }
  if (includesAny(text, ["lead", "leads", "scoring", "crm", "qualification", "calificacion", "clasificacion", "priorizacion", "pipeline comercial"])) {
    return isEn
      ? { signal: `Lead prioritization at ${company}`, reason: "an agent can sort the pipeline" }
      : { signal: `Leads sin priorización en ${company}`, reason: "un agente puede ordenar el pipeline" };
  }
  if (includesAny(text, ["onboarding", "manual", "operativo", "operations", "ops"])) {
    return isEn
      ? { signal: `Manual operations at ${company}`, reason: "a small system can remove the busywork" }
      : { signal: `Operación manual en ${company}`, reason: "un sistema chico puede sacar trabajo repetido" };
  }

  return isEn
    ? { signal: `Operational signals at ${company}`, reason: "a focused AI system may fit" }
    : { signal: `Señales operativas en ${company}`, reason: "un sistema de IA enfocado puede encajar" };
}

function cleanPublicText(text: string): string {
  return text
    .replace(/^(direct match|strong overlap|adjacent experience|useful analogy)\s*:\s*/i, "")
    .replace(/\bJuan\s+(Pablo\s+Amorosi\s+)?(built|has|tiene|ya construy[oó]|construy[oó])\b/gi, "construí")
    .replace(/\s+/g, " ")
    .trim();
}

function looksInternal(text: string): boolean {
  return /(reach out|outreach|presenting|presentar|escribir a|contactar|send you|who to contact|next action|scratchpad|strategy)/i.test(text);
}

function publicOverlap(p: Prospect, lang: ProspectLang): string | undefined {
  const raw = p.fitReason ? cleanPublicText(p.fitReason) : "";
  if (raw && !looksInternal(raw)) return raw.slice(0, 300);
  const company = p.company ?? (lang === "en" ? "your team" : "tu equipo");
  return lang === "en"
    ? `The overlap is the operational layer around ${company}: signals, workflows, and the small systems that turn manual work into repeatable process.`
    : `El overlap está en la capa operativa de ${company}: señales, flujos y sistemas chicos que convierten trabajo manual en proceso repetible.`;
}

function publicNextStep(lang: ProspectLang): string {
  return lang === "en"
    ? "Reply with one workflow that still takes too much manual time; I can map a small first system around it."
    : "Respondeme con un flujo que todavía consuma demasiado trabajo manual; puedo mapear un primer sistema chico alrededor de eso.";
}

/** The single coherent outreach payload for a prospect. Derives language from
 *  stored signals and threads it (plus a deterministic seed) into every field,
 *  so subject + body + chrome always agree. Autonomous and manual paths share
 *  this exact function. */
export function buildProspectOutreachData(
  p: Prospect,
  siteUrl: string,
  options: { visualUrl?: string; avatarUrl?: string } = {},
): ProspectOutreachData {
  const lang = detectProspectLang(p);
  const subject = subjectParts(p, lang);
  return {
    company: p.company ?? undefined,
    contactName: p.contactName ?? undefined,
    subjectSignal: subject.signal,
    subjectReason: subject.reason,
    body: defaultOutreachBody(p, lang),
    siteUrl,
    sourceUrl: p.url ?? undefined,
    signals: prospectSignals(p),
    fitReason: publicOverlap(p, lang),
    nextAction: publicNextStep(lang),
    visualUrl: options.visualUrl ?? new URL("/og.jpg", siteUrl).toString(),
    avatarUrl: options.avatarUrl ?? new URL("/imgs/img-profile-jpa.jpg", siteUrl).toString(),
    lang,
    seed: p.id,
  };
}

export function nextStageFromIngest(
  p: Pick<Prospect, "url" | "title" | "snippet" | "source">,
): ProspectStage {
  const junk = p.url ? JUNK_DOMAINS.some((d) => p.url!.includes(d)) : false;
  return !junk && (relevanceScore(p) >= 2 || p.source === "email_drop")
    ? "filter"
    : "discarded";
}

export function nextStageFromQualify(score: number): ProspectStage {
  return score >= QUALIFY_THRESHOLD ? "contact" : "discarded";
}

async function advance(
  id: number,
  stage: ProspectStage,
  patch: Partial<Pick<Prospect, "enrichment" | "fitReason" | "nextAction" | "score" | "email" | "company">> = {},
): Promise<void> {
  await tryQuery(
    `UPDATE prospects SET stage = $2,
       enrichment  = COALESCE($3, enrichment),
       fit_reason  = COALESCE($4, fit_reason),
       next_action = COALESCE($5, next_action),
       score       = COALESCE($6, score),
       email       = COALESCE($7, email),
       company     = COALESCE($8, company),
       updated_at  = now()
     WHERE id = $1`,
    [
      id, stage,
      patch.enrichment ?? null, patch.fitReason ?? null, patch.nextAction ?? null,
      patch.score ?? null, patch.email ?? null, patch.company ?? null,
    ],
  );
  await recordEvent("prospect.advanced", { id, stage });
}

/** LLM qualification; deterministic keyword scoring when there is no key. */
async function qualifyProspect(
  p: Prospect,
): Promise<{ score: number; fitReason: string; nextAction: string }> {
  if (isLlmConfigured()) {
    const raw = await chatCompletion([
      {
        role: "system",
        content:
          `You qualify outbound prospects for ${profile.name} (${profile.role}) — strengths: shipped AI orchestration engines, production WhatsApp agents, founder-built products; stack Next.js/TypeScript/Postgres/LLM systems. ` +
          `Reply STRICT JSON only: {"score": 0-100 fit, "fitReason": one concrete line WHY (or why not), "nextAction": one actionable outreach step in Spanish (who to contact, with what angle)}. Be skeptical; generic listicles score low.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title: p.title, company: p.company, snippet: p.snippet,
          url: p.url, enrichment: p.enrichment?.slice(0, 1500), source: p.source,
        }),
      },
    ]);
    try {
      const j = JSON.parse(
        (raw ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
      ) as Record<string, unknown>;
      const score = Math.max(0, Math.min(100, Math.round(Number(j.score))));
      if (Number.isFinite(score) && typeof j.fitReason === "string") {
        return {
          score,
          fitReason: j.fitReason.slice(0, 400),
          nextAction: typeof j.nextAction === "string" ? j.nextAction.slice(0, 400) : "Revisar manualmente",
        };
      }
    } catch {
      /* fall through to the deterministic floor */
    }
  }
  // deterministic floor: keyword density, direct-contact bonus
  const score = Math.min(100, relevanceScore(p) * 12 + (p.email ? 20 : 0));
  return {
    score,
    fitReason: `Keyword relevance ${relevanceScore(p)}/${RELEVANT.length}${p.email ? " + contacto directo" : ""} (sin LLM)`,
    nextAction: p.email
      ? `Escribir a ${p.email} presentando el perfil de ${profile.name}`
      : "Buscar un contacto en el sitio y presentar el perfil",
  };
}

export type PipelineReport = {
  processed: number;
  moves: Array<{ id: number; from: ProspectStage; to: ProspectStage }>;
};

/** Advance up to `limit` cards ONE stage each, oldest-touched first — the
 *  kanban visibly rotates on every pass. Serper/LLM cost is bounded by limit. */
export async function processPipelineBatch(limit = 6): Promise<PipelineReport> {
  if (!(await dbReady())) return { processed: 0, moves: [] };
  const res = await tryQuery<Prospect>(
    `SELECT ${SELECT} FROM prospects
     WHERE stage IN ('ingest','filter','enrich','qualify')
     ORDER BY updated_at ASC LIMIT $1`,
    [limit],
  );
  const batch = res?.rows ?? [];
  const moves: PipelineReport["moves"] = [];

  for (const p of batch) {
    const from = p.stage;
    if (p.stage === "ingest") {
      // deterministic relevance gate: junk drowns, signal passes
      const to = nextStageFromIngest(p);
      await advance(p.id, to);
      moves.push({ id: p.id, from, to });
    } else if (p.stage === "filter") {
      // Premium enrichment is a scalpel now: only high-fit, incomplete cards
      // can spend Serper, and the query is built for contact/hiring context.
      const premium = await premiumEnrichCandidate(
        {
          title: p.title,
          url: p.url,
          snippet: p.snippet,
          source: p.source,
          company: p.company,
          email: p.email,
        },
        { minPremiumScore: 38, premiumBudget: 1 },
      );
      const enrichment = [
        premium.premiumCallsUsed > 0
          ? `premium:serper:${premium.candidate.premiumQuery ?? ""}`
          : premium.enrichmentText,
        premium.premiumCallsUsed > 0 ? premium.enrichmentText : null,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000);
      const premiumUrls = selectPremiumHarvestUrls(premium.candidate, premium.candidate.enrichment, 2);
      // Harvest the original URL plus selected premium Serper URLs. Serper is
      // only useful if it opens pages where contact data can actually be read.
      const found =
        p.email && p.company
          ? { email: p.email, company: p.company, sourceUrl: p.url }
          : await harvestContactFromUrls([p.url, ...premiumUrls], enrichment);
      await advance(p.id, "enrich", {
        enrichment: [
          enrichment,
          premiumUrls.length > 0 ? `premium:scrape:${premiumUrls.join(", ")}` : null,
          found.sourceUrl ? `contact:source:${found.sourceUrl}` : null,
        ].filter(Boolean).join("\n").slice(0, 2000),
        email: found.email ?? undefined,
        company: found.company ?? undefined,
      });
      if (found.email && !p.email) {
        await recordEvent("prospect.email_found", { id: p.id, email: found.email });
      }
      moves.push({ id: p.id, from, to: "enrich" });
    } else if (p.stage === "enrich") {
      const q = await qualifyProspect(p);
      await advance(p.id, "qualify", q);
      moves.push({ id: p.id, from, to: "qualify" });
    } else if (p.stage === "qualify") {
      const to = nextStageFromQualify(p.score);
      await advance(p.id, to);
      moves.push({ id: p.id, from, to });
    }
  }
  return { processed: moves.length, moves };
}
