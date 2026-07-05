"use client";

// components/ui/card-carousel.tsx
// Reusable Embla card carousel for section grids (Featured, Archive, …).
// Same infinite-loop behavior as the Hall of Fame room, but the cards keep
// their own format: responsive 1/2/3 per view, no coverflow reshaping.
// Duplicates a small set so Embla always has enough slides to wrap.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";

export function CardCarousel({
  items,
  slides,
  accent = "#00f2ff",
  ariaLabel,
}: {
  items: { id: string; title: string }[];
  /** pre-rendered card per item (index-aligned with `items`) — ReactNode so
      server components can hand cards across the client boundary */
  slides: ReactNode[];
  accent?: string;
  ariaLabel: string;
}) {
  // With 33% slide basis, loop needs the track to comfortably overfill the
  // viewport — duplicate small sets so the ring never starves.
  const slideCount = items.length < 7 ? items.length * 2 : items.length;
  const slideIdxs = useMemo(
    () => Array.from({ length: slideCount }, (_, i) => i % items.length),
    [slideCount, items.length],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    onSel();
    return () => {
      emblaApi.off("select", onSel);
    };
  }, [emblaApi]);

  const activeIdx = items.length > 0 ? selected % items.length : 0;

  // Dots address projects; jump to the closest duplicate on the ring.
  const scrollTo = useCallback(
    (projectIdx: number) => {
      if (!emblaApi) return;
      let best = projectIdx;
      let bestDist = Infinity;
      for (let s = projectIdx; s < slideCount; s += items.length) {
        const raw = Math.abs(s - selected);
        const dist = Math.min(raw, slideCount - raw);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      emblaApi.scrollTo(best);
    },
    [emblaApi, slideCount, items.length, selected],
  );

  if (items.length === 0) return null;

  return (
    <div aria-label={ariaLabel} role="region">
      {/* py: clipping happens at the padding box — gives the holographic
          rest-tilt corners breathing room so card edges never look cut */}
      {/* edge fade only on sm+ (see .carousel-edge-fade) — mobile shows one
          card, so no fade there or it would eat the single card's edges */}
      <div className="ui-interactive carousel-edge-fade -my-6 overflow-hidden py-8" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slideIdxs.map((itemIdx, i) => (
            <div
              key={`${items[itemIdx].id}-${i}`}
              className="min-w-0 flex-[0_0_100%] px-3 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              {slides[itemIdx]}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to ${it.title}`}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === activeIdx ? 22 : 8,
                background: i === activeIdx ? accent : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default CardCarousel;
