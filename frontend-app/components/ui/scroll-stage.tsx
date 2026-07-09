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
// GSAP + LENIS INTEGRATION (FINALPROD S9 — corrected). S8 introduced a
// scrollerProxy on the assumption that modern Lenis animates `transform:
// translate3d(0, -Y, 0)` on the content. That's wrong for Lenis 1.x in
// its `wrapper` + `content` mode with `smoothWheel: true`: Lenis animates
// the wrapper's `scrollTop` and the content's `transform` together. The
// canonical, supported integration is to share the GSAP ticker with Lenis
// and forward its scroll events to ScrollTrigger:
//
//   gsap.ticker.add((time) => lenis.raf(time * 1000));
//   gsap.ticker.lagSmoothing(0);
//   lenis.on("scroll", ScrollTrigger.update);
//
// No scrollerProxy, no pinType: "transform". One shared clock. This is
// the integration the Lenis README documents for 1.3.x.

import { createContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

    let lastTop = wrapper.scrollTop;
    let lastTs = performance.now();
    const onLenisScroll = () => {
      // 1. Forward every Lenis scroll to ScrollTrigger so it can recompute
      //    progress for any active trigger.
      ScrollTrigger.update();

      // 1b. Broadcast a tiny, read-only scroll signal for fixed ambient layers.
      //     Consumers must animate transforms only; no layout reads downstream.
      const now = performance.now();
      const top = wrapper.scrollTop;
      const max = Math.max(1, wrapper.scrollHeight - wrapper.clientHeight);
      const dt = Math.max(16, now - lastTs);
      const velocity = ((top - lastTop) / dt) * 1000;
      lastTop = top;
      lastTs = now;
      window.dispatchEvent(
        new CustomEvent("al-scroll-stage", {
          detail: {
            progress: Math.max(0, Math.min(1, top / max)),
            velocity: Math.max(-1800, Math.min(1800, velocity)),
          },
        }),
      );
    };
    lenis.on("scroll", onLenisScroll);

    // 2. Share the GSAP ticker with Lenis — one rAF loop, one clock. This
    //    is the only synchronization Lenis needs. lagSmoothing(0) is
    //    required so GSAP doesn't try to "catch up" the timeline after a
    //    frame stutter, which would cause animation jumps.
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // 3. First refresh AFTER the ticker is wired so ScrollTrigger picks up
    //    the correct scrollHeight/scrollTop on first paint.
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());

    // 4. ANCHOR NAVIGATION THROUGH LENIS. Native scrollIntoView/hash-jump
    //    animates wrapper.scrollTop while Lenis's raf keeps writing its own
    //    value every frame — the two fight and the glide stops SHORT of the
    //    target (every #contact link landed "un poco arriba"). All in-page
    //    anchors must go through lenis.scrollTo, which owns the physics.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const scrollToHash = (hash: string) => {
      const el = document.getElementById(decodeURIComponent(hash.replace(/^#/, "")));
      if (!el) return false;
      lenis.scrollTo(el, { offset: -8 });
      return true;
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const href = a.getAttribute("href") ?? "";
      // "#id" always; "/#id" only when we're already on the home
      const hash = href.startsWith("#")
        ? href
        : href.startsWith("/#") && window.location.pathname === "/"
          ? href.slice(1)
          : null;
      if (!hash || hash === "#") return;
      if (scrollToHash(hash)) {
        e.preventDefault();
        history.pushState(null, "", hash);
      }
    };
    wrapper.addEventListener("click", onClick);

    // arriving WITH a hash (e.g. /#contact from a project room): the native
    // jump raced Lenis and stopped short — re-glide once layout settles.
    const hashTimer = window.location.hash
      ? window.setTimeout(() => scrollToHash(window.location.hash), 250)
      : 0;

    return () => {
      cancelAnimationFrame(raf);
      if (hashTimer) window.clearTimeout(hashTimer);
      wrapper.removeEventListener("click", onClick);
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      gsap.ticker.remove(tick);
      lenis.off("scroll", onLenisScroll);
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
