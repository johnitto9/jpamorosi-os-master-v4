// components/design-system/GlowCard.tsx
// Path: components/design-system/GlowCard.tsx
// Inputs: children, optional accent glow color, className, `as` element/link.
// Outputs: a dark glass panel with a soft radial glow and subtle hover lift.
// State: none (presentational).
// Data source: none.
// Failure mode: renders a plain glass panel if no glow provided.

import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

type GlowCardProps = {
  children: ReactNode;
  /** rgba/hex color used for the soft radial bloom behind the card */
  glow?: string;
  className?: string;
  interactive?: boolean;
  style?: CSSProperties;
};

export function GlowCard({
  children,
  glow,
  className,
  interactive = true,
  style,
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10",
        "bg-white/[0.03] backdrop-blur-md",
        "transition-all duration-300",
        interactive &&
          "hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]",
        className,
      )}
      style={style}
    >
      {glow ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px opacity-40 transition-opacity duration-300 group-hover:opacity-80"
          style={{
            background: `radial-gradient(120% 120% at 0% 0%, ${glow} 0%, transparent 55%)`,
          }}
        />
      ) : null}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export default GlowCard;
