// lib/assistant/response-builder.ts
// The single output path (Delibot "DeliveryService" lesson): every reply is built
// and enforced here. Deterministic, content-grounded, always non-silent.

import type {
  AssistantRequest,
  AssistantResponse,
  AssistantAction,
  AssistantCard,
} from "./types";
import { guardInput, enforceResponse } from "./guardrails";
import { routeIntent } from "./intent-router";
import { callTool } from "./tool-registry";
import {
  buildContext,
  findProject,
  matchProjectByText,
} from "./context-builder";

function dedupeActions(actions: AssistantAction[]): AssistantAction[] {
  const seen = new Set<string>();
  const out: AssistantAction[] = [];
  for (const a of actions) {
    const key = a.type === "show_project" ? `p:${a.projectSlug}` : `${a.type}:${a.href}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

function dedupeCards(cards: AssistantCard[]): AssistantCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = c.type === "project" ? c.slug : c.src;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}

export function buildResponse(req: AssistantRequest): AssistantResponse {
  const guard = guardInput(req?.message);
  if (!guard.ok) {
    return enforceResponse((guard as { response: AssistantResponse }).response);
  }

  const text = (guard as { cleaned: string }).cleaned;
  const routed = routeIntent(text);
  const ctx = buildContext();

  let message = "";
  let actions: AssistantAction[] = [];
  let cards: AssistantCard[] = [];

  switch (routed.intent) {
    case "hiring": {
      message =
        `${ctx.profile.name} is an ${ctx.profile.role}. The fastest read: LumenScript (AI systems architecture), BuenPick (live founder execution), and BBN (production agent workflows). Grab the CV or jump straight to the strongest work.`;
      const hall = callTool("list_hall_of_fame");
      const cv = callTool("open_or_generate_cv");
      const contact = callTool("open_contact");
      actions = [...cv.actions, ...hall.actions, ...contact.actions];
      cards = hall.cards;
      break;
    }
    case "specific_project": {
      const p = findProject(routed.projectSlug!);
      if (p) {
        message = `${p.title} — ${p.oneLiner} ${p.proof}`;
        const t = callTool("navigate_to_project", p.slug);
        actions = t.actions;
        cards = t.cards;
      }
      break;
    }
    case "capability": {
      const cap = routed.capability!;
      const c = ctx.capabilities.find((x) => x.capability === cap);
      const proven = (c?.projects ?? []).map((s) => findProject(s)?.title).filter(Boolean);
      message = `"${cap}" is proven in: ${proven.join(", ") || "several systems"}. Open one to see how.`;
      const t = callTool("explain_capability", cap);
      actions = t.actions;
      cards = t.cards;
      break;
    }
    case "architecture": {
      message =
        "On the architecture side, LumenScript is the deepest proof: multi-model orchestration with memory/canon and evaluation loops — not a prompt wrapper. BBN shows the same discipline applied to lightweight production agents.";
      actions = [
        ...callTool("navigate_to_project", "lumenscript").actions,
        ...callTool("navigate_to_project", "bbn").actions,
      ];
      cards = [{ type: "project", slug: "lumenscript" }, { type: "project", slug: "bbn" }];
      break;
    }
    case "comparison": {
      // pick up to two projects mentioned, else default flagships
      const first = matchProjectByText(text);
      const rest = text.replace(first?.title ?? "", "").replace(first?.slug ?? "", "");
      const second = matchProjectByText(rest);
      const slugs = [first?.slug, second?.slug].filter(Boolean) as string[];
      const chosen = slugs.length >= 2 ? slugs : ["lumenscript", "bbn"];
      const a = findProject(chosen[0])!;
      const b = findProject(chosen[1])!;
      message = `${a.title}: ${a.oneLiner} — vs — ${b.title}: ${b.oneLiner} Open both rooms to compare the proof.`;
      const t = callTool("compare_projects", chosen);
      actions = t.actions;
      cards = t.cards;
      break;
    }
    case "cv": {
      message =
        `Here's a print-ready CV built from ${ctx.profile.name}'s real projects and capabilities — open it and use your browser's "Save as PDF".`;
      actions = [...callTool("open_or_generate_cv").actions, ...callTool("open_contact").actions];
      break;
    }
    case "contact": {
      message = `You can reach ${ctx.profile.name} directly — happy to talk about AI Product Engineering and Systems Architecture roles.`;
      actions = callTool("open_contact").actions;
      break;
    }
    case "about": {
      message = `${ctx.profile.name} — ${ctx.profile.role}. ${ctx.profile.tagline} ${ctx.profile.thesis}`;
      actions = [
        ...callTool("list_hall_of_fame").actions,
        ...callTool("open_or_generate_cv").actions,
      ];
      cards = callTool("list_hall_of_fame").cards;
      break;
    }
    case "os": {
      message =
        "jpamorosi.os is the original interactive CV — a personal operating system with windows, a dock and a 3D avatar. Boot it up.";
      actions = callTool("open_os").actions;
      break;
    }
    case "project_discovery": {
      message =
        "Here's the strongest work: the Hall of Fame — LumenScript, BuenPick and BBN. Featured systems and the lab archive live in the project rooms.";
      const hall = callTool("list_hall_of_fame");
      actions = [...hall.actions, ...callTool("list_featured_systems").actions];
      cards = hall.cards;
      break;
    }
    default: {
      // no-silence fallback
      message =
        "I can walk you through Juan's work. Try the strongest AI project, or tell me what you're hiring for.";
      actions = [
        ...callTool("list_hall_of_fame").actions,
        ...callTool("open_or_generate_cv").actions,
        ...callTool("open_os").actions,
      ];
      cards = callTool("list_hall_of_fame").cards;
      return enforceResponse({
        message,
        intent: "unknown",
        actions: dedupeActions(actions),
        cards: dedupeCards(cards),
        safety: { source: "fallback", confidence: "low" },
      });
    }
  }

  // No-silence guarantee: never return empty-handed.
  if (actions.length === 0 && cards.length === 0) {
    actions = [
      ...callTool("list_hall_of_fame").actions,
      ...callTool("open_or_generate_cv").actions,
    ];
    cards = callTool("list_hall_of_fame").cards;
  }
  if (!message) {
    message = "Here's the best of Juan's work — take a look.";
  }

  return enforceResponse({
    message,
    intent: routed.intent,
    actions: dedupeActions(actions),
    cards: dedupeCards(cards),
    safety: { source: "site_content", confidence: "high" },
  });
}
