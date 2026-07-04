"use client";

// components/ui/section-transition.tsx
// SCROLL-LINKED cinematic scene transition (v3 — "page turn with light").
// As a section travels through the viewport its progress drives FOUR layers:
//   1. the fold: deep 3D swing around the top edge (rotateX + z-depth + rise),
//      finishing early (~24% of travel) so the move is fast and punchy, not a
//      slow smear you never notice;
//   2. page lighting: the scene sits in shadow while tilted and clears as it
//      lands flat — the light change is what sells the physical turn;
//   3. a light sweep: a diagonal sheen travels across the surface as the scene
//      lands (the "gloss" of a real page catching light);
//   4. inner parallax: the content lags a few px behind its own frame, adding
//      depth between the section and what's inside it.
// Tracks the page's OWN scroll container (see ScrollStage) with a manual
// rAF-throttled listener. No pinning / no GSAP. Respects reduced motion.

import { useContext, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import type { ReactNode } from "react";
import { ScrollContainerContext } from "./scroll-stage";

export function SectionTransition({
  children,
  className,
  blur = 8,
}: {
  children: ReactNode;
  className?: string;
  /** Max blur (px) applied while entering/leaving. Lower it for heavy sections. */
  blur?: number;
}) {
  const reduce = useReducedMotion();
  const containerRef = useContext(ScrollContainerContext);
  const ref = useRef<HTMLDivElement>(null);

  // 0 = section just below the viewport, 1 = fully scrolled past the top.
  const progress = useMotionValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    const scroller = containerRef?.current ?? null;
    // Safety net: if we can't find the real scroller, keep content visible
    // rather than trapping it at opacity 0.
    if (!scroller) {
      progress.set(1);
      return;
    }
    let raf = 0;
    const compute = () => {
      raf = 0;
      const target = ref.current;
      if (!target) return;
      const cRect = scroller.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const viewH = scroller.clientHeight;
      const relTop = tRect.top - cRect.top; // section top within the viewport
      const p = (viewH - relTop) / (viewH + tRect.height);
      progress.set(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef, reduce, progress]);

  // Layer 1 — cinematic rise (v4). With Lenis smoothing the scrub, the class
  // move is a confident rise + settle: modest 3D tip that flattens as the
  // scene lands, no aggressive fold-out on exit (exits just recede quietly —
  // the incoming scene is the show).
  const opacity = useTransform(progress, [0, 0.06, 0.3, 0.9, 1], [0, 0.55, 1, 1, 0.55]);
  const scale = useTransform(progress, [0, 0.3, 0.9, 1], [0.93, 1, 1, 0.975]);
  const y = useTransform(progress, [0, 0.3, 0.9, 1], [110, 0, 0, -36]);
  const z = useTransform(progress, [0, 0.3], [-120, 0]);
  const rotateX = useTransform(progress, [0, 0.3], [16, 0]);
  const blurPx = useTransform(progress, [0, 0.3, 0.9, 1], [blur, 0, 0, blur * 0.4]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  // Layer 2 — page lighting (in shadow while below, clears as it lands).
  const shade = useTransform(progress, [0, 0.3, 0.9, 1], [0.5, 0, 0, 0.3]);

  // Layer 3 — light sweep across the surface as the scene lands.
  const sweepX = useTransform(progress, [0.08, 0.38], ["-130%", "160%"]);
  const sweepO = useTransform(progress, [0.08, 0.16, 0.32, 0.4], [0, 0.35, 0.25, 0]);

  // Layer 4 — inner parallax: the content lags its frame slightly.
  const innerY = useTransform(progress, [0, 0.42], [44, 0]);

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        position: "relative", // anchors the lighting + sweep layers below
        opacity,
        scale,
        y,
        z,
        rotateX,
        filter,
        transformPerspective: 1100,
        transformOrigin: "50% 0%",
        willChange: "transform, opacity, filter",
      }}
    >
      <motion.div style={{ y: innerY }}>{children}</motion.div>
      {/* page-lighting veil: darkens the scene while it is tilted in 3D */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: shade,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      {/* light sweep: diagonal sheen travelling across as the page lands */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[45%] mix-blend-screen"
        style={{
          x: sweepX,
          opacity: sweepO,
          background:
            "linear-gradient(100deg, transparent 0%, rgba(0,242,255,0.07) 30%, rgba(255,255,255,0.12) 50%, rgba(139,92,246,0.07) 70%, transparent 100%)",
        }}
      />
    </motion.div>
  );
}

export default SectionTransition;
