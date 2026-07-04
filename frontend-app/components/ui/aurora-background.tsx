"use client";

// components/ui/aurora-background.tsx
// Animated aurora gradient (framer-motion color cycle) + drei starfield.
// Restrained brand palette (emerald → blue → violet → cyan; no loud pink).
// The starfield is loaded client-only (ssr:false) and wrapped in an error
// boundary so a WebGL failure can never take down the page — the aurora remains.

import { useEffect } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  motion,
  animate,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { StarField } from "./star-field";

const COLORS = ["#00e0a4", "#1E67C6", "#8b5cf6", "#00f2ff"];

export function AuroraBackground({ className }: { className?: string }) {
  const color = useMotionValue(COLORS[0]);

  useEffect(() => {
    const controls = animate(color, COLORS, {
      ease: "easeInOut",
      duration: 12,
      repeat: Infinity,
      repeatType: "mirror",
    });
    return () => controls.stop();
  }, [color]);

  const backgroundImage = useMotionTemplate`radial-gradient(130% 130% at 50% 0%, #05060f 45%, ${color})`;

  return (
    <motion.div
      aria-hidden
      style={{ backgroundImage }}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <StarField className="opacity-90" density={1.1} />
      {/* keep the bottom readable / blend into the page */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-dark-bg" />
    </motion.div>
  );
}

export default AuroraBackground;
