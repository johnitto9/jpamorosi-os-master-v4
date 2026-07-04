// lib/assistant/tool-registry.ts
// Whitelisted tools. Each returns structured actions/cards ONLY — never code,
// never arbitrary URLs, never admin/filesystem/network side effects.

import type { AssistantAction, AssistantCard } from "./types";
import { buildContext, findProject } from "./context-builder";
import { profile } from "@/content/profile";
import { isAllowedHref } from "./guardrails";

export type ToolResult = { actions: AssistantAction[]; cards: AssistantCard[] };

const nav = (label: string, href: string): AssistantAction => ({ type: "navigate", label, href });
const card = (slug: string): AssistantCard => ({ type: "project", slug });

const TOOLS = {
  navigate_to_project(slug: string): ToolResult {
    const p = findProject(slug);
    if (!p) return { actions: [], cards: [] };
    return { actions: [nav(`Open ${p.title} room`, `/projects/${p.slug}`)], cards: [card(p.slug)] };
  },

  show_project_card(slug: string): ToolResult {
    const p = findProject(slug);
    return p ? { actions: [], cards: [card(p.slug)] } : { actions: [], cards: [] };
  },

  compare_projects(slugs: string[]): ToolResult {
    const found = slugs.map(findProject).filter(Boolean).slice(0, 3);
    return {
      actions: found.map((p) => nav(`Open ${p!.title}`, `/projects/${p!.slug}`)),
      cards: found.map((p) => card(p!.slug)),
    };
  },

  list_hall_of_fame(): ToolResult {
    const { hall } = buildContext();
    return {
      actions: [nav("Open Hall of Fame", "/#hall-of-fame")],
      cards: hall.slice(0, 3).map((p) => card(p.slug)),
    };
  },

  list_featured_systems(): ToolResult {
    const { featured } = buildContext();
    return {
      actions: [nav("All project rooms", "/projects")],
      cards: featured.slice(0, 3).map((p) => card(p.slug)),
    };
  },

  explain_capability(capability: string): ToolResult {
    const { capabilities } = buildContext();
    const cap = capabilities.find((c) => c.capability === capability);
    if (!cap) return { actions: [], cards: [] };
    return {
      actions: cap.projects
        .slice(0, 2)
        .map((slug) => {
          const p = findProject(slug);
          return p ? nav(`Open ${p.title}`, `/projects/${p.slug}`) : null;
        })
        .filter(Boolean) as AssistantAction[],
      cards: cap.projects.slice(0, 2).map(card),
    };
  },

  open_os(): ToolResult {
    return { actions: [nav("Open jpamorosi.os", "/os")], cards: [] };
  },

  open_contact(): ToolResult {
    const email = profile.links.email;
    const actions: AssistantAction[] = [nav("Contact Juan", "/#contact")];
    if (email) actions.push({ type: "external", label: "Email Juan", href: `mailto:${email}` });
    return { actions, cards: [] };
  },

  open_or_generate_cv(): ToolResult {
    return { actions: [nav("Open printable CV", "/cv")], cards: [] };
  },

  open_github(): ToolResult {
    const gh = profile.links.github;
    return gh
      ? { actions: [{ type: "external", label: "GitHub ↗", href: gh }], cards: [] }
      : { actions: [], cards: [] };
  },

  suggest_best_project_for_intent(intent: string): ToolResult {
    const t = intent.toLowerCase();
    let slug = "lumenscript";
    if (/product|founder|startup|commerce|market/.test(t)) slug = "buenpick";
    else if (/media|editorial|rank|cost|cheap|lightweight/.test(t)) slug = "bbn";
    else if (/agent|workflow|automation/.test(t)) slug = "bbn";
    const p = findProject(slug);
    return p ? { actions: [nav(`Open ${p.title}`, `/projects/${p.slug}`)], cards: [card(p.slug)] } : { actions: [], cards: [] };
  },
} as const;

export type ToolName = keyof typeof TOOLS;

export function hasTool(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOLS, name);
}

// Safe dispatcher: unknown tools rejected; results filtered to allowed hrefs.
export function callTool(name: string, arg?: unknown): ToolResult {
  if (!hasTool(name)) return { actions: [], cards: [] };
  let res: ToolResult;
  switch (name) {
    case "compare_projects":
      res = TOOLS.compare_projects(Array.isArray(arg) ? (arg as string[]) : []);
      break;
    case "navigate_to_project":
    case "show_project_card":
    case "explain_capability":
    case "suggest_best_project_for_intent":
      res = (TOOLS[name] as (a: string) => ToolResult)(String(arg ?? ""));
      break;
    default:
      res = (TOOLS[name] as () => ToolResult)();
  }
  return {
    actions: res.actions.filter((a) =>
      a.type === "show_project" ? true : isAllowedHref((a as { href?: string }).href ?? ""),
    ),
    cards: res.cards,
  };
}

export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];
