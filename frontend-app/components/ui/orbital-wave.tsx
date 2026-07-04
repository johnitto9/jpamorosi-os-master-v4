// components/ui/orbital-wave.tsx
// A 3D-looking orbital ring (Saturn-style) rendered in two halves so it can wrap
// a card: render `part="back"` BEHIND the card and `part="front"` IN FRONT of it.
// Wide ellipse seen at an angle, glowing cyan → blue → violet. No comet.
// Pure SVG (server component). Sits in a box WIDER than the card.

import { cn } from "@/lib/utils";

// ellipse centred (100,100) rx92 ry42 → left (8,100), right (192,100)
const BACK_ARC = "M8,100 A92,42 0 0 1 192,100"; // upper arc (behind)
const FRONT_ARC = "M8,100 A92,42 0 0 0 192,100"; // lower arc (in front)
const MID = "M100,74 a74,32 0 1,0 0.1,0 z"; // inner depth ring (full, dashed)

function Arc({ d, dashed = false }: { d: string; dashed?: boolean }) {
  if (dashed) {
    return (
      <path
        d={d}
        fill="none"
        stroke="#00f2ff"
        strokeOpacity="0.26"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
    );
  }
  return (
    <>
      <path d={d} fill="none" stroke="url(#ow-grad)" strokeWidth="7" opacity="0.42" filter="url(#ow-soft)" />
      <path d={d} fill="none" stroke="url(#ow-grad)" strokeWidth="1.6" filter="url(#ow-glow)" />
    </>
  );
}

export function OrbitalWave({
  className,
  part = "full",
}: {
  className?: string;
  part?: "back" | "front" | "full";
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ transform: "rotate(-16deg)" }}
    >
      <defs>
        <linearGradient id="ow-grad" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#00f2ff" stopOpacity="0" />
          <stop offset="28%" stopColor="#00f2ff" stopOpacity="1" />
          <stop offset="60%" stopColor="#4f7cff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <filter id="ow-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="ow-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {(part === "back" || part === "full") && (
        <>
          <Arc d={MID} dashed />
          <Arc d={BACK_ARC} />
        </>
      )}
      {(part === "front" || part === "full") && <Arc d={FRONT_ARC} />}
    </svg>
  );
}

export default OrbitalWave;
