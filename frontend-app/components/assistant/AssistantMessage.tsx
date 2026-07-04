"use client";

import type { AssistantResponse } from "@/lib/assistant/types";
import { AssistantActionButton } from "./AssistantActionButton";
import { AssistantProjectCard } from "./AssistantProjectCard";

export type ChatTurn =
  | { role: "user"; content: string; image?: string }
  | { role: "assistant"; content: string; response?: AssistantResponse };

export function AssistantMessage({ turn }: { turn: ChatTurn }) {
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
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2 text-sm text-white/90">
        {turn.content}
      </div>
      {res && res.cards.length > 0 && (
        <div className="grid w-full gap-2">
          {res.cards.map((c, i) =>
            c.type === "project" ? (
              <AssistantProjectCard key={c.slug} slug={c.slug} />
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
