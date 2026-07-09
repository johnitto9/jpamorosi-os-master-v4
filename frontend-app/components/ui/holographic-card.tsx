"use client";

// components/ui/holographic-card.tsx
// Holographic card: sits tilted in 3D at rest (~15°) and responds to the cursor
// with an iridescent sheen + glare. Desktop/fine-pointer + hover only; respects
// prefers-reduced-motion (keeps a static tilt, no live motion).

import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Intensity = "subtle" | "medium";

export function HolographicCard({
  children,
  className,
  intensity = "medium",
  disabled = false,
  restTilt = 14,
}: {
  children: ReactNode;
  className?: string;
  intensity?: Intensity;
  disabled?: boolean;
  /** default resting Y-tilt in degrees (card shown slightly in profile) */
  restTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);
  const maxTilt = intensity === "medium" ? 15 : 8;

  useEffect(() => {
    setInteractive(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // rest pose: slightly angled so it reads as 3D even without interaction
  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "6deg");
    el.style.setProperty("--ry", `${-restTilt}deg`);
    el.style.setProperty("--shine", "0.35");
    el.style.setProperty("--x", "78%");
    el.style.setProperty("--y", "28%");
  }, [restTilt]);

  useEffect(() => {
    reset();
  }, [reset]);

  // shared tilt math for mouse AND touch
  const applyPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      // modulate AROUND the resting pose so it never snaps flat — stays tilted
      el.style.setProperty("--rx", `${6 + (0.5 - py) * (maxTilt * 0.7)}deg`);
      el.style.setProperty("--ry", `${-restTilt + (px - 0.5) * (maxTilt * 0.7)}deg`);
      el.style.setProperty("--x", `${px * 100}%`);
      el.style.setProperty("--y", `${py * 100}%`);
      el.style.setProperty("--shine", "1");
    },
    [maxTilt, restTilt],
  );

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !interactive) return;
      applyPoint(e.clientX, e.clientY);
    },
    [disabled, interactive, applyPoint],
  );

  // mobile: press & hold tilts the card live (passive — scroll still works)
  const onTouch = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return;
      const t = e.touches[0];
      if (t) applyPoint(t.clientX, t.clientY);
    },
    [disabled, applyPoint],
  );

  return (
    <div className="[perspective:1200px]">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={reset}
        onTouchCancel={reset}
        style={
          {
            transform:
              "rotateX(var(--rx,6deg)) rotateY(var(--ry,-14deg))",
            transition:
              "transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease-out",
          } as React.CSSProperties
        }
        className={cn(
          "group/holo relative rounded-2xl [transform-style:preserve-3d]",
          className,
        )}
      >
        {/* iridescent holographic sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--shine,0.35)] mix-blend-screen transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(115deg, transparent 0%, rgba(0,242,255,0.10) 30%, rgba(139,92,246,0.16) 45%, rgba(0,242,255,0.10) 60%, transparent 100%)",
            backgroundSize: "220% 220%",
            backgroundPosition: "var(--x,78%) var(--y,28%)",
          }}
        />
        {/* cursor glare */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--shine,0.35)] transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(420px circle at var(--x,78%) var(--y,28%), rgba(255,255,255,0.14), transparent 45%)",
          }}
        />
        {/* edge rim */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow:
              "0 0 0 1px rgba(0,242,255,0.18), 0 24px 60px -22px rgba(0,0,0,0.9), 0 0 50px -12px rgba(139,92,246,0.4)",
          }}
        />
        <div style={{ transform: "translateZ(28px)" }} className="[transform-style:preserve-3d]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default HolographicCard;
