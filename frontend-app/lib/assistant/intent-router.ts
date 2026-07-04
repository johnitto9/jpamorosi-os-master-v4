// lib/assistant/intent-router.ts
// Deterministic intent classification (no LLM). Keyword/regex based.

import type { AssistantIntent } from "./types";
import { matchProjectByText, matchCapabilityByText } from "./context-builder";

export type RoutedIntent = {
  intent: AssistantIntent;
  projectSlug?: string;
  capability?: string;
  comparisonSlugs?: string[];
};

export function routeIntent(text: string): RoutedIntent {
  const t = text.toLowerCase();

  // comparison ("compare X and Y", "X vs Y")
  if (/\bvs\b|\bcompare\b|\bversus\b|difference between/.test(t)) {
    return { intent: "comparison" };
  }

  // CV / resume
  if (/\bcv\b|resume|curriculum/.test(t)) return { intent: "cv" };

  // contact / hire-me-directly
  if (/contact|email|reach (him|juan|out)|get in touch|hire him|message/.test(t)) {
    return { intent: "contact" };
  }

  // hiring / recruiter intent
  if (/hir(e|ing)|recruit|role|position|candidate|job|looking for (a|an)|we need|open role|cto|founder looking/.test(t)) {
    return { intent: "hiring" };
  }

  // OS
  if (/\bos\b|jpamorosi\.os|operating system|desktop|the os/.test(t)) {
    return { intent: "os" };
  }

  // specific project
  const proj = matchProjectByText(t);
  if (proj) return { intent: "specific_project", projectSlug: proj.slug };

  // capability
  const cap = matchCapabilityByText(t);
  if (cap && /(prove|proof|which project|capab|skill|can he|does he|experience (in|with))/.test(t)) {
    return { intent: "capability", capability: cap };
  }

  // architecture / technical
  if (/architect|orchestrat|agent|rag|pipeline|infra|system design|how does .* work|technical/.test(t)) {
    return { intent: "architecture", capability: cap };
  }

  // about Juan / founder story
  if (/who is (juan|he)|about juan|about him|background|story|tell me about (juan|him)|founder story/.test(t)) {
    return { intent: "about" };
  }

  // project discovery
  if (/project|show me|best work|portfolio|systems?|what (has|did) he (build|ship)|see his/.test(t)) {
    return { intent: "project_discovery" };
  }

  // capability as fallback if a capability keyword was present
  if (cap) return { intent: "capability", capability: cap };

  return { intent: "unknown" };
}
