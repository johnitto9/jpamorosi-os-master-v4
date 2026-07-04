// lib/projects/public-projects.ts
// -----------------------------------------------------------------------------
// PUBLIC read layer for the website (home + project rooms).
//
// Why this exists:
// - One stable place the public UI reads project data from, so components never
//   import content selectors ad-hoc.
// - Kept intentionally STATIC-SAFE for Vercel: it reads the static seed
//   (content/projects.ts) synchronously — no repository, no local-json, no fs,
//   no network. This lets `/` and `/projects/[slug]` prerender as static.
//
// Future: to serve live data from the Docker/Dokploy backend, these functions
// can be re-implemented against the remote-api repository (getProjectRepository)
// behind an explicit flag. That is a DELIBERATE later step — doing it here would
// make the public pages dynamic. Not now.
// -----------------------------------------------------------------------------

import { projects as seed } from "@/content/projects";
import type { Project, ProjectTier } from "@/content/projects";
import { getPublicContentMode } from "@/lib/env";

export type { Project, ProjectTier } from "@/content/projects";

// Seed records may predate the `published` field — treat missing as published.
const isPublished = (p: Project): boolean => p.published !== false;

// Sort by explicit order (sortOrder) first, then title as a stable tiebreaker.
const byOrderThenTitle = (a: Project, b: Project): number => {
  const ao = a.sortOrder ?? 100;
  const bo = b.sortOrder ?? 100;
  if (ao !== bo) return ao - bo;
  return a.title.localeCompare(b.title);
};

export function getPublicProjects(): Project[] {
  return seed.filter(isPublished).sort(byOrderThenTitle);
}

function byTier(tier: ProjectTier): Project[] {
  return getPublicProjects().filter((p) => p.tier === tier);
}

export function getPublicHallOfFameProjects(): Project[] {
  return byTier("hall_of_fame");
}

export function getPublicFeaturedProjects(): Project[] {
  return byTier("featured");
}

export function getPublicArchiveProjects(): Project[] {
  return byTier("archive");
}

export function getPublicProjectBySlug(slug: string): Project | undefined {
  return getPublicProjects().find((p) => p.slug === slug);
}

// -----------------------------------------------------------------------------
// LIVE getters (PROJECT_PUBLIC_CONTENT_MODE=live, Docker/local only).
// These read the repository (local-json) at request time so admin edits are
// visible. They are used by the deliberate /preview/* surface and never change
// the static SSG behavior of /, /projects on Vercel.
// -----------------------------------------------------------------------------

async function repoPublished(): Promise<Project[]> {
  const { getProjectRepository } = await import("./repository");
  const repo = getProjectRepository();
  const all = await repo.listProjects();
  return all.filter(isPublished).sort(byOrderThenTitle);
}

export async function getLivePublicProjects(): Promise<Project[]> {
  return repoPublished();
}

export async function getLivePublicHallOfFameProjects(): Promise<Project[]> {
  return (await repoPublished()).filter((p) => p.tier === "hall_of_fame");
}

export async function getLivePublicFeaturedProjects(): Promise<Project[]> {
  return (await repoPublished()).filter((p) => p.tier === "featured");
}

export async function getLivePublicArchiveProjects(): Promise<Project[]> {
  return (await repoPublished()).filter((p) => p.tier === "archive");
}

export async function getLivePublicProjectBySlug(
  slug: string,
): Promise<Project | undefined> {
  return (await repoPublished()).find((p) => p.slug === slug);
}

// -----------------------------------------------------------------------------
// AUTO getters — respect PROJECT_PUBLIC_CONTENT_MODE.
//   static (Vercel): return the compiled seed (safe, no fs).
//   live (Docker):   return the repository (local-json) so admin edits show.
// Pages using these should be dynamic (SSR). On Vercel with mode=static this is
// still safe: it reads in-memory seed data, no filesystem writes.
// -----------------------------------------------------------------------------

export async function getPublicProjectsAuto(): Promise<Project[]> {
  return getPublicContentMode() === "live" ? getLivePublicProjects() : getPublicProjects();
}

export async function getPublicGroupedAuto(): Promise<{
  hall: Project[];
  featured: Project[];
  archive: Project[];
}> {
  const all = await getPublicProjectsAuto();
  return {
    hall: all.filter((p) => p.tier === "hall_of_fame"),
    featured: all.filter((p) => p.tier === "featured"),
    archive: all.filter((p) => p.tier === "archive"),
  };
}

export async function getPublicProjectBySlugAuto(
  slug: string,
): Promise<Project | undefined> {
  return (await getPublicProjectsAuto()).find((p) => p.slug === slug);
}
