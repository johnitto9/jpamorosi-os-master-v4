import { describe, expect, it } from "vitest";
import { nextStageFromIngest, nextStageFromQualify, relevanceScore } from "@/lib/agent/prospects";

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

  it("moves only qualified scores to contact", () => {
    expect(nextStageFromQualify(55)).toBe("contact");
    expect(nextStageFromQualify(54)).toBe("discarded");
  });
});
