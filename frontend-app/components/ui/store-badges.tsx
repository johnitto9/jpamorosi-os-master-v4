// components/ui/store-badges.tsx
// Official-feel distribution badges + premium link pills for project rooms.
// Store badges follow the canonical dark-badge look (Google Play triangle /
// Apple mark drawn inline — no remote assets, brand shapes preserved).

import { Globe, Play, ArrowUpRight } from "lucide-react";

const badgeBase =
  "inline-flex items-center gap-3 rounded-xl border border-white/25 bg-black px-4 py-2 transition-all hover:-translate-y-0.5 hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";

/** Canonical multicolor Play triangle. */
function PlayTriangle({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M3.6 1.8 13.7 12 3.6 22.2c-.4-.3-.6-.8-.6-1.4V3.2c0-.6.2-1.1.6-1.4Z" fill="#00d7fe" />
      <path d="M17.4 8.3 5.3 1.4c-.5-.3-1-.4-1.5-.3L13.7 12l3.7-3.7Z" fill="#00f076" />
      <path d="M17.4 15.7 13.7 12l-9.9 10.9c.5.1 1 0 1.5-.3l12.1-6.9Z" fill="#f43e5c" />
      <path d="M21.4 10.6l-4-2.3L13.7 12l3.7 3.7 4-2.3c1.2-.7 1.2-2.1 0-2.8Z" fill="#ffc900" />
    </svg>
  );
}

/** Apple mark (single path, official silhouette). */
function AppleMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

export function GooglePlayBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={badgeBase} aria-label="Get it on Google Play">
      <PlayTriangle />
      <span className="text-left leading-tight">
        <span className="block text-[9px] uppercase tracking-wide text-white/60">Get it on</span>
        <span className="block text-base font-semibold text-white">Google Play</span>
      </span>
    </a>
  );
}

export function AppStoreBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={badgeBase} aria-label="Download on the App Store">
      <AppleMark />
      <span className="text-left leading-tight">
        <span className="block text-[9px] uppercase tracking-wide text-white/60">Download on the</span>
        <span className="block text-base font-semibold text-white">App Store</span>
      </span>
    </a>
  );
}

/** GitHub octocat mark (official path). */
export function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.9 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

/** Premium pill for website / demo / source links. */
export function LinkPill({
  href,
  label,
  kind,
  accent,
  primary = false,
}: {
  href: string;
  label: string;
  kind: "website" | "demo" | "github";
  accent: string;
  primary?: boolean;
}) {
  const Icon =
    kind === "website" ? Globe : kind === "demo" ? Play : GitHubMark;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={
        primary
          ? { background: accent, borderColor: accent, color: "#000" }
          : { borderColor: `${accent}66`, color: accent }
      }
    >
      {kind === "github" ? <GitHubMark size={16} /> : <Icon size={16} strokeWidth={2.2} aria-hidden />}
      {label}
      <ArrowUpRight size={14} className="opacity-60" aria-hidden />
    </a>
  );
}
