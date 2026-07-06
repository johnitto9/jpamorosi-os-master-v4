import { afterEach, describe, expect, it, vi } from "vitest";

function req(ip: string, body: unknown = { message: "hola" }) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("public LLM endpoint rate limits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("/api/assistant returns 429 before agent execution when exhausted", async () => {
    vi.doMock("@/lib/agent/orchestrator", () => ({
      runAgent: vi.fn(async () => ({
        message: "ok",
        intent: "general",
        actions: [],
        cards: [],
        safety: { source: "test", confidence: "high" },
      })),
    }));
    const mod = await import("@/app/api/assistant/route");
    const ip = `198.51.100.${Math.floor(Math.random() * 100)}`;
    for (let i = 0; i < 20; i++) {
      const res = await mod.POST(req(ip));
      expect(res.status).not.toBe(429);
    }
    const blocked = await mod.POST(req(ip));
    expect(blocked.status).toBe(429);
  });

  it("/api/ai/chat returns 429 before agent execution when exhausted", async () => {
    vi.doMock("@/lib/agent/orchestrator", () => ({
      runAgent: vi.fn(async () => ({
        message: "ok",
        intent: "general",
        actions: [],
        cards: [],
        safety: { source: "test", confidence: "high" },
      })),
    }));
    const mod = await import("@/app/api/ai/chat/route");
    const ip = `203.0.113.${Math.floor(Math.random() * 100)}`;
    for (let i = 0; i < 10; i++) {
      const res = await mod.POST(req(ip));
      expect(res.status).not.toBe(429);
    }
    const blocked = await mod.POST(req(ip));
    expect(blocked.status).toBe(429);
  });
});
