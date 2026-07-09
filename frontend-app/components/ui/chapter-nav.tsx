"use client";

// components/ui/chapter-nav.tsx
// Cyberpunk node rail: a vertical energy line with knob-nodes per chapter.
// The node in view grows with a glow + expanding pulse ring (fires on scroll
// arrival AND on click), label slides in beside it. Hidden on small screens.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

const DEFAULT_CHAPTERS = [
  { id: "intro", label: "Intro", segmentAfter: "before-the-systems" },
  { id: "hall-of-fame", label: "Hall of Fame", segmentAfter: "inside-the-proof" },
  { id: "featured", label: "Featured", segmentAfter: "living-layer" },
  { id: "lab-archive", label: "Archive" },
  { id: "contact", label: "Contact" },
];

const DEFAULT_SEGMENTS: Record<string, string> = {
  "before-the-systems": "Before the systems",
  "inside-the-proof": "Inside the proof",
  "living-layer": "The living layer",
};

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
  const [segmentProgress, setSegmentProgress] = useState<Record<string, number>>({});
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

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("main");
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = scroller.getBoundingClientRect();
      const vc = viewport.top + viewport.height / 2; // viewport centre line
      const next: Record<string, number> = {};
      // A connector fills as you travel from one chapter node to the NEXT,
      // reaching exactly 100% when the next node's centre reaches the viewport
      // centre — the same point the IntersectionObserver lights that node. So
      // the bar and the dot arrive together: no dead travel, exact completion
      // (the old formula tracked the interlude's own height and finished early).
      // Keyed by the CURRENT chapter id (the connector rendered under it).
      for (let i = 0; i < CHAPTERS.length - 1; i++) {
        const a = document.getElementById(CHAPTERS[i].id);
        const b = document.getElementById(CHAPTERS[i + 1].id);
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const centerA = ra.top + ra.height / 2;
        const centerB = rb.top + rb.height / 2;
        const span = centerB - centerA; // A→B distance, constant while scrolling
        const progress = span > 0 ? (vc - centerA) / span : 0;
        next[CHAPTERS[i].id] = Math.max(0, Math.min(1, progress));
      }
      setSegmentProgress(next);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (id: string) => {
    setPulseKey((k) => k + 1);
    const el = document.getElementById(id);
    if (!el) return;
    // Lenis owns the scroll physics — scrollIntoView's native animation gets
    // overwritten by Lenis's raf mid-flight and stops short of the target.
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: { offset?: number }) => void } }).__lenis;
    if (lenis) lenis.scrollTo(el, { offset: -8 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" }); // reduced-motion path
  };

  return (
    <nav
      aria-label="Sections"
      // Visible on mobile too now (compact dots-only rail). pointer-events-none
      // on the container so the thin right strip never blocks touch-scroll; only
      // the knob buttons re-enable pointer events.
      className="ui-interactive pointer-events-none fixed right-2.5 top-1/2 z-[80] -translate-y-1/2 md:right-7"
    >
      <div className="relative flex flex-col items-center gap-3">
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
            <div key={c.id} className="flex flex-col items-center">
              <button
                onClick={() => go(c.id)}
                aria-label={c.label}
                aria-current={on}
                className="group pointer-events-auto relative flex h-5 w-5 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {/* label (section title) — shown for the active node on every
                    viewport; on desktop the rest reveal on hover. On mobile
                    there's no hover, so only the active title appears. */}
                <span
                  className={`pointer-events-none absolute right-7 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.25em] transition-all duration-300 md:text-[10px] ${
                    on
                      ? "translate-x-0 text-cyan-300 opacity-100"
                      : "translate-x-1 text-white/40 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100"
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
              {c.segmentAfter ? (
                <button
                  type="button"
                  onClick={() => go(c.segmentAfter!)}
                  aria-label={labels?.[c.segmentAfter] ?? DEFAULT_SEGMENTS[c.segmentAfter]}
                  // connectors (loading bars) now show on mobile too — a compact
                  // rail between the dots that fills as you scroll the segment.
                  className="group pointer-events-auto relative my-1 flex h-8 w-5 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:h-12"
                >
                  <span className="relative h-full w-px overflow-hidden rounded-full bg-white/10">
                    <motion.span
                      aria-hidden
                      className="absolute left-0 top-0 w-px rounded-full"
                      style={{
                        height: `${Math.round((segmentProgress[c.id] ?? 0) * 100)}%`,
                        background: "linear-gradient(180deg, rgba(0,242,255,0.9), rgba(139,92,246,0.8))",
                      }}
                    />
                  </span>
                  {/* segment (interlude) name — shown on ALL viewports (was
                      rail clean; the section titles come from the knob labels. */}
                  <span
                    className={`pointer-events-none absolute right-7 block max-w-[42vw] truncate whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.24em] transition-all duration-300 md:max-w-none ${
                      (segmentProgress[c.id] ?? 0) > 0 && (segmentProgress[c.id] ?? 0) < 1
                        ? "translate-x-0 text-violet-200 opacity-100"
                        : "translate-x-1 text-white/35 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    }`}
                  >
                    {labels?.[c.segmentAfter] ?? DEFAULT_SEGMENTS[c.segmentAfter]}
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default ChapterNav;
