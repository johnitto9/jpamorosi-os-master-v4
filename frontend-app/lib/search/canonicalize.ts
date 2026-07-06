import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
]);

function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.pathname = stripTrailingSlash(decodeURIComponent(u.pathname));

    const kept = new URLSearchParams();
    Array.from(u.searchParams.entries())
      .filter(([key]) => {
        const k = key.toLowerCase();
        return !k.startsWith("utm_") && !TRACKING_PARAMS.has(k);
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => kept.append(key, value));
    u.search = kept.toString();

    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export function stableSearchHash(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 32);
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

