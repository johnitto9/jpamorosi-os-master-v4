"use client";

// components/visual/AuroraScene.tsx
// Site-wide living background: a color-cycling aurora radial gradient + canvas
// starfield, fixed behind all content. ONE palette everywhere: the aurora
// cycles the original brand colors on every page/section — deliberately NOT
// per-section (palette switches restarted the cycle and caused abrupt color
// jumps; user feedback 2026-07-02). SSR-safe, reduced-motion aware (the
// starfield stills itself; the gradient simply rests on its first color).

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { StarField } from "@/components/ui/star-field";
import { DEFAULT_SCENE_PALETTE } from "@/store/sceneStore";

export function AuroraScene() {
  const reduce = useReducedMotion();
  const color = useMotionValue(DEFAULT_SCENE_PALETTE[0]);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  useEffect(() => {
    const pal = DEFAULT_SCENE_PALETTE;
    if (reduce) {
      // Ease once to the representative color, then rest.
      const controls = animate(color, pal[0], { duration: 1.2, ease: "easeInOut" });
      return () => controls.stop();
    }
    // Loop through the palette (…→last→first) so the cycle is seamless.
    const controls = animate(color, [...pal, pal[0]], {
      duration: Math.max(10, pal.length * 3.5),
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    });
    return () => controls.stop();
  }, [color, reduce]);

  useEffect(() => {
    if (reduce) return;
    const coarseOrMobile = window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
    if (coarseOrMobile) return;
    let settle = 0;
    const onScroll = (event: Event) => {
      const detail = (event as CustomEvent<{ progress?: number; velocity?: number }>).detail ?? {};
      const progress = Math.max(0, Math.min(1, detail.progress ?? 0));
      const velocity = Math.max(-1800, Math.min(1800, detail.velocity ?? 0));
      x.set(velocity * 0.012);
      y.set(progress * -22 + velocity * 0.003);
      scale.set(1 + Math.min(0.026, Math.abs(velocity) / 70_000));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        x.set(0);
        scale.set(1);
      }, 160);
    };
    window.addEventListener("al-scroll-stage", onScroll);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("al-scroll-stage", onScroll);
    };
  }, [reduce, scale, x, y]);

  const backgroundImage = useMotionTemplate`radial-gradient(130% 130% at 50% 0%, #05060f 42%, ${color})`;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute -inset-[5%] transform-gpu will-change-transform"
        style={{ backgroundImage, x, y, scale }}
      >
        <StarField className="opacity-90" density={1.05} />
        {/* subtle vignette so content stays legible over the brightest edge */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(5,6,11,0.55) 100%)",
          }}
        />
        {/* film grain: barely-there noise that kills gradient banding and adds
            physical texture (top-tier feel for almost zero cost) */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E\")",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default AuroraScene;
