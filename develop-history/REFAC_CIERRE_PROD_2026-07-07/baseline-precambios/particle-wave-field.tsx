"use client";

// components/ui/particle-wave-field.tsx
// Delicate dotted particle-wave field (inspired by three.js webgl_points_waves):
// a fine grid of small, soft, glowing points flowing on a sine wave in
// perspective. Minimal + restrained — small dots, low opacity, soft glow, masked
// edges. Canvas 2D → SSR-safe, DPR-capped, ~24fps, paused off-screen, respects
// prefers-reduced-motion. Density scales with width (mobile-friendly).

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Variant = "cyan" | "emerald" | "violet" | "gold" | "mixed";
type Density = "low" | "medium" | "high";
type Mask = "center" | "right" | "bottom" | "none";

const RGB: Record<Exclude<Variant, "mixed">, [number, number, number]> = {
  cyan: [0, 242, 255],
  emerald: [26, 224, 164],
  violet: [139, 92, 246],
  gold: [240, 165, 0],
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const MASKS: Record<Mask, string | undefined> = {
  // keep the field off the main content; soft feathered edges
  center: "radial-gradient(130% 125% at 55% 55%, #000 45%, transparent 92%)",
  right: "radial-gradient(85% 120% at 92% 55%, #000 30%, transparent 85%)",
  bottom: "linear-gradient(to top, #000 30%, transparent 95%)",
  none: undefined,
};

export function ParticleWaveField({
  className,
  variant = "cyan",
  density = "medium",
  animated = true,
  mask = "center",
  style,
}: {
  className?: string;
  variant?: Variant;
  density?: Density;
  animated?: boolean;
  mask?: Mask;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

    // fine grid: small spacing = many small dots (delicate). Scales with width.
    const spacing = density === "low" ? 24 : density === "high" ? 15 : 19;
    const rows: number = density === "high" ? 9 : 7;

    const colOf = (fx: number): [number, number, number] => {
      if (variant !== "mixed") return RGB[variant];
      return [
        lerp(RGB.cyan[0], RGB.violet[0], fx),
        lerp(RGB.cyan[1], RGB.violet[1], fx),
        lerp(RGB.cyan[2], RGB.violet[2], fx),
      ];
    };

    let W = 0;
    let H = 0;
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      const cols = clamp(Math.round(W / spacing), 12, 160);

      for (let r = 0; r < rows; r++) {
        const depth = rows === 1 ? 1 : r / (rows - 1); // 0 back → 1 front
        // rows recede upward → perspective; front rows lower & denser vertically
        const baseY = H * (0.28 + Math.pow(depth, 1.15) * 0.6);
        // slow lateral drift, faster up front (parallax) — wraps seamlessly
        const drift = (t * (6 + depth * 14)) % W;
        for (let i = 0; i < cols; i++) {
          const fx = i / (cols - 1);
          const x = (fx * W + drift + W) % W;
          const wave =
            Math.sin(fx * Math.PI * 2 * 1.1 + t + r * 0.45) * (H * 0.05) +
            Math.sin(fx * Math.PI * 2 * 0.5 - t * 0.6 + r * 0.25) * (H * 0.03);
          const y = baseY + wave;
          const crest = 0.5 + 0.5 * Math.sin(fx * Math.PI * 2 * 1.1 + t + r * 0.45);
          // organic shimmer: each dot breathes on its own phase
          const twinkle = 0.72 + 0.28 * Math.sin(t * 2.1 + i * 1.7 + r * 2.3);
          // small, soft points — crest dots swell slightly (wave catches light)
          const size = (0.4 + depth * 1.05) * (1 + crest * 0.35);
          const alpha = (0.06 + depth * 0.32) * (0.4 + 0.6 * crest) * twinkle;
          const [cr, cg, cb] = colOf(fx);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha.toFixed(3)})`;
          ctx.shadowColor = `rgba(${cr | 0},${cg | 0},${cb | 0},0.8)`;
          ctx.shadowBlur = size * 4.5; // soft halo relative to tiny core
          ctx.fill();
          // sparkle: the very top of the crest gets a tiny white-hot core
          if (crest > 0.92 && depth > 0.45) {
            ctx.beginPath();
            ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`;
            ctx.fill();
          }
        }
      }
      ctx.restore();
    };

    if (!animated || reduce) {
      draw(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const start = performance.now();
    function loop(now: number) {
      raf = 0;
      if (!visible) return;
      if (now - last > 40) {
        last = now;
        draw(((now - start) / 1000) * 0.4);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [variant, density, animated]);

  const maskCss = MASKS[mask];
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{
        ...(maskCss
          ? { maskImage: maskCss, WebkitMaskImage: maskCss }
          : {}),
        ...style,
      }}
    />
  );
}

export default ParticleWaveField;
