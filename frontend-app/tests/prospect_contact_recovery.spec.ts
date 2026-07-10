// tests/prospect_contact_recovery.spec.ts
// Deep contact recovery (2026-07-10): second-pass email dig for qualified
// prospects stuck in `contact` without an address. Fixtures are the REAL
// prod offenders that motivated the feature: 4e3…@reporting.workana.com
// (relay scored 85 on content), wor…@email.com, n@app.route.

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

import {
  deobfuscateContactText,
  isActionableEmail,
  hostMatchesCompany,
  deepHarvestContact,
  recoverMissingContacts,
} from "@/lib/agent/prospects";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  queryMock.mockReset();
  searchMock.mockReset();
  resolveMxMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false }); // default: pages don't answer
});

describe("deobfuscateContactText", () => {
  it("unmasks bracketed at/dot forms (en + es)", () => {
    expect(deobfuscateContactText("hola [at] empresa [dot] com")).toBe("hola@empresa.com");
    expect(deobfuscateContactText("info (arroba) acme (punto) es")).toBe("info@acme.es");
  });
  it("leaves prose with a bare ' at ' untouched", () => {
    const prose = "meet us at berlin.de next week";
    expect(deobfuscateContactText(prose)).toBe(prose);
  });
});

describe("isActionableEmail (real prod offenders)", () => {
  it("rejects the tracking relay that scored 85 on content", () => {
    expect(isActionableEmail("4e3abc@reporting.workana.com")).toBe(false);
  });
  it("rejects anonymous @email.com and junk TLD n@app.route", () => {
    expect(isActionableEmail("work@email.com")).toBe(false);
    expect(isActionableEmail("n@app.route")).toBe(false);
  });
  it("accepts the business mailboxes that were actually sent", () => {
    expect(isActionableEmail("info@iaclinic.es")).toBe(true);
    expect(isActionableEmail("sales@interakt.ai")).toBe(true);
  });
  it("rejects notification/newsletter machine senders", () => {
    expect(isActionableEmail("notifications@github.com")).toBe(false);
    expect(isActionableEmail("newsletter@acme.com")).toBe(false);
  });
  it("rejects live-validation catches: hash localpart, error subdomain, platform inbox", () => {
    expect(isActionableEmail("77e708048c4747e1a801fa2ef5557ca6@vs-errors.eightfold.ai")).toBe(false);
    expect(isActionableEmail("support@linkedin.com")).toBe(false);
  });
});

describe("hostMatchesCompany", () => {
  it("matches the company's own site and rejects the listicle host", () => {
    expect(hostMatchesCompany("www.sync-manager.com", "SyncManager")).toBe(true);
    expect(hostMatchesCompany("medium.com", "SyncManager")).toBe(false);
  });
});

describe("deepHarvestContact", () => {
  it("refuses to dig for platform/aggregator cards (Linkedin, RemoteJobs.org, *jobs)", async () => {
    for (const company of ["Linkedin", "RemoteJobs.org", "Next.js jobs", "In"]) {
      expect(await deepHarvestContact({ url: "https://x.example/p", company })).toBeNull();
    }
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("finds an (obfuscated) address straight in a search snippet", async () => {
    searchMock.mockResolvedValue({
      results: [
        { title: "Contacto", snippet: "escribinos: hola [at] neuriax [dot] com", url: "https://neuriax.com/contacto" },
      ],
    });
    const hit = await deepHarvestContact({ url: "https://listicle.example/post", company: "Neuriax" });
    expect(hit).toMatchObject({ email: "hola@neuriax.com", method: "search-snippet" });
  });

  it("never returns a relay even if the SERP offers one; falls back to MX guess on the company site", async () => {
    searchMock.mockResolvedValue({
      results: [
        { snippet: "reach 4e3abc@reporting.workana.com", url: "https://workana.com/x" },
        { title: "SyncManager — chatbots", url: "https://sync-manager.com" },
      ],
    });
    resolveMxMock.mockResolvedValue([{ exchange: "mx.sync-manager.com", priority: 10 }]);
    const hit = await deepHarvestContact({ url: "https://blog.example/post", company: "SyncManager" });
    expect(hit).toMatchObject({ email: "info@sync-manager.com", method: "mx-guess" });
  });

  it("returns null when the domain has no MX and nothing else surfaces", async () => {
    searchMock.mockResolvedValue({ results: [{ title: "Acme", url: "https://acmecorp.com" }] });
    resolveMxMock.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await deepHarvestContact({ url: null, company: "AcmeCorp" })).toBeNull();
  });
});

describe("recoverMissingContacts", () => {
  it("updates the prospect when the dig finds an actionable address", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("SELECT")) {
        return { rows: [{ id: 7, url: "https://post.example/x", company: "Neuriax", stage: "contact", email: null }] };
      }
      return { rows: [] };
    });
    searchMock.mockResolvedValue({
      results: [{ snippet: "hola [at] neuriax [dot] com", url: "https://neuriax.com" }],
    });
    expect(await recoverMissingContacts(1)).toBe(1);
    const update = queryMock.mock.calls.find(([sql]) => String(sql).includes("SET email"));
    expect(update?.[1]).toEqual([7, "hola@neuriax.com", expect.stringContaining("contact:recovered:search-snippet")]);
  });

  it("bumps updated_at (rotation) when the card stays dry", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("SELECT")) {
        return { rows: [{ id: 9, url: null, company: null, stage: "contact", email: null }] };
      }
      return { rows: [] };
    });
    expect(await recoverMissingContacts(1)).toBe(0);
    const bump = queryMock.mock.calls.find(([sql]) => String(sql).includes("SET updated_at"));
    expect(bump?.[1]).toEqual([9]);
  });
});
