import { env } from "@/lib/env";
import { dedupeResults } from "./normalize";
import { SearxngProvider } from "./providers/searxng-provider";
import { SerperProvider } from "./providers/serper-provider";
import type { NormalizedSearchResult, SearchInput, SearchProvider, SearchReport } from "./types";

const searxng = new SearxngProvider();
const serper = new SerperProvider();

export function searchProviders(): SearchProvider[] {
  return [searxng, serper];
}

export function anySearchProviderEnabled(providers = searchProviders()): boolean {
  return providers.some((p) => p.enabled());
}

function enoughResults(results: NormalizedSearchResult[], input: SearchInput): boolean {
  const min = input.critical ? 3 : Math.min(3, input.limit ?? 4);
  return results.length >= min;
}

function primaryFor(input: SearchInput, providers: SearchProvider[]): SearchProvider | null {
  const intent = input.intent ?? "general-web-search";
  const byName = new Map(providers.map((p) => [p.name, p]));
  if (input.critical || intent === "critical-verification") {
    return byName.get(env.SEARCH_PREMIUM_PROVIDER) ?? byName.get("serper") ?? null;
  }
  const preferred = byName.get(env.SEARCH_PRIMARY_PROVIDER);
  if (preferred?.enabled()) return preferred;
  return providers.find((p) => p.enabled()) ?? null;
}

function premiumProvider(providers: SearchProvider[]): SearchProvider | null {
  const byName = new Map(providers.map((p) => [p.name, p]));
  return byName.get(env.SEARCH_PREMIUM_PROVIDER) ?? byName.get("serper") ?? null;
}

export async function search(input: SearchInput, providers = searchProviders()): Promise<SearchReport> {
  const primary = primaryFor(input, providers);
  if (!primary || !primary.enabled()) {
    return { provider: "none", fallbackUsed: false, results: [] };
  }

  let primaryResults: NormalizedSearchResult[] = [];
  try {
    primaryResults = dedupeResults(await primary.search(input));
  } catch (err) {
    console.warn(`[search] ${primary.name} failed:`, (err as Error).message.slice(0, 160));
  }

  if (
    primaryResults.length > 0 &&
    enoughResults(primaryResults, input)
  ) {
    return { provider: primary.name, fallbackUsed: false, results: primaryResults.slice(0, input.limit ?? 4) };
  }

  const intent = input.intent ?? "general-web-search";
  const shouldFallback =
    env.SEARXNG_FALLBACK_TO_SERPER === true &&
    primary.name !== "serper" &&
    (input.critical || intent === "enrichment" || intent === "critical-verification" || primaryResults.length === 0);
  const premium = premiumProvider(providers);
  if (!shouldFallback || !premium || !premium.enabled()) {
    return { provider: primary.name, fallbackUsed: false, results: primaryResults.slice(0, input.limit ?? 4) };
  }

  try {
    const premiumResults = await premium.search(input);
    return {
      provider: premium.name,
      fallbackUsed: true,
      results: dedupeResults([...primaryResults, ...premiumResults]).slice(0, input.limit ?? 4),
    };
  } catch (err) {
    console.warn(`[search] ${premium.name} fallback failed:`, (err as Error).message.slice(0, 160));
    return { provider: primary.name, fallbackUsed: false, results: primaryResults.slice(0, input.limit ?? 4) };
  }
}

