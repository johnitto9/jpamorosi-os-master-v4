import type { NormalizedSearchResult } from "@/lib/search/types";
import type { OpportunityCandidate, OpportunityCandidateInput } from "./types";

const POSITIVE: Array<[string, number, string]> = [
  ["ai", 10, "ai"],
  ["ia", 8, "ia"],
  ["llm", 10, "llm"],
  ["agent", 8, "agents"],
  ["automation", 9, "automation"],
  ["automatizacion", 8, "automation-es"],
  ["startup", 7, "startup"],
  ["founder", 7, "founder"],
  ["hiring", 9, "hiring"],
  ["careers", 8, "careers"],
  ["jobs", 8, "jobs"],
  ["remote", 6, "remote"],
  ["developer", 7, "developer"],
  ["engineer", 7, "engineer"],
  ["typescript", 8, "typescript"],
  ["next.js", 8, "nextjs"],
  ["full-stack", 7, "fullstack"],
  ["product", 5, "product"],
  ["saas", 6, "saas"],
  ["whatsapp", 5, "whatsapp"],
];

const NEGATIVE_DOMAINS = [
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "tiktok.com",
  "reddit.com",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export function inferDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function inferCompanyFromDomain(domain: string | null): string | null {
  if (!domain) return null;
  const first = domain.split(".")[0]?.replace(/[-_]+/g, " ").trim();
  if (!first || first.length < 2) return null;
  return first.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

export function inferCompanyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const parts = u.pathname.split("/").filter(Boolean);
    if (host === "jobs.lever.co" && parts[0]) return titleCase(parts[0].replace(/[-_]+/g, " "));
    if (host.endsWith(".teamtailor.com")) return titleCase(host.split(".")[0].replace(/[-_]+/g, " "));
    return inferCompanyFromDomain(host);
  } catch {
    return null;
  }
}

function normalizeHaystack(input: OpportunityCandidateInput): string {
  return `${input.title ?? ""} ${input.snippet ?? ""} ${input.url ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function scoreOpportunityCandidate(
  input: OpportunityCandidateInput,
): OpportunityCandidate {
  const domain = inferDomain(input.url);
  const hay = normalizeHaystack(input);
  const reasons: string[] = [];
  let score = 0;

  for (const [keyword, weight, reason] of POSITIVE) {
    if (hay.includes(keyword)) {
      score += weight;
      reasons.push(reason);
    }
  }

  if (input.email || EMAIL_RE.test(`${input.snippet ?? ""} ${input.title ?? ""}`)) {
    score += 14;
    reasons.push("direct-email");
  }
  if (input.company) {
    score += 8;
    reasons.push("company-known");
  }
  if (input.url && /\/(jobs?|careers?|work-with-us|contact|about|company)(\/|$|\?)/i.test(input.url)) {
    score += 10;
    reasons.push("high-intent-url");
  }
  if (domain && NEGATIVE_DOMAINS.some((d) => domain.endsWith(d))) {
    score -= 30;
    reasons.push("low-signal-domain");
  }

  const email = input.email ?? `${input.snippet ?? ""} ${input.title ?? ""}`.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const company = input.company ?? inferCompanyFromUrl(input.url) ?? inferCompanyFromDomain(domain);
  const initialScore = Math.max(0, Math.min(100, score));

  return {
    title: (input.title ?? "Untitled opportunity").slice(0, 220),
    url: input.url ?? null,
    snippet: (input.snippet ?? "").slice(0, 1000),
    source: input.source ?? undefined,
    provider: input.provider ?? undefined,
    company,
    email,
    domain,
    initialScore,
    finalScore: initialScore,
    reasons: [...new Set(reasons)],
    needsPremiumEnrichment: false,
    enrichment: [],
  };
}

export function scoreSearchResult(result: NormalizedSearchResult): OpportunityCandidate {
  return scoreOpportunityCandidate({
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    source: result.source,
    provider: result.provider,
  });
}
