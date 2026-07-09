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
  /** When false the video PAUSES instead of unmounting. Persistent-mount
   *  callers (Hall of Fame crossfade) use this so <video> elements are never
   *  created/destroyed per interaction — Chromium keeps dead media players
   *  around until GC and caps them per tab, so mount churn "nests zombies"
   *  until playback starts glitching. Default true (previous behavior). */
  playing?: boolean;
};

export function BackgroundVideoPanel({
  webm,
  mp4,
  poster,
  className,
  overlayClassName,
  children,
  playing = true,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = !!(mp4 || webm);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // ensure property (not just attribute) for autoplay
    v.playsInline = true;
    if (!playing) {
      // GRACEFUL pause: the caller crossfades this layer out over ~700ms.
      // Pausing instantly froze the outgoing frame mid-fade, which read as
      // "the video jammed". Let it run through the fade, then stop.
      const t = window.setTimeout(() => v.pause(), 750);
      return () => window.clearTimeout(t);
    }
    // decode only while on screen — a full-viewport loop playing off-screen
    // burns the scroll budget for nothing
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(v);
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return () => io.disconnect();
  }, [mp4, webm, playing]);

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
        // Playback is FULLY managed by the effect above — no autoPlay attr
        // (inactive layers were racing play-before-pause on mount). A direct
        // `src` instead of <source> children: React reconciliation can make
        // the browser re-run source selection and RESTART the video.
        // preload: only the active layer buffers ahead; inactive/offscreen
        // layers fetch metadata only (three full videos used to download in
        // parallel on page load, starving each other into stutter).
        <video
          ref={ref}
          src={webm || mp4}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload={playing ? "auto" : "metadata"}
          poster={poster}
        />
      )}
      {overlayClassName ? (
        <div className={cn("absolute inset-0", overlayClassName)} aria-hidden />
      ) : null}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default BackgroundVideoPanel;
