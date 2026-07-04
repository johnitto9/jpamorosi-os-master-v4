"use client";

// components/ui/chapter-nav.tsx
// Cyberpunk node rail: a vertical energy line with knob-nodes per chapter.
// The node in view grows with a glow + expanding pulse ring (fires on scroll
// arrival AND on click), label slides in beside it. Hidden on small screens.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

const DEFAULT_CHAPTERS = [
  { id: "intro", label: "Intro" },
  { id: "hall-of-fame", label: "Hall of Fame" },
  { id: "featured", label: "Featured" },
  { id: "lab-archive", label: "Archive" },
  { id: "contact", label: "Contact" },
];

const ACCENT = "#00f2ff";

// The knob wrapper: overshoots (grows past size, springs back) every time its
// chapter becomes active — the "alive" pop the rail is meant to have.
function KnobPop({
  on,
  pulseKey,
  children,
}: {
  on: boolean;
  pulseKey: number;
  children: React.ReactNode;
}) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (!on) return;
    controls.start({
      scale: [1, 1.55, 0.92, 1],
      transition: { duration: 0.6, times: [0, 0.35, 0.7, 1], ease: "easeOut" },
    });
  }, [on, pulseKey, controls]);
  return (
    <motion.span animate={controls} className="relative flex items-center justify-center">
      {children}
    </motion.span>
  );
}

export function ChapterNav({
  labels,
}: {
  /** i18n: translated label per chapter id (defaults to English) */
  labels?: Partial<Record<string, string>>;
} = {}) {
  const CHAPTERS = DEFAULT_CHAPTERS.map((c) => ({
    ...c,
    label: labels?.[c.id] ?? c.label,
  }));
  const [active, setActive] = useState("intro");
  // bump key so the pulse ring re-fires every time the active node changes
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive((prev) => {
              if (prev !== e.target.id) setPulseKey((k) => k + 1);
              return e.target.id;
            });
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    setPulseKey((k) => k + 1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Sections"
      className="ui-interactive fixed right-7 top-1/2 z-[90] hidden -translate-y-1/2 md:block"
    >
      <div className="relative flex flex-col items-center gap-6">
        {/* energy rail behind the nodes */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 top-1 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,242,255,0.35) 20%, rgba(139,92,246,0.35) 80%, transparent 100%)",
          }}
        />
        {CHAPTERS.map((c) => {
          const on = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => go(c.id)}
              aria-label={c.label}
              aria-current={on}
              className="group relative flex h-5 w-5 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {/* label — slides in for the active node, hover for the rest */}
              <span
                className={`pointer-events-none absolute right-7 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] transition-all duration-300 ${
                  on
                    ? "translate-x-0 text-cyan-300 opacity-100"
                    : "translate-x-1 text-white/40 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                {c.label}
              </span>

              {/* expanding pulse ring when this node becomes active */}
              <AnimatePresence>
                {on && (
                  <motion.span
                    key={pulseKey}
                    aria-hidden
                    className="absolute rounded-full border"
                    style={{ borderColor: ACCENT }}
                    initial={{ width: 10, height: 10, opacity: 0.9 }}
                    animate={{ width: 34, height: 34, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* knob: outer ring + glowing core, grows when active and
                  overshoots (pop + settle) on every activation */}
              <KnobPop on={on} pulseKey={pulseKey}>
                <motion.span
                  aria-hidden
                  className="relative flex items-center justify-center rounded-full border"
                  animate={{
                    width: on ? 18 : 11,
                    height: on ? 18 : 11,
                    borderColor: on ? ACCENT : "rgba(255,255,255,0.25)",
                    boxShadow: on
                      ? `0 0 12px ${ACCENT}, inset 0 0 6px rgba(0,242,255,0.4)`
                      : "0 0 0px rgba(0,0,0,0)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  style={{ background: "rgba(5,6,11,0.85)" }}
                >
                  <motion.span
                    className="rounded-full"
                    animate={{
                      width: on ? 6 : 3,
                      height: on ? 6 : 3,
                      background: on ? ACCENT : "rgba(255,255,255,0.45)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  />
                </motion.span>
              </KnobPop>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default ChapterNav;
