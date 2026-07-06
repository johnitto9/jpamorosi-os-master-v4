import type { NormalizedSearchResult } from "@/lib/search/types";

export type OpportunityMarket = "jobs" | "startups" | "leads" | "signals";

export type OpportunityCandidateInput = {
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
  source?: string | null;
  provider?: string | null;
  company?: string | null;
  email?: string | null;
};

export type OpportunityCandidate = {
  title: string;
  url: string | null;
  snippet: string;
  source?: string;
  provider?: string;
  company: string | null;
  email: string | null;
  domain: string | null;
  initialScore: number;
  finalScore: number;
  reasons: string[];
  needsPremiumEnrichment: boolean;
  premiumQuery?: string;
  enrichment: NormalizedSearchResult[];
};

export type PremiumDecision = {
  shouldUsePremium: boolean;
  reason: string;
  query?: string;
};

export type OpportunityDiscoveryInput = {
  query: string;
  market?: OpportunityMarket;
  locale?: string;
  broadLimit?: number;
  candidateLimit?: number;
  premiumBudget?: number;
  minPremiumScore?: number;
};

export type OpportunityDiscoveryReport = {
  broadProvider: string;
  totalFound: number;
  candidates: OpportunityCandidate[];
  premiumCallsUsed: number;
  premiumCallsAvoided: number;
};
