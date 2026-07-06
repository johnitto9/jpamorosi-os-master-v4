import { env } from "@/lib/env";
import { normalizeSearchResult } from "../normalize";
import type { NormalizedSearchResult, SearchInput, SearchProvider } from "../types";

const SERPER_TIMEOUT_MS = 8_000;

type SerperHit = {
  title?: string;
  snippet?: string;
  link?: string;
  date?: string;
  source?: string;
};

export class SerperProvider implements SearchProvider {
  name = "serper";

  enabled(): boolean {
    return !!env.WEB_SEARCH_API_KEY;
  }

  async search(input: SearchInput): Promise<NormalizedSearchResult[]> {
    if (!this.enabled() || !input.query.trim()) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "X-API-KEY": env.WEB_SEARCH_API_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: input.query.slice(0, 220),
          num: Math.min(input.limit ?? 4, 10),
        }),
      });
      if (!res.ok) throw new Error(`serper ${res.status}`);
      const data = (await res.json()) as { organic?: SerperHit[] };
      return (data.organic ?? [])
        .map((hit, i) =>
          normalizeSearchResult({
            title: hit.title,
            url: hit.link,
            snippet: hit.snippet,
            source: hit.source,
            provider: this.name,
            publishedAt: hit.date,
            score: 100 - i,
            metadata: { rawRank: i + 1 },
          }),
        )
        .filter((r): r is NormalizedSearchResult => !!r)
        .slice(0, input.limit ?? 4);
    } finally {
      clearTimeout(timer);
    }
  }
}

