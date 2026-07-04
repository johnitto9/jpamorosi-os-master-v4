// lib/env.ts
// -----------------------------------------------------------------------------
// Server-only environment access + validation (zod).
//
// SAFETY:
// - This module reads server secrets (ADMIN_*). Do NOT import it from client
//   components. Only NEXT_PUBLIC_* values are safe to expose to the browser.
// - Validation is non-throwing (safeParse) so a missing optional var can never
//   crash the build. Admin-specific requirements are enforced lazily at the
//   point of use via `isAdminConfigured()`.
// -----------------------------------------------------------------------------

// NOTE: intentionally NOT importing "server-only" (not a dependency here).
// Keep this module out of client component import graphs by convention.
import { z } from "zod";

const boolish = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  APP_ENV: z.enum(["local", "test", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  ADMIN_ENABLED: boolish,
  ADMIN_USERNAME: z.string().min(1).optional(),
  ADMIN_PASSWORD_HASH: z.string().min(1).optional(),
  ADMIN_SESSION_SECRET: z.string().min(16).optional(),

  PROJECT_STORAGE_DRIVER: z
    .enum(["static", "local-json", "postgres", "remote-api"])
    .default("static"),
  PROJECTS_JSON_PATH: z.string().min(1).default("./data/projects.json"),

  // How PUBLIC pages source content:
  //   static -> read the compiled seed (content/projects.ts). Vercel-safe, SSG.
  //   live   -> read the repository (local-json in Docker) at request time.
  // Default MUST be static so Vercel stays static/SSG. Docker sets it to "live".
  PROJECT_PUBLIC_CONTENT_MODE: z.enum(["static", "live"]).default("static"),

  // Future remote-api bridge (Vercel frontend -> Docker/Dokploy backend).
  // Optional; only used when PROJECT_STORAGE_DRIVER=remote-api.
  PROJECTS_API_URL: z.string().url().optional(),
  PROJECTS_API_TOKEN: z.string().optional(),

  // --- Email (Resend). All optional: without a key the email service logs
  // instead of sending (controlled dev fallback, never crashes a flow).
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_ADMIN_TO_EMAIL: z.string().default("jpamorosi14@gmail.com"),
  // Single allowed magic-link identity (no public multi-user registration).
  ADMIN_EMAIL: z.string().default("jpamorosi14@gmail.com"),

  // --- Cloudflare R2 (S3-compatible). All optional: storageService falls
  // back to the durable local volume when any of these is missing.
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  // --- Internal service-to-service APIs (/api/internal/*). Either token works.
  INTERNAL_API_TOKEN: z.string().optional(),
  SERVICE_API_TOKEN: z.string().optional(),

  // --- Agent optional capabilities (env-gated tools).
  WEB_SEARCH_API_KEY: z.string().optional(), // serper.dev
  // Image model for generate_mockup. Seedream 4.5 via OpenRouter's dedicated
  // /api/v1/images endpoint (b64_json). This is the house image model for
  // EVERYTHING we generate (logos, mockups, home, screens, storyboards).
  OPENROUTER_IMAGE_MODEL: z.string().default("bytedance-seed/seedream-4.5"),
});

export type AppEnv = z.infer<typeof schema>;

function loadEnv(): AppEnv {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // Never throw at import time. Log once and fall back to safe defaults so the
  // public site keeps working even if admin vars are malformed.
  console.warn(
    "[env] Invalid environment configuration, using safe defaults:",
    parsed.error.flatten().fieldErrors,
  );
  return schema.parse({});
}

export const env: AppEnv = loadEnv();

/** Admin master switch. */
export function isAdminEnabled(): boolean {
  return env.ADMIN_ENABLED === true;
}

/** True only when admin is enabled AND fully configured with secrets. */
export function isAdminConfigured(): boolean {
  return (
    isAdminEnabled() &&
    !!env.ADMIN_USERNAME &&
    !!env.ADMIN_PASSWORD_HASH &&
    !!env.ADMIN_SESSION_SECRET
  );
}

/** Public content mode: "static" (seed, Vercel-safe) or "live" (repository). */
export function getPublicContentMode(): "static" | "live" {
  return env.PROJECT_PUBLIC_CONTENT_MODE;
}

/** Storage driver label for admin badges. */
export function getStorageDriver(): string {
  return env.PROJECT_STORAGE_DRIVER;
}

/** Email sending is live (otherwise the service logs instead of sending). */
export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY && !!env.RESEND_FROM_EMAIL;
}

/** R2 offload configured (otherwise storage falls back to the local volume). */
export function isR2Configured(): boolean {
  return (
    !!env.R2_ACCESS_KEY_ID &&
    !!env.R2_SECRET_ACCESS_KEY &&
    !!env.R2_BUCKET_NAME &&
    !!env.R2_ENDPOINT
  );
}

/** Valid bearer for /api/internal/* (INTERNAL_API_TOKEN or SERVICE_API_TOKEN). */
export function isInternalToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const valid = [env.INTERNAL_API_TOKEN, env.SERVICE_API_TOKEN].filter(Boolean);
  return valid.length > 0 && valid.includes(token);
}

/** Human-readable list of what's missing, for the /admin setup screen. */
export function adminMissingVars(): string[] {
  const missing: string[] = [];
  if (!isAdminEnabled()) missing.push("ADMIN_ENABLED=true");
  if (!env.ADMIN_USERNAME) missing.push("ADMIN_USERNAME");
  if (!env.ADMIN_PASSWORD_HASH) missing.push("ADMIN_PASSWORD_HASH");
  if (!env.ADMIN_SESSION_SECRET) missing.push("ADMIN_SESSION_SECRET");
  return missing;
}
