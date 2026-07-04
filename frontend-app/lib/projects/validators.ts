// lib/projects/validators.ts
// -----------------------------------------------------------------------------
// Zod validation for project shape. Used by the admin API and the local-json
// repository before persisting, so bad data never reaches the store.
// -----------------------------------------------------------------------------

import { z } from "zod";

export const projectTierSchema = z.enum(["hall_of_fame", "featured", "archive"]);
export const projectStatusSchema = z.enum([
  "Live",
  "Platformizing",
  "R&D",
  "Prototype",
  "Paused",
]);

const themeSchema = z.object({
  accent: z.string().min(1),
  secondary: z.string().min(1),
  glow: z.string().min(1),
  mood: z.enum(["ai-engine", "commerce", "media", "ops", "archive"]),
});

const assetsSchema = z.object({
  logo: z.string().optional(),
  heroImage: z.string().optional(),
  backgroundImage: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  heroVideo: z.string().optional(),
  heroVideoPoster: z.string().optional(),
});

const architectureSchema = z
  .object({
    nodes: z.array(z.string()).default([]),
    flow: z.array(z.string()).default([]),
  })
  .optional();

// slug: lowercase letters, numbers, hyphens
const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case (a-z, 0-9, -)");

export const projectSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  tier: projectTierSchema,
  status: projectStatusSchema,
  published: z.boolean().default(false),
  sortOrder: z.number().int().default(100),

  title: z.string().min(1),
  labTitle: z.string().default(""),
  category: z.string().default(""),
  oneLiner: z.string().default(""),
  proof: z.string().default(""),
  role: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),

  architecture: architectureSchema,
  assets: assetsSchema.default({}),
  theme: themeSchema,
  aiSummary: z.string().default(""),

  links: z
    .object({
      demo: z.string().optional(),
      github: z.string().optional(),
      playstore: z.string().optional(),
      appstore: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),

  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Create: id optional (derived from slug if absent), timestamps server-managed.
export const createProjectSchema = projectSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ id: z.string().min(1).optional() });

// Update: everything optional except immutable keys, which are not accepted.
export const updateProjectSchema = projectSchema
  .omit({ id: true, slug: true, createdAt: true })
  .partial();

export type ProjectSchema = z.infer<typeof projectSchema>;
export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
