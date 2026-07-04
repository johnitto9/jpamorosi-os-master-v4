"use client";

// components/ui/scroll-stage.tsx
// The page scroll container + Lenis smooth scrolling.
// The global layout locks <body> (overflow:hidden + h-screen) for the OS
// experience, so this page scrolls INSIDE its own <main>. ScrollStage owns
// that scroller, shares its ref via context to every SectionTransition, and
// runs Lenis on it: inertial, lerped scrolling is what makes scroll-linked
// animation read "top tier" instead of stepping with the wheel.
// Disabled under prefers-reduced-motion (native scroll remains).
//
// GSAP + LENIS INTEGRATION (FINALPROD S8): Lenis animates `transform:
// translate3d(0, -Y, 0)` on the `content` element (the inner div), NOT the
// `<main>`'s scrollTop. ScrollTrigger, by default, watches the `scroller`
// element's scrollTop — which Lenis does NOT update. This means
// ScrollTrigger's progress calculation is wrong, scroll-driven animations
// either never fire or fire at the wrong scroll position. The fix is
// `scrollerProxy`: tell ScrollTrigger to source its scroll from Lenis
// instead of the DOM. This is the canonical GSAP+Lenis pattern.
//
// Without scrollerProxy, the desktop choreography works "by accident"
// because desktop sections are tall enough that any timing drift is masked.
// On mobile, sections are smaller and tighter, so the drift becomes visible
// (the user reports animations don't play).

import { createContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

    // Lenis → ScrollTrigger sync. Every Lenis scroll event (rAF-driven)
    // recalculates ScrollTrigger progress. Without this, ScrollTrigger's
    // progress is stale and triggers never fire reliably.
    lenis.on("scroll", ScrollTrigger.update);

    // scrollerProxy: ScrollTrigger queries `scroller.scrollTop` and
    // `scroller.getBoundingClientRect()` to compute progress. We override
    // these to read from Lenis. This is the only way ScrollTrigger works
    // correctly with Lenis' transform-based scroll.
    const scrollerProxyHandler = (target: HTMLElement) => {
      ScrollTrigger.scrollerProxy(target, {
        scrollTop(value) {
          if (arguments.length) {
            lenis.scrollTo(value as number, { immediate: true });
          }
          return lenis.scroll;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
        // Lenis translates the content, not the wrapper. PinSpacing must
        // account for the inner content's transform, not the wrapper's
        // scrollHeight. We return the wrapper's layout box (which equals
        // the viewport in the standard ScrollStage layout) so pinners and
        // start/end positions behave correctly.
        pinType: "transform",
      });
    };
    scrollerProxyHandler(wrapper);

    // First refresh: recompute every ScrollTrigger now that the proxy is
    // installed. Without this, triggers created BEFORE the proxy install
    // (during the same tick) use the broken default scroller math.
    ScrollTrigger.refresh();

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      // Drop the scrollerProxy so a future mount can re-install it cleanly.
      ScrollTrigger.scrollerProxy(wrapper, undefined as any);
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
