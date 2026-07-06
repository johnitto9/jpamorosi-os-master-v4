import { describe, expect, it } from "vitest";
import { buildPremiumEnrichmentQuery, buildSearxngEnrichmentQuery, premiumEnrichmentDecision, selectPremiumHarvestUrls } from "@/lib/opportunity-discovery/planner";
import { premiumEnrichCandidate, runOpportunityDiscovery } from "@/lib/opportunity-discovery/pipeline";
import { scoreOpportunityCandidate } from "@/lib/opportunity-discovery/score";
import { normalizeSearchResult } from "@/lib/search/normalize";
import type { SearchInput, SearchProvider } from "@/lib/search/types";

function provider(
  name: string,
  urls: string[],
  calls: { inputs: SearchInput[] },
): SearchProvider {
  return {
    name,
    enabled: () => true,
    async search(input: SearchInput) {
      calls.inputs.push(input);
      return urls.map((url, i) => normalizeSearchResult({
        title: i === 0
          ? "Remote AI automation engineer hiring"
          : `Result ${i}`,
        url,
        snippet: i === 0
          ? "Startup hiring TypeScript LLM automation developer, contact careers page"
          : "Generic result",
        provider: name,
        source: name,
      })!);
    },
  };
}

function providerWithTitles(
  name: string,
  rows: Array<{ title: string; url: string; snippet?: string }>,
  calls: { inputs: SearchInput[] },
): SearchProvider {
  return {
    name,
    enabled: () => true,
    async search(input: SearchInput) {
      calls.inputs.push(input);
      return rows.map((row) => normalizeSearchResult({
        title: row.title,
        url: row.url,
        snippet: row.snippet,
        provider: name,
        source: name,
      })!);
    },
  };
}

describe("serper augmented opportunity discovery", () => {
  it("does not spend premium search on weak candidates", async () => {
    const calls = { inputs: [] as SearchInput[] };
    const result = await premiumEnrichCandidate(
      {
        title: "Weekly design inspiration list",
        url: "https://example.com/blog",
        snippet: "A generic article with no hiring signal",
      },
      {
        providers: [provider("serper", ["https://premium.example.com/contact"], calls)],
        minPremiumScore: 45,
      },
    );

    expect(result.premiumCallsUsed).toBe(0);
    expect(calls.inputs).toHaveLength(0);
    expect(result.enrichmentText).toContain("premium:skipped");
  });

  it("uses Serper once for a strong incomplete candidate", async () => {
    const calls = { inputs: [] as SearchInput[] };
    const result = await premiumEnrichCandidate(
      {
        title: "AI automation engineer",
        url: "https://signalforge.ai/careers",
        snippet: "Startup hiring remote TypeScript developer for LLM agents",
      },
      {
        providers: [provider("serper", ["https://signalforge.ai/contact"], calls)],
        minPremiumScore: 45,
      },
    );

    expect(result.premiumCallsUsed).toBe(1);
    expect(calls.inputs).toHaveLength(1);
    expect(calls.inputs[0]).toMatchObject({ intent: "enrichment", critical: true, limit: 3 });
    expect(calls.inputs[0].query).toContain("hiring");
    expect(calls.inputs[0].query).toContain("contact");
    expect(calls.inputs[0].query).toContain("email");
  });

  it("skips premium when the candidate already has contact and company context", () => {
    const candidate = scoreOpportunityCandidate({
      title: "AI automation engineer",
      url: "https://signalforge.ai/careers",
      snippet: "Hiring remote TypeScript developer. Email founder@signalforge.ai",
      company: "SignalForge",
      email: "founder@signalforge.ai",
    });

    expect(premiumEnrichmentDecision(candidate).shouldUsePremium).toBe(false);
    expect(premiumEnrichmentDecision(candidate).reason).toBe("already-has-contact-context");
  });

  it("builds premium queries with identity and outreach keywords", () => {
    const candidate = scoreOpportunityCandidate({
      title: "Founder hiring AI automation developer",
      url: "https://signalforge.ai/jobs",
      snippet: "Remote LLM agent product role",
      company: "SignalForge",
    });

    const query = buildPremiumEnrichmentQuery(candidate);
    expect(query).toContain("SignalForge");
    expect(query).toContain("signalforge.ai");
    expect(query).toContain("founder");
    expect(query).toContain("careers");
    expect(query).toContain("product");
  });

  it("builds shorter provider-aware SearXNG queries", () => {
    const candidate = scoreOpportunityCandidate({
      title: "Senior Full-Stack Engineer (Django / Next.js) - Search Atlas",
      url: "https://searchatlas.na.teamtailor.com/jobs/595729-senior-full-stack-engineer-django-next-js",
      snippet: "AI-native marketing platform hiring a full-stack engineer",
    });

    const searxngQuery = buildSearxngEnrichmentQuery(candidate);
    const serperQuery = buildPremiumEnrichmentQuery(candidate);

    expect(searxngQuery).toContain("site:searchatlas.na.teamtailor.com");
    expect(searxngQuery).toContain("contact email careers");
    expect(searxngQuery.length).toBeLessThan(serperQuery.length);
  });

  it("uses SearXNG enrichment first and avoids Serper when it returns scrape-worthy URLs", async () => {
    const searxngCalls = { inputs: [] as SearchInput[] };
    const serperCalls = { inputs: [] as SearchInput[] };

    const result = await premiumEnrichCandidate(
      {
        title: "AI automation engineer",
        url: "https://signalforge.ai/careers",
        snippet: "Startup hiring remote TypeScript developer for LLM agents",
      },
      {
        providers: [
          providerWithTitles("searxng", [
            {
              title: "SignalForge contact",
              url: "https://signalforge.ai/contact",
              snippet: "Founder contact email and careers",
            },
          ], searxngCalls),
          provider("serper", ["https://premium.example.com/contact"], serperCalls),
        ],
        minPremiumScore: 45,
      },
    );

    expect(result.premiumCallsUsed).toBe(0);
    expect(result.premiumCallsAvoided).toBe(1);
    expect(searxngCalls.inputs).toHaveLength(1);
    expect(serperCalls.inputs).toHaveLength(0);
    expect(result.enrichmentText).toContain("sovereign:searxng:");
  });

  it("keeps Serper under the premium budget during broad discovery", async () => {
    const calls = {
      searxng: { inputs: [] as SearchInput[] },
      serper: { inputs: [] as SearchInput[] },
    };

    const searxng = provider(
      "searxng",
      [
        "https://alpha.ai/careers",
        "https://beta.ai/jobs",
        "https://gamma.dev/careers",
        "https://delta.com/blog",
      ],
      calls.searxng,
    );
    const serper = provider(
      "serper",
      ["https://premium.example.com/contact"],
      calls.serper,
    );

    const report = await runOpportunityDiscovery(
      {
        query: "AI automation startups hiring remote TypeScript engineers",
        broadLimit: 4,
        candidateLimit: 4,
        premiumBudget: 2,
        minPremiumScore: 35,
      },
      [searxng, serper],
    );

    expect(report.broadProvider).toBe("searxng");
    expect(calls.searxng.inputs).toHaveLength(1);
    expect(calls.serper.inputs.length).toBeLessThanOrEqual(2);
    expect(report.premiumCallsUsed).toBeLessThanOrEqual(2);
    expect(report.premiumCallsAvoided).toBeGreaterThanOrEqual(1);
  });

  it("selects scrape-worthy premium URLs and rejects random job aggregators", async () => {
    const calls = { inputs: [] as SearchInput[] };
    const result = await premiumEnrichCandidate(
      {
        title: "AI automation engineer",
        url: "https://signalforge.ai/careers",
        snippet: "Startup hiring remote TypeScript developer for LLM agents",
      },
      {
        providers: [provider("serper", [
          "https://linkedin.com/jobs/view/123",
          "https://signalforge.ai/contact",
          "https://ziprecruiter.com/jobs/ai-engineer",
        ], calls)],
        minPremiumScore: 45,
      },
    );

    expect(selectPremiumHarvestUrls(result.candidate, result.candidate.enrichment)).toEqual([
      "https://signalforge.ai/contact",
    ]);
  });

  it("does not scrape unrelated ATS jobs just because they share the same host", async () => {
    const calls = { inputs: [] as SearchInput[] };
    const result = await premiumEnrichCandidate(
      {
        title: "Full-Stack Next.js Engineer - Jamloop - Lever",
        url: "https://jobs.lever.co/jam-loop/82b46d52",
        snippet: "JamLoop is hiring a full-stack Next.js engineer",
      },
      {
        providers: [provider("serper", [
          "https://jobs.lever.co/jobgether",
          "https://jobs.lever.co/jam-loop/82b46d52",
        ], calls)],
        minPremiumScore: 35,
      },
    );

    expect(result.candidate.company).toBe("Jam Loop");
    expect(selectPremiumHarvestUrls(result.candidate, result.candidate.enrichment)).toEqual([
      "https://jobs.lever.co/jam-loop/82b46d52",
    ]);
  });
});
