// components/ui/glass-aurora.tsx
// Premium card backdrop: large brand-color light blobs drifting slowly behind
// frosted glass, over a faint masked grid. Replaces the dotted particle field
// in the home's closing cards (user feedback: dots read cheap). Pure CSS —
// no canvas, no JS — so it's crisp at any DPI and free at runtime.
// Motion is keyframed (lab-blob-*) and disabled under prefers-reduced-motion.

import { cn } from "@/lib/utils";

type Tone = "cyan" | "violet" | "mixed";

const BLOBS: Record<Tone, Array<{ color: string; cls: string }>> = {
  mixed: [
    { color: "rgba(0,242,255,0.20)", cls: "lab-blob-a -left-20 -top-24 h-72 w-72" },
    { color: "rgba(139,92,246,0.20)", cls: "lab-blob-b -right-16 top-6 h-80 w-80" },
    { color: "rgba(0,224,164,0.14)", cls: "lab-blob-c bottom-[-40%] left-1/3 h-72 w-72" },
  ],
  cyan: [
    { color: "rgba(0,242,255,0.22)", cls: "lab-blob-a -left-20 -top-24 h-72 w-72" },
    { color: "rgba(30,103,198,0.20)", cls: "lab-blob-b -right-16 top-6 h-80 w-80" },
    { color: "rgba(0,242,255,0.12)", cls: "lab-blob-c bottom-[-40%] left-1/3 h-72 w-72" },
  ],
  violet: [
    { color: "rgba(139,92,246,0.22)", cls: "lab-blob-a -left-20 -top-24 h-72 w-72" },
    { color: "rgba(168,85,247,0.18)", cls: "lab-blob-b -right-16 top-6 h-80 w-80" },
    { color: "rgba(0,242,255,0.10)", cls: "lab-blob-c bottom-[-40%] left-1/3 h-72 w-72" },
  ],
};

export function GlassAurora({
  tone = "mixed",
  className,
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* drifting light blobs */}
      {BLOBS[tone].map((b, i) => (
        <div
          key={i}
          className={cn("absolute rounded-full blur-3xl", b.cls)}
          style={{ background: `radial-gradient(closest-side, ${b.color}, transparent 70%)` }}
        />
      ))}
      {/* faint structural grid, feathered to the center */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 0%, transparent 78%)",
        }}
      />
      {/* glass sheen along the top edge */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 50%, transparent)",
        }}
      />
    </div>
  );
}

export default GlassAurora;
