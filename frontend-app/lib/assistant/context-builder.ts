// lib/assistant/context-builder.ts
// Builds a compact, content-grounded snapshot from REAL site data (static seed).
// The assistant only ever answers from this — never invented facts.

import {
  getPublicProjects,
  getPublicHallOfFameProjects,
  getPublicFeaturedProjects,
  getPublicArchiveProjects,
  getPublicProjectBySlug,
} from "@/lib/projects/public-projects";
import { profile } from "@/content/profile";
import { capabilities } from "@/content/capabilities";
import type { Project } from "@/content/projects";

export type AssistantContext = {
  profile: typeof profile;
  projects: Project[];
  hall: Project[];
  featured: Project[];
  archive: Project[];
  capabilities: typeof capabilities;
};

export function buildContext(): AssistantContext {
  return {
    profile,
    projects: getPublicProjects(),
    hall: getPublicHallOfFameProjects(),
    featured: getPublicFeaturedProjects(),
    archive: getPublicArchiveProjects(),
    capabilities,
  };
}

export function findProject(slug: string): Project | undefined {
  return getPublicProjectBySlug(slug);
}

// Best-effort match of free text to a known project (by slug/title/alias).
export function matchProjectByText(text: string): Project | undefined {
  const t = text.toLowerCase();
  const projects = getPublicProjects();
  // direct slug/title contains
  for (const p of projects) {
    if (t.includes(p.slug.toLowerCase())) return p;
    if (t.includes(p.title.toLowerCase())) return p;
  }
  // loose aliases
  const aliases: Record<string, string> = {
    lumen: "lumenscript",
    buen: "buenpick",
    "buen pick": "buenpick",
    bbn: "bbn",
    delify: "delify",
    delibot: "delibot",
    piki: "piki",
    whatsapp: "piki",
    trading: "trading-ecosystem",
    recapp: "recapp-azure",
    azure: "recapp-azure",
    kaelos: "kaelos-legal",
    legal: "kaelos-legal",
    runpod: "ai-lab-runpod",
  };
  for (const [k, slug] of Object.entries(aliases)) {
    if (t.includes(k)) return projects.find((p) => p.slug === slug);
  }
  return undefined;
}

export function matchCapabilityByText(text: string): string | undefined {
  const t = text.toLowerCase();
  const cap = capabilities.find((c) => t.includes(c.capability.toLowerCase()));
  if (cap) return cap.capability;
  // keyword hints
  if (/orchestrat|multi.?model/.test(t)) return "Multi-model orchestration";
  if (/agent|workflow/.test(t)) return "Agent workflows";
  if (/rag|memory|rerank/.test(t)) return "RAG / memory / reranking";
  if (/founder|startup|product/.test(t)) return "Founder execution";
  if (/full.?stack/.test(t)) return "Full-stack engineering";
  if (/infra|deploy|docker/.test(t)) return "Infrastructure / deployment";
  return undefined;
}
