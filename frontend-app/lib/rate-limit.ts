// lib/rate-limit.ts
// -----------------------------------------------------------------------------
// Minimal in-memory fixed-window rate limiter (T07 / spec 17). No Redis — this
// is per-process and resets on restart, which is enough to blunt brute-force and
// abuse bursts at this scale. The day the app runs multiple replicas, swap the
// Map for a shared store (Redis/Upstash) behind the SAME rateLimit() signature.
// -----------------------------------------------------------------------------

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
export function rateLimited(
  request: Request,
  key: string,
  limit: number,
  windowMs: number,
): Response | null {
  sweepExpired();
  const rl = rateLimit(`${key}:${clientIp(request)}`, limit, windowMs);
  if (rl.ok) return null;
  return new Response(JSON.stringify({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec) },
  });
}
