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
import { AlertTriangle, CheckCircle2, Mail, Save } from "lucide-react";
import type { AssistantResponse, DecisionProposal } from "@/lib/assistant/types";
import { OMNI_TOUR, matchesTourTrigger } from "@/lib/assistant/omni-tour";
import { personalizationAllowed } from "@/lib/consent";
import { cn } from "@/lib/utils";
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
import { InlineCanon } from "./InlineCanon";
import {
  ProjectStrip,
  ProjectSetup,
  type SessionProjectLite,
} from "./AssistantProjectOrbit";
import {
  PhaseCreatedCard,
  BrandingPointer,
  BrandingEmptyGate,
  BrandingDone,
  BrandingWizard,
  DecisionsBoard,
  GenerationBoard,
} from "./AssistantFlow";

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

function SessionRecoveryCard({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const copy =
    lang === "es"
      ? {
          title: "Guardar esta sesión",
          hint: "Recibís un link privado para volver a esta conversación.",
          placeholder: "tu@email.com",
          action: "Enviar link",
          sending: "Enviando…",
          sent: "Link enviado si el email es válido.",
          error: "No pude enviarlo ahora.",
        }
      : {
          title: "Save this session",
          hint: "Get a private link back to this conversation.",
          placeholder: "you@email.com",
          action: "Send link",
          sending: "Sending…",
          sent: "Link sent if the email is valid.",
          error: "Could not send it now.",
        };

  async function submit() {
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/session/recover-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="relative mt-2 flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 text-[11px] font-semibold text-white/65 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
      >
        <Save size={13} aria-hidden />
        {copy.title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.98 }}
            className="absolute right-0 top-9 z-30 w-[min(92vw,360px)] rounded-xl border border-white/12 bg-[#080b12]/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-2">
              <Mail size={15} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{copy.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">{copy.hint}</p>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== "idle") setState("idle");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={copy.placeholder}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-400/60"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={state === "sending" || email.trim().length < 5}
                className="shrink-0 rounded-lg bg-cyan-400 px-3 py-2 text-[11px] font-bold text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state === "sending" ? copy.sending : copy.action}
              </button>
            </div>
            {(state === "sent" || state === "error") && (
              <p className={`mt-2 flex items-center justify-end gap-1 text-right text-[10px] ${state === "sent" ? "text-emerald-300" : "text-amber-200"}`}>
                {state === "sent" ? <CheckCircle2 size={12} aria-hidden /> : <AlertTriangle size={12} aria-hidden />}
                {state === "sent" ? copy.sent : copy.error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Attention = { kind: "greeting" } | { kind: "preset"; nudge: PresetNudge };

const NUDGE_KEY = "al_assistant_nudge_done";
const TURNS_KEY = "al_assistant_turns"; // per-thread suffix: _0.._4
const PRESETS_KEY = "al_assistant_presets_shown";

// The greeting popup is now the SINGLE entry to the interactive tour (merge
// 2026-07-04): one button here fires `al-tour-start`, which GuidedTour listens
// for. Localized inline (same pattern as GuidedTour's own label maps) to avoid
// threading a new key through the 7-language ASSISTANT dict.
const TOUR_CTA: Record<Lang, string> = {
  en: "Take the 2-min tour",
  es: "Hacé el tour de 2 min",
  pt: "Faça o tour de 2 min",
  fr: "Faire la visite de 2 min",
  ru: "Пройти 2-мин тур",
  zh: "开始 2 分钟导览",
  ar: "خذ جولة الدقيقتين",
  he: "סיור של 2 דקות",
  ja: "2分ツアーに参加",
  ko: "2분 투어 하기",
  hi: "2 मिनट का टूर लें",
};

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
    fetch("/api/assistant/projects", { headers: { "x-device-id": getDeviceId() ?? "" } })
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

  // ONLY the project tab auto-pushes the setup wizard when its orbit is empty.
  // The branding tab, without a project, shows a soft derivation instead
  // (BrandingEmptyGate) — never a full wizard the visitor didn't ask for.
  const needsSetup = setupOpen || (kind === "project" && projects.length === 0);

  // guided-flow phase of the pinned project (created until the server says else)
  const activePhase = activeProject?.phase ?? "created";
  // foundations first: the composer stays LOCKED while there's no pinned project,
  // through the whole branding tab, and during the created/branding phases of the
  // project tab. It UNLOCKS once decisions begin (free conversation from there on).
  const composerLocked =
    kind !== "omni" &&
    (!activeProject ||
      kind === "branding" ||
      activePhase === "created" ||
      activePhase === "branding");

  // ---- guided-flow helpers (Fase 2b: wiring the state machine) --------------
  // patchPhase: advance the server-side phase AND the local orbit (optimistic).
  const patchPhase = useCallback(async (id: number, phase: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, phase } : p)));
    try {
      const res = await fetch("/api/assistant/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, phase }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.project) {
        setProjects((prev) => prev.map((p) => (p.id === id ? (data.project as SessionProjectLite) : p)));
      }
    } catch {
      /* optimistic value stays — the server just wasn't reachable */
    }
  }, []);

  // syncPhase: the generate endpoint ALREADY advanced the phase server-side —
  // just mirror it locally (no redundant PATCH).
  const syncPhase = useCallback((id: number, phase: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, phase } : p)));
  }, []);

  // goToThread: jump to the (first) tab of a given kind — creating it if needed —
  // and optionally pin a project into it (single focus). This is how the flow
  // derives created→branding→(back to) project without the visitor hunting tabs.
  const goToThread = useCallback(
    (k: ThreadKind, pinId?: number) => {
      let idx = threads.findIndex((th) => th.kind === k);
      if (idx === -1) {
        if (threads.length >= MAX_THREADS) return; // no room — stay put
        const next = [...threads, { kind: k, title: ASSISTANT[lang].threads[k].title }];
        setThreads(next);
        try { localStorage.setItem(THREADS_KEY, JSON.stringify(next)); } catch { /* ui */ }
        idx = next.length - 1;
      }
      if (typeof pinId === "number") {
        setPinned((prev) => {
          const map = { ...prev, [idx]: [pinId] };
          try { localStorage.setItem("al_thread_projects", JSON.stringify(map)); } catch { /* ui */ }
          return map;
        });
      }
      setActiveThread(idx);
      setTurns(personalizationAllowed() ? loadTurns(idx) : []);
      setPicker(false);
      setSetupOpen(false);
    },
    [threads, lang],
  );

  // a decision card pick (agent-proposed OR preset board) persists to the project
  const onDecision = useCallback(
    (item: DecisionProposal, option: string) => {
      if (!activeProject) return;
      void fetch("/api/assistant/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, category: item.id, option }),
      })
        .then(() => window.dispatchEvent(new CustomEvent("al-workspace-refresh")))
        .catch(() => undefined);
    },
    [activeProject],
  );

  // omni tour quick-replies (chips over the composer after the preset visit)
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

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

  // single-button handoff to the interactive Guided Tour (GuidedTour listens for
  // `al-tour-start`). Dismiss the popup first so the tour has the stage.
  const startTour = useCallback(() => {
    dismissAttention();
    window.dispatchEvent(new CustomEvent("al-tour-start"));
  }, [dismissAttention]);

  // Guided Tour handoff target: open Orbe and optionally seed a first message.
  // `send` is a hoisted function declaration below — safe to reference here.
  seedHandlerRef.current = (seed?: string) => {
    openPanel();
    if (seed?.trim()) void send(seed);
  };

  // Fase 1: the omni "guided visit" plays entirely client-side — staged assistant
  // turns with real project cards + nav links, ZERO LLM calls, ending in quick
  // replies that DO reach the agent. Intercepted in send() before the fetch.
  const playOmniTour = useCallback(() => {
    const tour = OMNI_TOUR[lang];
    setQuickReplies([]);
    let at = 0;
    tour.steps.forEach((step, i) => {
      const gap = reduce ? 0 : 1100;
      window.setTimeout(() => setLoading(true), at);
      at += gap;
      window.setTimeout(() => {
        const response: AssistantResponse = {
          message: step.text,
          intent: "unknown",
          actions: (step.links ?? []).map((l) => ({ type: "navigate", label: l.label, href: l.href })),
          cards: (step.slugs ?? []).map((s) => ({ type: "project", slug: s })),
          safety: { source: "site_content", confidence: "high" },
        };
        setLoading(false);
        setTurns((prev) => [...prev, { role: "assistant", content: step.text, response }]);
        if (i === tour.steps.length - 1) setQuickReplies(tour.replies);
      }, at);
      at += 40;
    });
  }, [lang, reduce]);

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
    setQuickReplies([]); // any real send clears the leftover tour chips
    // Fase 1: intercept the preset tour trigger BEFORE the LLM — play it locally
    if (kind === "omni" && !pendingImage && matchesTourTrigger(message)) {
      playOmniTour();
      return;
    }
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
      // a turn may have changed the project's brand/stack/assets -> refresh the vault
      window.dispatchEvent(new CustomEvent("al-workspace-refresh"));
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
            className="fixed inset-x-3 z-[120] max-w-xl rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_80px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-[bottom] duration-300 ease-out sm:left-auto sm:right-5 sm:w-[min(92vw,420px)]"
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
                  {/* single, prominent entry to the interactive tour */}
                  <button
                    onClick={startTour}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
                  >
                    <span aria-hidden>✦</span>
                    {TOUR_CTA[lang]}
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
                    {(ASSISTANT[lang].nudges.find((n) => n.id === attention.nudge.id) ?? attention.nudge).text}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => sendAndOpen((ASSISTANT[lang].nudges.find((n) => n.id === attention.nudge.id) ?? attention.nudge).prompt)}
                    className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
                  >
                    {(ASSISTANT[lang].nudges.find((n) => n.id === attention.nudge.id) ?? attention.nudge).cta}
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

      {/* The canon now renders INSIDE the chat panel (see <InlineCanon/> above
          the composer). The old floating <AssetVault/> sat at z-[115], behind
          the z-[121] panel, so it read as "buried behind the home" — removed. */}

      {/* launcher — the mascot itself, with an attention ping until touched */}
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? ASSISTANT[lang].panel.launcherClose : ASSISTANT[lang].panel.launcherOpen}
        aria-expanded={open}
        className={cn("ui-interactive group fixed bottom-5 right-5 z-[122] h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all hover:scale-[1.06] hover:border-white/35 hover:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400", open ? "hidden sm:flex" : "flex")}
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
                <SessionRecoveryCard lang={lang} />

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
                className="chat-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4"
              >
                {/* The transcript is driven by the guided-flow state machine.
                    Priority: explicit setup wizard → branding workspace →
                    project-room phases → locked derivation → free conversation. */}
                {(() => {
                  const loadingDots = loading ? (
                    <div className="flex items-center gap-2.5 pl-1" role="status" aria-label={ASSISTANT[lang].panel.typing}>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-cyan-300/80"
                          animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                      <motion.span
                        key={stepIdx}
                        initial={reduce ? false : { opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[11px] text-white/40"
                      >
                        {ASSISTANT[lang].thinking[stepIdx]}
                      </motion.span>
                    </div>
                  ) : null;

                  // 1) explicit setup wizard (project tab empty, or "+" pressed)
                  if (needsSetup) {
                    return (
                      <div className="flex min-h-full flex-col justify-center">
                        <ProjectSetup
                          lang={lang}
                          onCreated={onProjectCreated}
                          onCancel={() => setSetupOpen(false)}
                          cancelable={projects.length > 0 || kind === "omni"}
                        />
                      </div>
                    );
                  }

                  // 2) branding tab — the visual-universe workspace
                  if (kind === "branding") {
                    if (!activeProject)
                      return <BrandingEmptyGate lang={lang} onStart={() => goToThread("project")} />;
                    if (activePhase === "created")
                      return (
                        <PhaseCreatedCard
                          project={activeProject}
                          lang={lang}
                          onStartBranding={() => void patchPhase(activeProject.id, "branding")}
                        />
                      );
                    if (activePhase === "branding")
                      return (
                        <BrandingWizard
                          project={activeProject}
                          lang={lang}
                          onComplete={() => void patchPhase(activeProject.id, "decisions")}
                        />
                      );
                    return <BrandingDone lang={lang} onBack={() => goToThread("project", activeProject.id)} />;
                  }

                  // 3) project tab with a pinned project — driven by phase
                  if (kind === "project" && activeProject) {
                    if (activePhase === "created")
                      return (
                        <PhaseCreatedCard
                          project={activeProject}
                          lang={lang}
                          onStartBranding={() => {
                            void patchPhase(activeProject.id, "branding");
                            goToThread("branding", activeProject.id);
                          }}
                        />
                      );
                    if (activePhase === "branding")
                      return <BrandingPointer lang={lang} onGo={() => goToThread("branding", activeProject.id)} />;
                    // decisions / consolidated / generating / ready → chat + board
                    return (
                      <>
                        {turns.map((t, i) => (
                          <AssistantMessage key={i} turn={t} onDecision={onDecision} />
                        ))}
                        {loadingDots}
                        {activePhase === "decisions" ? (
                          <DecisionsBoard
                            project={activeProject}
                            lang={lang}
                            onConsolidate={() => void patchPhase(activeProject.id, "consolidated")}
                          />
                        ) : (
                          <GenerationBoard
                            project={activeProject}
                            lang={lang}
                            onPhase={(p) => syncPhase(activeProject.id, p)}
                          />
                        )}
                      </>
                    );
                  }

                  // 4) project tab, projects exist but none pinned here → locked
                  if (composerLocked) {
                    return (
                      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
                        <p className="text-sm text-white/60">{ASSISTANT[lang].panel.lockedBody}</p>
                        <button
                          onClick={() => setSetupOpen(true)}
                          className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10"
                        >
                          + {WIZARD[lang].stripNew}
                        </button>
                      </div>
                    );
                  }

                  // 5) omni (or any unlocked free conversation)
                  const suggestions =
                    kind === "omni"
                      ? [OMNI_TOUR[lang].trigger, ...templateFor(kind, lang).suggestions.slice(1)]
                      : templateFor(kind, lang).suggestions;
                  return (
                    <>
                      {turns.map((t, i) => (
                        <AssistantMessage key={i} turn={t} onDecision={onDecision} />
                      ))}
                      {loadingDots}
                      {turns.length > 0 && turns.length <= 1 && !loading && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {suggestions.map((s) => (
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
                      {quickReplies.length > 0 && !loading && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {quickReplies.map((q) => (
                            <button
                              key={q}
                              onClick={() => send(q)}
                              className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* canon rail — palette + generated assets INSIDE the panel, so
                  branding-done never looks empty and the project room fills as
                  visuals land (refreshes on al-workspace-refresh) */}
              {kind !== "omni" && (
                <InlineCanon
                  projectId={activeProject?.id}
                  scope={kind === "branding" ? "branding" : "project"}
                />
              )}

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
