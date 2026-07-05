"use client";

// components/hall/HallOfFameGrid.tsx
// Hall of Fame micro-universe: a dark room with dichroic light beams, an Embla
// carousel of flagship projects where the SELECTED card brands the whole section
// (accent glow, beams, title watermark) and drops branded confetti on it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { getHallOfFame, type Project } from "@/content/projects";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { HallOfFameCard } from "@/components/hall/HallOfFameCard";
import { Confetti } from "@/components/ui/confetti";
import { BackgroundVideoPanel } from "@/components/visual/BackgroundVideoPanel";
import { resolveMediaUrl, resolveVideoUrl } from "@/lib/media/resolve";
import { cn } from "@/lib/utils";

function DichroicBeams({ accent }: { accent: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { left: "18%", rot: -18, color: accent, o: 0.16 },
        { left: "50%", rot: 6, color: "#00f2ff", o: 0.1 },
        { left: "78%", rot: 20, color: "#8b5cf6", o: 0.12 },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute -top-1/3 h-[160%] w-40 blur-3xl"
          style={{
            left: b.left,
            transform: `translateX(-50%) rotate(${b.rot}deg)`,
            opacity: b.o,
            background: `linear-gradient(to bottom, ${b.color} 0%, transparent 75%)`,
          }}
        />
      ))}
    </div>
  );
}

export function HallOfFameGrid({
  projects,
  header,
  enterLabel,
}: {
  projects?: Project[];
  /** i18n: translated section header (defaults to English) */
  header?: { eyebrow: string; title: string; description: string };
  /** i18n: translated card CTA */
  enterLabel?: string;
}) {
  const items = projects ?? getHallOfFame();
  // Let Embla be the single loop authority. Duplicating the three flagships on
  // top of Embla's own loop creates two recycling systems; after a few next()
  // calls, loop-translated clones drift closer to the center and the coverflow
  // amplifies that into the visible "cards bunching up" bug.
  const slides = items;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selected, setSelected] = useState(0);
  // coverflow tilt only from sm up — on phones the rotated neighbours drag
  // over the 86%-wide active card and the whole row reads off-center
  const [coverflow, setCoverflow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setCoverflow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    emblaApi.on("reInit", onSel);
    onSel();
    return () => {
      emblaApi.off("select", onSel);
      emblaApi.off("reInit", onSel);
    };
  }, [emblaApi]);

  // NOTE: this grid used to push the selected project's palette to the global
  // aurora. Removed — the site background now cycles ONE fixed palette (no
  // abrupt per-section color jumps). Branding stays local: beams, glow and
  // watermark below still follow the selected flagship.
  const activeIdx = items.length > 0 ? selected % items.length : 0;
  const active = items[activeIdx];
  const accent = active.theme.accent;

  // Per-project background footage ONLY: each flagship shows its OWN loop video
  // (assets.heroVideo). No site-wide fallback — a single global video pinned to
  // the whole section (settings.heroVideo) read as "stuck, never changes per
  // project", so we dropped it. Projects without their own video show the
  // premium gradient (BackgroundVideoPanel). URLs go through the media resolver
  // (Cloudflare Stream/R2 ready — see lib/media/resolve.ts).
  const activeVideo = useMemo(() => {
    const own = resolveVideoUrl(active?.assets.heroVideo);
    if (own) {
      return { mp4: own, poster: resolveMediaUrl(active?.assets.heroVideoPoster) };
    }
    return null;
  }, [active]);

  const scrollTo = useCallback(
    (projectIdx: number) => {
      if (!emblaApi) return;
      emblaApi.scrollTo(projectIdx);
    },
    [emblaApi],
  );
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const visualSlots = useMemo(() => {
    if (!items.length) return [];
    const offsets = coverflow ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
    return offsets.map((offset) => {
      const index = (activeIdx + offset + items.length) % items.length;
      return { offset, index, project: items[index] };
    });
  }, [activeIdx, coverflow, items]);

  if (items.length === 0) {
    return (
      <section id="hall-of-fame" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
        <p className="text-sm text-white/50">No Hall of Fame projects yet.</p>
      </section>
    );
  }

  return (
    <section
      id="hall-of-fame"
      className="relative scroll-mt-20 overflow-hidden py-20"
    >
      {/* dark room — edges fade so the micro-universe blends into its neighbors
          (kills the hard "seam" between the aurora hero and the dark room) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, #05060b 14%, #05060b 86%, transparent 100%)",
        }}
      />
      {/* background footage follows the SELECTED flagship: the active project's
          own loop video (assets.heroVideo) brands the whole room; fallback is
          the site-wide hero video (admin/F2). Crossfaded on carousel change. */}
      {activeVideo?.mp4 && (
        <>
          <AnimatePresence initial={false}>
            <motion.div
              key={activeVideo.mp4}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            >
              <BackgroundVideoPanel
                mp4={activeVideo.mp4}
                poster={activeVideo.poster}
                className="absolute inset-0"
              />
            </motion.div>
          </AnimatePresence>
          {/* readability veil (keeps cards/text legible over the footage) */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,6,11,0.55) 0%, rgba(5,6,11,0.35) 45%, rgba(5,6,11,0.75) 100%)",
            }}
          />
        </>
      )}
      <DichroicBeams accent={accent} />
      {/* selected-project branding glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(55% 45% at 50% 32%, ${active.theme.glow} 0%, transparent 70%)`,
        }}
      />
      {/* huge faint title watermark of the active project */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 select-none text-center font-mono text-[18vw] font-bold uppercase leading-none tracking-tighter opacity-[0.04]"
        style={{ color: accent }}
      >
        {active.title}
      </div>

      {/* seam blends: fade the whole section (incl. video) into the page bg
          above & below so scrolling in/out feels organic, not a cut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-dark-bg to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-dark-bg to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow={header?.eyebrow ?? "Proof Rooms"}
          title={header?.title ?? "Flagship proof systems"}
          description={
            header?.description ??
            "A dark room of trophies. Each flagship proves a major hiring thesis — advanced AI orchestration, production agents, and live startup execution."
          }
          accent={accent}
        />

        {/* Embla stays mounted as the loop/drag engine, but the visible
            coverflow is rendered by a separate circular layer with fixed slots.
            This avoids Embla's loop-translated slide nodes becoming the visual
            source of truth, which caused the progressive bunching bug. */}
        <div
          className="ui-interactive relative mt-4 overflow-hidden py-10"
          ref={emblaRef}
          // side cards dissolve into the edges instead of being hard-clipped
          // by the padding box — a softer, more natural exit than the cut
          style={{
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
          }}
        >
          <div aria-hidden className="flex touch-pan-y opacity-0">
            {slides.map((p, i) => {
              return (
                <div
                  key={`${p.id}-${i}`}
                  className="min-w-0 flex-[0_0_86%] px-3 sm:flex-[0_0_62%] sm:px-4 lg:flex-[0_0_54%] lg:px-5"
                >
                  <HallOfFameCard project={p} large enterLabel={enterLabel} />
                </div>
              );
            })}
          </div>
          <div
            aria-hidden={false}
            className="pointer-events-none absolute inset-0 [perspective:1400px]"
          >
            {visualSlots.map(({ offset, index, project }) => {
              const abs = Math.abs(offset);
              const isActive = offset === 0;
              const x = coverflow ? offset * 35 : offset * 82;
              const rotate = coverflow ? offset * -18 : 0;
              const scale = coverflow ? 1 - Math.min(abs, 2) * 0.12 : 1 - abs * 0.08;
              const z = coverflow ? -Math.min(abs, 2) * 110 : 0;
              const opacity = isActive ? 1 : coverflow ? (abs === 1 ? 0.58 : 0.22) : 0.45;
              const widthClass = coverflow ? "w-[54%]" : "w-[86%] sm:w-[62%]";
              return (
                <motion.div
                  key={project.id}
                  className={cn(
                    "absolute top-10 px-3 will-change-transform [backface-visibility:hidden] [transform-style:preserve-3d] sm:px-4 lg:px-5",
                    widthClass,
                    isActive ? "pointer-events-auto" : "pointer-events-none",
                  )}
                  initial={false}
                  animate={{
                    left: `${50 + x}%`,
                    opacity,
                    zIndex: 100 - abs * 20,
                    rotateY: rotate,
                    scale,
                    z,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 210,
                    damping: 28,
                    mass: 0.85,
                  }}
                  style={{
                    x: "-50%",
                  }}
                >
                  {isActive && (
                    <Confetti
                      colors={[project.theme.accent, project.theme.secondary, "#ffffff"]}
                      className="z-20 opacity-70"
                    />
                  )}
                  <HallOfFameCard project={project} large enterLabel={enterLabel} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* controls */}
        <div className="mt-1 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            aria-label="Previous flagship"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            {items.map((p, i) => (
              <button
                key={p.id}
                onClick={() => scrollTo(i)}
                aria-label={`Go to ${p.title}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === activeIdx ? 22 : 8,
                  background: i === activeIdx ? accent : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            aria-label="Next flagship"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}

export default HallOfFameGrid;
