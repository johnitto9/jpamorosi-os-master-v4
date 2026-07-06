import { afterEach, describe, expect, it, vi } from "vitest";
import type { SearchInput, SearchProvider } from "@/lib/search/types";

describe("search router fallback", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("falls back from failed SearXNG to Serper once when enabled", async () => {
    const prev = { ...process.env };
    process.env = {
      ...prev,
      SEARXNG_FALLBACK_TO_SERPER: "true",
      SEARCH_PRIMARY_PROVIDER: "searxng",
      SEARCH_PREMIUM_PROVIDER: "serper",
    };
    const { search } = await import("@/lib/search/router");
    const { normalizeSearchResult } = await import("@/lib/search/normalize");
    const calls = { searxng: 0, serper: 0 };
    const providers: SearchProvider[] = [
      {
        name: "searxng",
        enabled: () => true,
        async search(_input: SearchInput) {
          calls.searxng += 1;
          throw new Error("searxng down");
        },
      },
      {
        name: "serper",
        enabled: () => true,
        async search(_input: SearchInput) {
          calls.serper += 1;
          return [normalizeSearchResult({ title: "Premium", url: "https://premium.dev/job", provider: "serper" })!];
        },
      },
    ];

    const report = await search({ query: "ai jobs", intent: "broad-discovery", limit: 3 }, providers);
    expect(report.provider).toBe("serper");
    expect(report.fallbackUsed).toBe(true);
    expect(calls).toEqual({ searxng: 1, serper: 1 });
    process.env = prev;
  });
});
