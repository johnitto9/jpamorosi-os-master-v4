"use client";

// components/assistant/AssistantWidget.tsx
// Orbe (the lab guide), v4 — a character, not a chat bubble:
// - launcher is the animated holo-bot mascot (bobbing, blinking) with an
//   attention ping until the visitor first interacts;
// - it SPEAKS FIRST: a greeting popup (mascot waving + typed message) invites
//   the conversation once per visitor (localStorage);
// - the chat opens CENTERED as a large glass panel (mobile: full sheet), with
//   a typing indicator and the mascot in the header;
// - privacy-aware: the transcript persists across pages only when the cookie
//   banner's "assistant memory" consent is on (lib/consent.ts); each message
//   carries the current path so the server can contextualize the visit.

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AssistantResponse } from "@/lib/assistant/types";
import { personalizationAllowed } from "@/lib/consent";
import { getDeviceId } from "@/lib/identity";
import {
  ASSISTANT,
  DEFAULT_LANG,
  LANGS,
  WIZARD,
  type Lang,
} from "@/lib/i18n/dictionaries";

// UI language (cookie al_lang, set by the LanguageSwitch). Every preset string
// Orbe speaks (greeting, suggestions, nudges, thinking steps) is
// sourced from ASSISTANT[lang]; the AGENT itself is told the language in the
// request body, so replies, button labels and follow-ups all flow in it.
function readLangCookie(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const raw = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1];
  return raw && raw in LANGS ? (raw as Lang) : DEFAULT_LANG;
}

function templateFor(kind: ThreadKind, lang: Lang) {
  // The chrome that comes from the dict (title/tagline/greeting/suggestions)
  // is fully localized; only the icon stays a constant.
  const t = ASSISTANT[lang].threads[kind];
  const icon = kind === "omni" ? "💬" : kind === "project" ? "🚀" : "🎨";
  return { ...t, icon };
}
import { AssistantAvatar } from "./AssistantAvatar";
import { AssistantMessage, type ChatTurn } from "./AssistantMessage";
import {
  ProjectStrip,
  ProjectSetup,
  BrandingBoard,
  type SessionProjectLite,
} from "./AssistantProjectOrbit";

// ---- conversation tabs (max 5 per session) ----------------------------------
// Each tab is a THREAD on the server (agent_messages.thread) + its own local
// transcript. Templates shape the greeting + suggestion chips, not the brain.
type ThreadKind = "omni" | "project" | "branding";
type ThreadMeta = { kind: ThreadKind; title: string };

const MAX_THREADS = 5;
const THREADS_KEY = "al_chat_threads";

// Preset attention pops — the agent calls out, feels alive. Each fires at most
// once per session, only while the visitor hasn't chatted yet, max 2 total.
// Context-aware: the page you're on decides which hooks lead the queue.
// Source: ASSISTANT[lang].nudges (7-language dict in lib/i18n/dictionaries).
type PresetNudge = { id: string; text: string; cta: string; prompt: string };

/** Order the queue by where the visitor actually is (uses ASSISTANT[lang]). */
function nudgeQueue(pathname: string, lang: Lang): PresetNudge[] {
  const by = (ids: string[]) =>
    [...ASSISTANT[lang].nudges].sort((a, b) => {
      const ia = ids.indexOf(a.id);
      const ib = ids.indexOf(b.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  if (pathname.startsWith("/projects")) return by(["projects", "match", "hiring"]);
  if (pathname.startsWith("/cv")) return by(["cvpage", "hiring", "match"]);
  return by(["hall", "match", "hiring"]); // home & everything else
}
type Attention = { kind: "greeting" } | { kind: "preset"; nudge: PresetNudge };

const NUDGE_KEY = "al_assistant_nudge_done";
const TURNS_KEY = "al_assistant_turns"; // per-thread suffix: _0.._4
const PRESETS_KEY = "al_assistant_presets_shown";

function loadTurns(thread: number): ChatTurn[] {
  try {
    const raw = sessionStorage.getItem(`${TURNS_KEY}_${thread}`);
    const parsed = raw ? (JSON.parse(raw) as ChatTurn[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-30) : [];
  } catch {
    return [];
  }
}

function loadThreads(): ThreadMeta[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ThreadMeta[]) : [];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, MAX_THREADS);
  } catch {
    /* fresh visitor */
  }
  return [{ kind: "omni", title: ASSISTANT[DEFAULT_LANG].threads.omni.title }];
}

export function AssistantWidget() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [interacted, setInteracted] = useState(true); // until mount check
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // ---- UI language (cookie al_lang) — flips greeting, nudges, thinking steps
  // and is shipped in every request body so the orchestrator replies in kind.
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  useEffect(() => {
    setLang(readLangCookie());
    // LanguageSwitch dispatches this when the visitor picks a new language —
    // the widget re-reads the cookie so the greeting/nudges flip in place.
    const onChange = () => setLang(readLangCookie());
    window.addEventListener("al_lang_change", onChange);
    return () => window.removeEventListener("al_lang_change", onChange);
  }, []);

  // Track the cookie consent banner in real time:
  //  - `needsConsentTopUp`: whether the banner is still pending (false = go
  //    back to the normal bottom position)
  //  - `cookieBannerOffset`: live distance from the viewport bottom to the
  //    TOP of the banner (so the popup greeting can sit ~12px above it with
  //    a smooth CSS transition, regardless of banner height / position).
  // ResizeObserver + scroll listeners keep it in sync if the banner resizes
  // (text reflow) or the user scrolls.
  const [needsConsentTopUp, setNeedsConsentTopUp] = useState(true);
  const [cookieBannerOffset, setCookieBannerOffset] = useState(0);
  useEffect(() => {
    const checkPending = () => {
      try {
        setNeedsConsentTopUp(localStorage.getItem("al_consent") === null);
      } catch {
        setNeedsConsentTopUp(false);
      }
    };
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-cookie-banner]");
      if (!el) {
        setCookieBannerOffset(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      // distance from viewport bottom to the top of the banner + small gap
      const dist = Math.max(0, window.innerHeight - rect.top + 12);
      setCookieBannerOffset(dist);
    };
    checkPending();
    measure();
    const onConsent = () => { checkPending(); measure(); };
    window.addEventListener("al_consent_change", onConsent);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // ResizeObserver: catch text reflow inside the banner (lang switch etc.)
    let ro: ResizeObserver | null = null;
    const el = document.querySelector<HTMLElement>("[data-cookie-banner]");
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener("al_consent_change", onConsent);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      ro?.disconnect();
    };
  }, []);

  // When language flips, regenerate the preset greeting in place — visitors
  // who opened the panel and then switched language shouldn't be stuck reading
  // the OLD greeting while every other string around it is in the new one.
  // Heuristic: the first turn is a preset greeting iff it matches one of the
  // 7 greetings for the current thread kind. If so, replace just that one.
  useEffect(() => {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      if (first.role !== "assistant") return prev;
      const newGreeting = templateFor(kind, lang).greeting;
      if (first.content === newGreeting) return prev;
      const isStaleGreeting = (Object.keys(ASSISTANT) as Lang[]).some(
        (l) => templateFor(kind, l).greeting === first.content,
      );
      if (!isStaleGreeting) return prev;
      return [{ role: "assistant", content: newGreeting }, ...prev.slice(1)];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // conversation tabs
  const [threads, setThreads] = useState<ThreadMeta[]>([{ kind: "omni", title: ASSISTANT[DEFAULT_LANG].threads.omni.title }]);
  const [activeThread, setActiveThread] = useState(0);
  const [picker, setPicker] = useState(false);
  const kind = threads[activeThread]?.kind ?? "omni";

  const switchThread = (idx: number) => {
    if (idx === activeThread) return;
    setActiveThread(idx);
    setTurns(personalizationAllowed() ? loadTurns(idx) : []);
    setPicker(false);
  };

  // ---- the ORBIT: pre-projects pinned per tab -------------------------------
  const [projects, setProjects] = useState<SessionProjectLite[]>([]);
  const [pinned, setPinned] = useState<Record<number, number[]>>({});
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/projects")
      .then((r) => r.json())
      .then((d) => Array.isArray(d?.projects) && setProjects(d.projects))
      .catch(() => undefined);
    try {
      const raw = localStorage.getItem("al_thread_projects");
      if (raw) setPinned(JSON.parse(raw));
    } catch { /* fresh */ }
  }, [open]);

  const pinnedIds = pinned[activeThread] ?? [];
  const activeProject = projects.find((p) => pinnedIds.includes(p.id)) ?? null;

  const togglePin = (id: number) => {
    setPinned((prev) => {
      const cur = prev[activeThread] ?? [];
      // omni: multi (max 3) — project/branding: single focus
      const next =
        kind === "omni"
          ? cur.includes(id)
            ? cur.filter((x) => x !== id)
            : [...cur, id].slice(-3)
          : cur.includes(id)
            ? []
            : [id];
      const map = { ...prev, [activeThread]: next };
      try { localStorage.setItem("al_thread_projects", JSON.stringify(map)); } catch { /* ui */ }
      return map;
    });
  };

  const onProjectCreated = (p: SessionProjectLite) => {
    setProjects((prev) => [...prev, p]);
    setPinned((prev) => {
      const map = { ...prev, [activeThread]: [p.id] };
      try { localStorage.setItem("al_thread_projects", JSON.stringify(map)); } catch { /* ui */ }
      return map;
    });
    setSetupOpen(false);
  };

  // project/branding tabs push the setup when the orbit is empty
  const needsSetup =
    kind !== "omni" && projects.length === 0 && !setupOpen ? true : setupOpen;
  // foundations first: in project/branding the chat stays LOCKED until a
  // pre-project is pinned — the wizard is the pre-creation screen, not a form
  // floating over an already-usable chat
  const composerLocked = kind !== "omni" && !activeProject;

  const addThread = (k: ThreadKind) => {
    if (threads.length >= MAX_THREADS) return;
    const next = [...threads, { kind: k, title: ASSISTANT[lang].threads[k].title }];
    setThreads(next);
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(next));
    } catch { /* ui state only */ }
    setPicker(false);
    setActiveThread(next.length - 1);
    setTurns([]);
  };
  // staged "thinking" steps under the typing dots — the reply feels like a
  // process (checking evidence, drafting), not a black box. Source: dict
  // (7 languages, ASSISTANT[lang].thinking).
  const THINKING = ASSISTANT[lang].thinking;
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (!loading) {
      setStepIdx(0);
      return;
    }
    const t = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, THINKING.length - 1)),
      1700,
    );
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // pending image attachment (uploaded to the session, sent with next message)
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    if (uploadingImage) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/assistant/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) setPendingImage(data.url as string);
    } finally {
      setUploadingImage(false);
    }
  }

  // restore transcript (consent-gated) + schedule the one-time greeting popup
  useEffect(() => {
    const restored = loadThreads();
    setThreads(restored);
    if (personalizationAllowed()) {
      setTurns(loadTurns(0));
    }
    const done = !!localStorage.getItem(NUDGE_KEY);
    setInteracted(done);
    if (done) return;
    const timer = setTimeout(() => setAttention({ kind: "greeting" }), 4000);
    return () => clearTimeout(timer);
  }, []);

  // preset attention pops: the agent keeps calling out (politely) until the
  // visitor actually talks to it — max 2 per session, never over an open panel
  useEffect(() => {
    if (open || turns.length > 0) return;
    let shown: string[] = [];
    try {
      shown = JSON.parse(sessionStorage.getItem(PRESETS_KEY) || "[]") as string[];
    } catch {
      shown = [];
    }
    if (shown.length >= 2) return;

    const timers = [40_000, 150_000].slice(shown.length).map((delay) =>
      setTimeout(() => {
        if (document.visibilityState !== "visible") return;
        const next = nudgeQueue(window.location.pathname, lang).find(
          (n) => !shown.includes(n.id),
        );
        if (!next) return;
        shown = [...shown, next.id];
        try {
          sessionStorage.setItem(PRESETS_KEY, JSON.stringify(shown));
        } catch {
          /* storage blocked — the pop just won't be deduped */
        }
        setAttention((a) => (a ? a : { kind: "preset", nudge: next }));
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [open, turns.length]);

  // persist the ACTIVE thread's transcript ONLY with personalization consent
  useEffect(() => {
    try {
      if (personalizationAllowed()) {
        sessionStorage.setItem(
          `${TURNS_KEY}_${activeThread}`,
          JSON.stringify(turns.slice(-30)),
        );
      }
    } catch {
      /* storage blocked — transcript just won't persist */
    }
  }, [turns, activeThread]);

  // The guide speaks first: typed greeting when the panel opens empty.
  // IMPORTANT: no state gate inside this effect — an earlier version set
  // `greeted` here, which re-ran the effect and its cleanup cleared the timer
  // BEFORE it fired, leaving `loading` stuck true (dots forever, send dead).
  // Now the only gates are `open` + empty transcript, and cleanup always
  // resets loading so the composer can never be left locked.
  useEffect(() => {
    if (!open || turns.length > 0) return;
    setLoading(true);
    const greeting = templateFor(kind, lang).greeting;
    const t = setTimeout(() => {
      setTurns((prev) =>
        prev.length > 0 ? prev : [{ role: "assistant", content: greeting }],
      );
      setLoading(false);
    }, reduce ? 0 : 900);
    return () => {
      clearTimeout(t);
      setLoading(false);
    };
  }, [open, turns.length, reduce, kind]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [turns, loading, open, reduce]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // action buttons dispatch this so the panel never covers its destination.
  // The Guided Tour hands off here (`al-assistant-open`, optional seed message).
  const seedHandlerRef = useRef<(seed?: string) => void>(() => {});
  useEffect(() => {
    const close = () => setOpen(false);
    const openFromTour = (e: Event) => {
      const seed = (e as CustomEvent<{ seed?: string }>).detail?.seed;
      seedHandlerRef.current(seed);
    };
    window.addEventListener("al-assistant-close", close);
    window.addEventListener("al-assistant-open", openFromTour);
    return () => {
      window.removeEventListener("al-assistant-close", close);
      window.removeEventListener("al-assistant-open", openFromTour);
    };
  }, []);

  const dismissAttention = useCallback(() => {
    setAttention(null);
    setInteracted(true);
    localStorage.setItem(NUDGE_KEY, "1");
  }, []);

  const openPanel = useCallback(() => {
    dismissAttention();
    setOpen(true);
  }, [dismissAttention]);

  // Guided Tour handoff target: open Orbe and optionally seed a first message.
  // `send` is a hoisted function declaration below — safe to reference here.
  seedHandlerRef.current = (seed?: string) => {
    openPanel();
    if (seed?.trim()) void send(seed);
  };

  async function send(text: string) {
    const message = text.trim() || (pendingImage ? "Compartí una imagen 📎" : "");
    // foundations first: locked tabs never send (belt for the disabled composer)
    if (!message || loading || composerLocked) return;
    const attachments = pendingImage ? [pendingImage] : [];
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [
      ...prev,
      { role: "user", content: message, ...(pendingImage ? { image: pendingImage } : {}) },
    ]);
    setInput("");
    setPendingImage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          attachments,
          page: window.location.pathname, // visit context for the server brain
          deviceId: getDeviceId(), // identity leg 2: rebinds if cookies were wiped
          thread: activeThread, // conversation tab
          lang, // UI language -> agent replies in it by default
          projectIds: pinnedIds, // the orbit pinned to this tab
        }),
      });
      const data: AssistantResponse = await res.json();
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.message, response: data },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the lab just now. Try the Proof Rooms or open the CV.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function sendAndOpen(text: string) {
    openPanel();
    void send(text);
  }

  return (
    <>
      {/* attention popups — the guide says hi BIG (once), then keeps calling
          out with preset hooks until the visitor talks to it */}
      <AnimatePresence>
        {attention && !open && (
          <motion.div
            key={attention.kind === "preset" ? attention.nudge.id : "greeting"}
            initial={reduce ? false : { opacity: 0, y: 26, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            // When the cookie banner is still pending, the popup anchors
            // 12px above the banner (live-measured). When the banner is gone,
            // it falls back to bottom-24 (the launcher's resting position).
            // The CSS transition smooths the shift as the banner resizes,
            // scrolls, or disappears.
            className="fixed inset-x-3 z-[120] mx-auto w-full max-w-xl rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_80px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-[bottom] duration-300 ease-out sm:left-auto sm:right-5 sm:w-[min(92vw,420px)]"
            style={{
              bottom: needsConsentTopUp && cookieBannerOffset > 0
                ? `${cookieBannerOffset}px`
                : "6rem", // bottom-24 in rem for the resting state
            }}
            role="dialog"
            aria-label={ASSISTANT[lang].popup.dialogAria}
          >
            <button
              onClick={dismissAttention}
              aria-label={ASSISTANT[lang].popup.dismissAria}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
            {attention.kind === "greeting" ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-violet-500/15 p-1.5">
                    <AssistantAvatar size={64} waving />
                  </div>
                  <div className="pr-4">
                    {/* the BIG hello — the mascot waves, the word lands */}
                    <motion.p
                      initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                      className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-4xl font-black leading-none text-transparent"
                    >
                      {ASSISTANT[lang].popup.hello}
                    </motion.p>
                    <p className="mt-2 text-xs leading-relaxed text-white/65">
                      {ASSISTANT[lang].popup.body}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => sendAndOpen(ASSISTANT[lang].threads.omni.suggestions[0])}
                    className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
                  >
                    {ASSISTANT[lang].popup.ctaPrimary}
                  </button>
                  <button
                    onClick={openPanel}
                    className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 hover:border-cyan-400/50 hover:text-cyan-200"
                  >
                    {ASSISTANT[lang].popup.ctaSecondary}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-violet-500/15 p-1.5">
                    <AssistantAvatar size={48} waving />
                  </div>
                  <p className="pr-4 pt-1 text-sm leading-relaxed text-white/80">
                    {attention.nudge.text}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => sendAndOpen(attention.nudge.prompt)}
                    className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
                  >
                    {attention.nudge.cta}
                  </button>
                  <button
                    onClick={dismissAttention}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/60 hover:text-white"
                  >
                    {ASSISTANT[lang].popup.dismissPreset}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* launcher — the mascot itself, with an attention ping until touched */}
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? ASSISTANT[lang].panel.launcherClose : ASSISTANT[lang].panel.launcherOpen}
        aria-expanded={open}
        className="ui-interactive group fixed bottom-5 right-5 z-[122] flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all hover:scale-[1.06] hover:border-white/35 hover:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {!interacted && !reduce && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-cyan-400" />
          </span>
        )}
        {open ? (
          <span className="text-2xl text-white/85" aria-hidden>×</span>
        ) : (
          // waves along whenever an attention popup is on screen
          <AssistantAvatar size={46} waving={!!attention} />
        )}
      </button>

      {/* panel: centered glass stage (mobile: full sheet) */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[119] bg-black/50 backdrop-blur-md"
              aria-hidden
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 36, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              role="dialog"
              aria-label={ASSISTANT[lang].panel.dockAria}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) void uploadImage(file);
              }}
              className={`fixed inset-2 z-[121] m-auto flex flex-col overflow-hidden rounded-3xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_120px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:h-[min(84vh,760px)] sm:w-[min(94vw,760px)] ${
                dragOver
                  ? "border-cyan-400/70 bg-cyan-400/10"
                  : "border-white/15 bg-white/[0.07]"
              }`}
            >
              {/* header */}
              <div className="relative border-b border-white/10 px-5 py-3.5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(80% 140% at 0% 0%, rgba(0,242,255,0.12) 0%, transparent 60%), radial-gradient(70% 140% at 100% 0%, rgba(139,92,246,0.12) 0%, transparent 60%)",
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <AssistantAvatar size={44} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{ASSISTANT[lang].panel.title}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/45">
                      <span className="lab-livedot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {ASSISTANT[lang].panel.tagline}
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label={ASSISTANT[lang].panel.closeAria}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                {/* conversation tabs — parallel threads within the session */}
                <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {threads.map((th, i) => (
                    <button
                      key={i}
                      onClick={() => switchThread(i)}
                      aria-current={i === activeThread}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        i === activeThread
                          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 text-white/50 hover:text-white/80"
                      }`}
                    >
                      <span aria-hidden>{templateFor(th.kind, lang).icon}</span>
                      {th.title}
                    </button>
                  ))}
                  {threads.length < MAX_THREADS && (
                    <button
                      onClick={() => setPicker((p) => !p)}
                      aria-label={ASSISTANT[lang].panel.newConversation}
                      aria-expanded={picker}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-white/50 transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* the orbit: pre-project cards pinned to this tab */}
                <ProjectStrip
                  projects={projects}
                  selected={pinnedIds}
                  multi={kind === "omni"}
                  onToggle={togglePin}
                  onNew={() => setSetupOpen(true)}
                  lang={lang}
                />
                {kind === "branding" && activeProject && (
                  <BrandingBoard
                    project={activeProject}
                    lang={lang}
                    onGenerate={(prompt) => send(prompt)}
                  />
                )}

                {/* template picker */}
                <AnimatePresence>
                  {picker && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-4 right-4 top-full z-20 mt-1 grid gap-2 rounded-2xl border border-white/15 bg-[#0a0a14]/95 p-3 backdrop-blur-xl sm:grid-cols-3"
                    >
                      {(["omni", "project", "branding"] as ThreadKind[]).map((k) => {
                        const t = templateFor(k, lang);
                        return (
                          <button
                            key={k}
                            onClick={() => addThread(k)}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-cyan-400/50"
                          >
                            <span className="text-lg" aria-hidden>{t.icon}</span>
                            <p className="mt-1 text-sm font-semibold text-white">{t.title}</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-white/50">{t.tagline}</p>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* transcript — data-lenis-prevent: wheel over the OPEN chat
                  scrolls the chat, not the page behind it */}
              <div
                ref={scrollRef}
                data-lenis-prevent
                className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
              >
                {/* pre-creation screen: the wizard REPLACES the conversation
                    until the foundations exist (or the "+" flow is cancelled) */}
                {needsSetup ? (
                  <div className="flex min-h-full flex-col justify-center">
                    <ProjectSetup
                      lang={lang}
                      onCreated={onProjectCreated}
                      onCancel={() => setSetupOpen(false)}
                      cancelable={projects.length > 0 || kind === "omni"}
                    />
                  </div>
                ) : composerLocked ? (
                  /* projects exist but none is pinned to this tab */
                  <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-white/60">
                      {ASSISTANT[lang].panel.lockedBody}
                    </p>
                    <button
                      onClick={() => setSetupOpen(true)}
                      className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10"
                    >
                      + {WIZARD[lang].stripNew}
                    </button>
                  </div>
                ) : null}
                {!needsSetup && !composerLocked && turns.map((t, i) => (
                  <AssistantMessage key={i} turn={t} />
                ))}
                {!needsSetup && !composerLocked && loading && (
                  <div className="flex items-center gap-2.5 pl-1" role="status" aria-label={ASSISTANT[lang].panel.typing}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-cyan-300/80"
                        animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                    {/* staged process indicator */}
                    <motion.span
                      key={stepIdx}
                      initial={reduce ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] text-white/40"
                    >
                      {ASSISTANT[lang].thinking[stepIdx]}
                    </motion.span>
                  </div>
                )}
                {!needsSetup && !composerLocked && turns.length > 0 && turns.length <= 1 && !loading && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {templateFor(kind, lang).suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="border-t border-white/10 p-3"
              >
                {/* pending attachment preview */}
                {(pendingImage || uploadingImage) && (
                  <div className="mb-2 flex items-center gap-2">
                    {pendingImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingImage}
                          alt="Attachment preview"
                          className="h-12 w-12 rounded-lg border border-cyan-400/40 object-cover"
                        />
                        <span className="text-xs text-white/50">Imagen lista para enviar</span>
                        <button
                          type="button"
                          onClick={() => setPendingImage(null)}
                          aria-label={ASSISTANT[lang].panel.removeAttachment}
                          className="rounded-full px-2 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="animate-pulse text-xs text-cyan-300">Subiendo imagen…</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingImage || composerLocked}
                  aria-label={ASSISTANT[lang].panel.attachImage}
                  title="Adjuntar imagen (o arrastrala al chat)"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-40"
                >
                  📎
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={600}
                  disabled={composerLocked}
                  placeholder={
                    composerLocked
                      ? ASSISTANT[lang].composer.locked
                      : ASSISTANT[lang].composer.placeholder
                  }
                  aria-label={ASSISTANT[lang].panel.messageAria}
                  className="flex-1 rounded-full border border-white/20 bg-white/[0.07] px-4 py-2.5 text-sm text-white placeholder-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none backdrop-blur focus:border-cyan-400/60 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || composerLocked || (!input.trim() && !pendingImage)}
                  className="rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-300 disabled:opacity-40"
                >
                  {ASSISTANT[lang].composer.send}
                </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default AssistantWidget;
