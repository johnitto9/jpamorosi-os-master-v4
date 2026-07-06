// lib/assistant/guardrails.ts
// Input sanitation + safety checks for the assistant. Deterministic, no network.
// See docs/assistant/ASSISTANT_GUARDRAILS.md.

import { ASSISTANT_LIMITS, type AssistantResponse } from "./types";

// Internal routes the assistant is allowed to navigate to.
export const ALLOWED_ROUTES = [
  "/",
  "/#hall-of-fame",
  "/#contact",
  "/projects",
  "/projects/lumenscript",
  "/projects/buenpick",
  "/projects/bbn",
  "/projects/delify",
  "/projects/delibot",
  "/projects/trading-ecosystem",
  "/projects/recapp-azure",
  "/projects/ai-lab-runpod",
  "/projects/kaelos-legal",
  "/projects/code-saver",
  "/os",
  "/cv",
];

export function isAllowedHref(href: string): boolean {
  if (href.startsWith("/projects/")) return true; // internal project rooms
  if (ALLOWED_ROUTES.includes(href)) return true;
  if (href.startsWith("mailto:")) return true; // profile contact only (validated upstream)
  if (href.startsWith("https://github.com/")) return true; // profile GitHub (registry-built)
  return false;
}

// Patterns that indicate an attempt to abuse the assistant.
const INJECTION =
  /ignore (all|previous|the) (instructions|rules)|system prompt|jailbreak|developer mode|pretend you|disregard|override (your|the) (rules|instructions)|reveal (your|the) (prompt|system)|act as (?:if )?you are not|no longer follow|olvida (tus|las) instrucciones|ignora (tus|las) reglas|modo desarrollador/i;

// Intent-based exfiltration guard (NOT keyword-based):
// A software brief legitimately uses words like "backoffice", "admin", "token",
// "api key" to describe what the visitor wants to BUILD. We only refuse when a
// sensitive noun co-occurs with a verb that means "extract/hand over/access"
// THIS system's secrets. Describing/building any of these never triggers.
const EXFIL_VERB =
  /\b(give|show|reveal|share|send|tell|leak|dump|expose|print|paste|bypass|hack|dame|damelo|mostr[aá]|mostrame|pasame|pas[aá]|decime|filtr[aá]|robar|sac[aá])\b/i;
// Secrets that are sensitive regardless of surrounding words (real credentials).
const SECRET_NOUN =
  /\b(password|passwd|contrase[nñ]a|secret|secreto|api.?key|env var|credential|credencial|session secret|private key|clave (privada|secreta))\b|\.env\b/i;
// Admin/backoffice terms: only sensitive when someone tries to ACCESS them here.
const ADMIN_TERM = /\b(admin|backoffice|back[- ]?office|panel de administraci[oó]n)\b/i;

/** True when the message is trying to extract/access secrets from THIS system. */
function isExfilAttempt(text: string): boolean {
  if (!EXFIL_VERB.test(text)) return false;
  return SECRET_NOUN.test(text) || ADMIN_TERM.test(text);
}

function isInstructionOverrideAttempt(text: string): boolean {
  const lower = text.toLowerCase();
  const overrideIntent =
    /\b(ignore|disregard|override|forget|bypass|disable|remove|change|reveal|show|print|olvida|ignora|cambia|mostra|mostrame|revela|salt[aá])\b/i.test(lower);
  const target =
    /\b(system|developer|instruction|instructions|rules|policy|prompt|guardrail|safety|sistema|desarrollador|instrucciones|reglas|politica|pol[ií]tica)\b/i.test(lower);
  return overrideIntent && target;
}

// Off-topic ADVICE requests (medical/legal/financial), not domain briefs. A
// fintech/health app brief must pass; only asking the bot FOR advice is refused.
const OFFTOPIC_ADVICE =
  /\b(medical|health|legal|financial|investment|tax)\s+advice\b|\bdiagnos(e|is)\b|should i (invest|buy)\b|recommend .*(stock|crypto|investment)/i;

export type GuardVerdict =
  | { ok: true; cleaned: string }
  | { ok: false; response: AssistantResponse };

const refusal = (message: string): AssistantResponse => ({
  message,
  intent: "refusal",
  actions: [
    { type: "navigate", label: "Show best projects", href: "/#hall-of-fame" },
    { type: "navigate", label: "Open project rooms", href: "/projects" },
  ],
  cards: [],
  safety: { source: "guardrail", confidence: "high" },
});

export function guardInput(raw: unknown): GuardVerdict {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      ok: false,
      response: refusal(
        "Ask me about Juan's work — his AI systems, projects, or how to hire him.",
      ),
    };
  }
  const cleaned = raw.slice(0, ASSISTANT_LIMITS.maxInputChars).trim();

  if (INJECTION.test(cleaned) || isInstructionOverrideAttempt(cleaned)) {
    return {
      ok: false,
      response: refusal(
        "I can only help you explore Juan's portfolio — I can't change my instructions. Want to see his strongest projects or grab his CV?",
      ),
    };
  }
  if (isExfilAttempt(cleaned)) {
    return {
      ok: false,
      response: refusal(
        "I don't have access to admin, credentials, or any secrets — I only surface Juan's public portfolio. I can point you to his best work or his CV instead.",
      ),
    };
  }
  if (OFFTOPIC_ADVICE.test(cleaned)) {
    return {
      ok: false,
      response: refusal(
        "That's outside what I do — I'm here to walk you through Juan's projects and experience. Want the highlights?",
      ),
    };
  }
  return { ok: true, cleaned };
}

// Final enforcement applied to every outgoing response.
export function enforceResponse(res: AssistantResponse): AssistantResponse {
  return {
    ...res,
    message: res.message.slice(0, ASSISTANT_LIMITS.maxMessageChars),
    actions: res.actions
      .filter((a) =>
        a.type === "show_project" ? true : isAllowedHref((a as { href?: string }).href ?? ""),
      )
      .slice(0, ASSISTANT_LIMITS.maxActions),
    cards: res.cards
      // image cards may only point at our own media server (generated mockups)
      .filter(
        (c) =>
          c.type === "project" ||
          c.type === "lead_capture" ||
          c.type === "info" ||
          c.type === "decisions" ||
          (c.type === "image" && c.src.startsWith("/api/media/")),
      )
      .slice(0, ASSISTANT_LIMITS.maxCards),
  };
}
