// tests/env_recovery.spec.ts
// Regression for the 2026-07-09 prod incident: ONE malformed optional var
// (empty UPSTASH_REDIS_REST_URL) must NOT collapse the whole env to defaults.
// Valid vars survive; only the invalid field is dropped.

import { afterEach, describe, expect, it, vi } from "vitest";

const BASE = {
  APP_ENV: "production",
  PROJECT_STORAGE_DRIVER: "postgres",
  RESEND_API_KEY: "re_valid_key",
  RESEND_FROM_EMAIL: "labs@example.com",
  INTERNAL_API_TOKEN: "tok_valid",
  R2_ACCESS_KEY_ID: "AKIA_x",
  R2_SECRET_ACCESS_KEY: "secret_x",
  R2_BUCKET_NAME: "bucket",
  R2_ENDPOINT: "https://acc.r2.cloudflarestorage.com",
} as const;

async function loadWith(extra: Record<string, string>) {
  vi.resetModules();
  const prev = { ...process.env };
  process.env = { ...prev, ...BASE, ...extra } as NodeJS.ProcessEnv;
  const mod = await import("@/lib/env");
  process.env = prev;
  return mod;
}

describe("env per-field recovery", () => {
  afterEach(() => vi.resetModules());

  it("keeps valid vars when one optional var is malformed", async () => {
    const { env, isEmailConfigured, isR2Configured, isInternalToken } = await loadWith({
      UPSTASH_REDIS_REST_URL: "", // present but invalid URL — the prod incident
    });
    expect(env.PROJECT_STORAGE_DRIVER).toBe("postgres"); // NOT collapsed to "static"
    expect(env.APP_ENV).toBe("production");
    expect(isEmailConfigured()).toBe(true);
    expect(isR2Configured()).toBe(true);
    expect(isInternalToken("tok_valid")).toBe(true);
    // only the offender degraded
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("still fully valid config parses untouched", async () => {
    const { env } = await loadWith({
      UPSTASH_REDIS_REST_URL: "https://usable.upstash.io",
    });
    expect(env.PROJECT_STORAGE_DRIVER).toBe("postgres");
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://usable.upstash.io");
  });
});
