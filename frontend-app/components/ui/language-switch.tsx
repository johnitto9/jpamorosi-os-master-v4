"use client";

// components/ui/language-switch.tsx
// Floating glass language selector (top-left, away from ChapterNav and the
// assistant). Sets the al_lang cookie and refreshes — home is SSR-dynamic so
// the whole shell re-renders translated. Includes a one-time easy-guide
// nudge ("Choose your language") that never competes with the bot popups:
// small, top-left, dismissed on any interaction.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LANGS, DEFAULT_LANG, DICTS, type Lang } from "@/lib/i18n/dictionaries";

const NUDGE_KEY = "al_lang_nudge_done";

function readLang(): Lang {
  const m = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1];
  return m && m in LANGS ? (m as Lang) : DEFAULT_LANG;
}

export function LanguageSwitch() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    setLang(readLang());
    if (!localStorage.getItem(NUDGE_KEY)) {
      const t = setTimeout(() => setNudge(true), 2500);
      const off = setTimeout(() => setNudge(false), 10_500);
      return () => {
        clearTimeout(t);
        clearTimeout(off);
      };
    }
  }, []);

  const pick = (l: Lang) => {
    document.cookie = `al_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    localStorage.setItem(NUDGE_KEY, "1");
    setLang(l);
    setOpen(false);
    setNudge(false);
    // Tell every live client widget (AssistantWidget, etc.) to re-read the
    // cookie NOW — router.refresh() takes a tick and the greeting/nudges
    // shouldn't wait for the server round-trip.
    window.dispatchEvent(new CustomEvent("al_lang_change"));
    router.refresh();
  };

  return (
    <motion.div
      // entrance: drop in with a spring pop so the switch announces itself
      initial={{ opacity: 0, y: -16, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.6 }}
      className="ui-interactive fixed left-4 top-4 z-[95]"
    >
      <div className="relative">
        {/* two attention pulses after landing (first visit only) */}
        {nudge && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-cyan-400/70"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 1.1, repeat: 3, repeatDelay: 0.6, ease: "easeOut" }}
          />
        )}
        <button
          onClick={() => {
            setOpen((o) => !o);
            setNudge(false);
            localStorage.setItem(NUDGE_KEY, "1");
          }}
          aria-label="Change language"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-cyan-400/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
        >
          <span aria-hidden>{LANGS[lang].flag}</span>
          <span className="font-mono uppercase tracking-wider">{lang}</span>
          <span aria-hidden className="text-[9px] text-white/40">▾</span>
        </button>

        {/* easy-guide nudge — small, self-dismissing, no competition with the bot */}
        <AnimatePresence>
          {nudge && !open && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(true)}
              className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1.5 text-[11px] text-cyan-200 backdrop-blur-md"
            >
              🌐 {DICTS[lang].langNudge}
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              role="listbox"
              aria-label="Languages"
              className="absolute left-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-white/15 bg-[#0a0a14]/95 py-1 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            >
              {(Object.keys(LANGS) as Lang[]).map((l) => (
                <li key={l}>
                  <button
                    role="option"
                    aria-selected={l === lang}
                    onClick={() => pick(l)}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                      l === lang ? "text-cyan-300" : "text-white/75"
                    }`}
                  >
                    <span aria-hidden>{LANGS[l].flag}</span>
                    {LANGS[l].label}
                    {l === lang && <span className="ml-auto text-xs">✓</span>}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default LanguageSwitch;
