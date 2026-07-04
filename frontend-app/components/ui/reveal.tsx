"use client";

// components/ui/reveal.tsx
// Load / enter animation. Fades + rises content into view once. Respects
// prefers-reduced-motion. Use `delay` for staggered storyboard reveals.

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 22,
  once = true,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
  as?: keyof typeof motion;
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as React.ComponentType<HTMLMotionProps<"div">>;
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

export default Reveal;
