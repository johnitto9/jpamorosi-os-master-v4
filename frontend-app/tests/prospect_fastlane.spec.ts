// tests/prospect_fastlane.spec.ts
// Fast-lane (2026-07-18): a promising card should cross consecutive pipeline
// stages in ONE processPipelineBatch pass — measured avg ingest→sent was 73h
// because each cron run advanced a card a single hop. A fresh, emailled, on-
// topic card must reach `contact` in one call so the same heartbeat can send it.

import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db/pool", () => ({
  isDbConfigured: () => true,
  query: (...a: unknown[]) => queryMock(...a),
  tryQuery: (...a: unknown[]) => queryMock(...a),
}));
vi.mock("@/lib/db/bootstrap", () => ({ ensureSchema: async () => undefined }));
vi.mock("@/lib/events", () => ({ recordEvent: vi.fn(async () => undefined) }));
// no LLM → qualifyProspect uses the deterministic floor: relevanceScore*12 + 20
vi.mock("@/lib/agent/llm", () => ({ chatCompletion: vi.fn(), isLlmConfigured: () => false }));
vi.mock("@/content/profile", () => ({ profile: { name: "Juan", role: "Engineer" } }));

const premiumMock = vi.fn();
vi.mock("@/lib/opportunity-discovery/pipeline", () => ({
  premiumEnrichCandidate: (...a: unknown[]) => premiumMock(...a),
}));
vi.mock("@/lib/opportunity-discovery/planner", () => ({ selectPremiumHarvestUrls: () => [] }));
vi.mock("@/lib/search/router", () => ({ search: vi.fn(async () => ({ results: [] })) }));
vi.mock("node:dns/promises", () => ({ resolveMx: vi.fn(async () => []) }));

import { processPipelineBatch } from "@/lib/agent/prospects";

const FRESH_CARD = {
  id: 42,
  stage: "ingest",
  source: "scout",
  url: "https://smallco.io/jobs",
  title: "AI automation engineer",
  snippet: "Startup hiring an LLM automation developer for its agent workflows",
  company: "Smallco",
  email: "maria.paz@smallco.io", // actionable person address, already present
  score: 0,
  enrichment: null,
  fitReason: null,
  nextAction: null,
  contactName: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  queryMock.mockReset();
  premiumMock.mockReset();
  premiumMock.mockResolvedValue({
    premiumCallsUsed: 0,
    enrichmentText: "operational signals",
    candidate: { premiumQuery: null, enrichment: "" },
  });
});

describe("processPipelineBatch fast-lane", () => {
  it("carries a fresh emailled on-topic card ingest→contact in one pass", async () => {
    let served = false;
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("WHERE stage IN ('ingest'")) {
        if (served) return { rows: [] };
        served = true; // the batch is served once; advances are in-memory
        return { rows: [{ ...FRESH_CARD }] };
      }
      return { rowCount: 1, rows: [] }; // advance() UPDATEs
    });

    const report = await processPipelineBatch(12);

    // one card, four hops in a single call — not one hop per cron run
    const hops = report.moves.filter((m) => m.id === 42).map((m) => m.to);
    expect(hops).toEqual(["filter", "enrich", "qualify", "contact"]);
    expect(report.moves.at(-1)).toMatchObject({ id: 42, to: "contact" });
  });

  it("stops fast-laning into expensive stages once the per-cycle budget is spent", async () => {
    // two fresh cards, but a budget of 1 expensive hop: the first consumes it at
    // filter→enrich, the second can only take the free ingest→filter hop.
    const cards = [
      { ...FRESH_CARD, id: 1 },
      { ...FRESH_CARD, id: 2 },
    ];
    let served = false;
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("WHERE stage IN ('ingest'")) {
        if (served) return { rows: [] };
        served = true;
        return { rows: cards };
      }
      return { rowCount: 1, rows: [] };
    });
    vi.stubEnv("PIPELINE_EXPENSIVE_OPS_PER_CYCLE", "1");
    vi.resetModules();
    const { processPipelineBatch: fresh } = await import("@/lib/agent/prospects");

    const report = await fresh(12);
    const byId = (id: number) => report.moves.filter((m) => m.id === id).map((m) => m.to);
    // card 1 spends the single expensive op and advances past filter
    expect(byId(1).length).toBeGreaterThan(1);
    // card 2 only gets the free ingest→filter hop, then defers
    expect(byId(2)).toEqual(["filter"]);
    vi.unstubAllEnvs();
  });
});
