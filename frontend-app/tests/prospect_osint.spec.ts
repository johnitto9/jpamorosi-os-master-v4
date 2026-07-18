// tests/prospect_osint.spec.ts
// Sovereign person-finding (2026-07-18): reach a NAMED human without a paid
// people-data provider and without IP-burning SMTP probing. Three open
// techniques inside deepHarvestContact, best-confidence first: team/about page,
// public GitHub commits, and format inference from an OBSERVED corporate sample.

import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db/pool", () => ({
  isDbConfigured: () => true,
  query: (...a: unknown[]) => queryMock(...a),
  tryQuery: (...a: unknown[]) => queryMock(...a),
}));
vi.mock("@/lib/db/bootstrap", () => ({ ensureSchema: async () => undefined }));
vi.mock("@/lib/events", () => ({ recordEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/agent/llm", () => ({ chatCompletion: vi.fn(), isLlmConfigured: () => false }));
vi.mock("@/content/profile", () => ({ profile: { name: "Juan" } }));
vi.mock("@/lib/opportunity-discovery/pipeline", () => ({ premiumEnrichCandidate: vi.fn() }));
vi.mock("@/lib/opportunity-discovery/planner", () => ({ selectPremiumHarvestUrls: () => [] }));

const searchMock = vi.fn();
vi.mock("@/lib/search/router", () => ({ search: (...a: unknown[]) => searchMock(...a) }));

const resolveMxMock = vi.fn();
vi.mock("node:dns/promises", () => ({ resolveMx: (...a: unknown[]) => resolveMxMock(...a) }));

import { deepHarvestContact, inferEmailFromSample } from "@/lib/agent/prospects";

// A URL-routed fetch: each entry maps a substring → html (or null for 404).
function routeFetch(routes: Record<string, string | null>) {
  return vi.fn(async (input: string | URL) => {
    const url = String(input);
    for (const [needle, html] of Object.entries(routes)) {
      if (url.includes(needle)) {
        if (html == null) return { ok: false, text: async () => "", json: async () => ({}) } as Response;
        return {
          ok: true,
          text: async () => html,
          json: async () => JSON.parse(html),
        } as Response;
      }
    }
    return { ok: false, text: async () => "", json: async () => ({}) } as Response;
  });
}

beforeEach(() => {
  queryMock.mockReset();
  searchMock.mockReset();
  searchMock.mockResolvedValue({ results: [] });
  resolveMxMock.mockReset();
  resolveMxMock.mockRejectedValue(new Error("no mx")); // method C off unless set
});

describe("inferEmailFromSample", () => {
  it("applies the observed corporate format to a name", () => {
    expect(inferEmailFromSample("Maria Paz", "smallco.io", "jane.smith")).toBe("maria.paz@smallco.io");
    expect(inferEmailFromSample("Maria Paz", "smallco.io", "j.smith")).toBe("m.paz@smallco.io");
  });
  it("declines ambiguous single-token samples (jsmith / info)", () => {
    expect(inferEmailFromSample("Maria Paz", "smallco.io", "jsmith")).toBeNull();
    expect(inferEmailFromSample("Maria Paz", "smallco.io", "info")).toBeNull();
  });
  it("declines when the derived address is itself a placeholder", () => {
    expect(inferEmailFromSample("John Doe", "smallco.io", "jane.smith")).toBeNull();
  });
});

describe("deepHarvestContact — sovereign person-finding", () => {
  it("returns a named person's real address from the company's team page", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/team": `<a href="mailto:support@smallco.io">x</a>
                  <a href="mailto:maria.paz@smallco.io">Maria Paz, Founder</a>`,
      }),
    );
    await expect(
      deepHarvestContact({ url: "https://smallco.io/careers", company: "Smallco" }),
    ).resolves.toEqual({ email: "maria.paz@smallco.io", sourceUrl: "https://smallco.io/team", method: "team-page" });
  });

  it("falls back to a real corporate address from public GitHub commits", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "smallco.io": null, // no team/about email
        "/search/users": JSON.stringify({ items: [{ login: "smallco" }] }),
        "/orgs/smallco/repos": JSON.stringify([{ name: "app" }]),
        "/commits": JSON.stringify([
          { commit: { author: { email: "bot@users.noreply.github.com" } } },
          { commit: { author: { email: "dev.ops@smallco.io" } } },
        ]),
      }),
    );
    await expect(
      deepHarvestContact({ url: "https://smallco.io/jobs", company: "Smallco" }),
    ).resolves.toMatchObject({ email: "dev.ops@smallco.io", method: "github" });
  });

  it("retargets the founder via the format a GitHub address reveals", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/about": `<h2>Team</h2><p>Maria Paz — Founder & CEO</p>`, // name, no email
        "/team": null,
        "/equipo": null,
        "/nosotros": null,
        "/search/users": JSON.stringify({ items: [{ login: "smallco" }] }),
        "/orgs/smallco/repos": JSON.stringify([{ name: "app" }]),
        "/commits": JSON.stringify([{ commit: { author: { email: "j.smith@smallco.io" } } }]),
      }),
    );
    await expect(
      deepHarvestContact({ url: "https://smallco.io/jobs", company: "Smallco" }),
    ).resolves.toMatchObject({ email: "m.paz@smallco.io", method: "format-infer" });
  });
});
