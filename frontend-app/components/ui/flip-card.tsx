"use client";

// components/ui/flip-card.tsx
// Interactive proof card: click/tap flips it in 3D. The back rewards the
// flip — a short punchline + a CTA (Try it live / Get the app / Read the
// code…) and Hall-of-Fame confetti raining INSIDE the card. Keyboard
// accessible (button semantics, Enter/Space flips).

import { useState } from "react";
import { motion } from "framer-motion";
import { Confetti } from "@/components/ui/confetti";

export type FlipBack = {
  title: string;
  cta?: { label: string; href: string };
};

export function FlipCard({
  front,
  back,
  accent,
  glow,
  secondary,
}: {
  front: React.ReactNode;
  back: FlipBack;
  accent: string;
  glow: string;
  secondary: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="h-full [perspective:1000px]">
      <motion.div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full min-h-[92px] cursor-pointer [transform-style:preserve-3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {/* front */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] [backface-visibility:hidden]"
          style={{ boxShadow: `0 0 40px -18px ${glow}` }}
        >
          {front}
          <span
            aria-hidden
            className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25"
          >
            flip ↻
          </span>
        </div>

        {/* back */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            borderColor: `${accent}66`,
            background: `radial-gradient(120% 120% at 50% 0%, ${glow} 0%, rgba(3,4,8,0.95) 70%)`,
          }}
        >
          {flipped && (
            <Confetti colors={[accent, secondary, "#ffffff"]} className="opacity-80" />
          )}
          <div className="relative flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
            <p className="text-base font-bold text-white">{back.title}</p>
            {back.cta && (
              <a
                href={back.cta.href}
                target={back.cta.href.startsWith("http") ? "_blank" : undefined}
                rel={back.cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-black transition-transform hover:scale-105"
                style={{ background: accent }}
              >
                {back.cta.label}
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default FlipCard;
