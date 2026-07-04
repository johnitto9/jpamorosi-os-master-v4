// lib/cv/build-cv-data.ts
// Builds CV data from REAL site content only (profile + projects + capabilities).
// No invented employers, degrees, dates or metrics. Static-safe.

import { profile } from "@/content/profile";
import { capabilities } from "@/content/capabilities";
import {
  getPublicHallOfFameProjects,
  getPublicFeaturedProjects,
  getPublicProjects,
} from "@/lib/projects/public-projects";

export type CvProject = {
  title: string;
  slug: string;
  category: string;
  status: string;
  oneLiner: string;
  proof: string;
  stack: string[];
};

export type CvData = {
  name: string;
  role: string;
  location: string;
  tagline: string;
  summary: string;
  languages: string[];
  links: { label: string; href: string }[];
  capabilities: { capability: string; provenIn: string[] }[];
  flagship: CvProject[];
  featured: CvProject[];
  stack: string[]; // deduped across all projects
};

const toCvProject = (p: ReturnType<typeof getPublicProjects>[number]): CvProject => ({
  title: p.title,
  slug: p.slug,
  category: p.category,
  status: p.status,
  oneLiner: p.oneLiner,
  proof: p.proof,
  stack: p.stack,
});

export function buildCvData(): CvData {
  const all = getPublicProjects();
  const titleBySlug = new Map(all.map((p) => [p.slug, p.title]));
  const stack = Array.from(new Set(all.flatMap((p) => p.stack))).sort();

  const links: { label: string; href: string }[] = [];
  if (profile.links.github) links.push({ label: "GitHub", href: profile.links.github });
  if (profile.links.email) links.push({ label: "Email", href: `mailto:${profile.links.email}` });
  links.push({ label: "Portfolio", href: "https://www.jpamorosi.dev" });

  return {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    tagline: profile.tagline,
    summary: [profile.tagline, profile.thesis, ...profile.bio].join(" "),
    languages: profile.languages,
    links,
    capabilities: capabilities.map((c) => ({
      capability: c.capability,
      provenIn: c.projects.map((s) => titleBySlug.get(s) ?? s),
    })),
    flagship: getPublicHallOfFameProjects().map(toCvProject),
    featured: getPublicFeaturedProjects().map(toCvProject),
    stack,
  };
}
