import { describe, expect, it } from "vitest";
import { premiumEnrichCandidate } from "@/lib/opportunity-discovery/pipeline";
import { selectPremiumHarvestUrls } from "@/lib/opportunity-discovery/planner";
import { SearxngProvider } from "@/lib/search/providers/searxng-provider";
import { harvestContactFromUrls } from "@/lib/agent/prospects";
import type { SearchInput, SearchProvider } from "@/lib/search/types";

const runLive = process.env.LIVE_SEARXNG_DISCOVERY === "true" && !!process.env.SEARXNG_BASE_URL;
const maybe = runLive ? describe : describe.skip;

maybe("live SearXNG-only premium enrichment", () => {
  it("can reproduce the last +1 email without Serper because original-page harvesting found it", async () => {
    const found = await harvestContactFromUrls(
      ["https://reactjobs.io/jobs/nextjs/remote"],
      "premium:skipped:score-below-threshold",
    );

    expect(found.email).toBe("hi@reactjobs.io");
    expect(found.sourceUrl).toBe("https://reactjobs.io/jobs/nextjs/remote");
  }, 20_000);

  it("uses SearXNG as the premium provider and feeds selected URLs into the same scrape filter", async () => {
    const premiumCalls: SearchInput[] = [];
    const searxng = new SearxngProvider();
    const provider: SearchProvider = {
      name: "searxng",
      enabled: () => searxng.enabled(),
      async search(input) {
        const adapted = {
          ...input,
          query: "Search Atlas careers Senior Full-Stack Engineer Next.js contact email",
        };
        premiumCalls.push(adapted);
        return searxng.search(adapted);
      },
    };

    const result = await premiumEnrichCandidate(
      {
        title: "Senior Full-Stack Engineer (Django / Next.js) - Search Atlas",
        url: "https://searchatlas.na.teamtailor.com/jobs/595729-senior-full-stack-engineer-django-next-js",
        snippet: "AI-native marketing platform hiring a full-stack Next.js engineer.",
      },
      {
        providers: [provider],
        minPremiumScore: 35,
        premiumBudget: 1,
      },
    );

    const urls = selectPremiumHarvestUrls(result.candidate, result.candidate.enrichment, 2);

    expect(premiumCalls).toHaveLength(1);
    expect(premiumCalls[0]).toMatchObject({ intent: "enrichment", critical: true, limit: 3 });
    expect(result.premiumCallsUsed).toBe(1);
    expect(result.candidate.enrichment.length).toBeGreaterThan(0);
    expect(urls.every((url) => !/linkedin|indeed|glassdoor|ziprecruiter/i.test(url))).toBe(true);
  }, 25_000);
});
