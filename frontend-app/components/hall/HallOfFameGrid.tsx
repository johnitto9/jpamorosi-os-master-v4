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

type HeroVideo = { mp4?: string; poster?: string } | undefined;

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
  heroVideo,
  header,
  enterLabel,
}: {
  projects?: Project[];
  heroVideo?: HeroVideo;
  /** i18n: translated section header (defaults to English) */
  header?: { eyebrow: string; title: string; description: string };
  /** i18n: translated card CTA */
  enterLabel?: string;
}) {
  const items = projects ?? getHallOfFame();
  // Embla only loops when the slides overfill the viewport with room to spare;
  // with few flagships (48% basis) the wrap feels starved — duplicate the set
  // so the ring is always dense and true side cards exist for the 3D tilt.
  const slides = useMemo(
    () => (items.length > 0 && items.length < 5 ? [...items, ...items] : items),
    [items],
  );
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
    onSel();
    return () => {
      emblaApi.off("select", onSel);
    };
  }, [emblaApi]);

  // NOTE: this grid used to push the selected project's palette to the global
  // aurora. Removed — the site background now cycles ONE fixed palette (no
  // abrupt per-section color jumps). Branding stays local: beams, glow and
  // watermark below still follow the selected flagship.
  const activeIdx = items.length > 0 ? selected % items.length : 0;
  const active = items[activeIdx];
  const accent = active.theme.accent;

  // Per-project background footage: prefer the selected flagship's own loop
  // video, else the site-wide hero video. URLs go through the media resolver
  // (Cloudflare Stream/R2 ready — see lib/media/resolve.ts).
  const activeVideo = useMemo(() => {
    const own = resolveVideoUrl(active?.assets.heroVideo);
    if (own) {
      return { mp4: own, poster: resolveMediaUrl(active?.assets.heroVideoPoster) };
    }
    if (heroVideo?.mp4) {
      return { mp4: resolveVideoUrl(heroVideo.mp4), poster: resolveMediaUrl(heroVideo.poster) };
    }
    return null;
  }, [active, heroVideo]);

  // Dots address projects, not slides: jump to whichever duplicate of the
  // project is closest to the current position (shortest wrap distance).
  const scrollTo = useCallback(
    (projectIdx: number) => {
      if (!emblaApi) return;
      const total = slides.length;
      let best = projectIdx;
      let bestDist = Infinity;
      for (let s = projectIdx; s < total; s += items.length) {
        const raw = Math.abs(s - selected);
        const dist = Math.min(raw, total - raw);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      emblaApi.scrollTo(best);
    },
    [emblaApi, slides.length, items.length, selected],
  );
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

        {/* Embla carousel — coverflow: side cards tilt in 3D toward the
            selected one (perspective on the track, rotateY per wrap offset).
            NOTE: overflow-hidden clips at the padding box — the vertical py
            gives the tilted/holographic corners room so edges never look cut. */}
        <div className="ui-interactive mt-4 overflow-hidden py-10" ref={emblaRef}>
          <div className="flex touch-pan-y [perspective:1400px]">
            {slides.map((p, i) => {
              const total = slides.length;
              // shortest signed distance to the selected slide on the ring:
              // negative = left of center, positive = right of center
              const offset =
                ((i - selected + total + Math.floor(total / 2)) % total) -
                Math.floor(total / 2);
              const isActive = offset === 0;
              const side = Math.sign(offset);
              return (
                <div
                  key={`${p.id}-${i}`}
                  className="relative min-w-0 flex-[0_0_86%] px-2 [transform-style:preserve-3d] sm:flex-[0_0_62%] lg:flex-[0_0_48%]"
                  // stacking: DOM order is NOT depth — the ACTIVE card must
                  // always paint above its tilted neighbours, wherever the
                  // ring is (this kept the layout from turn 1 forever)
                  style={{ zIndex: 10 - Math.min(Math.abs(offset), 9) }}
                >
                  <div
                    className={cn(
                      "relative transition-all duration-500 ease-out",
                      isActive ? "opacity-100" : "opacity-45",
                    )}
                    style={{
                      transform: isActive
                        ? "none"
                        : coverflow
                          ? `rotateY(${side * -26}deg) scale(0.88) translateZ(-90px)`
                          : "scale(0.9)",
                    }}
                  >
                    {isActive && (
                      <Confetti
                        colors={[p.theme.accent, p.theme.secondary, "#ffffff"]}
                        className="z-20 opacity-70"
                      />
                    )}
                    <HallOfFameCard project={p} large enterLabel={enterLabel} />
                  </div>
                </div>
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
