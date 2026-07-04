"use client";

// components/ui/star-field.tsx
// Lightweight canvas-2D starfield (twinkle + slow drift). Reliable & SSR-safe
// (no WebGL/R3F). Mostly white with a few cyan/violet tinted stars; the aurora
// gradient behind provides the colour shift. Respects prefers-reduced-motion.

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Star = {
  x: number;
  y: number;
  r: number;
  a: number; // base alpha
  tw: number; // twinkle speed
  ph: number; // phase
  c: string; // color
};

const TINTS = ["255,255,255", "255,255,255", "255,255,255", "180,240,255", "200,190,255"];

export function StarField({
  className,
  style,
  density = 1,
}: {
  className?: string;
  style?: CSSProperties;
  density?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    let stars: Star[] = [];

    const build = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      const n = Math.min(420, Math.floor(((W * H) / 6500) * density));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.25,
        a: Math.random() * 0.5 + 0.25,
        tw: Math.random() * 1.6 + 0.4,
        ph: Math.random() * Math.PI * 2,
        c: TINTS[(Math.random() * TINTS.length) | 0],
      }));
    };
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    build();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (const s of stars) {
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
        const alpha = s.a * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.c},${alpha.toFixed(3)})`;
        ctx.shadowColor = `rgba(${s.c},0.9)`;
        ctx.shadowBlur = s.r * 3.5;
        ctx.fill();
      }
      ctx.restore();
    };

    if (reduce) {
      draw(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = 0;
    let drift = 0;
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
      if (now - last > 33) {
        last = now;
        // gentle downward drift
        drift += 0.02;
        for (const s of stars) {
          s.y += 0.015;
          if (s.y > H) s.y = 0;
        }
        draw((now - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      void drift;
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={style}
    />
  );
}

export default StarField;
