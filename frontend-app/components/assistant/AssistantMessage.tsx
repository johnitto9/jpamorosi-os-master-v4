"use client";

import { useState, type ReactNode } from "react";
import type { AssistantResponse, DecisionProposal } from "@/lib/assistant/types";
import { AssistantActionButton } from "./AssistantActionButton";
import { AssistantProjectCard } from "./AssistantProjectCard";

type LeadField = "name" | "email" | "company" | "need" | "budget";

// --- lightweight, XSS-safe rich text -----------------------------------------
// The LLM writes light markdown (**bold**, *italic*, `code`, bullet lists). We
// rendered it raw before, so "**" leaked into the UI. This renders real nodes
// (never dangerouslySetInnerHTML — no dep, nothing to sanitize) and gives bold
// a cyan pop so replies read with life instead of a flat wall of text.
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-cyan-200">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(<code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-cyan-100">{tok.slice(1, -1)}</code>);
    } else {
      out.push(<em key={key} className="italic text-white">{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function RichText({ content }: { content: string }) {
  const lines = content.split(/\n/);
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const bullet = /^\s*[-*•]\s+(.*)/.exec(line);
        if (bullet) {
          return (
            <div key={i} className={`flex gap-1.5 ${i > 0 ? "mt-1" : ""}`}>
              <span className="mt-px shrink-0 text-cyan-400" aria-hidden>•</span>
              <span>{renderInline(bullet[1], `l${i}`)}</span>
            </div>
          );
        }
        return (
          <p key={i} className={i > 0 ? "mt-1.5" : ""}>
            {renderInline(line, `l${i}`)}
          </p>
        );
      })}
    </>
  );
}

export type ChatTurn =
  | { role: "user"; content: string; image?: string }
  | { role: "assistant"; content: string; response?: AssistantResponse };

// --- decision cards (Fase 2d) --------------------------------------------------
// Agent-proposed decisions ride the reply as a card; each option is a button.
// Picks are LOCAL state here (the card freezes once answered) and bubble up via
// onDecision so the widget persists them (/api/assistant/decisions).
function DecisionCards({
  items,
  onDecision,
}: {
  items: DecisionProposal[];
  onDecision?: (item: DecisionProposal, option: string) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  return (
    <div className="grid w-full gap-2">
      {items.map((d) => {
        const chosen = picked[d.id];
        return (
          <div
            key={d.id}
            className={`rounded-2xl border p-3 ${chosen ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/15 bg-white/[0.03]"}`}
          >
            <p className="text-xs font-semibold text-white">
              {chosen ? "✓ " : ""}
              {d.question}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.options.map((o) => (
                <button
                  key={o.label}
                  onClick={() => {
                    if (chosen) return;
                    setPicked((prev) => ({ ...prev, [d.id]: o.label }));
                    onDecision?.(d, o.label);
                  }}
                  disabled={!!chosen}
                  title={o.detail}
                  className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                    chosen === o.label
                      ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200"
                      : chosen
                        ? "border-white/10 text-white/30"
                        : "border-white/15 text-white/70 hover:border-cyan-400/50 hover:text-cyan-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({
  card,
}: {
  card: Extract<NonNullable<AssistantResponse["cards"]>[number], { type: "info" }>;
}) {
  const tone =
    card.tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
      : card.tone === "violet"
        ? "border-violet-400/30 bg-violet-400/[0.05]"
        : "border-cyan-400/30 bg-cyan-400/[0.05]";
  return (
    <div className={`rounded-2xl border p-3 ${tone}`}>
      <p className="text-xs font-semibold text-white">{card.title}</p>
      {card.body && <p className="mt-1.5 text-xs leading-relaxed text-white/65">{card.body}</p>}
      {card.items && card.items.length > 0 && (
        <div className="mt-2 grid gap-1.5">
          {card.items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{item.label}</p>
              {item.value && <p className="mt-0.5 text-xs text-white/75">{item.value}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Localized chrome for the lead card (title/body arrive already localized
// from the agent; these are the fixed labels/placeholders/states). Falls
// back to EN for languages without an entry.
const LEAD_I18N: Record<string, {
  fields: Record<LeadField, string>;
  idle: string; error: string; send: string; saving: string;
  doneTitle: string; doneBody: (email?: string) => string;
}> = {
  en: {
    fields: { name: "Name", email: "Email", company: "Company", need: "What do you need?", budget: "Budget / timing" },
    idle: "Juan can pick this up from admin.",
    error: "Could not save. Try again.",
    send: "Send", saving: "Saving...",
    doneTitle: "Thanks — it's on its way! 🎉",
    doneBody: (e) => e
      ? `Your session is saved and linked to ${e}. Juan reads everything personally and will write back soon.`
      : "Your session is saved. Juan reads everything personally and will write back soon.",
  },
  es: {
    fields: { name: "Nombre", email: "Email", company: "Empresa", need: "¿Qué necesitás?", budget: "Presupuesto / tiempos" },
    idle: "Juan lo retoma desde el admin.",
    error: "No se pudo guardar. Probá de nuevo.",
    send: "Enviar", saving: "Guardando...",
    doneTitle: "¡Gracias! Ya se envió 🎉",
    doneBody: (e) => e
      ? `Tu sesión quedó guardada y vinculada a ${e}. Juan lee todo personalmente y te escribe pronto.`
      : "Tu sesión quedó guardada. Juan lee todo personalmente y te escribe pronto.",
  },
  pt: {
    fields: { name: "Nome", email: "Email", company: "Empresa", need: "O que você precisa?", budget: "Orçamento / prazos" },
    idle: "Juan retoma isso pelo admin.",
    error: "Não foi possível salvar. Tente de novo.",
    send: "Enviar", saving: "Salvando...",
    doneTitle: "Obrigado! Já foi enviado 🎉",
    doneBody: (e) => e
      ? `Sua sessão ficou salva e vinculada a ${e}. Juan lê tudo pessoalmente e te escreve em breve.`
      : "Sua sessão ficou salva. Juan lê tudo pessoalmente e te escreve em breve.",
  },
  fr: {
    fields: { name: "Nom", email: "Email", company: "Entreprise", need: "De quoi avez-vous besoin ?", budget: "Budget / délais" },
    idle: "Juan reprend ça depuis l'admin.",
    error: "Impossible d'enregistrer. Réessayez.",
    send: "Envoyer", saving: "Enregistrement...",
    doneTitle: "Merci — c'est envoyé ! 🎉",
    doneBody: (e) => e
      ? `Votre session est sauvegardée et liée à ${e}. Juan lit tout personnellement et vous répond vite.`
      : "Votre session est sauvegardée. Juan lit tout personnellement et vous répond vite.",
  },
};

function readLeadLang(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)al_lang=([^;]+)/)?.[1];
  return m && m in LEAD_I18N ? m : "en";
}

function LeadCaptureCard({
  card,
}: {
  card: Extract<NonNullable<AssistantResponse["cards"]>[number], { type: "lead_capture" }>;
}) {
  const fields = (card.fields?.length ? card.fields : ["email", "company", "need"]).slice(0, 5);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const L = LEAD_I18N[readLeadLang()];

  async function submit() {
    if (state === "saving" || state === "saved") return;
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v.length > 0),
    );
    if (Object.keys(payload).length === 0) return;
    setState("saving");
    try {
      const res = await fetch("/api/assistant/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  // SUCCESS takes over the card — a real "it landed" moment, not a footnote.
  if (state === "saved") {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.08] p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/15 text-2xl">
          ✓
        </div>
        <p className="mt-3 text-base font-bold text-white">{L.doneTitle}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-emerald-100/75">
          {L.doneBody(values.email?.trim() || undefined)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">{card.title ?? "Keep the thread alive"}</p>
          {card.body && <p className="mt-1 text-xs leading-relaxed text-white/60">{card.body}</p>}
        </div>
        <span className="rounded-full border border-emerald-300/25 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
          lead
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className={field === "need" ? "sm:col-span-2" : ""}>
            <span className="sr-only">{L.fields[field]}</span>
            <input
              type={field === "email" ? "email" : "text"}
              value={values[field] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder={L.fields[field]}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-300/55"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/45">
          {state === "error" ? L.error : L.idle}
        </p>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "saving"}
          className="h-8 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-200/70 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {state === "saving" ? L.saving : L.send}
        </button>
      </div>
    </div>
  );
}

export function AssistantMessage({
  turn,
  onDecision,
}: {
  turn: ChatTurn;
  onDecision?: (item: DecisionProposal, option: string) => void;
}) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-500/20 px-3 py-2 text-sm text-white">
          {turn.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={turn.image}
              alt="Shared image"
              className="mb-2 max-h-40 w-full rounded-lg border border-white/10 object-cover"
            />
          )}
          {turn.content}
        </div>
      </div>
    );
  }

  const res = turn.response;
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2 text-sm leading-relaxed text-white/90">
        <RichText content={turn.content} />
      </div>
      {res && res.cards.length > 0 && (
        <div className="grid w-full gap-2">
          {res.cards.map((c, i) =>
            c.type === "project" ? (
              <AssistantProjectCard key={c.slug} slug={c.slug} />
            ) : c.type === "lead_capture" ? (
              <LeadCaptureCard key={`lead-${i}`} card={c} />
            ) : c.type === "info" ? (
              <InfoCard key={`info-${i}`} card={c} />
            ) : c.type === "decisions" ? (
              <DecisionCards key={`dec-${i}`} items={c.items} onDecision={onDecision} />
            ) : (
              // generated mockup — internal /api/media path only
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${c.src}-${i}`}
                src={c.src}
                alt={c.alt}
                className="w-full rounded-xl border border-white/10"
              />
            ),
          )}
        </div>
      )}
      {res && res.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {res.actions.map((a, i) => (
            <AssistantActionButton key={i} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AssistantMessage;
