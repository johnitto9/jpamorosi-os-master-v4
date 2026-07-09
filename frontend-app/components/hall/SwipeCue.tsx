// components/hall/SwipeCue.tsx
// A lightweight, dependency-free "swipe down" gesture hint: a stack of downward
// chevrons (arrows only — no hand) that glide down + fade in sequence on a loop.
// Pure CSS animation (see .lab-swipe-* in globals.css) — no motion library, no
// runtime JS. Reused by the hero and by the bottom of every GSAP interlude on
// mobile. Reduced-motion safe (animation disabled in globals.css).

import { cn } from "@/lib/utils";

export function SwipeCue({
  className,
  label = "swipe",
  tone = "cyan",
}: {
  className?: string;
  /** small caption under the arrows; pass "" to hide */
  label?: string;
  tone?: "cyan" | "amber" | "violet";
}) {
  const color =
    tone === "amber" ? "#fbbf24" : tone === "violet" ? "#c4b5fd" : "#7de3ff";
  return (
    <div
      aria-hidden
      className={cn(
        "lab-swipe pointer-events-none flex select-none flex-col items-center gap-1",
        className,
      )}
      style={{ color }}
    >
      {/* down arrows: the whole group glides downward (lab-swipe-hand), and each
          chevron fades in sequence to reinforce the "down" direction */}
      <span className="lab-swipe-hand relative block">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path
            className="lab-swipe-chevron lab-swipe-chevron-1"
            d="M5 4l8 7 8-7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="lab-swipe-chevron lab-swipe-chevron-2"
            d="M5 13l8 7 8-7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {label ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/40">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default SwipeCue;
