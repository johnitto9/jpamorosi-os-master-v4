// lib/assistant/types.ts
// Shared types for the Amorosi Labs portfolio assistant (deterministic RC2).

export type AssistantIntent =
  | "hiring"
  | "project_discovery"
  | "specific_project"
  | "capability"
  | "cv"
  | "contact"
  | "about"
  | "architecture"
  | "comparison"
  | "os"
  | "refusal" // guardrail-triggered (admin/secret/injection)
  | "unknown";

// Actions are structured UI directives — never arbitrary code or external URLs.
export type AssistantAction =
  | { type: "navigate"; label: string; href: string }
  | { type: "show_project"; label: string; projectSlug: string }
  | { type: "external"; label: string; href: string }; // mailto/github only, from profile

export type AssistantCard =
  | { type: "project"; slug: string }
  // generated mockup (Seedream) — src is always an internal /api/media path
  | { type: "image"; src: string; alt: string }
  // decision cards (decisions phase, Fase 2d) — options render as buttons; the
  // pick persists as a StackDecision via /api/assistant/decisions
  | { type: "decisions"; items: DecisionProposal[] };

// One open decision the agent proposes (propose_decisions tool).
export type DecisionProposal = {
  id: string; // category slug ("stack", "core", "apis", …)
  question: string;
  options: Array<{ label: string; detail?: string }>;
};

export type AssistantSafety = {
  source: "site_content" | "guardrail" | "fallback";
  confidence: "high" | "medium" | "low";
};

export type AssistantResponse = {
  message: string;
  intent: AssistantIntent;
  actions: AssistantAction[];
  cards: AssistantCard[];
  safety: AssistantSafety;
};

export type AssistantRequestMessage = { role: "user" | "assistant"; content: string };

export type AssistantRequest = {
  message: string;
  history?: AssistantRequestMessage[]; // memory-lite: caller-provided, not persisted
};

// Internal limits (also enforced by guardrails).
export const ASSISTANT_LIMITS = {
  maxInputChars: 600,
  maxActions: 4,
  maxCards: 3,
  maxMessageChars: 900,
  maxHistory: 8,
} as const;
