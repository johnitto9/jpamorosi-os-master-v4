"use client";

// components/CookieConsent.tsx
// First-visit consent banner, glass aesthetic. Two honest choices — strictly
// necessary, or necessary + assistant memory (personalization). No dark
// patterns: both buttons have equal visual weight, the banner never blocks
// scrolling, and the decision is one click.
//
// Re-reads the cookie on `al_lang_change` so the popup flips languages
// instantly when the visitor uses LanguageSwitch — no router.refresh needed.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getConsent, saveConsent } from "@/lib/consent";
import { COOKIE, DEFAULT_LANG, LANGS, type Lang } from "@/lib/i18n/dictionaries";

function readLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const m = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1];
  return m && m in LANGS ? (m as Lang) : DEFAULT_LANG;
}

export function CookieConsent() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    // slight delay so the banner doesn't compete with the hero's entrance
    const t = setTimeout(() => setVisible(getConsent() === null), 1800);
    setLang(readLang());
    const onChange = () => setLang(readLang());
    window.addEventListener("al_lang_change", onChange);
    return () => {
      clearTimeout(t);
      window.removeEventListener("al_lang_change", onChange);
    };
  }, []);

  function decide(personalization: boolean) {
    saveConsent(personalization);
    setVisible(false);
    // Tell every live client widget (AssistantWidget, etc.) to re-check the
    // consent state — used to drop the popup greeting back to bottom-24 once
    // the cookie banner is gone.
    window.dispatchEvent(new CustomEvent("al_consent_change"));
  }

  const t = COOKIE[lang];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-cookie-banner
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          role="dialog"
          aria-label={t.title}
          className="fixed inset-x-3 bottom-3 z-[130] mx-auto max-w-xl rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_80px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:bottom-5"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-violet-500/25 text-lg"
            >
              🍪
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                {t.bodyLead}
                <span className="text-cyan-300">{t.highlight}</span>
                {t.bodyTail}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => decide(false)}
              className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 transition-colors hover:border-white/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {t.reject}
            </button>
            <button
              onClick={() => decide(true)}
              className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {t.accept}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;