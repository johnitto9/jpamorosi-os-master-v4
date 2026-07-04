// tests/playbooks.spec.ts — the sales brain's deterministic core.
// Stage machine + scoring are code, not LLM opinion: they must be exact.

import { describe, it, expect } from "vitest";
import { computeStage, scoreLead, stageBlock, personaBlock } from "@/lib/agent/playbooks";

describe("scoreLead", () => {
  it("scores 0 for null / empty leads", () => {
    expect(scoreLead(null)).toBe(0);
    expect(scoreLead({})).toBe(0);
    expect(scoreLead({ name: "  " })).toBe(0);
  });

  it("adds weights per captured field", () => {
    expect(scoreLead({ need: "an agent" })).toBe(30);
    expect(scoreLead({ need: "x", email: "a@b.co" })).toBe(50);
    expect(
      scoreLead({ need: "x", email: "a@b.co", budget: "3k", company: "Acme" }),
    ).toBe(85);
  });

  it("caps at 100", () => {
    expect(
      scoreLead({
        need: "x", email: "a@b.co", budget: "3k", company: "Acme",
        phone: "123", name: "M", notes: "n",
      }),
    ).toBe(100);
  });
});

describe("computeStage", () => {
  it("starts at discover", () => {
    expect(computeStage(null, 0)).toBe("discover");
    expect(computeStage({}, 1)).toBe("discover");
  });

  it("qualify on soft signals or long conversations", () => {
    expect(computeStage({ company: "Acme" }, 0)).toBe("qualify");
    expect(computeStage({ name: "Marco" }, 0)).toBe("qualify");
    expect(computeStage({}, 4)).toBe("qualify");
  });

  it("propose once the need is known", () => {
    expect(computeStage({ need: "whatsapp agent" }, 0)).toBe("propose");
  });

  it("close when need + a contact channel exist", () => {
    expect(computeStage({ need: "x", email: "a@b.co" }, 0)).toBe("close");
    expect(computeStage({ need: "x", phone: "+54911..." }, 0)).toBe("close");
    // contact without need is NOT closeable yet
    expect(computeStage({ email: "a@b.co" }, 0)).toBe("discover");
  });
});

describe("prompt blocks", () => {
  it("stageBlock names the stage and carries tactics", () => {
    const block = stageBlock("propose", 60);
    expect(block).toContain("PROPOSE");
    expect(block).toContain("60/100");
  });

  it("persona carries the constitution + identity rules", () => {
    const p = personaBlock();
    expect(p).toContain("CONSTITUTION");
    expect(p).toContain("NOT Juan");
    expect(p).toContain("INTENT ROUTER");
    expect(p).toContain("evidence over adjectives");
  });
});
