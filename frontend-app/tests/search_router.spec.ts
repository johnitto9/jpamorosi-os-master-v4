import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "@/lib/search/canonicalize";
import { dedupeResults, normalizeSearchResult } from "@/lib/search/normalize";
import { search } from "@/lib/search/router";
import type { SearchInput, SearchProvider } from "@/lib/search/types";

function provider(name: string, results: string[], fail = false, calls?: { n: number }): SearchProvider {
  return {
    name,
    enabled: () => true,
    async search(_input: SearchInput) {
      if (calls) calls.n += 1;
      if (fail) throw new Error(`${name} failed`);
      return results.map((url, i) => normalizeSearchResult({
        title: `Result ${i}`,
        url,
        provider: name,
      })!);
    },
  };
}

describe("search canonicalization", () => {
  it("removes tracking params and normalizes host/path", () => {
    expect(
      canonicalizeUrl("https://www.Example.com/path/?utm_source=x&b=2&a=1#frag"),
    ).toBe("https://example.com/path?a=1&b=2");
  });

  it("dedupes equivalent URLs", () => {
    const one = normalizeSearchResult({ title: "A", url: "https://x.com/a?utm_source=n", provider: "x" })!;
    const two = normalizeSearchResult({ title: "A", url: "https://www.x.com/a", provider: "y" })!;
    expect(dedupeResults([one, two])).toHaveLength(1);
  });
});

describe("search router", () => {
  it("uses primary results without premium fallback when enough results exist", async () => {
    const report = await search(
      { query: "ai startup", limit: 3, intent: "broad-discovery" },
      [
        provider("searxng", ["https://a.com/1", "https://b.com/2", "https://c.com/3"]),
        provider("serper", ["https://premium.com/1"]),
      ],
    );
    expect(report.provider).toBe("searxng");
    expect(report.fallbackUsed).toBe(false);
    expect(report.results.map((r) => r.provider)).toEqual(["searxng", "searxng", "searxng"]);
  });

  it("routes critical verification directly to the premium provider", async () => {
    const searxngCalls = { n: 0 };
    const serperCalls = { n: 0 };
    const report = await search(
      { query: "company verification", limit: 3, intent: "critical-verification", critical: true },
      [
        provider("searxng", ["https://broad.com/1"], false, searxngCalls),
        provider("serper", ["https://verified.com/1", "https://verified.com/2", "https://verified.com/3"], false, serperCalls),
      ],
    );
    expect(report.provider).toBe("serper");
    expect(searxngCalls.n).toBe(0);
    expect(serperCalls.n).toBe(1);
  });
});
