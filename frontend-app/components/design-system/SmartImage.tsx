"use client";

// components/design-system/SmartImage.tsx
// The site's single image wrapper — BuenPick-grade loading experience:
//  - next/image (fill): resized + AVIF/WebP variants, `sizes`-aware.
//  - Premium load: shimmer skeleton underneath, image reveals with a
//    fade + blur-in once decoded.
//  - SAFE gate: a fallback timeout guarantees it never sits on the skeleton
//    forever (slow networks, cached-but-no-event edge cases).
//  - Missing src OR load error -> deterministic brand-gradient placeholder
//    (no broken-image icon, ever).

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type SmartImageProps = {
  src?: string;
  alt: string;
  /** accent used for the placeholder bloom when no image is available */
  accent?: string;
  glow?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  label?: string;
  /** "contain" for logos/marks that must always show COMPLETE in their box */
  fit?: "cover" | "contain";
};

export function SmartImage({
  src,
  alt,
  accent = "#00f2ff",
  glow,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  label,
  fit = "cover",
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    // safety gate: never stuck on the skeleton
    const t = window.setTimeout(() => setLoaded(true), 2500);
    return () => window.clearTimeout(t);
  }, [src]);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-black/40",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(90% 90% at 30% 20%, ${glow ?? accent + "33"} 0%, transparent 60%)`,
          }}
        />
        <span
          aria-hidden
          className="relative z-10 font-mono text-xs uppercase tracking-[0.3em] text-white/50"
        >
          {label ?? "Amorosi Labs"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-black/40", className)}>
      {/* shimmer while loading — fades out on reveal */}
      <span
        aria-hidden
        className={cn(
          "lab-skeleton absolute inset-0 transition-opacity duration-700",
          loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          "transition-[opacity,filter,transform] duration-700 ease-out group-hover:scale-105",
          fit === "contain" ? "object-contain" : "object-cover",
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
    </div>
  );
}

export default SmartImage;
