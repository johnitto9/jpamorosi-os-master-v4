"use client";

import { useState, type ReactNode } from "react";
import type { AssistantResponse, DecisionProposal } from "@/lib/assistant/types";
import { AssistantActionButton } from "./AssistantActionButton";
import { AssistantProjectCard } from "./AssistantProjectCard";

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
