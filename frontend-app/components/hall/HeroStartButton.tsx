"use client";

import { useCallback } from "react";

const cta =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export function HeroStartButton({ label }: { label: string }) {
  const onClick = useCallback(() => {
    const section = document.getElementById("before-the-systems");
    const scroller = document.querySelector<HTMLElement>("main");
    if (!section || !scroller) return;

    const sectionTop = section.offsetTop;
    const travel = Math.max(0, section.offsetHeight - scroller.clientHeight);
    // Land on the frame where the first milestone word ("Comercio") is settled
    // and ALONE, just before the next word appears. The mobile and desktop GSAP
    // timelines reveal that word at DIFFERENT scroll progress (mobile ~0.30,
    // desktop ~0.20), so the landing fraction must be viewport-aware — a single
    // value undershot on mobile (stopped before "Comercio" had appeared).
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const target = sectionTop + travel * (isMobile ? 0.36 : 0.28);
    scroller.scrollTo({
      top: target,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, []);

  return (
    <button type="button" onClick={onClick} className={`${cta} bg-white text-black hover:bg-white/80`}>
      {label}
    </button>
  );
}

export default HeroStartButton;
