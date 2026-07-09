"use client";

// components/assistant/AssistantProjectOrbit.tsx
// The ORBIT UI: everything in a chat tab revolves around a pre-project.
//  - ProjectStrip: horizontal cards under the tabs (active = brand-lit,
//    others greyed). Click to pin; "+" opens the setup.
//  - ProjectSetup: STEP WIZARD for the foundations (name+type -> stack ->
//    concept), ending in a staged "laying foundations" sequence while the
//    POST /api/assistant/projects lands. The chat stays locked until this
//    exists (project/branding tabs) — foundations first, conversation second.
//  - BrandingBoard: compact visual strip for the branding tab — palette,
//    logo slot, one-tap "generate visual concept" (Seedream via the agent).
//
// All chrome strings live in WIZARD[lang] (lib/i18n/dictionaries.ts) —
// 7 languages, switches live when the LanguageSwitch dispatches
// `al_lang_change`.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { WIZARD, DEFAULT_LANG, LANGS, type Lang } from "@/lib/i18n/dictionaries";
import { getDeviceId } from "@/lib/identity";

// helper used by callers that don't yet expose `lang` — kept here so the
// wizard chrome doesn't break while the migration from `es: boolean` rolls
// outward. New code should pass `lang` explicitly.
function readLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const m = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1];
  return m && m in LANGS ? (m as Lang) : DEFAULT_LANG;
}

export type SessionProjectLite = {
  id: number;
  name: string;
  kind: string;
  concept: string | null;
  stack: string[];
  palette: string[];
  logoUrl: string | null;
  // guided-flow state machine (Fase 2a): created|branding|decisions|consolidated|
  // generating|ready. Optional on the client until the UI (2b) consumes it.
  phase?: string;
};

const KIND_META: Record<string, { icon: string }> = {
  app: { icon: "📱" },
  web: { icon: "🌐" },
  ecommerce: { icon: "🛒" },
  agent: { icon: "🤖" },
  saas: { icon: "☁️" },
  brand: { icon: "🎨" },
};

// Suggested starting palette per kind — the visitor confirms or tweaks it in the
// colors step. These are just sensible defaults; the agent can refine later
// (confirm_palette) or the visitor edits them inline. Always valid #rrggbb.
const DEFAULT_PALETTE: Record<string, string[]> = {
  app: ["#00e5ff", "#8b5cf6", "#0a0a14"],
  web: ["#38bdf8", "#6366f1", "#0b1020"],
  ecommerce: ["#f59e0b", "#10b981", "#111827"],
  agent: ["#22d3ee", "#a855f7", "#0a0f1e"],
  saas: ["#3b82f6", "#14b8a6", "#0d1117"],
  brand: ["#ec4899", "#f97316", "#faf5ff"],
};
const FALLBACK_PALETTE = ["#00e5ff", "#8b5cf6", "#0a0a14"];

// Business needs — written for non-devs. The agent translates them into
// concrete stack decisions later; the visitor never has to name a technology.
// Each chip maps to a stable id (used in the brief the agent reads).
const BUSINESS_NEEDS: Array<{ id: string; icon: string; labels: Record<Lang, string> }> = [
  { id: "traffic",     icon: "🚦", labels: { en: "Handle heavy traffic",          es: "Bancar mucho tráfico",          pt: "Aguentar muito tráfego",      fr: "Encaisser beaucoup de trafic",    ru: "Выдерживать высокий трафик",     zh: "承载高流量",            ar: "تحمّل حركة مرور كثيفة", he: "לעמוד בעומס גבוה", ja: "高トラフィック対応", ko: "대량 트래픽 감당", hi: "भारी ट्रैफ़िक सँभालना" } },
  { id: "visuals",     icon: "✨", labels: { en: "Smooth visuals / animations",  es: "Visuales fluidas / animaciones", pt: "Visuais fluidos / animações",  fr: "Visuels fluides / animations",   ru: "Плавные визуалы / анимации",     zh: "流畅视觉 / 动效",          ar: "مرئيات سلسة / حركات", he: "ויזואלים חלקים / אנימציות", ja: "滑らかなビジュアル / アニメ", ko: "부드러운 비주얼 / 애니메이션", hi: "स्मूद विज़ुअल / एनिमेशन" } },
  { id: "edge",        icon: "🌍", labels: { en: "Fast worldwide (edge)",        es: "Rápido en todo el mundo",       pt: "Rápido no mundo todo (edge)", fr: "Rapide partout (edge)",           ru: "Быстро по всему миру (edge)",  zh: "全球加速 (edge)",        ar: "سريع في كل العالم (edge)", he: "מהיר בכל העולם (edge)", ja: "世界中で高速 (edge)", ko: "전 세계 빠르게 (edge)", hi: "दुनिया भर में तेज़ (edge)" } },
  { id: "sovereignty", icon: "🔐", labels: { en: "Data sovereignty",             es: "Soberanía de la data",          pt: "Soberania dos dados",         fr: "Souveraineté des données",       ru: "Суверенитет данных",             zh: "数据主权",               ar: "سيادة البيانات", he: "ריבונות נתונים", ja: "データ主権", ko: "데이터 주권", hi: "डेटा संप्रभुता" } },
  { id: "payments",    icon: "💳", labels: { en: "Online payments",              es: "Pagos online",                  pt: "Pagamentos online",            fr: "Paiements en ligne",             ru: "Онлайн-платежи",                 zh: "在线支付",               ar: "مدفوعات أونلاين", he: "תשלומים אונליין", ja: "オンライン決済", ko: "온라인 결제", hi: "ऑनलाइन पेमेंट" } },
  { id: "i18n",        icon: "🌐", labels: { en: "Multi-language",               es: "Multi-idioma",                  pt: "Multi-idioma",                 fr: "Multilingue",                    ru: "Мультиязычность",                zh: "多语言",                 ar: "متعدد اللغات", he: "רב-לשוני", ja: "多言語対応", ko: "다국어", hi: "बहुभाषी" } },
  { id: "mobile",      icon: "📱", labels: { en: "Mobile app (iOS/Android)",     es: "App móvil (iOS/Android)",       pt: "App móvel (iOS/Android)",      fr: "App mobile (iOS/Android)",       ru: "Мобильное приложение (iOS/Android)", zh: "移动端 App (iOS/Android)", ar: "تطبيق جوال (iOS/Android)", he: "אפליקציה (iOS/Android)", ja: "モバイルアプリ (iOS/Android)", ko: "모바일 앱 (iOS/Android)", hi: "मोबाइल ऐप (iOS/Android)" } },
];

// Tokenize the free-form dev textbox into a stack[] (split on commas, new
// lines, or bullets; trim; cap at 20 — the same ceiling the schema allows).
function parseStackList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n•·]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 40),
    ),
  ).slice(0, 20);
}

// ---- strip -------------------------------------------------------------------

export function ProjectStrip({
  projects,
  selected,
  multi,
  onToggle,
  onNew,
  lang,
}: {
  projects: SessionProjectLite[];
  selected: number[];
  multi: boolean;
  onToggle: (id: number) => void;
  onNew: () => void;
  lang: Lang;
}) {
  const t = WIZARD[lang];
  if (projects.length === 0) return null;
  return (
    <div className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto pb-1">
      {projects.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            aria-pressed={on}
            className={`flex h-14 w-[224px] shrink-0 items-center gap-2 rounded-lg border px-2.5 text-left transition-all ${
              on
                ? "border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
                : "border-white/10 bg-white/[0.025] opacity-70 grayscale hover:opacity-95"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/25">
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt="" className="h-full w-full rounded-md object-cover" />
              ) : (
                <span aria-hidden className="text-sm">{KIND_META[p.kind]?.icon ?? "🧩"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{p.name}</span>
              <div className="mt-1 flex items-center gap-1">
                {(p.palette.length > 0 ? p.palette : ["#00e5ff", "#8b5cf6"]).slice(0, 5).map((c, i) => (
                  <span key={i} aria-hidden className="h-2 w-2 rounded-full" style={{ background: c }} />
                ))}
                {p.stack.length > 0 ? (
                  <span className="ml-1 text-[9px] text-white/35">{p.stack.length} stack</span>
                ) : null}
              </div>
            </div>
            {on ? <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" /> : null}
          </button>
        );
      })}
      <button
        onClick={onNew}
        aria-label={t.stripNew}
        className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 text-white/45 transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
      >
        <Plus size={18} aria-hidden />
      </button>
      {multi && (
        <span className="self-center whitespace-nowrap pl-1 text-[9px] text-white/30">
          {t.stripMulti}
        </span>
      )}
    </div>
  );
}

// ---- setup wizard (foundations, step by step) ----------------------------------
// 6 short steps (no scroll-to-fill), each one decision; steps 1/3/4/5 are
// skippable. The system visibly BUILDS via FOUNDATION_STEPS theater.

export function ProjectSetup({
  lang,
  onCreated,
  onCancel,
  cancelable,
}: {
  lang: Lang;
  onCreated: (p: SessionProjectLite) => void;
  onCancel: () => void;
  cancelable: boolean;
}) {
  const t = WIZARD[lang];
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [description, setDescription] = useState("");   // one-line pitch (optional)
  const [kind, setKind] = useState("app");
  const [brandingNotes, setBrandingNotes] = useState(""); // tone/colors/refs (optional)
  const [needs, setNeeds] = useState<string[]>([]);     // business-need ids
  const [devStackOpen, setDevStackOpen] = useState(false); // collapsed by default
  const [devStack, setDevStack] = useState("");          // free-form (parsed on submit)
  const [vision, setVision] = useState("");              // the "what & why" pitch
  const [palette, setPalette] = useState<string[]>([]);  // brand colors (seeded from kind)
  // NB: logo/visual identity moved OUT of this wizard — it's now the first step
  // of the Branding tab (upload OR generate). The wizard ends at colors.
  // building = staged foundation sequence; doneIdx advances one line at a time
  const [building, setBuilding] = useState(false);
  const [doneIdx, setDoneIdx] = useState(-1);
  const [failed, setFailed] = useState(false);

  const STEPS = t.foundationSteps;
  const STEP_TITLES = t.stepTitles;
  const TOTAL_STEPS = STEP_TITLES.length;

  const toggleNeed = (id: string) =>
    setNeeds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Seed the palette from the chosen kind the first time the colors step opens
  // (and only if the visitor hasn't set anything yet, so we never stomp edits).
  useEffect(() => {
    if (step === 6 && palette.length === 0) {
      setPalette(DEFAULT_PALETTE[kind] ?? FALLBACK_PALETTE);
    }
  }, [step, kind, palette.length]);

  const setColorAt = (i: number, color: string) =>
    setPalette((prev) => prev.map((c, idx) => (idx === i ? color : c)));
  const removeColorAt = (i: number) =>
    setPalette((prev) => prev.filter((_, idx) => idx !== i));
  const addColor = () =>
    setPalette((prev) => (prev.length < 5 ? [...prev, "#22d3ee"] : prev));

  // Compose the labeled brief the agent reads from `concept`. Each block is
  // optional; we only emit lines for fields the visitor actually filled.
  // The schema caps concept at 1200 chars — we keep each block tight.
  function buildConcept(): string {
    const blocks: string[] = [];
    if (description.trim()) {
      blocks.push(`[Pitch]: ${description.trim()}`);
    }
    if (brandingNotes.trim()) {
      blocks.push(`[ADN/branding]: ${brandingNotes.trim()}`);
    }
    if (needs.length > 0) {
      const labels = needs
        .map((id) => BUSINESS_NEEDS.find((n) => n.id === id)?.labels[lang])
        .filter((l): l is string => Boolean(l));
      if (labels.length > 0) {
        blocks.push(`[Necesidades]: ${labels.join(", ")}`);
      }
    }
    if (vision.trim()) {
      blocks.push(`[Concepto]: ${vision.trim()}`);
    }
    return blocks.join("\n\n").slice(0, 1200);
  }

  // the build sequence: lines check off on a beat while the request runs;
  // completion waits for BOTH (the theater never lies about being done)
  useEffect(() => {
    if (!building) return;
    let cancelled = false;
    let created: SessionProjectLite | null = null;

    const request = fetch("/api/assistant/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() ?? "" },
      body: JSON.stringify({
        name: name.trim(),
        kind,
        concept: buildConcept() || undefined,
        stack: parseStackList(devStack),
        palette: palette.length > 0 ? palette : undefined,
        lead:
          leadName.trim() || leadCompany.trim() || leadEmail.trim()
            ? {
                name: leadName.trim() || undefined,
                company: leadCompany.trim() || undefined,
                email: leadEmail.trim() || undefined,
              }
            : undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.project) created = data.project as SessionProjectLite;
      })
      .catch(() => undefined);

    const timers = STEPS.map((_, i) =>
      setTimeout(() => !cancelled && setDoneIdx(i), 650 * (i + 1)),
    );
    const finish = setTimeout(() => {
      void request.then(() => {
        if (cancelled) return;
        if (created) onCreated(created);
        else {
          setFailed(true);
          setBuilding(false);
          setDoneIdx(-1);
        }
      });
    }, 650 * STEPS.length + 400);

    return () => {
      cancelled = true;
      [...timers, finish].forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building]);

  const stepTitle = STEP_TITLES[step];
  // Steps the visitor may skip without filling anything (everything except
  // name + kind, which the server needs to actually create a project).
  const SKIPPABLE = new Set([1, 3, 4, 5, 6]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.06] to-transparent p-5"
    >
      {building ? (
        /* ---- the system builds, visibly ---- */
        <div className="py-4">
          <p className="text-sm font-bold text-white">
            {t.buildTitle(name.trim())}
          </p>
          <div className="mt-4 space-y-2.5">
            {STEPS.map((label, i) => {
              const done = i <= doneIdx;
              const active = i === doneIdx + 1;
              return (
                <div key={label} className="flex items-center gap-2.5 text-xs">
                  {done ? (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-emerald-300"
                    >
                      ✓
                    </motion.span>
                  ) : active ? (
                    <motion.span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <span className="inline-block h-3 w-3 rounded-full border border-white/15" />
                  )}
                  <span className={done ? "text-white/80" : active ? "text-cyan-200" : "text-white/30"}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* header + step dots */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">{t.headerTitle}</p>
            <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-5 bg-cyan-400" : i < step ? "w-1.5 bg-cyan-400/50" : "w-1.5 bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-0.5 text-[11px] text-white/50">{t.headerSub}</p>
          {failed && (
            <p className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[11px] text-red-200">
              {t.failed}
            </p>
          )}

          <p className="mt-4 text-xs font-semibold text-cyan-200">{stepTitle}</p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18 }}
            >
              {step === 0 && (
                <div className="mt-3 space-y-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.phName}
                    maxLength={80}
                    autoFocus
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder={lang === "es" ? "Tu nombre" : "Your name"}
                      maxLength={120}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-400/50"
                    />
                    <input
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      placeholder={lang === "es" ? "Empresa" : "Company"}
                      maxLength={160}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-400/50"
                    />
                    <input
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={200}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-400/50"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <>
                  <p className="mt-2 text-[11px] text-white/45">{t.pitchHint}</p>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.phPitch}
                    maxLength={140}
                    autoFocus
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                </>
              )}

              {step === 2 && (
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {Object.entries(KIND_META).map(([k, m]) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      aria-pressed={kind === k}
                      className={`rounded-xl border px-2.5 py-2.5 text-left text-[11px] transition-colors ${
                        kind === k
                          ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-200"
                          : "border-white/15 text-white/55 hover:text-white/80"
                      }`}
                    >
                      <span className="text-base" aria-hidden>{m.icon}</span>
                      <span className="ml-1.5">{(KIND_META_LABELS[lang] ?? KIND_META_LABELS.en)[k] ?? k}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <>
                  <p className="mt-2 text-[11px] text-white/45">{t.adnHint}</p>
                  <textarea
                    value={brandingNotes}
                    onChange={(e) => setBrandingNotes(e.target.value)}
                    placeholder={t.adnPlaceholder}
                    maxLength={400}
                    rows={3}
                    autoFocus
                    className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-cyan-400/60"
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <p className="mt-2 text-[11px] text-white/45">{t.needsHint}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {BUSINESS_NEEDS.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => toggleNeed(n.id)}
                        aria-pressed={needs.includes(n.id)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                          needs.includes(n.id)
                            ? "border-violet-400/70 bg-violet-400/15 text-violet-200"
                            : "border-white/15 text-white/55 hover:text-white/80"
                        }`}
                      >
                        <span aria-hidden className="mr-1">{n.icon}</span>
                        {n.labels[lang]}
                      </button>
                    ))}
                  </div>

                  {/* dev-only escape hatch — collapsed by default, fully optional */}
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setDevStackOpen((v) => !v)}
                      aria-expanded={devStackOpen}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-white/55 hover:text-white/80"
                    >
                      <span>
                        <span className="mr-1.5" aria-hidden>🛠</span>
                        {t.devTitle}
                      </span>
                      <span aria-hidden className={`transition-transform ${devStackOpen ? "rotate-90" : ""}`}>›</span>
                    </button>
                    {devStackOpen && (
                      <div className="px-3 pb-3">
                        <p className="text-[10px] text-white/40">{t.devHint}</p>
                        <textarea
                          value={devStack}
                          onChange={(e) => setDevStack(e.target.value)}
                          placeholder={t.devPlaceholder}
                          maxLength={400}
                          rows={2}
                          autoFocus
                          className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white/85 outline-none focus:border-cyan-400/40"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <p className="mt-2 text-[11px] text-white/45">{t.visionHint}</p>
                  <textarea
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    placeholder={t.visionPh}
                    maxLength={800}
                    rows={4}
                    autoFocus
                    className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-cyan-400/60"
                  />
                </>
              )}

              {step === 6 && (
                <>
                  <p className="mt-2 text-[11px] text-white/45">{t.paletteHint}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {palette.map((c, i) => (
                      <div key={i} className="group relative">
                        <input
                          type="color"
                          value={c}
                          onChange={(e) => setColorAt(i, e.target.value)}
                          aria-label={`Color ${i + 1}`}
                          className="h-10 w-10 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0"
                        />
                        {palette.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColorAt(i)}
                            aria-label="Remove color"
                            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-black text-[10px] text-white/60 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {palette.length < 5 && (
                      <button
                        type="button"
                        onClick={addColor}
                        aria-label="Add color"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 text-lg text-white/40 transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
                      >
                        +
                      </button>
                    )}
                  </div>
                  {palette.length > 0 && (
                    <div className="mt-3 flex gap-1 overflow-hidden rounded-full">
                      {palette.map((c, i) => (
                        <span key={i} className="h-2 flex-1" style={{ background: c }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* wizard controls */}
          <div className="mt-4 flex items-center gap-2">
            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !name.trim()}
                className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300 disabled:opacity-40"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={() => {
                  setFailed(false);
                  setDoneIdx(-1);
                  setBuilding(true);
                }}
                disabled={!name.trim()}
                className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300 disabled:opacity-40"
              >
                {t.create}
              </button>
            )}
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="text-xs text-white/50 hover:text-white">
                {t.back}
              </button>
            )}
            {SKIPPABLE.has(step) && (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="ml-auto text-[11px] text-white/40 hover:text-white/70"
              >
                {t.skip}
              </button>
            )}
            {cancelable && step === 0 && (
              <button onClick={onCancel} className="ml-auto text-xs text-white/50 hover:text-white">
                {t.cancel}
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// Localized labels for the 6 project kinds (used in the step-2 grid).
// Kept here (instead of in the dict) because they're also exposed as `kind`
// values in the database — moving them to the dict would decouple the
// visible string from the canonical id, which we don't want.
const KIND_META_LABELS: Record<Lang, Record<string, string>> = {
  en: { app: "App móvil", web: "Web", ecommerce: "E-commerce", agent: "AI Agent", saas: "SaaS", brand: "Brand" },
  es: { app: "App móvil", web: "Web", ecommerce: "E-commerce", agent: "Agente IA", saas: "SaaS", brand: "Marca" },
  pt: { app: "App móvel", web: "Web", ecommerce: "E-commerce", agent: "Agente IA", saas: "SaaS", brand: "Marca" },
  fr: { app: "App mobile", web: "Web", ecommerce: "E-commerce", agent: "Agent IA", saas: "SaaS", brand: "Marque" },
  ru: { app: "Приложение", web: "Веб", ecommerce: "E-commerce", agent: "ИИ-агент", saas: "SaaS", brand: "Бренд" },
  zh: { app: "移动应用", web: "网站", ecommerce: "电商", agent: "AI 智能体", saas: "SaaS", brand: "品牌" },
  ar: { app: "تطبيق جوال", web: "ويب", ecommerce: "تجارة إلكترونية", agent: "وكيل ذكاء اصطناعي", saas: "SaaS", brand: "علامة" },
  he: { app: "אפליקציה", web: "ווב", ecommerce: "איקומרס", agent: "סוכן AI", saas: "SaaS", brand: "מותג" },
  ja: { app: "モバイルアプリ", web: "ウェブ", ecommerce: "EC", agent: "AIエージェント", saas: "SaaS", brand: "ブランド" },
  ko: { app: "모바일 앱", web: "웹", ecommerce: "이커머스", agent: "AI 에이전트", saas: "SaaS", brand: "브랜드" },
  hi: { app: "मोबाइल ऐप", web: "वेब", ecommerce: "ई-कॉमर्स", agent: "AI एजेंट", saas: "SaaS", brand: "ब्रांड" },
};

// ---- branding board ------------------------------------------------------------

export function BrandingBoard({
  project,
  lang,
  onGenerate,
}: {
  project: SessionProjectLite;
  lang: Lang;
  onGenerate: (prompt: string) => void;
}) {
  const t = WIZARD[lang];
  const palette = project.palette.length > 0 ? project.palette : ["#00e5ff", "#8b5cf6", "#0a0a14"];
  // Localization hook for the future: when BrandingBoard generates a prompt
  // it now uses lang to pick the right wording (was hardcoded EN/ES).
  const generatePrompt = (name: string, lang: Lang): string => {
    const prompts: Record<Lang, string> = {
      en: `Generate a visual mood concept for "${name}" using its palette and concept`,
      es: `Generá un concepto visual de mood para "${name}" usando su paleta y concepto`,
      pt: `Gere um conceito visual de mood para "${name}" usando a paleta e o conceito`,
      fr: `Génère un concept visuel de mood pour "${name}" en utilisant sa palette et son concept`,
      ru: `Сгенерируй визуальный mood-концепт для «${name}» на основе его палитры и концепции`,
      zh: `用它的调色板和概念，为「${name}」生成一个视觉情绪概念`,
      ar: `ولّد مفهوماً بصرياً للمزاج لـ «${name}» باستخدام لوحة ألوانه ومفهومه`,
      he: `צרו קונספט ויזואלי של mood עבור "${name}" על בסיס הפלטה והקונספט שלו`,
      ja: `「${name}」のパレットとコンセプトを使ってビジュアルのムードコンセプトを生成して`,
      ko: `"${name}"의 팔레트와 컨셉을 사용해 비주얼 무드 컨셉을 생성해줘`,
      hi: `"${name}" के पैलेट और कॉन्सेप्ट का उपयोग करके एक विज़ुअल मूड कॉन्सेप्ट बनाओ`,
    };
    return prompts[lang] ?? prompts.en;
  };
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-black/50 text-sm font-bold"
        style={{ color: palette[0] }}
      >
        {project.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          // fallback: emoji derived from the project's kind — never the
          // initial of the name (we want a recognizable visual cue, not a
          // letter that overlaps with another project starting with the same letter)
          <span aria-hidden className="text-base">
            {KIND_META[project.kind]?.icon ?? "🧩"}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{project.name}</p>
        <div className="mt-1 flex gap-1">
          {palette.slice(0, 6).map((c, i) => (
            <span
              key={i}
              title={c}
              className="h-3.5 w-6 rounded-sm border border-white/10"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => onGenerate(generatePrompt(project.name, lang))}
        className="shrink-0 rounded-full border border-violet-400/50 px-3 py-1.5 text-[11px] font-semibold text-violet-200 transition-colors hover:bg-violet-400/10"
      >
        ✨ {t.generate}
      </button>
    </div>
  );
}
