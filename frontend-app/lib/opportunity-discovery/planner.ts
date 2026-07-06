import type { OpportunityCandidate, PremiumDecision } from "./types";
import type { NormalizedSearchResult } from "@/lib/search/types";
import { inferDomain } from "./score";

const DEFAULT_MIN_PREMIUM_SCORE = 45;
const LOW_VALUE_HOSTS = [
  "google.com",
  "bing.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "jooble.org",
  "simplyhired.com",
];

const ATS_HOSTS = ["jobs.lever.co", "greenhouse.io", "ashbyhq.com", "workable.com", "teamtailor.com"];

function normalizedToken(value: string | null | undefined): string | null {
  const token = value
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return token && token.length >= 4 ? token : null;
}

function isAtsHost(host: string): boolean {
  return ATS_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

function resultMatchesCandidateIdentity(candidate: OpportunityCandidate, result: NormalizedSearchResult): boolean {
  const hay = `${result.url} ${result.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const company = normalizedToken(candidate.company);
  if (company) return hay.includes(company);
  const titleBits = candidate.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !["remote", "senior", "engineer", "developer", "hiring", "fullstack"].includes(w));
  return titleBits.some((w) => hay.includes(w));
}

function compact(parts: Array<string | null | undefined>): string[] {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p && p.length > 1));
}

export function buildPremiumEnrichmentQuery(candidate: OpportunityCandidate): string {
  const identity = compact([
    candidate.company,
    candidate.domain,
    candidate.title,
  ]).join(" ");

  const context = [
    "hiring",
    "AI",
    "automation",
    "developer",
    "founder",
    "contact",
    "email",
    "careers",
    "about",
    "product",
  ];

  return compact([identity.slice(0, 160), ...context]).join(" ").replace(/\s+/g, " ").trim();
}

function roleTerms(candidate: OpportunityCandidate): string {
  return candidate.title
    .split(/[^a-zA-Z0-9.+#-]+/)
    .filter((w) => w.length >= 4)
    .filter((w) => !["remote", "senior", "junior", "hiring", "jobs"].includes(w.toLowerCase()))
    .slice(0, 5)
    .join(" ");
}

export function buildSearxngEnrichmentQuery(candidate: OpportunityCandidate): string {
  const core = compact([
    candidate.company,
    roleTerms(candidate),
  ]).join(" ");
  const contactTerms = "contact email careers";
  if (candidate.domain) {
    return compact([`site:${candidate.domain}`, core, contactTerms]).join(" ").replace(/\s+/g, " ").trim();
  }
  return compact([core || candidate.title, contactTerms]).join(" ").replace(/\s+/g, " ").trim();
}

export function premiumEnrichmentDecision(
  candidate: OpportunityCandidate,
  minScore = DEFAULT_MIN_PREMIUM_SCORE,
): PremiumDecision {
  if (candidate.initialScore < minScore) {
    return { shouldUsePremium: false, reason: "score-below-threshold" };
  }
  if (candidate.email && candidate.company) {
    return { shouldUsePremium: false, reason: "already-has-contact-context" };
  }
  if (!candidate.url && !candidate.company && candidate.title === "Untitled opportunity") {
    return { shouldUsePremium: false, reason: "not-enough-identity" };
  }
  const query = buildPremiumEnrichmentQuery(candidate);
  if (!query) return { shouldUsePremium: false, reason: "empty-query" };
  return { shouldUsePremium: true, reason: "premium-enrichment-needed", query };
}

function hostValue(candidate: OpportunityCandidate, result: NormalizedSearchResult): number {
  const host = inferDomain(result.url);
  if (!host) return -100;
  if (LOW_VALUE_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))) return -80;
  if (isAtsHost(host) && !resultMatchesCandidateIdentity(candidate, result)) return -70;

  let score = 0;
  if (candidate.domain && host === candidate.domain) score += 60;
  if (candidate.domain && host.endsWith(`.${candidate.domain}`)) score += 45;
  if (candidate.company && result.title.toLowerCase().includes(candidate.company.toLowerCase())) score += 15;
  if (/\/(contact|contacto|about|careers?|jobs?|company)(\/|$|\?)/i.test(result.url)) score += 20;
  if (/(contact|email|founder|careers?|hiring)/i.test(`${result.title} ${result.snippet ?? ""}`)) score += 10;
  return score;
}

export function selectPremiumHarvestUrls(
  candidate: OpportunityCandidate,
  results: NormalizedSearchResult[],
  limit = 2,
): string[] {
  const seen = new Set<string>();
  return results
    .map((result) => ({ result, value: hostValue(candidate, result) }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
    .map(({ result }) => result.url)
    .filter((url) => {
      const host = inferDomain(url);
      if (!host || seen.has(host)) return false;
      seen.add(host);
      return true;
    })
    .slice(0, limit);
}
