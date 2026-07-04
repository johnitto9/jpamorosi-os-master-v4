"use client";

// components/hall/Interludes.tsx
// The three narrative interludes of the home — a scroll-CHOREOGRAPHED journey.
// ARCHITECTURE (single director): GSAP Timeline + ScrollTrigger. Each scene is a
// tall section with a native position:sticky stage; a single scrubbed timeline
// governs every element (headings settle, cards enter/cross/recede with overlap,
// words dance one handing off to the next). ScrollTrigger is bound to the REAL
// scroller — ScrollStage's <main> (see ScrollContainerContext) — not window;
// Lenis drives that element's native scroll, which ScrollTrigger listens to.
//
// WHY GSAP and not Motion here: we need ONE shared timeline (a partitura), not
// twenty independent MotionValues fighting the same transforms. Motion still
// owns the rest of the site (Reveal, SectionTransition, the widget).
//
// CRITICAL: interludes must NOT be wrapped in SectionTransition — its transform
// creates a containing block that breaks the sticky stage. (Removed in page.tsx.)
//
// FAIL-SAFE (progressive enhancement): the narrative core (eyebrow/heading/body)
// is VISIBLE at scroll progress 0 — GSAP only offsets its position, never hides
// it — so if GSAP never initializes (reduced motion, <lg, or an error) the scene
// still reads. Only the *travelling* elements (cards, words) start hidden and
// animate in. useGSAP runs in a layout effect (pre-paint), so there is no flash.

import { useContext, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ScrollContainerContext } from "@/components/ui/scroll-stage";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// --- Shared copy contract (page.tsx depends on this) -------------------------
export type InterludeCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  items: string[];
};

// --- Image slots (Juan drops the real photos here later) ---------------------
const IMG = {
  before1: "/images/interludes/before-the-systems-1.jpg",
  before2: "/images/interludes/before-the-systems-2.jpg",
  proof1: "/images/interludes/inside-the-proof-1.jpg",
  living1: "/images/interludes/living-layer-1.jpg",
};

// --- Accents + ambient glow (no card, "tirado" on the cosmos) ----------------
type Tone = "mixed" | "cyan" | "violet";
type Accent = "amber" | "cyan" | "violet";
const ACCENT: Record<Accent, { text: string; dot: string; border: string; glow: string; ph: string }> = {
  amber: {
    text: "text-amber-300", dot: "bg-amber-400", border: "border-amber-400/25",
    glow: "0 0 60px -12px rgba(240,165,0,0.28)",
    ph: "linear-gradient(135deg, rgba(240,165,0,0.30), rgba(0,242,255,0.16))",
  },
  cyan: {
    text: "text-cyan-300", dot: "bg-cyan-400", border: "border-cyan-400/25",
    glow: "0 0 60px -12px rgba(0,242,255,0.25)",
    ph: "linear-gradient(135deg, rgba(0,242,255,0.26), rgba(30,103,198,0.14))",
  },
  violet: {
    text: "text-violet-300", dot: "bg-violet-400", border: "border-violet-400/25",
    glow: "0 0 60px -12px rgba(139,92,246,0.30)",
    ph: "linear-gradient(135deg, rgba(139,92,246,0.30), rgba(0,242,255,0.12))",
  },
};

const GLOW: Record<Tone, Array<{ color: string; cls: string }>> = {
  mixed: [
    { color: "rgba(240,165,0,0.16)", cls: "-left-24 -top-16 h-[26rem] w-[26rem]" },
    { color: "rgba(0,242,255,0.15)", cls: "-right-16 bottom-[-6rem] h-[30rem] w-[30rem]" },
  ],
  cyan: [
    { color: "rgba(0,242,255,0.16)", cls: "-left-24 -top-16 h-[26rem] w-[26rem]" },
    { color: "rgba(30,103,198,0.16)", cls: "-right-16 bottom-[-6rem] h-[30rem] w-[30rem]" },
  ],
  violet: [
    { color: "rgba(139,92,246,0.18)", cls: "left-1/4 -top-16 h-[26rem] w-[26rem]" },
    { color: "rgba(168,85,247,0.12)", cls: "right-1/4 bottom-[-6rem] h-[28rem] w-[28rem]" },
  ],
};

function SceneGlow({ tone }: { tone: Tone }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {GLOW[tone].map((b, i) => (
        <div key={i} className={cn("absolute rounded-full blur-3xl", b.cls)}
          style={{ background: `radial-gradient(closest-side, ${b.color}, transparent 70%)` }} />
      ))}
    </div>
  );
}

function EyebrowPill({ accent, children }: { accent: Accent; children: ReactNode }) {
  const a = ACCENT[accent];
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full border bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.3em]", a.border, a.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} aria-hidden />
      {children}
    </p>
  );
}

/** Photo card with an elegant CSS fallback until the real image exists. */
function InterludeImage({ src, accent, emoji, className }: { src: string; accent: Accent; emoji: string; className?: string }) {
  const a = ACCENT[accent];
  const [failed, setFailed] = useState(false);
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-2xl border bg-white/[0.03]", a.border, className)} style={{ boxShadow: a.glow }}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center" style={{ background: a.ph }}>
          <span className="select-none text-5xl opacity-70">{emoji}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)" }} />
    </div>
  );
}

// --- The scroll engine -------------------------------------------------------
// Builds ONE scrubbed timeline per scene, bound to the real ScrollStage scroller.
// `build(tl, q)` authors the desktop choreography; `mobileBuild(tl, q)` (optional)
// authors a parallel vertical scrubbed timeline for the mobile scene block.
//
// ARCHITECTURE (1:1 parity): both desktop and mobile share the SAME shape —
// one shared timeline per scene, scrubbed to that scene's scroll progress,
// every element animated within it. Mobile just lays out elements vertically
// and uses vertical transforms (cards enter from below / exit above, words
// dance stacked, thread grows top-to-bottom) instead of the desktop's
// horizontal-axis choreography.
//
// `q` is a scoped selector (gsap.utils.selector) — desktop query is scoped to
// rootEl, mobile query to the mobile scene subtree, so the same `.il-*` class
// contract can drive both without collisions.
function useSceneChoreography(
  build: (tl: gsap.core.Timeline, q: (s: string) => Element[]) => void,
  mobileBuild?: (tl: gsap.core.Timeline, q: (s: string) => Element[]) => void,
): RefObject<HTMLDivElement> {
  const container = useContext(ScrollContainerContext);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const rootEl = root.current;
      // The scroller is ScrollStage's <main>. Prefer the context ref, but fall
      // back to the DOM — the context can arrive null (module duplication across
      // chunks), which was silently bailing this hook and creating 0 triggers.
      const scroller =
        (container?.current as HTMLElement | null) ??
        (typeof document !== "undefined" ? document.querySelector<HTMLElement>("main") : null) ??
        undefined;
      const section = rootEl?.querySelector<HTMLElement>("[data-scene]") ?? undefined;
      const mobileSection = rootEl?.querySelector<HTMLElement>("[data-scene-mobile]") ?? undefined;
      if (!rootEl || !scroller) return; // leave the readable base layout

      // gsap.matchMedia: the skill's responsive gate — builds only on the
      // matched viewport with motion allowed, auto-reverts otherwise.
      const mm = gsap.matchMedia();

      // Desktop: sticky horizontal scrubbed timeline (unchanged architecture)
      if (section) {
        mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
          const q = gsap.utils.selector(rootEl);
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              scroller,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
            },
          });
          build(tl, q);
        });
      }

      // Mobile: vertical scrubbed timeline (1:1 architectural parity).
      // mobileBuild is the per-scene choreography function; the section is the
      // SAME shape as desktop (sticky stage inside a tall section) so a single
      // scrubbed timeline drives all element transforms.
      if (mobileBuild && mobileSection) {
        mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
          const q = gsap.utils.selector(mobileSection);
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: mobileSection,
              scroller,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
            },
          });
          mobileBuild(tl, q);
        });
      }

      // photos may 404 to the CSS fallback + fonts can shift layout
      const id = window.setTimeout(() => ScrollTrigger.refresh(), 500);
      return () => window.clearTimeout(id);
    },
    { scope: root, dependencies: [container] },
  );

  return root;
}

// --- Mobile static block (reduced-motion / no-JS fallback — always readable) -
// Hidden by default on motion-safe devices; MobileScene* takes over. Both render
// so the page degrades cleanly if JS or motion is unavailable.
function MobileStatic({ t, accent, image, emoji }: { t: InterludeCopy; accent: Accent; image: string; emoji: string }) {
  return (
    <div data-scene-mobile className="mx-auto max-w-3xl px-6 py-16 lg:hidden motion-safe:hidden">
      <EyebrowPill accent={accent}>{t.eyebrow}</EyebrowPill>
      <h2 className="mt-4 text-3xl font-bold leading-tight text-white">{t.heading}</h2>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{t.body}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {t.items.map((it) => (
          <span key={it} className={cn("rounded-full border bg-white/[0.03] px-3 py-1 text-xs text-white/75", ACCENT[accent].border)}>{it}</span>
        ))}
      </div>
      <InterludeImage src={image} accent={accent} emoji={emoji} className="mt-6 aspect-[16/10] w-full" />
    </div>
  );
}

// --- Rich mobile scenes (mirror the desktop narrative vertically — multiple
// images, multiple texts, more scroll moments). Each .m-rise element rises +
// fades as it enters the viewport via the existing GSAP reveal; .m-chip staggers.
// Reduced-motion never matches -> the MobileStatic fallback above renders. */

// SCENE 1 (mobile) — Before the Systems: vertical scrubbed choreography.
// Sticky stage inside a tall section; cards travel vertically (enter from
// below, exit above), milestone words dance stacked, thread grows top-to-bottom.
// Architecturally 1:1 with the desktop scene — same ONE shared scrubbed
// timeline, same element contract (.il-*), just vertical transforms.
function MobileScene1({ t }: { t: InterludeCopy }) {
  const words = t.items;
  return (
    <div data-scene-mobile className="relative block min-h-[280vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="mixed" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6">
        {/* narrative at top, centred, with vertical thread on its left */}
        <div className="relative z-10 mt-20 w-full max-w-md text-center">
          <span className="il-thread absolute left-1/2 top-12 h-[calc(100vh-13rem)] w-px -translate-x-1/2"
            aria-hidden
            style={{ background: "linear-gradient(to bottom, rgba(240,165,0,0.8), rgba(0,242,255,0.7))" }} />
          <div className="il-eyebrow flex justify-center"><EyebrowPill accent="amber">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">{t.heading}</h2>
          <p className="il-body mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{t.body}</p>
        </div>

        {/* prints — vertical travellers. Same `.il-card-a/b` contract as desktop */}
        <div className="il-card-a absolute left-1/2 top-[58%] h-44 w-72 -translate-x-1/2 -translate-y-1/2">
          <InterludeImage src={IMG.before1} accent="amber" emoji="🏪" className="h-full w-full" />
        </div>
        <div className="il-card-b absolute left-1/2 top-[62%] h-40 w-64 -translate-x-1/2 -translate-y-1/2">
          <InterludeImage src={IMG.before2} accent="amber" emoji="🧰" className="h-full w-full" />
        </div>

        {/* milestone words band — same `.il-word` contract, vertical dance */}
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex h-14 justify-center">
          <div className="relative w-full">
            {words.map((m) => (
              <span key={m} className="il-word absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-amber-200 sm:text-3xl">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// SCENE 2 (mobile) — Inside the Proof: vertical scrubbed choreography.
// The system screen arrives from depth (below), holds; stack layer cards
// assemble bottom-up over the screen. Same `.il-screen` / `.il-layer`
// contract as desktop, vertical transforms.
function MobileScene2({ t }: { t: InterludeCopy }) {
  return (
    <div data-scene-mobile className="relative block min-h-[260vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="cyan" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6">
        {/* narrative at top */}
        <div className="relative z-10 mt-20 w-full max-w-md text-center">
          <div className="il-eyebrow flex justify-center"><EyebrowPill accent="cyan">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">{t.heading}</h2>
          <p className="il-body mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{t.body}</p>
        </div>

        {/* the running system — large, anchored in middle-lower, arrives from below */}
        <div className="il-screen absolute left-1/2 top-[55%] h-44 w-72 -translate-x-1/2 -translate-y-1/2">
          <InterludeImage src={IMG.proof1} accent="cyan" emoji="🖥️" className="h-full w-full" />
        </div>

        {/* stack layer cards assemble bottom-up; each its own reveal within
            the shared scrubbed timeline, same .il-layer contract as desktop */}
        <div className="absolute inset-x-4 bottom-14 space-y-2">
          {t.items.map((l, i) => (
            <div key={l} className="il-layer flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm"
              style={{ boxShadow: "0 0 24px -10px rgba(0,242,255,0.3)" }}>
              <span className="font-mono text-[11px] text-cyan-300/70" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
              <span className="text-sm text-white/85">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// SCENE 3 (mobile) — The Living Layer: vertical scrubbed choreography.
// Drifting backdrop, one flow word pulses at a time stacked in centre,
// violet→cyan rail advances. Same `.il-flow` / `.il-rail` / `.il-dot` /
// `.il-backdrop` contract as desktop, vertical transforms.
function MobileScene3({ t }: { t: InterludeCopy }) {
  const words = t.items;
  return (
    <div data-scene-mobile className="relative block min-h-[300vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="violet" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6">
        {/* narrative at top */}
        <div className="relative z-10 mt-20 w-full max-w-md text-center">
          <div className="il-eyebrow flex justify-center"><EyebrowPill accent="violet">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">{t.heading}</h2>
          <p className="il-body mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{t.body}</p>
        </div>

        {/* stage with drifting backdrop + stacked flow words */}
        <div className="relative mt-6 h-44 w-full max-w-sm">
          <div className="il-backdrop absolute inset-0 opacity-40">
            <InterludeImage src={IMG.living1} accent="violet" emoji="🌀" className="h-full w-full" />
          </div>
          <div className="relative flex h-full items-center justify-center">
            {words.map((w) => (
              <span key={w} className="il-flow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-bold text-white sm:text-4xl"
                style={{ textShadow: "0 0 30px rgba(139,92,246,0.5)" }}>{w}</span>
            ))}
          </div>
        </div>

        {/* advancing rail + step dots — same .il-rail / .il-dot contract */}
        <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3">
          <div className="relative h-px w-full bg-white/10">
            <div className="il-rail absolute inset-y-0 left-0 w-full" aria-hidden
              style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.9), rgba(0,242,255,0.7))" }} />
          </div>
          <div className="flex items-center gap-3">
            {words.map((w) => (<span key={w} className="il-dot h-1.5 w-1.5 rounded-full bg-violet-300" aria-hidden />))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SCENE 1 — BEFORE THE SYSTEMS (memory · shop · workshop · milestones)
// Two prints cross the stage on different axes (one from the right, one rising
// from below) with a beat where both share the frame; milestone words dance up
// one by one in a lower band; a thread grows down the whole scene.
// =============================================================================
export function BeforeTheSystems({ t }: { t: InterludeCopy }) {
  const words = t.items;
  const root = useSceneChoreography(
    (tl, q) => {
      // narrative core: VISIBLE at 0, only settles (fail-safe)
      tl.from(q(".il-eyebrow"), { y: 26, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 44, rotate: -2, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35)
        .to(q(".il-head"), { y: -26, duration: 5, ease: "none" }, 0.9) // drifts, stays visible
        // thread grows through the whole scene (secondary motion)
        .fromTo(q(".il-thread"), { scaleY: 0 }, { scaleY: 1, duration: 5, ease: "none", transformOrigin: "top center" }, 0.4)
        // print A: enters deep-right, crosses, then recedes (still faintly there)
        .fromTo(q(".il-card-a"), { xPercent: 150, autoAlpha: 0, rotate: -9, scale: 0.78, transformPerspective: 900 },
          { xPercent: 4, autoAlpha: 1, rotate: -4, scale: 1, duration: 1.7, ease: "power3.out" }, 0.5)
        .to(q(".il-card-a"), { xPercent: -46, autoAlpha: 0.18, rotate: -1, scale: 0.9, duration: 2, ease: "none" }, 2.4)
        // print B: rises from below while A is still present (overlap, oclusion)
        .fromTo(q(".il-card-b"), { yPercent: 130, xPercent: 24, autoAlpha: 0, rotate: 7, scale: 0.82 },
          { yPercent: 0, xPercent: 0, autoAlpha: 1, rotate: 3, scale: 1, duration: 1.6, ease: "power3.out" }, 2.1)
        .to(q(".il-card-b"), { xPercent: -140, autoAlpha: 0, rotate: 1, duration: 1.6, ease: "power1.in" }, 4.3);
      // milestone words dance up, handing off (last stays lit)
      q(".il-word").forEach((w, i) => {
        const at = 1.2 + i * 0.62;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 90, rotate: i % 2 ? 5 : -5 }, { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 0.5, ease: "back.out(1.7)" }, at);
        if (i < words.length - 1) tl.to(w, { autoAlpha: 0, yPercent: -80, duration: 0.5, ease: "power1.in" }, at + 0.72);
      });
    },
    // MOBILE BUILD — same single scrubbed timeline, vertical transforms.
    // Cards enter from below and exit up; thread grows top→bottom; words dance stacked.
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { y: 26, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 44, rotate: -2, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35)
        .to(q(".il-head"), { y: -22, duration: 5, ease: "none" }, 0.9)
        .fromTo(q(".il-thread"), { scaleY: 0 }, { scaleY: 1, duration: 5, ease: "none", transformOrigin: "top center" }, 0.4)
        // card A: rises from below, settles, then exits up
        .fromTo(q(".il-card-a"), { yPercent: 130, autoAlpha: 0, scale: 0.85 },
          { yPercent: 0, autoAlpha: 1, scale: 1, duration: 1.5, ease: "power3.out" }, 0.5)
        .to(q(".il-card-a"), { yPercent: -130, autoAlpha: 0, scale: 0.9, duration: 1.4, ease: "power1.in" }, 2.6)
        // card B: rises from below while A is still present
        .fromTo(q(".il-card-b"), { yPercent: 140, autoAlpha: 0, scale: 0.85 },
          { yPercent: 0, autoAlpha: 1, scale: 1, duration: 1.5, ease: "power3.out" }, 2.0)
        .to(q(".il-card-b"), { yPercent: -140, autoAlpha: 0, duration: 1.2, ease: "power1.in" }, 4.4);
      // milestone words dance stacked (vertical)
      q(".il-word").forEach((w, i) => {
        const at = 1.2 + i * 0.62;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 90, rotate: i % 2 ? 5 : -5 }, { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 0.5, ease: "back.out(1.7)" }, at);
        if (i < words.length - 1) tl.to(w, { autoAlpha: 0, yPercent: -80, duration: 0.5, ease: "power1.in" }, at + 0.72);
      });
    },
  );

  return (
    <section ref={root} id="before-the-systems" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="amber" image={IMG.before1} emoji="🏪" />
      <MobileScene1 t={t} />
      <div data-scene className="relative hidden min-h-[320vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <SceneGlow tone="mixed" />
          <div className="relative mx-auto flex w-full max-w-6xl items-center px-6">
            {/* narrative + growing thread */}
            <div className="relative z-10 w-full max-w-md pl-6">
              <span className="il-thread absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px" aria-hidden
                style={{ background: "linear-gradient(to bottom, rgba(240,165,0,0.8), rgba(0,242,255,0.7))" }} />
              <div className="il-eyebrow"><EyebrowPill accent="amber">{t.eyebrow}</EyebrowPill></div>
              <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{t.heading}</h2>
              <p className="il-body mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">{t.body}</p>
            </div>
            {/* travelling prints */}
            <div className="il-card-a absolute right-6 top-1/2 h-60 w-80 -translate-y-1/2">
              <InterludeImage src={IMG.before1} accent="amber" emoji="🏪" className="h-full w-full" />
            </div>
            <div className="il-card-b absolute right-16 top-1/2 h-56 w-72 -translate-y-1/3">
              <InterludeImage src={IMG.before2} accent="amber" emoji="🧰" className="h-full w-full" />
            </div>
            {/* dancing milestone words (shared centred slot, lower band) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-24 flex h-16 justify-center">
              <div className="relative w-full">
                {words.map((m) => (
                  <span key={m} className="il-word absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-amber-200 sm:text-3xl">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// SCENE 2 — INSIDE THE PROOF (system · layers · stack assembling · evidence)
// The running-system screenshot flies in from depth and holds (subtle float);
// the stack layers assemble bottom-up and STAY (the system builds before you).
// =============================================================================
export function PortfolioSystemInterlude({ t }: { t: InterludeCopy }) {
  const root = useSceneChoreography(
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { x: -32, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 40, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35)
        // the running system arrives from depth and holds
        .fromTo(q(".il-screen"), { autoAlpha: 0, xPercent: 46, scale: 0.8, rotateY: 14, transformPerspective: 1000 },
          { autoAlpha: 1, xPercent: 0, scale: 1, rotateY: 0, duration: 1.5, ease: "power3.out" }, 0.5)
        .to(q(".il-screen"), { yPercent: -6, duration: 5, ease: "sine.inOut" }, 2.2); // subtle float, stays
      // layers assemble one on top of the other and STAY
      q(".il-layer").forEach((l, i) => {
        tl.fromTo(l, { autoAlpha: 0, y: 64, xPercent: -10 }, { autoAlpha: 1, y: 0, xPercent: 0, duration: 0.7, ease: "back.out(1.4)" }, 1.4 + i * 0.72);
      });
    },
    // MOBILE BUILD — same single timeline; system screen rises from below
    // and floats up, layer cards assemble bottom-up.
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { y: 24, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 40, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35)
        .fromTo(q(".il-screen"), { yPercent: 130, autoAlpha: 0, scale: 0.85 },
          { yPercent: 0, autoAlpha: 1, scale: 1, duration: 1.5, ease: "power3.out" }, 0.5)
        .to(q(".il-screen"), { yPercent: -14, duration: 5, ease: "sine.inOut" }, 2.2);
      // layers assemble bottom-up (vertical stack)
      q(".il-layer").forEach((l, i) => {
        tl.fromTo(l, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" }, 1.5 + i * 0.55);
      });
    },
  );

  return (
    <section ref={root} id="inside-the-proof" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="cyan" image={IMG.proof1} emoji="🖥️" />
      <MobileScene2 t={t} />
      <div data-scene className="relative hidden min-h-[300vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <SceneGlow tone="cyan" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
            <div className="relative z-10">
              <div className="il-eyebrow"><EyebrowPill accent="cyan">{t.eyebrow}</EyebrowPill></div>
              <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{t.heading}</h2>
              <p className="il-body mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">{t.body}</p>
            </div>
            <div className="relative h-[68vh]">
              <div className="il-screen absolute right-0 top-6 h-52 w-full max-w-md sm:h-60">
                <InterludeImage src={IMG.proof1} accent="cyan" emoji="🖥️" className="h-full w-full" />
              </div>
              <div className="absolute inset-x-0 bottom-8 space-y-2.5">
                {t.items.map((l, i) => (
                  <div key={l} className="il-layer flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
                    style={{ marginLeft: `${i * 16}px`, boxShadow: "0 0 24px -10px rgba(0,242,255,0.3)" }}>
                    <span className="font-mono text-[11px] text-cyan-300/70" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
                    <span className="text-sm text-white/85 sm:text-base">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// SCENE 3 — THE LIVING LAYER (intelligence · flow · agents · transition)
// A dimmed photo backdrop drifts (parallax) while one big flow word at a time
// dances centre-stage — scaling in, holding, handing off — and a violet→cyan
// rail with step dots advances underneath. The last word stays: the transition.
// =============================================================================
export function LivingLayerInterlude({ t }: { t: InterludeCopy }) {
  const words = t.items;
  const root = useSceneChoreography(
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { y: 24, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 40, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 20, duration: 0.6, ease: "power2.out" }, 0.35)
        .fromTo(q(".il-backdrop"), { yPercent: 12, scale: 1.08 }, { yPercent: -12, scale: 1, duration: 6, ease: "none" }, 0)
        .fromTo(q(".il-rail"), { scaleX: 0 }, { scaleX: 1, duration: 5.4, ease: "none", transformOrigin: "left center" }, 0.6);
      // flow words crossfade centre-stage with a scale dance (last stays)
      const dots = q(".il-dot");
      q(".il-flow").forEach((w, i) => {
        const at = 0.9 + i * 0.66;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" },
          { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, at);
        if (dots[i]) tl.fromTo(dots[i], { scale: 1, autoAlpha: 0.3 }, { scale: 1.5, autoAlpha: 1, duration: 0.5 }, at);
        if (i < words.length - 1) {
          tl.to(w, { autoAlpha: 0, yPercent: -60, scale: 0.85, filter: "blur(6px)", duration: 0.5, ease: "power1.in" }, at + 0.7);
          if (dots[i]) tl.to(dots[i], { scale: 1, autoAlpha: 0.5, duration: 0.5 }, at + 0.7);
        }
      });
    },
    // MOBILE BUILD — same single timeline; backdrop drifts, flow words pulse
    // stacked vertically, rail advances, dots scale on each step.
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { y: 24, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 40, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 20, duration: 0.6, ease: "power2.out" }, 0.35)
        .fromTo(q(".il-backdrop"), { yPercent: 12, scale: 1.08 }, { yPercent: -12, scale: 1, duration: 6, ease: "none" }, 0)
        .fromTo(q(".il-rail"), { scaleX: 0 }, { scaleX: 1, duration: 5.4, ease: "none", transformOrigin: "left center" }, 0.6);
      const dots = q(".il-dot");
      q(".il-flow").forEach((w, i) => {
        const at = 0.9 + i * 0.66;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" },
          { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, at);
        if (dots[i]) tl.fromTo(dots[i], { scale: 1, autoAlpha: 0.3 }, { scale: 1.5, autoAlpha: 1, duration: 0.5 }, at);
        if (i < words.length - 1) {
          tl.to(w, { autoAlpha: 0, yPercent: -60, scale: 0.85, filter: "blur(6px)", duration: 0.5, ease: "power1.in" }, at + 0.7);
          if (dots[i]) tl.to(dots[i], { scale: 1, autoAlpha: 0.5, duration: 0.5 }, at + 0.7);
        }
      });
    },
  );

  return (
    <section ref={root} id="living-layer" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="violet" image={IMG.living1} emoji="🌀" />
      <MobileScene3 t={t} />
      <div data-scene className="relative hidden min-h-[340vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <SceneGlow tone="violet" />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-6 text-center">
            <div className="il-eyebrow"><EyebrowPill accent="violet">{t.eyebrow}</EyebrowPill></div>
            <h2 className="il-head text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{t.heading}</h2>
            <p className="il-body max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">{t.body}</p>
            {/* stage: drifting backdrop + one dancing flow word at a time */}
            <div className="relative flex h-56 w-full max-w-3xl items-center justify-center sm:h-64">
              <div className="il-backdrop absolute inset-0 opacity-40">
                <InterludeImage src={IMG.living1} accent="violet" emoji="🌀" className="h-full w-full" />
              </div>
              <div className="relative w-full">
                {words.map((w) => (
                  <span key={w} className="il-flow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-3xl font-bold text-white sm:text-5xl"
                    style={{ textShadow: "0 0 34px rgba(139,92,246,0.5)" }}>{w}</span>
                ))}
              </div>
            </div>
            {/* advancing rail + step dots */}
            <div className="flex w-full max-w-md flex-col items-center gap-3">
              <div className="relative h-px w-full bg-white/10">
                <div className="il-rail absolute inset-y-0 left-0 w-full" aria-hidden
                  style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.9), rgba(0,242,255,0.7))" }} />
              </div>
              <div className="flex items-center gap-3">
                {words.map((w) => (<span key={w} className="il-dot h-1.5 w-1.5 rounded-full bg-violet-300" aria-hidden />))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
