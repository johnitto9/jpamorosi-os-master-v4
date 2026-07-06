export type SearchIntent =
  | "broad-discovery"
  | "general-web-search"
  | "job-discovery"
  | "github-signal"
  | "critical-verification"
  | "enrichment";

export type SearchInput = {
  query: string;
  intent?: SearchIntent;
  limit?: number;
  locale?: string;
  categories?: string[];
  timeRange?: "day" | "month" | "year";
  critical?: boolean;
};

export type NormalizedSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  provider: string;
  publishedAt?: string;
  score?: number;
  canonicalUrl: string;
  hash: string;
  metadata?: Record<string, unknown>;
};

export interface SearchProvider {
  name: string;
  enabled(): boolean;
  search(input: SearchInput): Promise<NormalizedSearchResult[]>;
}

export type SearchReport = {
  provider: string;
  fallbackUsed: boolean;
  results: NormalizedSearchResult[];
};

