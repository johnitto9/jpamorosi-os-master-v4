"use client";

// components/assistant/GuidedTour.tsx
// Deterministic Guided Tour UI (T03, spec 11). Renders preset messages + action
// buttons from lib/assistant/guided-tour.ts and orchestrates scrolling. It makes
// NO network/LLM calls on the standard path — advancing states is pure client
// state. Exiting hands off to the adaptive Orbe widget via the `al-assistant-open`
// DOM event (which the widget listens for). Self-contained so it never
// destabilizes the 900-line AssistantWidget.
//
// MERGE (2026-07-04): the tour no longer owns a launcher. The single entry point
// is the Orbe greeting popup (AssistantWidget), whose "take the tour" button
// dispatches `al-tour-start`. This component sits idle until it hears that event,
// then runs the interactive walk — now with floating annotations: an anchored
// bubble beside the highlighted section + a stacked toast that logs the journey.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AssistantAvatar } from "./AssistantAvatar";
import {
  resolveTourState,
  type TourStateId,
  type TourEffect,
} from "@/lib/assistant/guided-tour";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/dictionaries";

const SKIP_LABEL: Record<Lang, string> = {
  en: "Skip", es: "Saltar", pt: "Pular", fr: "Passer", ru: "Пропустить", zh: "跳过", ar: "تخطّي",
};

function readLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const raw = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1] as Lang | undefined;
  return raw && raw in SKIP_LABEL ? raw : DEFAULT_LANG;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

type Toast = { key: string; note: string };
type Anchor = { top: number; left: number; note: string };

export function GuidedTour() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [phase, setPhase] = useState<"idle" | "active">("idle");
  const [stateId, setStateId] = useState<TourStateId>("welcome");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const highlightRef = useRef<HTMLElement | null>(null);
  const noteRef = useRef<string | undefined>(undefined);

  // language follows the cookie (same signal the widget uses)
  useEffect(() => {
    setLang(readLang());
    const onChange = () => setLang(readLang());
    window.addEventListener("al_lang_change", onChange);
    return () => window.removeEventListener("al_lang_change", onChange);
  }, []);

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.style.removeProperty("box-shadow");
      highlightRef.current.style.removeProperty("border-radius");
      highlightRef.current.style.removeProperty("transition");
      highlightRef.current = null;
    }
    noteRef.current = undefined;
    setAnchor(null);
  }, []);

  // Keep the anchored bubble glued to the highlighted section as the page scrolls
  // or resizes. Bubble sits just above the section, clamped into the viewport.
  const reposition = useCallback(() => {
    const el = highlightRef.current;
    const note = noteRef.current;
    if (!el || !note) return;
    const r = el.getBoundingClientRect();
    const top = Math.min(Math.max(r.top - 14, 76), window.innerHeight - 96);
    const left = Math.min(Math.max(r.left + 16, 16), window.innerWidth - 300);
    setAnchor({ top, left, note });
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [phase, reposition]);

  // scroll + subtle highlight + floating annotation when a targeted state opens
  const orchestrate = useCallback((id: TourStateId) => {
    const { scrollTo, note } = resolveTourState(id, lang);
    clearHighlight();
    if (!scrollTo) return;
    const el = document.getElementById(scrollTo);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    // subtle cyan attention ring, self-clearing
    el.style.transition = "box-shadow 400ms ease";
    el.style.borderRadius = "24px";
    el.style.boxShadow = "0 0 0 2px rgba(0,242,255,0.35), 0 0 40px rgba(0,242,255,0.15)";
    highlightRef.current = el;
    if (note) {
      noteRef.current = note;
      // let the smooth-scroll settle before measuring the anchor
      window.setTimeout(reposition, prefersReducedMotion() ? 0 : 380);
      // log the stop into the toast feed (keep the last 3, each self-expiring)
      const key = `${id}-${Date.now()}`;
      setToasts((prev) => [...prev, { key, note }].slice(-3));
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.key !== key)), 5200);
    }
  }, [lang, clearHighlight, reposition]);

  const stop = useCallback(() => {
    clearHighlight();
    setToasts([]);
    setPhase("idle");
  }, [clearHighlight]);

  const start = useCallback(() => {
    clearHighlight();
    setToasts([]);
    setStateId("welcome");
    setPhase("active");
  }, [clearHighlight]);

  // single entry point: the Orbe greeting popup fires `al-tour-start`
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("al-tour-start", onStart);
    return () => window.removeEventListener("al-tour-start", onStart);
  }, [start]);

  const applyEffect = useCallback((effect: TourEffect) => {
    if ("to" in effect) {
      setStateId(effect.to);
      orchestrate(effect.to);
      return;
    }
    // exit -> hand off to the adaptive Orbe widget (Layer B)
    clearHighlight();
    setToasts([]);
    setPhase("idle");
    window.dispatchEvent(new CustomEvent("al-assistant-open", { detail: { seed: effect.seed } }));
  }, [orchestrate, clearHighlight]);

  useEffect(() => () => clearHighlight(), [clearHighlight]);

  if (phase === "idle") return null;

  const state = resolveTourState(stateId, lang);
  const reduce = prefersReducedMotion();

  return (
    <>
      {/* anchored bubble — Orbe's note pinned beside the section it's showing */}
      <AnimatePresence>
        {anchor && (
          <motion.div
            key={anchor.note}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="pointer-events-none fixed z-[115] flex max-w-[280px] items-center gap-2 rounded-2xl border border-cyan-400/30 bg-black/85 px-3 py-2 text-xs font-medium text-cyan-100 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            style={{ top: anchor.top, left: anchor.left }}
          >
            <span aria-hidden className="text-sm leading-none">✦</span>
            <span className="leading-snug">{anchor.note}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast feed — the journey log, stacked out of the way (top-right) */}
      <div className="pointer-events-none fixed right-4 top-20 z-[115] flex w-[min(78vw,260px)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              initial={reduce ? false : { opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="flex items-start gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2 text-[11px] leading-snug text-white/75 shadow-lg backdrop-blur-xl"
            >
              <span aria-hidden className="mt-px text-cyan-300">◈</span>
              <span>{t.note}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* the tour dialog — Orbe walking you through, bottom-left (chat is right) */}
      <div
        role="dialog"
        aria-label="Orbe guided tour"
        className="fixed bottom-5 left-4 z-[118] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-cyan-400/25 bg-black/85 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0"><AssistantAvatar size={40} waving /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-white/85">{state.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.actions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyEffect(a.effect)}
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={stop}
            aria-label={SKIP_LABEL[lang]}
            className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white/80"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}

export default GuidedTour;
