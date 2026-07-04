"use client";

// components/assistant/GuidedTour.tsx
// Deterministic Guided Tour UI (T03, spec 11). Renders preset messages + action
// buttons from lib/assistant/guided-tour.ts and orchestrates scrolling. It makes
// NO network/LLM calls on the standard path — advancing states is pure client
// state. Exiting hands off to the adaptive Orbe widget via the `al-assistant-open`
// DOM event (which the widget listens for). Self-contained so it never
// destabilizes the 900-line AssistantWidget.

import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantAvatar } from "./AssistantAvatar";
import {
  resolveTourState,
  type TourStateId,
  type TourEffect,
} from "@/lib/assistant/guided-tour";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/dictionaries";

const LAUNCHER_LABEL: Record<Lang, string> = {
  en: "Take the 2-min tour with Orbe",
  es: "Hacé el tour de 2 min con Orbe",
  pt: "Faça o tour de 2 min com o Orbe",
  fr: "Faire la visite de 2 min avec Orbe",
  ru: "Пройти 2-мин тур с Orbe",
  zh: "和 Orbe 一起做 2 分钟导览",
  ar: "خذ جولة دقيقتين مع Orbe",
};
const SKIP_LABEL: Record<Lang, string> = {
  en: "Skip", es: "Saltar", pt: "Pular", fr: "Passer", ru: "Пропустить", zh: "跳过", ar: "تخطّي",
};

const DISMISS_KEY = "al_tour_dismissed";

function readLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const raw = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1] as Lang | undefined;
  return raw && raw in LAUNCHER_LABEL ? raw : DEFAULT_LANG;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function GuidedTour() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [phase, setPhase] = useState<"launcher" | "active" | "gone">("launcher");
  const [stateId, setStateId] = useState<TourStateId>("welcome");
  const highlightRef = useRef<HTMLElement | null>(null);

  // language follows the cookie (same signal the widget uses)
  useEffect(() => {
    setLang(readLang());
    const onChange = () => setLang(readLang());
    window.addEventListener("al_lang_change", onChange);
    return () => window.removeEventListener("al_lang_change", onChange);
  }, []);

  // hide the launcher permanently once dismissed/taken this browser
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setPhase("gone");
    } catch { /* private mode: just show it */ }
  }, []);

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.style.removeProperty("box-shadow");
      highlightRef.current.style.removeProperty("border-radius");
      highlightRef.current.style.removeProperty("transition");
      highlightRef.current = null;
    }
  }, []);

  // scroll + subtle highlight when a state with a target becomes active
  const orchestrate = useCallback((id: TourStateId) => {
    const { scrollTo } = resolveTourState(id, lang);
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
  }, [lang, clearHighlight]);

  const dismiss = useCallback(() => {
    clearHighlight();
    setPhase("gone");
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  }, [clearHighlight]);

  const start = useCallback(() => {
    setStateId("welcome");
    setPhase("active");
  }, []);

  const applyEffect = useCallback((effect: TourEffect) => {
    if ("to" in effect) {
      setStateId(effect.to);
      orchestrate(effect.to);
      return;
    }
    // exit -> hand off to the adaptive Orbe widget (Layer B)
    clearHighlight();
    setPhase("gone");
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("al-assistant-open", { detail: { seed: effect.seed } }));
  }, [orchestrate, clearHighlight]);

  useEffect(() => () => clearHighlight(), [clearHighlight]);

  if (phase === "gone") return null;

  if (phase === "launcher") {
    return (
      <div className="fixed bottom-5 left-4 z-40 flex items-center gap-1 sm:bottom-6 sm:left-6">
        <button
          type="button"
          onClick={start}
          className="group inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/70 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-lg backdrop-blur transition-colors hover:border-cyan-300/70 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span aria-hidden className="text-base leading-none">✦</span>
          {LAUNCHER_LABEL[lang]}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={SKIP_LABEL[lang]}
          className="rounded-full border border-white/15 bg-black/60 px-2.5 py-2.5 text-xs text-white/50 backdrop-blur transition-colors hover:text-white/80"
        >
          ✕
        </button>
      </div>
    );
  }

  const state = resolveTourState(stateId, lang);
  return (
    <div
      role="dialog"
      aria-label="Orbe guided tour"
      className="fixed bottom-5 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-cyan-400/25 bg-black/85 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0"><AssistantAvatar size={40} /></div>
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
          onClick={dismiss}
          aria-label={SKIP_LABEL[lang]}
          className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white/80"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default GuidedTour;
