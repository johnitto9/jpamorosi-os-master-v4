// lib/rate-limit.ts
// -----------------------------------------------------------------------------
// Fixed-window rate limiter. In dev/Docker it uses a small in-memory Map. In
// production/Vercel it can use Upstash Redis REST via env vars, so limits survive
// cold starts and multiple serverless instances.
// -----------------------------------------------------------------------------

import { env } from "@/lib/env";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

/** Fixed window: allow `limit` hits per `windowMs` for `key`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  b.count += 1;
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
  };
}

type UpstashPipelineResult = Array<{ result?: unknown; error?: string }>;

function upstashConfigured(): boolean {
  return !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;
}

async function distributedRateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
  const url = `${env.UPSTASH_REDIS_REST_URL!.replace(/\/+$/, "")}/pipeline`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, ttlSec, "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as UpstashPipelineResult;
  const count = Number(data[0]?.result ?? 0);
  const ttl = Number(data[2]?.result ?? ttlSec);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.max(1, Number.isFinite(ttl) && ttl > 0 ? ttl : ttlSec),
  };
}

export async function rateLimitShared(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  if (!upstashConfigured()) return rateLimit(key, limit, windowMs);
  try {
    return await distributedRateLimit(key, limit, windowMs);
  } catch (err) {
    // Keep the app available if the shared limiter is temporarily down. This is
    // still better than no guard, and emits a visible server log for prod.
    console.warn("[rate-limit] shared limiter failed, falling back local:", (err as Error).message);
    return rateLimit(key, limit, windowMs);
  }
}

// occasional sweep so an idle process doesn't grow the map unbounded
let lastSweep = 0;
export function sweepExpired(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

/** Best-effort client IP from proxy headers (Cloudflare / Vercel / nginx). */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** 429 response with a Retry-After header, or null when the caller may proceed. */
export async function rateLimited(
  request: Request,
  key: string,
  limit: number,
  windowMs: number,
): Promise<Response | null> {
  sweepExpired();
  const rl = await rateLimitShared(`${key}:${clientIp(request)}`, limit, windowMs);
  if (rl.ok) return null;
  return new Response(JSON.stringify({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec) },
  });
}
