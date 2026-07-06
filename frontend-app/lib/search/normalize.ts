import { canonicalizeUrl, normalizeTitle, stableSearchHash } from "./canonicalize";
import type { NormalizedSearchResult } from "./types";

export function normalizeSearchResult(input: {
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
  source?: string | null;
  provider: string;
  publishedAt?: string | null;
  score?: number;
  metadata?: Record<string, unknown>;
}): NormalizedSearchResult | null {
  const url = input.url?.trim();
  if (!url) return null;
  const canonicalUrl = canonicalizeUrl(url);
  return {
    title: input.title?.trim() || canonicalUrl,
    url,
    snippet: input.snippet?.trim() || undefined,
    source: input.source?.trim() || undefined,
    provider: input.provider,
    publishedAt: input.publishedAt ?? undefined,
    score: input.score,
    canonicalUrl,
    hash: stableSearchHash(canonicalUrl),
    metadata: input.metadata,
  };
}

export function dedupeResults(results: NormalizedSearchResult[]): NormalizedSearchResult[] {
  const seen = new Set<string>();
  const titleSeen = new Set<string>();
  const out: NormalizedSearchResult[] = [];
  for (const result of results) {
    const host = (() => {
      try {
        return new URL(result.canonicalUrl).hostname;
      } catch {
        return "";
      }
    })();
    const titleKey = `${host}:${normalizeTitle(result.title)}`;
    if (seen.has(result.canonicalUrl) || (host && titleSeen.has(titleKey))) continue;
    seen.add(result.canonicalUrl);
    if (host) titleSeen.add(titleKey);
    out.push(result);
  }
  return out;
}

