import { search, searchProviders } from "@/lib/search/router";
import { dedupeResults } from "@/lib/search/normalize";
import type { NormalizedSearchResult, SearchInput, SearchProvider } from "@/lib/search/types";
import { buildSearxngEnrichmentQuery, premiumEnrichmentDecision, selectPremiumHarvestUrls } from "./planner";
import { scoreOpportunityCandidate, scoreSearchResult } from "./score";
import type {
  OpportunityCandidate,
  OpportunityCandidateInput,
  OpportunityDiscoveryInput,
  OpportunityDiscoveryReport,
} from "./types";

function byScore(a: OpportunityCandidate, b: OpportunityCandidate): number {
  return b.initialScore - a.initialScore;
}

async function providerSearch(
  provider: SearchProvider,
  input: SearchInput,
): Promise<NormalizedSearchResult[]> {
  try {
    return dedupeResults(await provider.search(input));
  } catch (err) {
    console.warn(`[opportunity] ${provider.name} enrichment failed:`, (err as Error).message.slice(0, 160));
    return [];
  }
}

export async function premiumEnrichCandidate(
  input: OpportunityCandidateInput,
  options: {
    providers?: SearchProvider[];
    minPremiumScore?: number;
    premiumBudget?: number;
  } = {},
): Promise<{
  candidate: OpportunityCandidate;
  premiumCallsUsed: number;
  premiumCallsAvoided: number;
  enrichmentText: string;
}> {
  const candidate = scoreOpportunityCandidate(input);
  const decision = premiumEnrichmentDecision(candidate, options.minPremiumScore);
  candidate.needsPremiumEnrichment = decision.shouldUsePremium;
  candidate.premiumQuery = decision.query;

  if (!decision.shouldUsePremium) {
    return {
      candidate,
      premiumCallsUsed: 0,
      premiumCallsAvoided: 1,
      enrichmentText: `premium:skipped:${decision.reason}`,
    };
  }
  if ((options.premiumBudget ?? 1) < 1) {
    return {
      candidate,
      premiumCallsUsed: 0,
      premiumCallsAvoided: 1,
      enrichmentText: "premium:skipped:budget-exhausted",
    };
  }

  const providers = options.providers ?? searchProviders();
  const searxng = providers.find((p) => p.name === "searxng" && p.enabled());
  if (searxng) {
    const sovereignQuery = buildSearxngEnrichmentQuery(candidate);
    const sovereignResults = await providerSearch(searxng, {
      query: sovereignQuery,
      intent: "enrichment",
      critical: false,
      limit: 3,
    });
    if (sovereignResults.length > 0) {
      candidate.enrichment = sovereignResults;
      candidate.finalScore = Math.min(100, candidate.initialScore + 6);
      const harvestUrls = selectPremiumHarvestUrls(candidate, sovereignResults, 2);
      if (harvestUrls.length > 0) {
        return {
          candidate,
          premiumCallsUsed: 0,
          premiumCallsAvoided: 1,
          enrichmentText: [
            `sovereign:searxng:${sovereignQuery}`,
            sovereignResults.map((h) => `${h.title} - ${h.snippet ?? ""} (${h.url})`).join("\n"),
          ].join("\n"),
        };
      }
    }
  }

  const report = await search(
    {
      query: decision.query!,
      intent: "enrichment",
      critical: true,
      limit: 3,
    },
    providers,
  );

  candidate.enrichment = report.results;
  candidate.finalScore = Math.min(100, candidate.initialScore + (report.results.length > 0 ? 10 : 0));

  const enrichmentText = report.results.length > 0
    ? report.results
      .map((h) => `${h.title} - ${h.snippet ?? ""} (${h.url})`)
      .join("\n")
    : "premium:serper:no-additional-signal";

  return {
    candidate,
    premiumCallsUsed: report.provider === "serper" ? 1 : 0,
    premiumCallsAvoided: report.provider === "serper" ? 0 : 1,
    enrichmentText,
  };
}

export async function runOpportunityDiscovery(
  input: OpportunityDiscoveryInput,
  providers?: SearchProvider[],
): Promise<OpportunityDiscoveryReport> {
  const broadLimit = input.broadLimit ?? 30;
  const candidateLimit = input.candidateLimit ?? 10;
  let premiumBudget = input.premiumBudget ?? 3;
  let premiumCallsUsed = 0;
  let premiumCallsAvoided = 0;

  const broad = await search(
    {
      query: input.query,
      intent: input.market === "jobs" ? "job-discovery" : "broad-discovery",
      limit: broadLimit,
      locale: input.locale,
    },
    providers,
  );

  const candidates = broad.results
    .map(scoreSearchResult)
    .sort(byScore)
    .slice(0, candidateLimit);

  for (const candidate of candidates) {
    const decision = premiumEnrichmentDecision(candidate, input.minPremiumScore);
    candidate.needsPremiumEnrichment = decision.shouldUsePremium;
    candidate.premiumQuery = decision.query;

    if (!decision.shouldUsePremium) {
      premiumCallsAvoided += 1;
      continue;
    }
    if (premiumBudget <= 0) {
      premiumCallsAvoided += 1;
      continue;
    }

    const enrichment = await search(
      {
        query: decision.query!,
        intent: "enrichment",
        critical: true,
        limit: 3,
        locale: input.locale,
      },
      providers,
    );
    candidate.enrichment = enrichment.results;
    candidate.finalScore = Math.min(100, candidate.initialScore + (enrichment.results.length > 0 ? 10 : 0));
    premiumBudget -= 1;
    premiumCallsUsed += enrichment.provider === "none" ? 0 : 1;
  }

  return {
    broadProvider: broad.provider,
    totalFound: broad.results.length,
    candidates,
    premiumCallsUsed,
    premiumCallsAvoided,
  };
}
