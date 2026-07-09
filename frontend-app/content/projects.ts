// content/projects.ts
// -----------------------------------------------------------------------------
// Amorosi Labs — content-driven project model (Phase 1 static seed).
//
// This file is the single source of truth for the public Hall of Fame home.
// A future phase will move this behind lib/projects/repository.ts and later a
// database, without changing the public UI components (they consume the
// selectors exported at the bottom of this file).
// -----------------------------------------------------------------------------

export type ProjectTier = "hall_of_fame" | "featured" | "archive";

export type ProjectStatus =
  | "Live"
  | "Platformizing"
  | "R&D"
  | "Prototype"
  | "Paused";

export type ProjectTheme = {
  /** primary accent (borders, glow, key text) */
  accent: string;
  /** secondary accent */
  secondary: string;
  /** rgba/hex glow used for radial background bloom */
  glow: string;
  mood: "ai-engine" | "commerce" | "media" | "ops" | "archive";
};

export type ProjectAssets = {
  logo?: string;
  heroImage?: string;
  backgroundImage?: string;
  screenshots?: string[];
  /** Loop video for the Hall of Fame room background when this project is
   *  selected. Local path today; resolves through lib/media/resolve.ts so it
   *  can move to Cloudflare Stream/R2 by env switch without touching UI. */
  heroVideo?: string;
  heroVideoPoster?: string;
};

export type Project = {
  id: string;
  slug: string;
  tier: ProjectTier;
  status: ProjectStatus;
  published: boolean;
  sortOrder: number;

  title: string;
  labTitle: string;
  category: string;
  oneLiner: string;
  proof: string;
  role: string[];
  stack: string[];
  highlights: string[];

  architecture?: {
    nodes: string[];
    flow: string[];
  };

  assets: ProjectAssets;
  theme: ProjectTheme;

  aiSummary: string;
  links?: {
    demo?: string;
    github?: string;
    /** Store / distribution links shown on the project room. */
    playstore?: string;
    appstore?: string;
    website?: string;
    /** Social presence (optional, shown as pills in the room). */
    instagram?: string;
    facebook?: string;
  };

  createdAt?: string;
  updatedAt?: string;
};

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

// The static seed data is GENERATED from Postgres (the source of truth) by
// scripts/export-projects-static.ts — do not hand-edit projects.data.json;
// edit in /admin and re-export before pushing the static front.
import projectsData from "./projects.data.json";

export const projects: Project[] = projectsData as unknown as Project[];

// -----------------------------------------------------------------------------
// Selectors (phase-1 stand-in for lib/projects/repository.ts)
// -----------------------------------------------------------------------------

const bySortOrder = (a: Project, b: Project) => a.sortOrder - b.sortOrder;

export function getProjects(): Project[] {
  return projects.filter((p) => p.published).sort(bySortOrder);
}

export function getProjectsByTier(tier: ProjectTier): Project[] {
  return getProjects().filter((p) => p.tier === tier);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && p.published);
}

export const getHallOfFame = () => getProjectsByTier("hall_of_fame");
export const getFeatured = () => getProjectsByTier("featured");
export const getArchive = () => getProjectsByTier("archive");
