"use client";

// components/hall/HallOfFameGrid.tsx
// Hall of Fame micro-universe: a dark room with dichroic light beams, an Embla
// carousel of flagship projects where the SELECTED card brands the whole section
// (accent glow, beams, title watermark) and drops branded confetti on it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
        // pre-softened gradient beam — same look as the old blur-3xl filter,
        // without the per-frame GPU filter cost on 160%-tall layers
        <div
          key={i}
          className="absolute -top-1/3 h-[160%] w-72"
          style={{
            left: b.left,
            transform: `translateX(-50%) rotate(${b.rot}deg)`,
            opacity: b.o,
            background: `radial-gradient(50% 55% at 50% 22%, ${b.color} 0%, transparent 70%)`,
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
  // ROOT FIX for the "swipe a lot and it starts glitching" bug: the old code
  // mounted a NEW <video> per selection change (AnimatePresence keyed by URL)
  // and unmounted the old one mid-fade. Chromium keeps destroyed media players
  // alive until GC and caps them per tab — rapid swiping "nested zombies"
  // until playback/compositing degraded, and re-entering a still-exiting key
  // also confused AnimatePresence (the weird swipe-back). Instead we mount
  // ONE persistent <video> per flagship (≤3, page-lifetime stable) and
  // crossfade with plain CSS opacity; inactive ones pause via `playing`.
  const flagshipVideos = useMemo(
    () =>
      items.map((p) => {
        const mp4 = resolveVideoUrl(p.assets.heroVideo);
        return mp4
          ? { id: p.id, mp4, poster: resolveMediaUrl(p.assets.heroVideoPoster) }
          : null;
      }),
    [items],
  );
  const activeHasVideo = !!flagshipVideos[activeIdx];

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
    // NEVER render more slots than distinct projects: with 3 flagships the
    // old 5-slot window mapped offsets ±2 and ∓1 to the SAME project →
    // DUPLICATE React keys in one map. React's behavior is undefined there:
    // heavy cards were being unmounted/remounted erratically on every swipe
    // (image decodes, canvases, listeners), which is exactly the "it degrades
    // after 10-20 swipes" accumulation.
    const offsets =
      coverflow && items.length >= 5 ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
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
      className="relative min-h-screen scroll-mt-20 overflow-hidden py-14 md:py-20"
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
      {flagshipVideos.map((v, i) =>
        v ? (
          <div
            key={v.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === activeIdx ? 0.75 : 0 }}
          >
            <BackgroundVideoPanel
              mp4={v.mp4}
              poster={v.poster}
              playing={i === activeIdx}
              className="absolute inset-0"
            />
          </div>
        ) : null,
      )}
      {/* readability veil (keeps cards/text legible over the footage) */}
      {activeHasVideo && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,6,11,0.55) 0%, rgba(5,6,11,0.35) 45%, rgba(5,6,11,0.75) 100%)",
          }}
        />
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
            "A room of trophies. Each flagship proves a major hiring thesis — advanced AI orchestration, production agents, and live startup execution."
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
              const opacity = isActive ? 1 : coverflow ? (abs === 1 ? 0.72 : 0.32) : 0.5;
              const widthClass = coverflow ? "w-[54%]" : "w-[86%] sm:w-[62%]";
              return (
                // FLAT slots (GPU-corruption fix): permanent will-change +
                // preserve-3d + animated translateZ across 5 large cards was
                // the Chromium black-tile recipe — tiles corrupted a bit more
                // on every swipe. rotateY+scale under the parent perspective
                // keep the coverflow read; depth via scale, not real Z.
                <motion.div
                  key={project.id}
                  className={cn(
                    "absolute top-10 px-3 sm:px-4 lg:px-5",
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
                  <HallOfFameCard project={project} large enterLabel={enterLabel} />
                </motion.div>
              );
            })}
            {/* ONE persistent confetti canvas over the centre slot — it used
                to live INSIDE the keyed map ({isActive && <Confetti/>}), so
                every swipe destroyed and re-created a canvas. It re-seeds
                itself when the palette changes (colors are an effect dep). */}
            <div
              aria-hidden
              className={cn(
                // z-[110]: the active slot animates to zIndex 100 — the
                // confetti must rain OVER it, like when it lived inside the card
                "pointer-events-none absolute inset-y-10 left-1/2 z-[110] -translate-x-1/2",
                coverflow ? "w-[54%]" : "w-[86%] sm:w-[62%]",
              )}
            >
              <Confetti
                colors={[active.theme.accent, active.theme.secondary, "#ffffff"]}
                className="opacity-70"
              />
            </div>
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
