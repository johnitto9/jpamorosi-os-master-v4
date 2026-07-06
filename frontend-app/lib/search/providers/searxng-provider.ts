import { env } from "@/lib/env";
import { normalizeSearchResult } from "../normalize";
import type { NormalizedSearchResult, SearchInput, SearchProvider } from "../types";

type SearxngResult = {
  title?: string;
  url?: string;
  content?: string;
  engine?: string;
  engines?: string[];
  publishedDate?: string;
  score?: number;
};

export class SearxngProvider implements SearchProvider {
  name = "searxng";

  enabled(): boolean {
    return env.SEARXNG_ENABLED === true && !!env.SEARXNG_BASE_URL;
  }

  async search(input: SearchInput): Promise<NormalizedSearchResult[]> {
    if (!this.enabled() || !input.query.trim()) return [];
    const base = (env.SEARXNG_BASE_URL as string).replace(/\/+$/, "");
    const url = new URL(`${base}/search`);
    url.searchParams.set("q", input.query.slice(0, 220));
    url.searchParams.set("format", "json");
    url.searchParams.set("safesearch", "1");
    if (input.locale) url.searchParams.set("language", input.locale);
    if (input.timeRange) url.searchParams.set("time_range", input.timeRange);
    if (input.categories?.length) url.searchParams.set("categories", input.categories.join(","));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.SEARXNG_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`searxng ${res.status}`);
      const data = (await res.json()) as { results?: SearxngResult[] };
      return (data.results ?? [])
        .map((hit, i) =>
          normalizeSearchResult({
            title: hit.title,
            url: hit.url,
            snippet: hit.content,
            source: hit.engine ?? hit.engines?.join(", "),
            provider: this.name,
            publishedAt: hit.publishedDate,
            score: typeof hit.score === "number" ? hit.score : 100 - i,
            metadata: { rawRank: i + 1, engines: hit.engines },
          }),
        )
        .filter((r): r is NormalizedSearchResult => !!r)
        .slice(0, input.limit ?? 4);
    } finally {
      clearTimeout(timer);
    }
  }
}

