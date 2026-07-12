import { describe, expect, it } from "vitest";
import {
  nextStageFromIngest,
  nextStageFromQualify,
  parseDroppedLeadText,
  relevanceScore,
} from "@/lib/agent/prospects";

describe("prospect pipeline decisions", () => {
  it("scores market relevance from title and snippet", () => {
    expect(
      relevanceScore({
        title: "Remote AI automation engineer",
        snippet: "Startup hiring a full-stack TypeScript developer for LLM agents",
      }),
    ).toBeGreaterThanOrEqual(6);
  });

  it("passes relevant scout catches from ingest to filter", () => {
    expect(
      nextStageFromIngest({
        source: "scout",
        url: "https://signalforge.ai/jobs",
        title: "AI agent engineer",
        snippet: "Remote startup hiring TypeScript automation developer",
      }),
    ).toBe("filter");
  });

  it("discards junk domains even if the title looks relevant", () => {
    expect(
      nextStageFromIngest({
        source: "scout",
        url: "https://youtube.com/watch?v=abc",
        title: "AI startup hiring engineers",
        snippet: "developer automation remote",
      }),
    ).toBe("discarded");
  });

  it("lets admin dropped leads through even with weak keywords", () => {
    expect(
      nextStageFromIngest({
        source: "email_drop",
        url: null,
        title: "Forwarded intro",
        snippet: "Personal referral",
      }),
    ).toBe("filter");
  });

  it("parses structured admin lead intake into the same prospect fields", () => {
    const parsed = parseDroppedLeadText([
      "Manual prospect intake",
      "Lead type: company",
      "Company: Greenfield Commerce",
      "Contact name: Maya Chen",
      "Email: ops@greenfield.example",
      "URL: https://greenfield.example/careers",
      "Title: WhatsApp commerce automation",
      "Need: Tool-first AI agent for catalog and orders",
      "Source: manual QA",
      "Notes: Strong fit with Delibot",
    ].join("\n"));

    expect(parsed.company).toBe("Greenfield Commerce");
    expect(parsed.contactName).toBe("Maya Chen");
    expect(parsed.email).toBe("ops@greenfield.example");
    expect(parsed.url).toBe("https://greenfield.example/careers");
    expect(parsed.title).toBe("WhatsApp commerce automation");
    expect(parsed.snippet).toContain("Tool-first AI agent");
  });

  it("moves only qualified scores to contact", () => {
    expect(nextStageFromQualify(55)).toBe("contact");
    expect(nextStageFromQualify(54)).toBe("discarded");
  });

  it("lets a real, deliverable contact reach contact on a lower fit score", () => {
    // A conservative fit score shouldn't throw away a harvested, actionable
    // address — the email halves the bar (but near-zero relevance still drops).
    expect(nextStageFromQualify(20, true)).toBe("contact");
    expect(nextStageFromQualify(14, true)).toBe("discarded");
    // No usable address: the full fit score is still required.
    expect(nextStageFromQualify(54, false)).toBe("discarded");
  });
});
