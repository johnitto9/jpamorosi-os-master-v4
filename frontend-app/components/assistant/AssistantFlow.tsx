"use client";

// components/assistant/AssistantFlow.tsx
// The guided-flow UI (Fases 2b-3) that the phase state machine drives inside
// the chat panel:
//   PhaseCreatedCard  (phase=created)   preset turn + "Generate branding" CTA —
//                                       NO LLM call; it derives to the Branding tab.
//   BrandingPointer   (project room,    the project is being branded elsewhere;
//                      phase=branding)  one button to jump there.
//   BrandingEmptyGate (branding tab,    branding only works ON a project — a
//                      no project)      single "start a project" derivation.
//   BrandingWizard    (branding tab,    the 3-step visual universe: logo →
//                      phase=branding)  representative → storyboard, each one
//                                       upload OR generate (Seedream) + brief.
//   DecisionsBoard    (phase=decisions) preset decision cards (no jargon) that
//                                       persist as StackDecisions + consolidate.
//   GenerationBoard   (consolidated+)   map / home (plan-driven) / screens ≤9.
//
// All chrome strings live in FLOW[lang] (lib/i18n/dictionaries.ts, 7 langs).
// Persistence reuses T05 (assets with roles, stack decisions, VisualPlan).

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FLOW, type Lang } from "@/lib/i18n/dictionaries";
import { AssistantMessage } from "./AssistantMessage";
import type { SessionProjectLite } from "./AssistantProjectOrbit";

const refreshVault = () => window.dispatchEvent(new CustomEvent("al-workspace-refresh"));

// ---- phase=created: the preset derivation card (2b) --------------------------

export function PhaseCreatedCard({
  project,
  lang,
  onStartBranding,
}: {
  project: SessionProjectLite;
  lang: Lang;
  onStartBranding: () => void;
}) {
  const t = FLOW[lang];
  return (
    <div className="flex min-h-full flex-col justify-center gap-3">
      <AssistantMessage turn={{ role: "assistant", content: t.createdMsg(project.name) }} />
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        onClick={onStartBranding}
        className="self-start rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
      >
        {t.createdCta}
      </motion.button>
    </div>
  );
}

// ---- project room while phase=branding: pointer to the Branding tab ----------

export function BrandingPointer({ lang, onGo }: { lang: Lang; onGo: () => void }) {
  const t = FLOW[lang];
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <p className="max-w-sm text-sm text-white/60">{t.brandingInProgress}</p>
      <button
        onClick={onGo}
        className="rounded-full border border-violet-400/50 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/10"
      >
        {t.brandingGo}
      </button>
    </div>
  );
}

// ---- branding tab with no project: single derivation ------------------------

export function BrandingEmptyGate({ lang, onStart }: { lang: Lang; onStart: () => void }) {
  const t = FLOW[lang];
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <p className="max-w-sm text-sm text-white/60">{t.brandingNoProject}</p>
      <button
        onClick={onStart}
        className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
      >
        {t.brandingStart}
      </button>
    </div>
  );
}

// ---- branding tab once phase > branding: done + way back --------------------

export function BrandingDone({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const t = FLOW[lang];
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <p className="max-w-sm text-sm text-white/60">{t.brandingDoneMsg}</p>
      <button
        onClick={onBack}
        className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300"
      >
        {t.backToRoom}
      </button>
    </div>
  );
}

// ---- the branding multistep (2c) ---------------------------------------------

type FlowAsset = { id: number; role: string; url: string | null };
const B_ROLES = ["logo", "reference", "storyboard"] as const;

export function BrandingWizard({
  project,
  lang,
  onComplete,
}: {
  project: SessionProjectLite;
  lang: Lang;
  /** all three assets exist -> the widget advances phase to `decisions` */
  onComplete: () => void;
}) {
  const t = FLOW[lang];
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState("");
  // latest asset per role (resume support: reload finds what already exists)
  const [byRole, setByRole] = useState<Record<string, FlowAsset | null>>({});
  const [busy, setBusy] = useState<"upload" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);

  const role = B_ROLES[step];
  const current = byRole[role] ?? null;

  const loadExisting = useCallback(async () => {
    try {
      const res = await fetch(`/api/assistant/workspace?projectId=${project.id}`);
      const data = await res.json();
      const assets: FlowAsset[] = data?.workspace?.assets ?? [];
      const map: Record<string, FlowAsset | null> = {};
      for (const r of B_ROLES) map[r] = assets.find((a) => a.role === r && a.url) ?? null;
      setByRole(map);
      // resume at the first missing step
      const firstMissing = B_ROLES.findIndex((r) => !map[r]);
      setStep(firstMissing === -1 ? B_ROLES.length - 1 : firstMissing);
    } catch {
      /* offline — wizard starts at step 0 */
    }
  }, [project.id]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  async function persist(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch("/api/assistant/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, role, brief: brief.trim() || undefined, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError(t.bLimit);
        return false;
      }
      if (!res.ok || !data?.asset) {
        setError(t.bFail);
        return false;
      }
      setByRole((prev) => ({ ...prev, [role]: data.asset as FlowAsset }));
      refreshVault();
      return true;
    } catch {
      setError(t.bFail);
      return false;
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/assistant/upload", { method: "POST", body: fd });
      const data = await up.json().catch(() => ({}));
      if (!up.ok || !data?.url) {
        setError(t.bFail);
        return;
      }
      await persist({ uploadUrl: data.url });
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy("generate");
    try {
      await persist({});
    } finally {
      setBusy(null);
    }
  }

  function next() {
    setBrief("");
    setError(null);
    if (step < B_ROLES.length - 1) {
      setStep((s) => s + 1);
    } else if (!completedRef.current) {
      completedRef.current = true; // belt: never advance the phase twice
      onComplete();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-400/[0.06] to-transparent p-5"
    >
      {/* header + step dots (same language as ProjectSetup) */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{t.bTitle}</p>
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${B_ROLES.length}`}>
          {B_ROLES.map((r, i) => (
            <span
              key={r}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-violet-400" : byRole[r] ? "w-1.5 bg-violet-400/50" : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-violet-200">
        {step + 1}/3 · {t.bStepTitles[step]}
      </p>
      <p className="mt-1 text-[11px] text-white/45">{t.bStepHints[step]}</p>

      {/* preview (generated/uploaded asset for THIS step) */}
      {current?.url && (
        <div className={`mt-3 overflow-hidden rounded-xl border border-white/15 ${role === "logo" ? "h-40 w-40" : "aspect-video w-full"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={role} className="h-full w-full object-cover" />
        </div>
      )}

      {busy === "generate" && (
        <p className="mt-3 animate-pulse text-xs text-violet-200">{t.bGenerating}</p>
      )}
      {busy === "upload" && (
        <p className="mt-3 animate-pulse text-xs text-cyan-200">…</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[11px] text-red-200">
          {error}
        </p>
      )}

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={t.bBriefPh}
        maxLength={400}
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-violet-400/60"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-40"
        >
          📎 {t.bUpload}
        </button>
        <button
          onClick={() => void generate()}
          disabled={busy !== null}
          className="rounded-full bg-violet-400 px-4 py-2 text-xs font-semibold text-black hover:bg-violet-300 disabled:opacity-40"
        >
          {current ? t.bRedo : t.bGenerate}
        </button>
        {current && (
          <button
            onClick={next}
            disabled={busy !== null}
            className="ml-auto rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300 disabled:opacity-40"
          >
            {step < B_ROLES.length - 1 ? t.bUseIt : t.backToRoom}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---- decisions phase (2d): preset cards, no jargon ---------------------------
// Deterministic-first (works without the LLM); the agent can ALSO push richer
// propose_decisions cards through the chat. Same write path for both:
// POST /api/assistant/decisions -> StackDecision(source user, confirmed).

const DECISION_PRESETS: Array<{
  id: string;
  question: Record<Lang, string>;
  options: Array<{ id: string; label: Record<Lang, string> }>;
}> = [
  {
    id: "priority",
    question: {
      en: "What do we prioritize first?", es: "¿Qué priorizamos primero?", pt: "O que priorizamos primeiro?",
      fr: "Que priorise-t-on d'abord ?", ru: "Что приоритетнее сначала?", zh: "我们先优先什么？", ar: "ما الذي نضعه أولاً؟",
    },
    options: [
      { id: "mvp", label: { en: "Launch fast (MVP)", es: "Lanzar rápido (MVP)", pt: "Lançar rápido (MVP)", fr: "Lancer vite (MVP)", ru: "Быстрый запуск (MVP)", zh: "快速上线 (MVP)", ar: "إطلاق سريع (MVP)" } },
      { id: "polish", label: { en: "Polished experience", es: "Experiencia pulida", pt: "Experiência polida", fr: "Expérience soignée", ru: "Отточенный опыт", zh: "打磨体验", ar: "تجربة مصقولة" } },
      { id: "scale", label: { en: "Scale from day 1", es: "Escalar desde el día 1", pt: "Escalar desde o dia 1", fr: "Scaler dès le jour 1", ru: "Масштаб с первого дня", zh: "从第一天就可扩展", ar: "توسّع من اليوم الأول" } },
    ],
  },
  {
    id: "platform",
    question: {
      en: "Where does it live?", es: "¿Dónde vive el producto?", pt: "Onde o produto vive?",
      fr: "Où vit le produit ?", ru: "Где живёт продукт?", zh: "产品在哪里运行？", ar: "أين يعيش المنتج؟",
    },
    options: [
      { id: "web", label: { en: "Web", es: "Web", pt: "Web", fr: "Web", ru: "Веб", zh: "网页", ar: "ويب" } },
      { id: "mobile", label: { en: "Mobile app", es: "App móvil", pt: "App móvel", fr: "App mobile", ru: "Мобильное приложение", zh: "移动 App", ar: "تطبيق جوال" } },
      { id: "both", label: { en: "Both", es: "Ambos", pt: "Ambos", fr: "Les deux", ru: "Оба", zh: "两者", ar: "كلاهما" } },
    ],
  },
  {
    id: "integrations",
    question: {
      en: "What's the critical connection?", es: "¿Cuál es la conexión crítica?", pt: "Qual é a conexão crítica?",
      fr: "Quelle est la connexion critique ?", ru: "Какая интеграция критична?", zh: "关键的对接是什么？", ar: "ما هو الربط الحاسم؟",
    },
    options: [
      { id: "payments", label: { en: "Payments", es: "Pagos", pt: "Pagamentos", fr: "Paiements", ru: "Платежи", zh: "支付", ar: "مدفوعات" } },
      { id: "messaging", label: { en: "Email / notifications", es: "Email / notificaciones", pt: "Email / notificações", fr: "Email / notifications", ru: "Email / уведомления", zh: "邮件 / 通知", ar: "بريد / إشعارات" } },
      { id: "ai", label: { en: "AI / automation", es: "IA / automatización", pt: "IA / automação", fr: "IA / automatisation", ru: "ИИ / автоматизация", zh: "AI / 自动化", ar: "ذكاء اصطناعي / أتمتة" } },
    ],
  },
];

export function DecisionsBoard({
  project,
  lang,
  onConsolidate,
}: {
  project: SessionProjectLite;
  lang: Lang;
  onConsolidate: () => void;
}) {
  const t = FLOW[lang];
  // categories already decided (either here or by the agent) don't re-ask
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assistant/workspace?projectId=${project.id}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Array<{ category: string; option: string }> = d?.workspace?.stackDecisions ?? [];
        const map: Record<string, string> = {};
        for (const dec of list) if (!map[dec.category]) map[dec.category] = dec.option;
        setDecided(map);
      })
      .catch(() => undefined);
  }, [project.id]);

  async function pick(category: string, option: string) {
    if (saving) return;
    setSaving(category);
    try {
      const res = await fetch("/api/assistant/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, category, option }),
      });
      if (res.ok) {
        setDecided((prev) => ({ ...prev, [category]: option }));
        refreshVault();
      }
    } finally {
      setSaving(null);
    }
  }

  const open = DECISION_PRESETS.filter((d) => !decided[d.id]);
  const allDone = open.length === 0;

  return (
    <div className="space-y-3">
      <AssistantMessage turn={{ role: "assistant", content: t.dIntro }} />
      {DECISION_PRESETS.map((d) => {
        const picked = decided[d.id];
        return (
          <div
            key={d.id}
            className={`rounded-2xl border p-3.5 ${picked ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/15 bg-white/[0.03]"}`}
          >
            <p className="text-xs font-semibold text-white">
              {picked ? "✓ " : ""}
              {d.question[lang]}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.options.map((o) => {
                const on = picked === o.label[lang];
                return (
                  <button
                    key={o.id}
                    onClick={() => void pick(d.id, o.label[lang])}
                    disabled={!!picked || saving === d.id}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      on
                        ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200"
                        : picked
                          ? "border-white/10 text-white/30"
                          : "border-white/15 text-white/70 hover:border-cyan-400/50 hover:text-cyan-200"
                    }`}
                  >
                    {o.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {allDone && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onConsolidate}
          className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
        >
          {t.dConsolidate}
        </motion.button>
      )}
    </div>
  );
}

// ---- generation board (Fase 3): map / home / screens -------------------------

export function GenerationBoard({
  project,
  lang,
  onPhase,
}: {
  project: SessionProjectLite;
  lang: Lang;
  /** the server may advance the phase (generating/ready) — sync the orbit */
  onPhase: (phase: string) => void;
}) {
  const t = FLOW[lang];
  const [busy, setBusy] = useState<string | null>(null);
  const [homeProgress, setHomeProgress] = useState<{ done: number; planned: number } | null>(null);
  const [screenBrief, setScreenBrief] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function generate(body: Record<string, unknown>): Promise<{ phase?: string; planned?: number; done?: number; error?: string } | null> {
    setNotice(null);
    try {
      const res = await fetch("/api/assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setNotice(t.gLimit);
        return { error: data?.error ?? "limit" };
      }
      if (!res.ok) {
        setNotice(t.bFail);
        return null;
      }
      refreshVault();
      if (typeof data.phase === "string") onPhase(data.phase);
      return data;
    } catch {
      setNotice(t.bFail);
      return null;
    }
  }

  async function runMap() {
    setBusy("map");
    try {
      await generate({ target: "map" });
    } finally {
      setBusy(null);
    }
  }

  // the home renders IMAGE BY IMAGE (incremental persistence: a timeout can't
  // lose finished work); progress shows n/planned while the loop runs
  async function runHome() {
    setBusy("home");
    try {
      for (let i = 0; i < 6; i++) {
        const res = await generate({ target: "home" });
        if (!res || res.error) break;
        if (typeof res.done === "number" && typeof res.planned === "number") {
          setHomeProgress({ done: res.done, planned: res.planned });
          if (res.done >= res.planned) break;
        } else break;
      }
    } finally {
      setBusy(null);
    }
  }

  async function runScreen() {
    setBusy("screen");
    try {
      const res = await generate({ target: "screen", brief: screenBrief.trim() || undefined });
      if (res && !res.error) setScreenBrief("");
    } finally {
      setBusy(null);
    }
  }

  const ready = project.phase === "ready";
  return (
    <div className="space-y-3">
      <AssistantMessage
        turn={{ role: "assistant", content: ready ? t.gReadyMsg : t.gIntro }}
      />
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void runMap()}
            disabled={busy !== null}
            className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-40"
          >
            {busy === "map" ? t.gWorking : t.gMap}
          </button>
          <button
            onClick={() => void runHome()}
            disabled={busy !== null}
            className="rounded-full border border-violet-400/50 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/10 disabled:opacity-40"
          >
            {busy === "home"
              ? `${t.gWorking}${homeProgress ? ` ${homeProgress.done}/${homeProgress.planned}` : ""}`
              : t.gHome}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={screenBrief}
            onChange={(e) => setScreenBrief(e.target.value)}
            placeholder={t.gScreenPh}
            maxLength={200}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400/60"
          />
          <button
            onClick={() => void runScreen()}
            disabled={busy !== null}
            className="shrink-0 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/85 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-40"
          >
            {busy === "screen" ? t.gWorking : t.gScreens}
          </button>
        </div>
        {busy !== null && (
          <p className="mt-2 animate-pulse text-[11px] text-white/45">{FLOW[lang].bGenerating}</p>
        )}
        {notice && <p className="mt-2 text-[11px] text-amber-200">{notice}</p>}
      </div>
    </div>
  );
}
