// tests/rate_limit.spec.ts — the security-critical limiter (T07). Fixed-window
// behavior: allow up to N, block the rest, reset after the window, keys isolated.
import { afterEach, describe, it, expect, vi } from "vitest";
import { rateLimit, rateLimited } from "@/lib/rate-limit";

const k = (p: string) => `${p}-${Math.random().toString(36).slice(2)}`;

describe("rate limiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("allows up to the limit, then blocks within the window", () => {
    const key = k("burst");
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });

  it("reports remaining count and a positive retryAfter", () => {
    const key = k("meta");
    const r1 = rateLimit(key, 2, 60_000);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(1);
    const r2 = rateLimit(key, 2, 60_000);
    expect(r2.remaining).toBe(0);
    const r3 = rateLimit(key, 2, 60_000);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const a = k("a");
    const b = k("b");
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true); // b unaffected by a's exhaustion
  });

  it("resets after the window elapses", async () => {
    const key = k("reset");
    expect(rateLimit(key, 1, 20).ok).toBe(true);
    expect(rateLimit(key, 1, 20).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30)); // past the 20ms window
    expect(rateLimit(key, 1, 20).ok).toBe(true);
  });

  it("returns 429 responses from the request helper", async () => {
    const req = new Request("http://localhost/api/assistant", {
      headers: { "x-forwarded-for": k("ip") },
    });
    expect(await rateLimited(req, "test-helper", 1, 60_000)).toBeNull();
    const blocked = await rateLimited(req, "test-helper", 1, 60_000);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBeTruthy();
  });

  it("uses Upstash REST pipeline when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.resetModules();
    const fetchMock = vi.fn(async () =>
      ({
        ok: true,
        json: async () => [{ result: 2 }, { result: 1 }, { result: 60 }],
      }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const mod = await import("@/lib/rate-limit");
    const req = new Request("http://localhost/api/assistant", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    const blocked = await mod.rateLimited(req, "distributed", 1, 60_000);
    expect(blocked?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.com/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });
});
