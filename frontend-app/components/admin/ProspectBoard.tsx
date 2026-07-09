"use client";

// components/admin/ProspectBoard.tsx
// Client half of /admin/prospects: the kanban itself.
// - columns mirror the pipeline stages; cards carry what each stage produced
//   (snippet -> enrichment -> score + fit + next action);
// - the intake bar accepts pasted text AND drag&drop of .eml/.txt files —
//   both feed the same ingest mouth as the scout;
// - "Advance pipeline" runs a bounded batch server-side and the board
//   refreshes in place, so you SEE the cards rotate;
// - click a card to open the detail drawer (full enrichment + raw + the
//   manual moves the admin is allowed to make, including "Promote to lead"
//   which closes the loop with the inbound funnel via /api/admin/leads).

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Prospect = {
  id: number;
  stage: string;
  source: string;
  title: string | null;
  company: string | null;
  contactName: string | null;
  email: string | null;
  url: string | null;
  snippet: string | null;
  enrichment: string | null;
  fitReason: string | null;
  nextAction: string | null;
  score: number;
  updatedAt: string;
};

type ProspectStats = {
  total: number;
  byStage: Record<string, number>;
  withEmail: number;
  readyToContact: number;
  highScore: number;
  rawIngest: number;
};

type ManualLeadForm = {
  leadType: "company" | "person" | "recruiter" | "founder" | "agency" | "other";
  company: string;
  contactName: string;
  email: string;
  url: string;
  title: string;
  need: string;
  source: string;
  notes: string;
};

const EMPTY_MANUAL_LEAD: ManualLeadForm = {
  leadType: "company",
  company: "",
  contactName: "",
  email: "",
  url: "",
  title: "",
  need: "",
  source: "",
  notes: "",
};

const COLUMNS: Array<{ stage: string; label: string; hint: string; color: string }> = [
  { stage: "ingest", label: "Ingesta", hint: "preview acotado", color: "rgba(255,255,255,0.4)" },
  { stage: "filter", label: "Filtrado", hint: "pasó la red", color: "#f0a500" },
  { stage: "enrich", label: "Enriquecido", hint: "búsqueda fina", color: "#8b5cf6" },
  { stage: "qualify", label: "Calificado", hint: "score + fit", color: "#00f2ff" },
  { stage: "contact", label: "Contactar 🎯", hint: "listos para salir", color: "#34d399" },
];

function ScoreRing({ score }: { score: number }) {
  const hue = score >= 70 ? "#34d399" : score >= 55 ? "#00f2ff" : "#f0a500";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold"
      style={{ borderColor: `${hue}90`, color: hue }}
      title={`fit score ${score}/100`}
    >
      {score}
    </span>
  );
}

function Card({
  p,
  onStage,
  onOpen,
}: {
  p: Prospect;
  onStage: (id: number, stage: string) => void;
  onOpen: (p: Prospect) => void;
}) {
  const contacted = p.stage === "contacted";
  // Whole card opens the drawer; the inline buttons stop propagation
  // so they keep their current behavior (mailto / mark / discard).
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: contacted ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={() => onOpen(p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(p);
        }
      }}
      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-cyan-400/40 focus:border-cyan-400/60 focus:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {contacted && <span className="mr-1 text-emerald-300">✓</span>}
            {p.company || p.title || "—"}
          </p>
          {p.company && p.title && (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/45">{p.title}</p>
          )}
        </div>
        {(p.stage === "qualify" || p.stage === "contact" || contacted) && (
          <ScoreRing score={p.score} />
        )}
      </div>

      {/* what the current stage knows */}
      {p.stage === "ingest" && p.snippet && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-white/55">{p.snippet}</p>
      )}
      {(p.stage === "filter" || p.stage === "enrich") && (
        <p className="mt-1.5 line-clamp-3 text-xs leading-snug text-white/55">
          {p.enrichment || p.snippet}
        </p>
      )}
      {(p.stage === "qualify" || p.stage === "contact" || contacted) && (
        <>
          {p.fitReason && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-white/60">{p.fitReason}</p>
          )}
          {p.nextAction && (
            <p className="mt-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-1.5 text-[11px] leading-snug text-emerald-200">
              → {p.nextAction}
            </p>
          )}
        </>
      )}

      <div className="mt-2 flex items-center gap-2 text-[10px] text-white/35">
        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono uppercase">
          {p.source === "email_drop" ? "📩 drop" : "🕸 scout"}
        </span>
        {p.email && <span className="truncate text-cyan-300">{p.email}</span>}
        {p.url && (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:text-cyan-300"
          >
            {p.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}…
          </a>
        )}
      </div>

      {/* manual controls — the only human moves on this board */}
      <div className="mt-2 flex items-center justify-end gap-2">
        {p.stage === "contact" && (
          <>
            {p.email && (
              <a
                href={`mailto:${p.email}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-bold text-black hover:bg-emerald-300"
              >
                ✉ Escribir
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStage(p.id, "contacted");
              }}
              className="rounded-full border border-emerald-400/50 px-2.5 py-1 text-[10px] text-emerald-300 hover:bg-emerald-400/10"
            >
              Marcar contactado
            </button>
          </>
        )}
        {!contacted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStage(p.id, "discarded");
            }}
            aria-label="Discard prospect"
            className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/40 hover:border-red-400/40 hover:text-red-300"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-white/80">{children}</div>
    </div>
  );
}

function ProspectDrawer({
  p,
  onClose,
  onStage,
  onOutreach,
  onPromoted,
}: {
  p: Prospect | null;
  onClose: () => void;
  onStage: (id: number, stage: string) => void;
  onOutreach: (id: number) => Promise<{ ok: boolean; error?: string; skipped?: boolean }>;
  onPromoted: (prospectId: number, leadId: number) => void;
}) {
  const [promoting, setPromoting] = useState(false);
  const [promoteErr, setPromoteErr] = useState<string | null>(null);
  const [outreaching, setOutreaching] = useState(false);
  const [outreachErr, setOutreachErr] = useState<string | null>(null);

  // Escape closes the drawer (the keyboard shortcut the admin actually uses).
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, onClose]);

  // reset transient state when switching prospects
  useEffect(() => {
    setPromoting(false);
    setPromoteErr(null);
    setOutreaching(false);
    setOutreachErr(null);
  }, [p?.id]);

  if (!p) return null;

  const contacted = p.stage === "contacted" || p.stage === "discarded";
  const canPromote =
    !contacted &&
    Boolean(p.email || (p.company && (p.contactName || p.title)));

  async function promote() {
    if (!p || promoting) return;
    setPromoting(true);
    setPromoteErr(null);
    try {
      const body: Record<string, string> = {};
      if (p.contactName) body.name = p.contactName;
      if (p.email) body.email = p.email;
      if (p.company) body.company = p.company;
      if (p.snippet) body.need = p.snippet.slice(0, 400);
      if (p.url) body.notes = `Origen: prospect #${p.id} (${p.source}) — ${p.url}`;
      else if (p.title) body.notes = `Origen: prospect #${p.id} (${p.source}) — ${p.title}`;
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lead-source": `prospect:${p.id}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.id !== "number") {
        setPromoteErr(
          data?.error === "db_unavailable_or_empty"
            ? "DB no disponible o sin datos suficientes para crear el lead"
            : `Error ${res.status}: ${data?.error ?? "falló"}`,
        );
        return;
      }
      onPromoted(p.id, data.id);
      onClose();
    } finally {
      setPromoting(false);
    }
  }

  async function sendOutreach() {
    if (!p || outreaching) return;
    setOutreaching(true);
    setOutreachErr(null);
    try {
      const res = await onOutreach(p.id);
      if (!res.ok) {
        setOutreachErr(
          res.skipped
            ? "Email no enviado: Resend no está configurado en este entorno."
            : `Email no enviado: ${res.error ?? "falló el transporte"}`,
        );
      }
    } finally {
      setOutreaching(false);
    }
  }

  return (
    <AnimatePresence>
      {p && (
        // single root so framer-motion can drive the enter/exit as one unit;
        // backdrop and drawer slide together instead of fighting AnimatePresence
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del prospecto ${p.company ?? p.title ?? p.id}`}
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-white/10 bg-[#0a0a0c] shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Prospect #{p.id} · {p.source === "email_drop" ? "📩 drop" : "🕸 scout"}
                </p>
                <h2 className="mt-1 truncate text-xl font-bold text-white">
                  {p.company || p.title || "—"}
                </h2>
                {p.company && p.title && (
                  <p className="mt-0.5 truncate text-sm text-white/55">{p.title}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(p.stage === "qualify" || p.stage === "contact" || contacted) && (
                  <ScoreRing score={p.score} />
                )}
                <button
                  onClick={onClose}
                  aria-label="Cerrar detalle"
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/30"
                >
                  Cerrar ✕
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {p.url && (
                <DetailRow label="URL">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-cyan-300 hover:text-cyan-200"
                  >
                    {p.url}
                  </a>
                </DetailRow>
              )}
              {p.contactName && (
                <DetailRow label="Contacto">
                  <span>{p.contactName}</span>
                  {p.email && (
                    <>
                      {" · "}
                      <a href={`mailto:${p.email}`} className="text-cyan-300 hover:text-cyan-200">
                        {p.email}
                      </a>
                    </>
                  )}
                </DetailRow>
              )}
              {p.snippet && (
                <DetailRow label="Snippet original">
                  <p className="whitespace-pre-wrap">{p.snippet}</p>
                </DetailRow>
              )}
              {p.enrichment && (
                <DetailRow label="Enrichment (búsqueda fina)">
                  <p className="whitespace-pre-wrap text-white/75">{p.enrichment}</p>
                </DetailRow>
              )}
              {p.fitReason && (
                <DetailRow label="Fit">
                  <p>{p.fitReason}</p>
                </DetailRow>
              )}
              {p.nextAction && (
                <DetailRow label="Next action">
                  <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-emerald-200">
                    → {p.nextAction}
                  </p>
                </DetailRow>
              )}
              {!p.snippet && !p.enrichment && !p.fitReason && (
                <p className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-white/40">
                  Esta card todavía no tiene señal capturada — mové el pipeline para enriquecerla.
                </p>
              )}
            </div>

            <footer className="shrink-0 space-y-2 border-t border-white/10 bg-black/40 p-5">
              {promoteErr && (
                <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                  {promoteErr}
                </p>
              )}
              {outreachErr && (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  {outreachErr}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!contacted && (
                  <button
                    onClick={() => onStage(p.id, "discarded")}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-red-400/40 hover:text-red-300"
                  >
                    Descartar
                  </button>
                )}
                {p.stage === "contact" && !contacted && (
                  <>
                    {p.email && (
                      <button
                        onClick={sendOutreach}
                        disabled={outreaching}
                        className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {outreaching ? "Enviando…" : "Enviar outreach"}
                      </button>
                    )}
                    <button
                      onClick={() => onStage(p.id, "contacted")}
                      className="rounded-full border border-emerald-400/50 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/10"
                    >
                      Marcar contactado
                    </button>
                  </>
                )}
                <button
                  onClick={promote}
                  disabled={!canPromote || promoting}
                  title={
                    canPromote
                      ? "Crea un lead en el pipeline inbound (session_id NULL)"
                      : "Necesita email o empresa + nombre/título para promover"
                  }
                  className="rounded-full bg-cyan-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {promoting ? "Promoviendo…" : "Promover a lead →"}
                </button>
              </div>
              <p className="text-right text-[10px] text-white/30">
                Esc cierra · backdrop también · stage actual: <code className="text-white/50">{p.stage}</code>
              </p>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ProspectBoard() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dropText, setDropText] = useState("");
  const [manualLead, setManualLead] = useState<ManualLeadForm>(EMPTY_MANUAL_LEAD);
  const [dragOver, setDragOver] = useState(false);
  const [lastReport, setLastReport] = useState<string | null>(null);
  const [selected, setSelected] = useState<Prospect | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/prospects");
      const data = await res.json();
      if (Array.isArray(data?.prospects)) setProspects(data.prospects);
      if (data?.stats) setStats(data.stats as ProspectStats);
    } catch {
      /* board keeps last known state */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(body: Record<string, unknown>, label: string) {
    if (busy) return;
    setBusy(label);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (body.action === "process" && typeof data?.processed === "number") {
        setLastReport(
          data.processed > 0
            ? `Pipeline: ${data.processed} card${data.processed === 1 ? "" : "s"} avanzaron`
            : "Pipeline al día — nada para mover",
        );
      }
      if (body.action === "ingest" && data?.ok) {
        setDropText("");
        setManualLead(EMPTY_MANUAL_LEAD);
        setLastReport("Lead ingestado en la red 🕸");
      }
      if (body.action === "stage" && data?.ok) {
        // keep the drawer open on the same prospect if it's still on the board
        setLastReport("Estado actualizado");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  // fire a real serper sweep ON DEMAND (the worker's daily window is narrow;
  // this lets the admin see the dragnet actually fill + advance right now)
  async function runScout() {
    if (busy) return;
    setBusy("scout");
    try {
      const res = await fetch("/api/admin/scout-run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data?.prospects) {
        setLastReport(
          `Scout: ${data.prospects.ingested ?? 0} capturados · ${data.prospects.advanced ?? 0} avanzados`,
        );
      } else {
        setLastReport(`Scout: ${data?.skipped ?? data?.error ?? "sin resultados"}`);
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const onStage = (id: number, stage: string) => {
    // local optimistic update so the kanban moves immediately, then sync
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage, updatedAt: new Date().toISOString() } : p)),
    );
    // if the drawer was open on this prospect, mirror the change
    setSelected((cur) => (cur && cur.id === id ? { ...cur, stage } : cur));
    void act({ action: "stage", id, stage }, "stage");
  };

  const onOutreach = async (id: number): Promise<{ ok: boolean; error?: string; skipped?: boolean }> => {
    if (busy) return { ok: false, error: "busy" };
    setBusy("outreach");
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "outreach", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return {
          ok: false,
          error: typeof data?.error === "string" ? data.error : `HTTP ${res.status}`,
          skipped: data?.skipped === true,
        };
      }
      setProspects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, stage: "contacted", updatedAt: new Date().toISOString() } : p,
        ),
      );
      setSelected((cur) => (cur && cur.id === id ? { ...cur, stage: "contacted" } : cur));
      setLastReport("Outreach enviado con tracking · prospecto pasó a contactado");
      await refresh();
      return { ok: true };
    } finally {
      setBusy(null);
    }
  };

  const onPromoted = (prospectId: number, leadId: number) => {
    // mark the prospect contacted locally + tell the admin what happened
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, stage: "contacted", updatedAt: new Date().toISOString() } : p,
      ),
    );
    setLastReport(`Promovido a lead #${leadId} · el prospecto pasó a contactado`);
  };

  async function onDropFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !/\.(eml|txt|md)$/i.test(file.name)) return;
    const text = await file.text();
    void act({ action: "ingest", text: text.slice(0, 20000) }, "ingest");
  }

  function updateManualLead<K extends keyof ManualLeadForm>(key: K, value: ManualLeadForm[K]) {
    setManualLead((cur) => ({ ...cur, [key]: value }));
  }

  function manualLeadText() {
    return [
      "Manual prospect intake",
      `Lead type: ${manualLead.leadType}`,
      manualLead.company ? `Company: ${manualLead.company}` : "",
      manualLead.contactName ? `Contact name: ${manualLead.contactName}` : "",
      manualLead.email ? `Email: ${manualLead.email}` : "",
      manualLead.url ? `URL: ${manualLead.url}` : "",
      manualLead.title ? `Title: ${manualLead.title}` : "",
      manualLead.need ? `Need: ${manualLead.need}` : "",
      manualLead.source ? `Source: ${manualLead.source}` : "",
      manualLead.notes ? `Notes: ${manualLead.notes}` : "",
      dropText.trim() ? `Raw extra:\n${dropText.trim()}` : "",
    ].filter(Boolean).join("\n");
  }

  const canIngestManual =
    manualLead.email.trim().length > 4 ||
    manualLead.company.trim().length > 1 ||
    manualLead.contactName.trim().length > 1 ||
    manualLead.need.trim().length > 8 ||
    dropText.trim().length >= 10;

  const discarded = prospects.filter((p) => p.stage === "discarded").length;

  return (
    <div className="mt-6">
      {/* intake bar: paste or drop — same river as the scout */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onDropFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border p-4 transition-colors ${
          dragOver ? "border-emerald-400/70 bg-emerald-400/10" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              📩 Dropear un lead — intake estructurado o .eml/.txt
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Tipo
                <select
                  value={manualLead.leadType}
                  onChange={(e) => updateManualLead("leadType", e.target.value as ManualLeadForm["leadType"])}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60"
                >
                  <option value="company">Empresa</option>
                  <option value="person">Persona</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="founder">Founder</option>
                  <option value="agency">Agencia</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Empresa / organización
                <input value={manualLead.company} onChange={(e) => updateManualLead("company", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="Acme AI" />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Nombre
                <input value={manualLead.contactName} onChange={(e) => updateManualLead("contactName", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="Jane Doe" />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Email
                <input value={manualLead.email} onChange={(e) => updateManualLead("email", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="hello@company.com" />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                URL / fuente
                <input value={manualLead.url} onChange={(e) => updateManualLead("url", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="https://company.com/careers" />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Título / señal
                <input value={manualLead.title} onChange={(e) => updateManualLead("title", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="AI Ops role, founder intro, automation need..." />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Necesidad / oportunidad
                <input value={manualLead.need} onChange={(e) => updateManualLead("need", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="CRM manual, WhatsApp commerce, LLM workflow..." />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Fuente
                <input value={manualLead.source} onChange={(e) => updateManualLead("source", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="Scout, referral, LinkedIn, inbound..." />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-2">
                Notas internas
                <input value={manualLead.notes} onChange={(e) => updateManualLead("notes", e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case tracking-normal text-white outline-none focus:border-emerald-400/60" placeholder="Por qué vale la pena, contexto personal, riesgo..." />
              </label>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/35 md:col-span-4">
                Data extra / email pegado
                <textarea
                  value={dropText}
                  onChange={(e) => setDropText(e.target.value)}
                  rows={3}
                  placeholder="Pegá acá un email, snippet, job post, LinkedIn copy o cualquier contexto adicional."
                  className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs normal-case leading-relaxed tracking-normal text-white outline-none focus:border-emerald-400/60"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              Estos campos se serializan como texto estructurado y entran por el mismo pipeline que el scout.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:w-44 lg:pt-5">
            <button
              onClick={() => canIngestManual && act({ action: "ingest", text: manualLeadText() }, "ingest")}
              disabled={!!busy || !canIngestManual}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-40"
            >
              {busy === "ingest" ? "Ingestando…" : "🕸 Ingestar lead"}
            </button>
            <button
              onClick={() => act({ action: "process" }, "process")}
              disabled={!!busy}
              className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-40"
            >
              {busy === "process" ? "Procesando…" : "⚙ Avanzar pipeline"}
            </button>
            <button
              onClick={() => void runScout()}
              disabled={!!busy}
              className="rounded-full border border-violet-400/50 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-400/10 disabled:opacity-40"
              title="Corre una barrida de serper ahora (no espera al worker diario)"
            >
              {busy === "scout" ? "Buscando…" : "🛰 Correr scout"}
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
          <span>{lastReport ?? "El scout diario alimenta la ingesta solo; este botón corre un batch a demanda."}</span>
          {discarded > 0 && <span>{discarded} descartados visibles · el bruto vive en snapshot</span>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Total archive", stats?.total ?? prospects.length, "todo lo capturado"],
          ["Raw bag", stats?.rawIngest ?? 0, "no se renderiza completo"],
          ["With email", stats?.withEmail ?? 0, "posible outreach"],
          ["Ready", stats?.readyToContact ?? 0, "contactar ahora"],
          ["High score", stats?.highScore ?? 0, "score >= 70"],
          ["Cards", prospects.length, "board curado"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-[10px] text-white/35">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        <p className="text-xs text-white/45">
          El board muestra señales únicas accionables. La bolsa completa del scout se guarda como archivo para análisis masivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/prospects?format=jsonl&scope=all"
            download
            className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-400/10"
          >
            JSONL snapshot
          </a>
          <a
            href="/api/admin/prospects?format=csv&scope=all"
            download
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/65 hover:border-white/30"
          >
            Full CSV
          </a>
        </div>
      </div>

      {/* the kanban */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = prospects.filter((p) =>
            col.stage === "contact"
              ? p.stage === "contact" || p.stage === "contacted"
              : p.stage === col.stage,
          );
          return (
            <section key={col.stage} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <header className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: col.color }}>
                    {col.label}
                  </h2>
                  <p className="text-[9px] text-white/30">{col.hint}</p>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                  {items.length}
                </span>
              </header>
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-white/25">vacío</p>
                  ) : (
                    items.map((p) => (
                      <Card key={p.id} p={p} onStage={onStage} onOpen={setSelected} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </div>

      {/* drawer — opens when you click a card; closes on Esc or backdrop click */}
      <ProspectDrawer
        p={selected}
        onClose={() => setSelected(null)}
        onStage={onStage}
        onOutreach={onOutreach}
        onPromoted={onPromoted}
      />
    </div>
  );
}
