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

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { resolveMediaUrl } from "@/lib/media/resolve";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ScrollContainerContext } from "@/components/ui/scroll-stage";
import { cn } from "@/lib/utils";
import { SwipeCue } from "./SwipeCue";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// --- __IL_DEBUG__ observability (FINALPROD S9+) ----------------------------
// Single source of truth for the actual state of the interlude ScrollTriggers
// and the Lenis/ScrollStage scroll pipeline. Paste these in DevTools to
// see the truth instead of guessing:
//
//   __IL_DEBUG__.snapshot()    — every il-* trigger, its progress, isActive
//   __IL_DEBUG__.play(0.5)    — manually advance all il-mobile-* timelines
//                                to the given progress (0–1) regardless of
//                                scroll. Use to verify the animation runs
//                                without depending on Lenis/ScrollTrigger.
//   __IL_DEBUG__.scrollTop()   — current scrollTop of the <main> wrapper.
//                                If this stays at 0 when you swipe, Lenis
//                                isn't actually scrolling.
//   __IL_DEBUG__.wrapperInfo() — full state of the <main> wrapper
//                                (scrollTop, scrollHeight, overflow).
//   __IL_DEBUG__.reducedMotion()— whether prefers-reduced-motion is on.
//                                If true, the mobile matchMedia won't fire.
type IlDebug = {
  snapshot: () => unknown;
  play: (progress?: number) => void;
  scrollTop: () => number;
  wrapperInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number; hasOverflow: string; hasLenis: boolean; viewportHeight: number };
  reducedMotion: () => boolean;
};
// Dev-only: never expose scroll-pipeline internals on the production window.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __IL_DEBUG__?: IlDebug }).__IL_DEBUG__ = {
    snapshot: () =>
      ScrollTrigger.getAll()
        .filter((st) => String(st.vars.id ?? "").startsWith("il-"))
        .map((st) => ({
          id: st.vars.id,
          progress: Number(st.progress.toFixed(3)),
          isActive: st.isActive,
          enabled: (st as unknown as { enable?: boolean }).enable ?? true,
          start: st.start,
          end: st.end,
          trigger:
            (st.trigger as HTMLElement | undefined)?.tagName?.toLowerCase() ?? null,
        })),
    play: (progress = 0.5) => {
      ScrollTrigger.getAll()
        .filter((st) => String(st.vars.id ?? "").startsWith("il-mobile-"))
        .forEach((st) => {
          // Jump the scroll position to the requested progress
          const targetScroll = st.start + progress * (st.end - st.start);
          st.scroll(targetScroll);
          // And force the animation to that progress
          const tween = (st.animation as gsap.core.Timeline | gsap.core.Tween | undefined);
          if (tween && "progress" in tween) {
            (tween as gsap.core.Timeline).progress(progress);
          }
        });
    },
    scrollTop: () => {
      const wrapper = document.querySelector("main");
      return (wrapper?.scrollTop ?? -1) as number;
    },
    wrapperInfo: () => {
      const wrapper = document.querySelector("main");
      const lenis = (window as unknown as { __lenis?: { scroll: number } }).__lenis;
      return {
        scrollTop: (wrapper?.scrollTop ?? -1) as number,
        scrollHeight: (wrapper?.scrollHeight ?? -1) as number,
        clientHeight: (wrapper?.clientHeight ?? -1) as number,
        hasOverflow: wrapper ? getComputedStyle(wrapper).overflowY : "?",
        hasLenis: !!lenis,
        viewportHeight: window.innerHeight,
      };
    },
    reducedMotion: () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

// Records that a mobile matchMedia build actually executed, so the on-screen
// debug indicator can prove it without the console. Increments a per-scene
// counter each time the mobile branch fires (should be 1 per scene once).
function markMobileBuildRan(scene: string, section: HTMLElement, scroller: HTMLElement | null) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
  const w = window as unknown as { __IL_MOBILE_RAN__?: Record<string, number> };
  w.__IL_MOBILE_RAN__ = w.__IL_MOBILE_RAN__ ?? {};
  w.__IL_MOBILE_RAN__[scene] = (w.__IL_MOBILE_RAN__[scene] ?? 0) + 1;
}

// Reveals a mobile scene's narrative (eyebrow / heading / body) with a ONE-SHOT
// tween that fires as the scene begins to ENTER the viewport — decoupled from
// the scrubbed card timeline (which only reveals it once the scene fully pins).
// This removes the perceived "empty gap" between the hero and the first animated
// screen: the title/heading are there as soon as the scene peeks in from below.
// The elements keep their SSR `opacity-0` (no flash); this fades them up on enter
// and reverses if you scroll back above the scene.
function revealNarrativeOnEnter(
  q: (s: string) => Element[],
  section: HTMLElement,
  scroller: HTMLElement | null,
) {
  const targets = q(".il-eyebrow, .il-head, .il-body");
  if (!targets.length) return;
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 20 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.09,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        scroller: scroller ?? undefined,
        start: "top 88%", // as the scene's top rises past 88% of the viewport
        toggleActions: "play none none reverse",
      },
    },
  );
}

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
type ImgKey = keyof typeof IMG;

// Admin-managed interlude images (from /admin/media → site settings). Provided
// by page.tsx around the interludes; InterludeImage reverse-maps its default
// `src` to the key and swaps in the override (through resolveMediaUrl, so R2/CDN
// works). No caller changes needed — the defaults still flow if unset.
const InterludeImagesCtx = createContext<Partial<Record<ImgKey, string>> | undefined>(undefined);
export function InterludeImagesProvider({
  images,
  children,
}: {
  images?: Partial<Record<ImgKey, string>>;
  children: ReactNode;
}) {
  return <InterludeImagesCtx.Provider value={images}>{children}</InterludeImagesCtx.Provider>;
}

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

// NB: blobs must stay INSIDE the scene (no negative offsets): the sections
// don't clip (overflow-hidden would break their sticky stages), so a blurred
// blob hanging past the edge bleeds into neighbouring sections — on mobile it
// read as a stray teal glow under the hero, tinting even the Orbe launcher
// through its backdrop-blur.
const GLOW: Record<Tone, Array<{ color: string; cls: string }>> = {
  mixed: [
    { color: "rgba(240,165,0,0.16)", cls: "-left-24 top-0 h-[26rem] w-[26rem]" },
    { color: "rgba(0,242,255,0.15)", cls: "-right-16 bottom-0 h-[30rem] w-[30rem]" },
  ],
  cyan: [
    { color: "rgba(0,242,255,0.16)", cls: "-left-24 top-0 h-[26rem] w-[26rem]" },
    { color: "rgba(30,103,198,0.16)", cls: "-right-16 bottom-0 h-[30rem] w-[30rem]" },
  ],
  violet: [
    { color: "rgba(139,92,246,0.18)", cls: "left-1/4 top-0 h-[26rem] w-[26rem]" },
    { color: "rgba(168,85,247,0.12)", cls: "right-1/4 bottom-0 h-[28rem] w-[28rem]" },
  ],
};

function SceneGlow({ tone }: { tone: Tone }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
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
  const overrides = useContext(InterludeImagesCtx);
  // reverse-map the default src to its key so an admin override wins, then run
  // it through the media resolver (serves from R2/CDN when configured)
  const key = (Object.keys(IMG) as ImgKey[]).find((k) => IMG[k] === src);
  const finalSrc = resolveMediaUrl((key && overrides?.[key]) || src) ?? src;
  const isVideo = /\.(mp4|webm)(?:$|\?)/i.test(finalSrc);
  useEffect(() => setFailed(false), [finalSrc]);

  // Lazy + visibility-gated playback for video backdrops (Living Layer loop):
  // nothing downloads until the scene approaches the viewport (preload="none",
  // play() triggers the fetch), and it PAUSES the moment you scroll past — no
  // background decode, no bandwidth burn while reading other sections.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || failed) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "25% 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [finalSrc, isVideo, failed]);
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-2xl border bg-white/[0.03]", a.border, className)} style={{ boxShadow: a.glow }}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center" style={{ background: a.ph }}>
          <span className="select-none text-5xl opacity-70">{emoji}</span>
        </div>
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={finalSrc}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={finalSrc} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)" }} />
    </div>
  );
}

// --- The scroll engine -------------------------------------------------------
// Two patterns, two viewports:
//
// DESKTOP (≥1024px): ONE scrubbed timeline per scene, bound to [data-scene].
// `build(tl, q)` authors the choreography; `q` is a scoped selector.
// Sticky 300vh stage, horizontal-axis choreography. This is the proven
// architecture that the user already loves ("flama").
//
// MOBILE (≤1023px): per-element ScrollTrigger with toggleActions. Each animated
// element has its own trigger; the animation plays once when the element
// enters the viewport. This is a deliberate departure from the desktop's
// shared-scrubbed-timeline pattern — on mobile, a single scrubbed timeline
// over a 280vh section produces changes too subtle to perceive, and the
// user reported "sin animacion" (no animation visible) after S4/S5 attempts
// to maintain architectural parity. Per-element triggers give the user a
// clear, visible sequence of reveals as they scroll.
//
// `mobile(q, ctx)` gets the scoped selector, the scroller, and the mobile
// section. The mobile function authors whatever per-element animations it
// wants — no shared timeline required.
function useSceneChoreography(
  build: (tl: gsap.core.Timeline, q: (s: string) => Element[]) => void,
  mobile?: (q: (s: string) => Element[], ctx: { scroller: HTMLElement | null; section: HTMLElement }) => void,
  // Copy revision key (heading + items). CRITICAL for the language switch:
  // router.refresh() re-renders the scene with NEW word spans (their React
  // keys are the words themselves), while the old timeline keeps animating
  // the DETACHED nodes — the fresh spans render at their CSS resting state,
  // all stacked on top of each other. Including the revision in the deps
  // makes useGSAP revert the old context and rebuild against the new DOM.
  revision?: string,
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
        null;
      const section = rootEl?.querySelector<HTMLElement>("[data-scene]") ?? null;
      // CRITICAL (root cause of "sin animación", S1–S9): the section contains
      // TWO mobile blocks — MobileStatic (reduced-motion fallback, marked
      // [data-scene-mobile-static], display:none when motion is allowed) and
      // the ANIMATED MobileScene* (marked [data-scene-mobile]). querySelector
      // returns the FIRST match in document order, and MobileStatic was ALSO
      // tagged [data-scene-mobile] — so the mobile timeline was being bound to
      // the display:none static block (start===end → never scrubs) whose
      // children have none of the .il-* classes (→ "GSAP target not found").
      // The animated scene is the only [data-scene-mobile] now.
      const mobileSection = rootEl?.querySelector<HTMLElement>("[data-scene-mobile]") ?? null;
      if (!rootEl || !scroller) return; // leave the readable base layout

      // gsap.matchMedia: the skill's responsive gate — builds only on the
      // matched viewport with motion allowed, auto-reverts otherwise.
      const mm = gsap.matchMedia();

      // Desktop: sticky horizontal scrubbed timeline (unchanged architecture).
      // CRITICAL: scope the selector to [data-scene], NOT rootEl. The section
      // also contains [data-scene-mobile] with the SAME class names (.il-word,
      // .il-card-a, etc.) — if we used rootEl as the scope, the selector would
      // match BOTH scenes' elements and the forEach on .il-word would iterate
      // 10 words instead of 5, pushing the desktop words to late timeline
      // positions and causing them to accumulate. Scoping to [data-scene]
      // isolates the desktop choreography to the desktop scene's own elements.
      if (section) {
        mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
          const q = gsap.utils.selector(section);
          const tl = gsap.timeline({
            defaults: { ease: "none", force3D: true },
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

      // Mobile: per-element ScrollTrigger (toggleActions).
      // The mobile function authors each element's own scrollTrigger; the
      // section is still a tall structure (180-200vh) so the sticky stage
      // behaves correctly, but the animation is per-element rather than
      // shared. This is what actually plays visibly on a phone.
      if (mobile && mobileSection) {
        mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
          const q = gsap.utils.selector(mobileSection);
          mobile(q, { scroller, section: mobileSection });
        });
      }

      // photos may 404 to the CSS fallback + fonts can shift layout
      const id = window.setTimeout(() => ScrollTrigger.refresh(), 500);
      return () => window.clearTimeout(id);
    },
    { scope: root, dependencies: [container, revision] },
  );

  return root;
}

/** Stable per-language key for a scene's animated copy. */
const copyRevision = (t: InterludeCopy) => `${t.heading}|${t.items.join("·")}`;

// --- Mobile static block (reduced-motion / no-JS fallback — always readable) -
// Hidden by default on motion-safe devices; MobileScene* takes over. Both render
// so the page degrades cleanly if JS or motion is unavailable.
function MobileStatic({ t, accent, image, emoji }: { t: InterludeCopy; accent: Accent; image: string; emoji: string }) {
  return (
    <div data-scene-mobile-static className="mx-auto max-w-3xl px-6 py-16 lg:hidden motion-safe:hidden">
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
//
// LAYOUT (tuned): flex-col with three explicit slots (narrative / print /
// words band). Smaller typography + line-clamp on body to prevent long
// translations from crowding the print slot. Words start opacity-0 (defensive
// — even if GSAP fails to apply the fromTo FROM state, they don't overlap).
function MobileScene1({ t }: { t: InterludeCopy }) {
  const words = t.items;
  return (
    <div data-scene-mobile className="relative block min-h-[260vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="mixed" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6 pb-5 pt-2">
        {/* narrative at top — compact, line-clamp keeps body from overflowing.
            opacity-0: hidden at first paint so it only appears WITH the GSAP
            reveal (no SSR flash → no visible→gone→back glitch). */}
        <div className="il-narrative relative z-10 w-full max-w-md shrink-0 text-center">
          <span className="il-thread absolute left-1/2 top-12 h-16 w-px -translate-x-1/2"
            aria-hidden
            style={{ background: "linear-gradient(to bottom, rgba(240,165,0,0.8), rgba(0,242,255,0.7))" }} />
          <div className="il-eyebrow flex justify-center opacity-0"><EyebrowPill accent="amber">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-2 text-2xl font-bold leading-tight text-white opacity-0 sm:text-3xl">{t.heading}</h2>
          <p className="il-body mt-2 text-xs leading-relaxed text-white/65 opacity-0 line-clamp-3 sm:text-sm">{t.body}</p>
        </div>

        {/* print slot — flex-1 fills the middle, cards absolutely centered so GSAP
            can translate them freely (enter from below, exit up). Cards stay in
            the centre; the milestone words sit just BELOW the cards. */}
        <div className="il-print-slot relative flex w-full flex-1 items-center justify-center">
          <div className="il-card-a absolute h-40 w-64 sm:h-44 sm:w-72">
            <InterludeImage src={IMG.before1} accent="amber" emoji="🏪" className="h-full w-full" />
          </div>
          <div className="il-card-b absolute h-36 w-56 sm:h-40 sm:w-64">
            <InterludeImage src={IMG.before2} accent="amber" emoji="🧰" className="h-full w-full" />
          </div>
          {/* milestone words — anchored just under the cards (one visible at a time) */}
          <div className="il-words-band pointer-events-none absolute left-1/2 top-1/2 mt-[5.5rem] h-12 w-full max-w-md -translate-x-1/2">
            {words.map((m) => (
              <span key={m} className="il-word absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-xl font-bold text-amber-200 opacity-0 sm:text-2xl">{m}</span>
            ))}
          </div>
        </div>

        {/* swipe-down hint at the foot of the scene */}
        <SwipeCue className="shrink-0" label="" tone="amber" />
      </div>
    </div>
  );
}

// SCENE 2 (mobile) — Inside the Proof: vertical scrubbed choreography.
// The system screen arrives from depth (below), holds; stack layer cards
// assemble bottom-up over the screen. Same `.il-screen` / `.il-layer`
// contract as desktop, vertical transforms. LAYOUT: flex-col with three
// slots (narrative / screen / layer stack). Tighter typography and
// line-clamp keep the narrative from pushing the screen into the stack.
function MobileScene2({ t }: { t: InterludeCopy }) {
  return (
    <div data-scene-mobile className="relative block min-h-[250vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="cyan" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6 pb-5 pt-4">
        {/* opacity-0: narrative appears only WITH the GSAP reveal (no SSR flash) */}
        <div className="il-narrative relative z-10 w-full max-w-md shrink-0 text-center">
          <div className="il-eyebrow flex justify-center opacity-0"><EyebrowPill accent="cyan">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-2 text-2xl font-bold leading-tight text-white opacity-0 sm:text-3xl">{t.heading}</h2>
          <p className="il-body mt-2 text-xs leading-relaxed text-white/65 opacity-0 line-clamp-3 sm:text-sm">{t.body}</p>
        </div>

        {/* screen slot — middle, screen floats up + holds; layer cards assemble
            bottom-up beneath. The screen is absolutely positioned inside the
            slot so GSAP can translate it (yPercent 130 → 0 → -14) without
            affecting the layer stack below. */}
        <div className="il-print-slot relative flex w-full flex-1 items-center justify-center">
          <div className="il-screen absolute top-[22%] h-40 w-64 sm:h-44 sm:w-72">
            <InterludeImage src={IMG.proof1} accent="cyan" emoji="🖥️" className="h-full w-full" />
          </div>

          {/* layer stack — sits a touch higher (closer under the screen) */}
          <div className="il-layers absolute bottom-[32%] z-20 w-full max-w-md space-y-1.5">
            {t.items.map((l) => (
              <div key={l} className="il-layer flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-black/45 px-3 py-1.5 backdrop-blur-md"
                style={{ boxShadow: "0 0 24px -10px rgba(0,242,255,0.3)" }}>
                <span className="h-1 w-1 rounded-full bg-cyan-400" aria-hidden />
                <span className="text-xs text-white/85 sm:text-sm">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* swipe-down hint at the foot of the scene */}
        <SwipeCue className="shrink-0" label="" tone="cyan" />
      </div>
    </div>
  );
}

// SCENE 3 (mobile) — The Living Layer: vertical scrubbed choreography.
// Drifting backdrop, one flow word pulses at a time stacked in centre,
// violet→cyan rail advances. Same `.il-flow` / `.il-rail` / `.il-dot` /
// `.il-backdrop` contract as desktop, vertical transforms. LAYOUT: flex-col
// with narrative / stage / rail slots. Flow words start opacity-0 (defensive).
function MobileScene3({ t }: { t: InterludeCopy }) {
  const words = t.items;
  return (
    <div data-scene-mobile className="relative block min-h-[280vh] lg:hidden motion-reduce:hidden">
      <SceneGlow tone="violet" />
      <div className="sticky top-0 flex h-screen flex-col items-center overflow-hidden px-6 pb-5 pt-6">
        {/* opacity-0: narrative appears only WITH the GSAP reveal (no SSR flash) */}
        <div className="il-narrative relative z-10 w-full max-w-md shrink-0 text-center">
          <div className="il-eyebrow flex justify-center opacity-0"><EyebrowPill accent="violet">{t.eyebrow}</EyebrowPill></div>
          <h2 className="il-head mt-2 text-2xl font-bold leading-tight text-white opacity-0 sm:text-3xl">{t.heading}</h2>
          <p className="il-body mt-2 text-xs leading-relaxed text-white/65 opacity-0 line-clamp-3 sm:text-sm">{t.body}</p>
        </div>

        {/* stage slot — backdrop + stacked flow words pulse one at a time */}
        <div className="il-print-slot relative flex w-full flex-1 items-center justify-center">
          <div className="relative h-36 w-full max-w-sm sm:h-44">
            <div className="il-backdrop absolute inset-0 opacity-40">
              <InterludeImage src={IMG.living1} accent="violet" emoji="🌀" className="h-full w-full" />
            </div>
            <div className="relative flex h-full items-center justify-center">
              {words.map((w) => (
                <span key={w} className="il-flow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-bold text-white opacity-0 sm:text-3xl"
                  style={{ textShadow: "0 0 30px rgba(139,92,246,0.5)" }}>{w}</span>
              ))}
            </div>
          </div>
        </div>

        {/* rail + dots — bottom slot, gradient advances, dots scale on each step */}
        <div className="il-rail-block flex w-full max-w-xs shrink-0 flex-col items-center gap-2">
          <div className="relative h-px w-full bg-white/10">
            <div className="il-rail absolute inset-y-0 left-0 w-full" aria-hidden
              style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.9), rgba(0,242,255,0.7))" }} />
          </div>
          <div className="flex items-center gap-2">
            {words.map((w) => (<span key={w} className="il-dot h-1 w-1 rounded-full bg-violet-300 sm:h-1.5 sm:w-1.5" aria-hidden />))}
          </div>
        </div>

        {/* swipe-down hint at the foot of the scene */}
        <SwipeCue className="mt-4 shrink-0" label="" tone="violet" />
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
      // narrative core: VISIBLE at 0, only settles (fail-safe). The head
      // straightens up on enter and STAYS PUT — the old slow upward drift
      // (y:-26 over the whole scene) read as "keeps rising" and collided
      // with the dancing words on short viewports.
      tl.from(q(".il-eyebrow"), { y: 26, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 44, rotate: -2, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35)
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
      // milestone words dance up, handing off (last stays lit). Spacing is
      // wider than the exit so consecutive words never coexist at high
      // opacity — the old 0.62 spacing / 0.72 exit had both words fully lit
      // at once, reading as garbled overlap mid-scroll.
      q(".il-word").forEach((w, i) => {
        const at = 1.2 + i * 0.95;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 90, rotate: i % 2 ? 5 : -5 }, { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 0.5, ease: "back.out(1.7)" }, at);
        if (i < words.length - 1) tl.to(w, { autoAlpha: 0, yPercent: -80, duration: 0.4, ease: "power1.in" }, at + 0.55);
      });
    },
    // MOBILE BUILD (FINALPROD S9) — single scrubbed timeline per scene. The
    // previous S4–S8 attempts accumulated multiple per-element triggers
    // fighting over the same targets (the "fossils" ChatGPT flagged). This
    // is the partitura approach: ONE timeline bound to the section's
    // scroll progress, all elements animated within it. Trigger is the
    // SECTION (not the element — the sticky inner stage pins elements to
    // fixed viewport positions, so per-element triggers never fire). The
    // timeline scrubs from progress 0 to 1 as the user scrolls through the
    // section. Initial states are all set at t=0; animations run to their
    // final states at their own positions in the timeline. One timeline,
    // one owner, one partitura per scene.
    (q, { scroller, section }) => {
      markMobileBuildRan("sc1", section, scroller);

      // Blindaje del estado de reposo (S10): los elementos VIAJEROS arrancan
      // ocultos INMEDIATAMENTE (no dependen de que el ScrollTrigger renderice).
      // Sin esto, antes de que el scroll llegue al `start` del trigger, la carta
      // se ve a opacity 1 (su valor CSS natural). El narrativo NO se toca acá
      // (fail-safe: legible siempre); la timeline lo revela temprano.
      gsap.set(q(".il-card-a"), { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: -8 });
      gsap.set(q(".il-card-b"), { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: 8 });
      gsap.set(q(".il-thread"), { scaleY: 0, transformOrigin: "top center" });
      gsap.set(q(".il-word"), { autoAlpha: 0, yPercent: 90, scale: 0.75 });

      const tl = gsap.timeline({
        defaults: { ease: "none", force3D: true },
        scrollTrigger: {
          id: "il-mobile-1",
          trigger: section,
          scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      // ---- Narrative: revealed EARLY (one-shot on enter, not the scrub) --
      revealNarrativeOnEnter(q, section, scroller);

      // ---- Initial states of the travelling elements (all at t=0) ------
      tl.set(q(".il-card-a"), { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: -8 }, 0)
        .set(q(".il-card-b"), { yPercent: 200, autoAlpha: 0, scale: 0.5, rotate: 8 }, 0)
        .set(q(".il-thread"), { scaleY: 0, transformOrigin: "top center" }, 0)
        .set(q(".il-word"), { autoAlpha: 0, yPercent: 90, scale: 0.75, rotate: 0 }, 0);

      // ---- Card-a: enter from below, hold, then exit up --------------
      tl.to(q(".il-card-a"),
        { yPercent: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 0.18, ease: "power3.out" },
        0.20)
        .to(q(".il-card-a"),
        { yPercent: -18, scale: 0.96, duration: 0.14 },
        0.45)
        .to(q(".il-card-a"),
        { autoAlpha: 0, yPercent: -120, duration: 0.14 },
        0.62);

      // ---- Card-b: enters after A is settled, exits up ---------------
      tl.to(q(".il-card-b"),
        { yPercent: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 0.18, ease: "power3.out" },
        0.42)
        .to(q(".il-card-b"),
        { yPercent: -18, duration: 0.15 },
        0.65);

      // ---- Thread: scrubbed grow from top to bottom -----------------
      tl.to(q(".il-thread"),
        { scaleY: 1, duration: 0.5, ease: "power2.out" },
        0.20);

      // ---- Milestone words: each enters in sequence, last stays ------
      const words = q(".il-word");
      const wordCount = words.length;
      words.forEach((w, i) => {
        const inAt = 0.30 + i * 0.08;
        const outAt = inAt + 0.12;
        // Initial state per word (with alternating rotation)
        tl.set(w, { rotate: i % 2 ? 6 : -6 }, 0);
        tl.to(w,
          { autoAlpha: 1, yPercent: 0, scale: 1, rotate: 0, duration: 0.07, ease: "back.out(1.7)" },
          inAt);
        if (i < wordCount - 1) {
          tl.to(w,
            { autoAlpha: 0, yPercent: -80, scale: 0.9, duration: 0.06 },
            outAt);
        }
      });
    },
    copyRevision(t),
  );

  return (
    <section ref={root} id="before-the-systems" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="amber" image={IMG.before1} emoji="🏪" />
      <MobileScene1 t={t} />
      {/* taller stage = slower scrub (the whole partitura, words included,
          spreads over more scroll — "un toque más lento", desktop only) */}
      <div data-scene className="relative hidden min-h-[350vh] lg:block">
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
            <div className="il-card-a absolute right-6 top-[44%] h-60 w-80 -translate-y-1/2">
              <InterludeImage src={IMG.before1} accent="amber" emoji="🏪" className="h-full w-full" />
            </div>
            <div className="il-card-b absolute right-16 top-[44%] h-56 w-72 -translate-y-1/3">
              <InterludeImage src={IMG.before2} accent="amber" emoji="🧰" className="h-full w-full" />
            </div>
            {/* dancing milestone words (shared centred slot, LOW band — on short
                viewports bottom-32 collided with the heading, so the words sit
                near the very bottom of the stage now) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex h-16 justify-center">
              <div className="relative w-full">
                {words.map((m) => (
                  <span key={m} className="il-word absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-amber-200 opacity-0 sm:text-3xl">{m}</span>
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
export function PortfolioSystemInterlude({ t, stack }: { t: InterludeCopy; stack?: ReactNode }) {
  const root = useSceneChoreography(
    (tl, q) => {
      tl.from(q(".il-eyebrow"), { x: -32, duration: 0.5, ease: "power2.out" }, 0)
        .from(q(".il-head"), { y: 40, duration: 0.7, ease: "power3.out" }, 0.05)
        .from(q(".il-body"), { y: 22, duration: 0.6, ease: "power2.out" }, 0.35);
      // this CV's own stack chips (server-rendered TechStack passed as a slot)
      // cascade in under the body — part of the same partitura
      const chips = q(".il-stack > div > *");
      if (chips.length) {
        tl.fromTo(chips, { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "power2.out" }, 0.6);
      }
      tl
        // the running system arrives from depth and holds
        .fromTo(q(".il-screen"), { autoAlpha: 0, xPercent: 46, scale: 0.8, rotateY: 14, transformPerspective: 1000 },
          { autoAlpha: 1, xPercent: 0, scale: 1, rotateY: 0, duration: 1.5, ease: "power3.out" }, 0.5)
        .to(q(".il-screen"), { yPercent: -6, duration: 5, ease: "sine.inOut" }, 2.2); // subtle float, stays
      // layers assemble one on top of the other and STAY
      q(".il-layer").forEach((l, i) => {
        tl.fromTo(l, { autoAlpha: 0, y: 64, xPercent: -10 }, { autoAlpha: 1, y: 0, xPercent: 0, duration: 0.7, ease: "back.out(1.4)" }, 1.4 + i * 0.72);
      });
    },
    // MOBILE BUILD — see Scene 1 mobile note. One scrubbed timeline.
    (q, { scroller, section }) => {
      markMobileBuildRan("sc2", section, scroller);

      // Blindaje del estado de reposo (S10) — ver nota en scene 1.
      gsap.set(q(".il-screen"), { xPercent: 46, autoAlpha: 0, scale: 0.8, rotateY: 14, transformPerspective: 1000 });
      gsap.set(q(".il-layer"), { autoAlpha: 0, y: 64, xPercent: -10 });

      const tl = gsap.timeline({
        defaults: { ease: "none", force3D: true },
        scrollTrigger: {
          id: "il-mobile-2",
          trigger: section,
          scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      // Narrative: revealed EARLY (one-shot on enter, not the scrub)
      revealNarrativeOnEnter(q, section, scroller);

      tl.set(q(".il-screen"), { xPercent: 46, autoAlpha: 0, scale: 0.8, rotateY: 14, transformPerspective: 1000 }, 0)
        .set(q(".il-layer"), { autoAlpha: 0, y: 64, xPercent: -10 }, 0);

      // System screen: arrives from depth, holds
      tl.to(q(".il-screen"),
        { xPercent: 0, autoAlpha: 1, scale: 1, rotateY: 0, duration: 0.18, ease: "power3.out" },
        0.22)
        .to(q(".il-screen"),
        { yPercent: -6, duration: 0.5, ease: "sine.inOut" },
        0.45);

      // Layer cards: assemble bottom-up, stay
      q(".il-layer").forEach((l, i) => {
        const at = 0.40 + i * 0.10;
        tl.to(l,
          { autoAlpha: 1, y: 0, xPercent: 0, duration: 0.10, ease: "back.out(1.4)" },
          at);
      });
    },
    copyRevision(t),
  );

  return (
    <section ref={root} id="inside-the-proof" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="cyan" image={IMG.proof1} emoji="🖥️" />
      <MobileScene2 t={t} />
      {/* taller stage = slower scrub (see scene 1 note) */}
      <div data-scene className="relative hidden min-h-[325vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <SceneGlow tone="cyan" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
            <div className="relative z-10">
              <div className="il-eyebrow"><EyebrowPill accent="cyan">{t.eyebrow}</EyebrowPill></div>
              <h2 className="il-head mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{t.heading}</h2>
              <p className="il-body mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">{t.body}</p>
              {/* this portfolio's real stack — proof chips under the claim */}
              {stack ? <div className="il-stack mt-6 max-w-md">{stack}</div> : null}
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
        .fromTo(q(".il-backdrop"), { yPercent: 12, scale: 1.08 }, { yPercent: -12, scale: 1, duration: 7.6, ease: "none" }, 0)
        .fromTo(q(".il-rail"), { scaleX: 0 }, { scaleX: 1, duration: 7.0, ease: "none", transformOrigin: "left center" }, 0.6);
      // flow words crossfade centre-stage (last stays). Wider spacing than the
      // exit so two beats never coexist at high opacity (8 beats now).
      const dots = q(".il-dot");
      q(".il-flow").forEach((w, i) => {
        const at = 0.9 + i * 0.85;
        tl.fromTo(w, { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" },
          { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, at);
        if (dots[i]) tl.fromTo(dots[i], { scale: 1, autoAlpha: 0.3 }, { scale: 1.5, autoAlpha: 1, duration: 0.45 }, at);
        if (i < words.length - 1) {
          tl.to(w, { autoAlpha: 0, yPercent: -60, scale: 0.85, filter: "blur(6px)", duration: 0.35, ease: "power1.in" }, at + 0.5);
          if (dots[i]) tl.to(dots[i], { scale: 1, autoAlpha: 0.5, duration: 0.35 }, at + 0.5);
        }
      });
    },
    // MOBILE BUILD — see Scene 1 mobile note. One scrubbed timeline.
    (q, { scroller, section }) => {
      markMobileBuildRan("sc3", section, scroller);

      // Blindaje del estado de reposo (S10) — ver nota en scene 1.
      gsap.set(q(".il-backdrop"), { yPercent: 12, scale: 1.08 });
      gsap.set(q(".il-flow"), { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" });
      gsap.set(q(".il-rail"), { scaleX: 0, transformOrigin: "left center" });
      gsap.set(q(".il-dot"), { autoAlpha: 0.3, scale: 1 });

      const tl = gsap.timeline({
        defaults: { ease: "none", force3D: true },
        scrollTrigger: {
          id: "il-mobile-3",
          trigger: section,
          scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      // Narrative: revealed EARLY (one-shot on enter, not the scrub)
      revealNarrativeOnEnter(q, section, scroller);

      tl.set(q(".il-backdrop"), { yPercent: 12, scale: 1.08 }, 0)
        .set(q(".il-flow"), { autoAlpha: 0, yPercent: 60, scale: 0.7, filter: "blur(6px)" }, 0)
        .set(q(".il-rail"), { scaleX: 0, transformOrigin: "left center" }, 0)
        .set(q(".il-dot"), { autoAlpha: 0.3, scale: 1 }, 0);

      // Backdrop: scrubbed drift
      tl.to(q(".il-backdrop"),
        { yPercent: -12, scale: 1, duration: 0.8, ease: "none" },
        0.20);

      // Rail: scrubbed grow
      tl.to(q(".il-rail"),
        { scaleX: 1, duration: 0.5, ease: "none" },
        0.20);

      // Flow words: crossfade in sequence, last stays
      const flows = q(".il-flow");
      const flowCount = flows.length;
      const dots = q(".il-dot");
      flows.forEach((w, i) => {
        const inAt = 0.30 + i * 0.08;
        const outAt = inAt + 0.10;
        tl.to(w,
          { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", duration: 0.08, ease: "power3.out" },
          inAt);
        if (dots[i]) {
          tl.to(dots[i],
            { autoAlpha: 1, scale: 1.5, duration: 0.08 },
            inAt);
        }
        if (i < flowCount - 1) {
          tl.to(w,
            { autoAlpha: 0, yPercent: -60, scale: 0.85, filter: "blur(6px)", duration: 0.07 },
            outAt);
          if (dots[i]) {
            tl.to(dots[i],
              { autoAlpha: 0.5, scale: 1, duration: 0.07 },
              outAt);
          }
        }
      });
    },
    copyRevision(t),
  );

  return (
    <section ref={root} id="living-layer" className="relative scroll-mt-20">
      <MobileStatic t={t} accent="violet" image={IMG.living1} emoji="🌀" />
      <MobileScene3 t={t} />
      {/* taller stage = slower scrub; scene 3 now carries 8 beats, so it gets
          the most extra runway of the three */}
      <div data-scene className="relative hidden min-h-[375vh] lg:block">
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
                  // opacity-0: defensive resting state — new spans minted by a
                  // language switch must never render all stacked before the
                  // rebuilt timeline takes ownership
                  <span key={w} className="il-flow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-3xl font-bold text-white opacity-0 sm:text-5xl"
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
