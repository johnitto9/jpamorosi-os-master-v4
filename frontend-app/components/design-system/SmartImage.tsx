// components/design-system/SmartImage.tsx
// Path: components/design-system/SmartImage.tsx
// Inputs: src (optional), alt, fill/sizes, glow accent, className.
// Outputs: an optimized next/image when a src exists, otherwise a graceful
//          gradient glow placeholder (no broken image icon).
// State: none (server component — no runtime onError needed).
// Data source: project assets (may be undefined in phase 1).
// Failure mode: missing src -> deterministic gradient placeholder.

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
  if (!src) {
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "transition-transform duration-500 group-hover:scale-105",
          fit === "contain" ? "object-contain" : "object-cover",
        )}
      />
    </div>
  );
}

export default SmartImage;
