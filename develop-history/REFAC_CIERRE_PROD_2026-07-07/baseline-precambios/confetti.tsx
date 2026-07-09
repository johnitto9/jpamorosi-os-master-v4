"use client";

// components/ui/confetti.tsx
// Lightweight canvas confetti that falls within its parent (absolute inset-0).
// Colours are driven by the selected project so it feels branded. Performant,
// paused off-screen, disabled under prefers-reduced-motion.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Piece = {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  vx: number;
  rot: number;
  vr: number;
  color: string;
};

export function Confetti({
  colors,
  className,
  count = 46,
}: {
  colors: string[];
  className?: string;
  count?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // stable key so pieces re-seed when the palette changes
  const key = colors.join(",");

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pal = colors.length ? colors : ["#00f2ff", "#8b5cf6"];

    let W = 0;
    let H = 0;
    let pieces: Piece[] = [];
    const seed = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      pieces = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * -H,
        w: 3 + Math.random() * 4,
        h: 5 + Math.random() * 6,
        vy: 18 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 14,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 3,
        color: pal[(Math.random() * pal.length) | 0],
      }));
    };
    const ro = new ResizeObserver(seed);
    ro.observe(canvas);
    seed();

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    function loop(now: number) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (const p of pieces) {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 10) {
          p.y = -10;
          p.x = Math.random() * W;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.restore();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [key, count]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}

export default Confetti;
