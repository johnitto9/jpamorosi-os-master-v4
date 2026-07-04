"use client";

// components/visual/BackgroundVideoPanel.tsx
// Background panel that plays a local loop video if present, else a premium
// gradient fallback (no broken video UI, no external URLs). Client component so
// it can force muted + autoplay reliably (React doesn't always set the muted DOM
// property, which browsers require for autoplay). Only renders sources actually
// provided. See docs/VIDEO_ASSET_PIPELINE.md.

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  webm?: string;
  mp4?: string;
  poster?: string;
  className?: string;
  overlayClassName?: string;
  children?: ReactNode;
};

export function BackgroundVideoPanel({
  webm,
  mp4,
  poster,
  className,
  overlayClassName,
  children,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = !!(mp4 || webm);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // ensure property (not just attribute) for autoplay
    v.playsInline = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [mp4, webm]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* premium gradient fallback (always painted, behind the video) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 10%, rgba(0,242,255,0.18) 0%, transparent 60%)," +
            "radial-gradient(60% 80% at 90% 90%, rgba(139,92,246,0.18) 0%, transparent 60%)," +
            "linear-gradient(160deg, #0a0a0f 0%, #10101a 100%)",
        }}
      />
      {hasVideo && (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
        >
          {webm ? <source src={webm} type="video/webm" /> : null}
          {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        </video>
      )}
      {overlayClassName ? (
        <div className={cn("absolute inset-0", overlayClassName)} aria-hidden />
      ) : null}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default BackgroundVideoPanel;
