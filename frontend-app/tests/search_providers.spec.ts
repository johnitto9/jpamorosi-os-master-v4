import { afterEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as Response;

describe("search providers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("normalizes SearXNG json results", async () => {
    const prev = { ...process.env };
    process.env = {
      ...prev,
      SEARXNG_ENABLED: "true",
      SEARXNG_BASE_URL: "http://searxng:8080",
      SEARXNG_TIMEOUT_MS: "8000",
    };
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({
        results: [
          {
            title: "AI Automation Startup",
            url: "https://www.example.com/jobs?utm_source=x",
            content: "Hiring builders",
            engine: "brave",
            publishedDate: "2026-07-01",
          },
        ],
      }),
    ));
    const { SearxngProvider } = await import("@/lib/search/providers/searxng-provider");
    const results = await new SearxngProvider().search({ query: "ai jobs", limit: 4 });
    expect(results[0]).toMatchObject({
      title: "AI Automation Startup",
      provider: "searxng",
      source: "brave",
      canonicalUrl: "https://example.com/jobs",
    });
    process.env = prev;
  });

  it("normalizes Serper organic results", async () => {
    const prev = { ...process.env };
    process.env = { ...prev, WEB_SEARCH_API_KEY: "test-key" };
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({
        organic: [
          {
            title: "Founder hiring AI engineer",
            link: "https://jobs.example.com/post?gclid=abc",
            snippet: "Remote role",
            source: "Jobs",
            date: "Jul 2026",
          },
        ],
      }),
    ));
    const { SerperProvider } = await import("@/lib/search/providers/serper-provider");
    const results = await new SerperProvider().search({ query: "ai engineer", limit: 4 });
    expect(results[0]).toMatchObject({
      title: "Founder hiring AI engineer",
      provider: "serper",
      canonicalUrl: "https://jobs.example.com/post",
      metadata: { rawRank: 1 },
    });
    process.env = prev;
  });
});
