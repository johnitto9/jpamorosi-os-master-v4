"use client";

// components/ui/scroll-stage.tsx
// The page scroll container + Lenis smooth scrolling.
// The global layout locks <body> (overflow:hidden + h-screen) for the OS
// experience, so this page scrolls INSIDE its own <main>. ScrollStage owns
// that scroller, shares its ref via context to every SectionTransition, and
// runs Lenis on it: inertial, lerped scrolling is what makes scroll-linked
// animation read "top tier" instead of stepping with the wheel.
// Disabled under prefers-reduced-motion (native scroll remains).

import { createContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Lenis from "lenis";

export const ScrollContainerContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function ScrollStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <ScrollContainerContext.Provider value={ref}>
      <main ref={ref} className={className}>
        <div ref={contentRef}>{children}</div>
      </main>
    </ScrollContainerContext.Provider>
  );
}

export default ScrollStage;
