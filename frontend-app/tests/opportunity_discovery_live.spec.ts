import { describe, expect, it } from "vitest";
import { runOpportunityDiscovery } from "@/lib/opportunity-discovery/pipeline";
import { SerperProvider } from "@/lib/search/providers/serper-provider";
import { normalizeSearchResult } from "@/lib/search/normalize";
import type { SearchInput, SearchProvider } from "@/lib/search/types";

const runLive = process.env.LIVE_OPPORTUNITY_DISCOVERY === "true" && !!process.env.WEB_SEARCH_API_KEY;
const maybe = runLive ? describe : describe.skip;

maybe("live serper augmented opportunity discovery", () => {
  it("spends exactly one premium Serper call on a strong incomplete candidate", async () => {
    const broadCalls: SearchInput[] = [];
    const premiumCalls: SearchInput[] = [];
    const serper = new SerperProvider();

    const broadProvider: SearchProvider = {
      name: "searxng",
      enabled: () => true,
      async search(input) {
        broadCalls.push(input);
        return [
          normalizeSearchResult({
            title: "Remote AI automation engineer hiring",
            url: "https://signalforge.ai/careers",
            snippet: "Startup hiring TypeScript developer for LLM agents and workflow automation.",
            provider: "searxng",
            source: "live-fixture",
          })!,
          normalizeSearchResult({
            title: "Generic design inspiration roundup",
            url: "https://example.com/blog/design",
            snippet: "No hiring or contact signal.",
            provider: "searxng",
            source: "live-fixture",
          })!,
        ];
      },
    };

    const premiumProvider: SearchProvider = {
      name: "serper",
      enabled: () => serper.enabled(),
      async search(input) {
        premiumCalls.push(input);
        return serper.search(input);
      },
    };

    const report = await runOpportunityDiscovery(
      {
        query: "AI automation startups hiring remote TypeScript developers",
        broadLimit: 2,
        candidateLimit: 2,
        premiumBudget: 1,
        minPremiumScore: 35,
      },
      [broadProvider, premiumProvider],
    );

    expect(broadCalls).toHaveLength(1);
    expect(premiumCalls).toHaveLength(1);
    expect(premiumCalls[0]).toMatchObject({ intent: "enrichment", critical: true, limit: 3 });
    expect(premiumCalls[0].query).toContain("hiring");
    expect(premiumCalls[0].query).toContain("contact");
    expect(premiumCalls[0].query).toContain("email");
    expect(report.premiumCallsUsed).toBe(1);
    expect(report.candidates[0].enrichment.length).toBeGreaterThan(0);
  }, 20_000);
});
