"use client";

import Link from "next/link";
import { projects } from "@/content/projects";
import { HolographicCard } from "@/components/ui/holographic-card";

// Renders a compact project card from the static seed (public, client-safe data).
export function AssistantProjectCard({ slug }: { slug: string }) {
  const p = projects.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <HolographicCard intensity="subtle" restTilt={4}>
    <Link
      href={`/projects/${p.slug}`}
      className="group block rounded-lg border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ color: p.theme.accent }}
        >
          {p.category}
        </span>
        <span className="text-white/40 transition-transform group-hover:translate-x-0.5">→</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{p.title}</div>
      <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{p.oneLiner}</p>
    </Link>
    </HolographicCard>
  );
}

export default AssistantProjectCard;
