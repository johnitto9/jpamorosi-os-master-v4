// components/hall/Interludes.tsx
// The three narrative interludes that give the home its rhythm (T02, spec 10).
// They share ONE aura — cosmic/noir band, restrained cyan/violet accents, an
// eyebrow, one statement, a compact body and a single symbolic focal — without
// becoming card grids or copies of each other. Pure CSS focals (no assets, no
// new deps); reduced-motion is handled by the <SectionTransition> wrapper in
// app/page.tsx. Copy comes from the localized shell dict.

import type { ReactNode } from "react";
import { GlassAurora } from "@/components/ui/glass-aurora";

type Tone = "cyan" | "violet" | "mixed";
type Accent = "cyan" | "violet" | "amber";

const ACCENT: Record<Accent, { text: string; border: string; dot: string }> = {
  cyan: { text: "text-cyan-300", border: "border-cyan-400/30", dot: "bg-cyan-400" },
  violet: { text: "text-violet-300", border: "border-violet-400/30", dot: "bg-violet-400" },
  amber: { text: "text-amber-300", border: "border-amber-400/30", dot: "bg-amber-400" },
};

/** Shared interlude shell. `focal` is the one symbolic visual on the right. */
function Interlude({
  id, eyebrow, heading, body, tone = "mixed", accent = "cyan", focal,
}: {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  tone?: Tone;
  accent?: Accent;
  focal: ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-14 sm:py-20">
      <div className={`relative overflow-hidden rounded-3xl border ${a.border} bg-white/[0.02] p-8 sm:p-12`}>
        <GlassAurora tone={tone} />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className={`inline-flex items-center gap-2 rounded-full border ${a.border} bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.3em] ${a.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden />
              {eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">{heading}</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">{body}</p>
          </div>
          <div className="relative">{focal}</div>
        </div>
      </div>
    </section>
  );
}

// --- Focal 1: the Alún thread — a warm-to-cold vertical line of milestones ----
function AlunThread({ milestones }: { milestones: string[] }) {
  return (
    <ol className="relative ml-3 space-y-5 py-2">
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-px"
        style={{ background: "linear-gradient(to bottom, rgba(240,165,0,0.7), rgba(0,242,255,0.6))" }}
      />
      {milestones.map((m, i) => (
        <li key={m} className="relative pl-6">
          <span
            aria-hidden
            className="absolute left-[-3px] top-1.5 h-2 w-2 rounded-full ring-2 ring-black"
            style={{ background: i === milestones.length - 1 ? "#00f2ff" : "#f0a500" }}
          />
          <span className="text-sm text-white/75">{m}</span>
        </li>
      ))}
    </ol>
  );
}

// --- Focal 2: the running-system stack (layers + real stack chips) -----------
const STACK = ["Next.js", "TypeScript", "Postgres", "pgvector", "R2", "Resend", "Docker"];
function SystemStack({ layers }: { layers: string[] }) {
  return (
    <div className="space-y-2.5">
      {layers.map((l, i) => (
        <div
          key={l}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
          style={{ marginLeft: `${i * 10}px` }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
          <span className="text-sm text-white/80">{l}</span>
        </div>
      ))}
      <ul className="flex flex-wrap gap-2 pt-2">
        {STACK.map((s) => (
          <li key={s} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/60">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Focal 3: the living-layer flow (arrival -> ... -> next action) ----------
function LivingFlow({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className="rounded-lg border border-violet-400/25 bg-violet-400/[0.06] px-3 py-1.5 text-xs text-white/80">
            {s}
          </span>
          {i < steps.length - 1 && <span className="text-violet-300/60" aria-hidden>→</span>}
        </li>
      ))}
    </ol>
  );
}

// --- Public interludes -------------------------------------------------------
export type InterludeCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  items: string[];
};

export function BeforeTheSystems({ t }: { t: InterludeCopy }) {
  return (
    <Interlude
      id="before-the-systems"
      eyebrow={t.eyebrow}
      heading={t.heading}
      body={t.body}
      tone="mixed"
      accent="amber"
      focal={<AlunThread milestones={t.items} />}
    />
  );
}

export function PortfolioSystemInterlude({ t }: { t: InterludeCopy }) {
  return (
    <Interlude
      id="inside-the-proof"
      eyebrow={t.eyebrow}
      heading={t.heading}
      body={t.body}
      tone="mixed"
      accent="cyan"
      focal={<SystemStack layers={t.items} />}
    />
  );
}

export function LivingLayerInterlude({ t }: { t: InterludeCopy }) {
  return (
    <Interlude
      id="living-layer"
      eyebrow={t.eyebrow}
      heading={t.heading}
      body={t.body}
      tone="violet"
      accent="violet"
      focal={<LivingFlow steps={t.items} />}
    />
  );
}
