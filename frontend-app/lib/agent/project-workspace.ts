// lib/agent/project-workspace.ts
// -----------------------------------------------------------------------------
// The ONE persistent Brand Foundation contract (T04, spec 12 / 04_DATA). Every
// surface — Project Room, Branding, Omni promotion, the admin dossier — reads
// and writes THIS module. No parallel palette/logo/asset logic anywhere else.
//
// session_projects is the Project (lib/agent/projects.ts owns its core row).
// Here we attach the brand foundation: BrandDNA, Assets, StackDecisions and
// VisualPlans. Ownership (which session owns a project) is enforced by the
// caller/route, exactly like updateSessionProject; admin reads pass no session.
//
// Same house rules as the rest: degrades to null/[] without a DB, never throws,
// every meaningful write emits an ActivityEvent (the `events` table).
// -----------------------------------------------------------------------------

import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";

async function dbReady(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// ---- BrandDNA (one per project) --------------------------------------------

export type BrandDNA = {
  projectId: number;
  personality: string | null;
  tone: string | null;
  keywords: string[];
  doList: string[];
  dontList: string[];
  visualDirection: string | null;
  updatedAt: string;
};

const BRAND_SELECT = `project_id::int AS "projectId", personality, tone, keywords,
  do_list AS "doList", dont_list AS "dontList", visual_direction AS "visualDirection",
  updated_at::text AS "updatedAt"`;

export type BrandDNAPatch = Partial<{
  personality: string;
  tone: string;
  keywords: string[];
  doList: string[];
  dontList: string[];
  visualDirection: string;
}>;

export async function getBrandDNA(projectId: number): Promise<BrandDNA | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<BrandDNA>(
    `SELECT ${BRAND_SELECT} FROM brand_dna WHERE project_id = $1`,
    [projectId],
  );
  return res?.rows[0] ?? null;
}

/** Insert-or-update the single BrandDNA row for a project (COALESCE keeps set fields). */
export async function upsertBrandDNA(
  projectId: number,
  patch: BrandDNAPatch,
): Promise<BrandDNA | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<BrandDNA>(
    `INSERT INTO brand_dna (project_id, personality, tone, keywords, do_list, dont_list, visual_direction)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
     ON CONFLICT (project_id) DO UPDATE SET
       personality      = COALESCE(EXCLUDED.personality, brand_dna.personality),
       tone             = COALESCE(EXCLUDED.tone, brand_dna.tone),
       keywords         = CASE WHEN $4 IS NULL THEN brand_dna.keywords ELSE EXCLUDED.keywords END,
       do_list          = CASE WHEN $5 IS NULL THEN brand_dna.do_list ELSE EXCLUDED.do_list END,
       dont_list        = CASE WHEN $6 IS NULL THEN brand_dna.dont_list ELSE EXCLUDED.dont_list END,
       visual_direction = COALESCE(EXCLUDED.visual_direction, brand_dna.visual_direction),
       updated_at       = now()
     RETURNING ${BRAND_SELECT}`,
    [
      projectId,
      patch.personality ?? null,
      patch.tone ?? null,
      patch.keywords ? JSON.stringify(patch.keywords) : null,
      patch.doList ? JSON.stringify(patch.doList) : null,
      patch.dontList ? JSON.stringify(patch.dontList) : null,
      patch.visualDirection ?? null,
    ],
  );
  const dna = res?.rows[0] ?? null;
  if (dna) await recordEvent("branddna.updated", { projectId });
  return dna;
}

// ---- Assets (one contract for every visual) --------------------------------

export type AssetRole =
  | "logo" | "reference" | "storyboard" | "screen" | "campaign" | "other";

export type Asset = {
  id: number;
  projectId: number;
  role: string;
  source: string;
  storageKey: string | null;
  url: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  promptSummary: string | null;
  parentIds: number[];
  status: string;
  createdAt: string;
};

const ASSET_SELECT = `id::int AS id, project_id::int AS "projectId", role, source,
  storage_key AS "storageKey", url, mime_type AS "mimeType", width, height,
  prompt_summary AS "promptSummary", parent_ids AS "parentIds", status,
  created_at::text AS "createdAt"`;

export type NewAsset = {
  role: string;
  source?: "upload" | "generated";
  storageKey?: string;
  url?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  promptSummary?: string;
  parentIds?: number[];
};

export async function addAsset(projectId: number, a: NewAsset): Promise<Asset | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<Asset>(
    `INSERT INTO assets (project_id, role, source, storage_key, url, mime_type, width, height, prompt_summary, parent_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) RETURNING ${ASSET_SELECT}`,
    [
      projectId,
      a.role,
      a.source ?? "generated",
      a.storageKey ?? null,
      a.url ?? null,
      a.mimeType ?? null,
      a.width ?? null,
      a.height ?? null,
      a.promptSummary ?? null,
      JSON.stringify(a.parentIds ?? []),
    ],
  );
  const asset = res?.rows[0] ?? null;
  if (asset) await recordEvent("asset.created", { projectId, role: a.role, source: a.source ?? "generated" });
  return asset;
}

export async function listAssets(projectId: number): Promise<Asset[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<Asset>(
    `SELECT ${ASSET_SELECT} FROM assets WHERE project_id = $1 ORDER BY id DESC`,
    [projectId],
  );
  return res?.rows ?? [];
}

// ---- StackDecisions (structured, confirmable) ------------------------------

export type StackDecision = {
  id: number;
  projectId: number;
  category: string;
  option: string;
  reason: string | null;
  source: string;
  confidence: number | null;
  confirmedAt: string | null;
  createdAt: string;
};

const STACK_SELECT = `id::int AS id, project_id::int AS "projectId", category, option,
  reason, source, confidence, confirmed_at::text AS "confirmedAt", created_at::text AS "createdAt"`;

export async function addStackDecision(
  projectId: number,
  d: { category: string; option: string; reason?: string; source?: "user" | "ai" | "inferred"; confidence?: number; confirmed?: boolean },
): Promise<StackDecision | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<StackDecision>(
    `INSERT INTO stack_decisions (project_id, category, option, reason, source, confidence, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${STACK_SELECT}`,
    [
      projectId,
      d.category,
      d.option,
      d.reason ?? null,
      d.source ?? "ai",
      d.confidence ?? null,
      d.confirmed ? new Date().toISOString() : null,
    ],
  );
  const dec = res?.rows[0] ?? null;
  if (dec) await recordEvent("stack.decided", { projectId, category: d.category, option: d.option });
  return dec;
}

export async function listStackDecisions(projectId: number): Promise<StackDecision[]> {
  if (!(await dbReady())) return [];
  const res = await tryQuery<StackDecision>(
    `SELECT ${STACK_SELECT} FROM stack_decisions WHERE project_id = $1 ORDER BY id DESC`,
    [projectId],
  );
  return res?.rows ?? [];
}

// ---- VisualPlan (PLAN FIRST, max 9 default) --------------------------------

export type VisualPlanItem = {
  role: string;
  deviceContext?: string;
  screenPurpose?: string;
  description?: string;
  inheritsFromAssetIds?: number[];
};

export type VisualPlan = {
  id: number;
  projectId: number;
  productSurface: string | null;
  items: VisualPlanItem[];
  maxItems: number;
  rationale: string | null;
  approvedAt: string | null;
  createdAt: string;
};

const PLAN_SELECT = `id::int AS id, project_id::int AS "projectId",
  product_surface AS "productSurface", items, max_items AS "maxItems", rationale,
  approved_at::text AS "approvedAt", created_at::text AS "createdAt"`;

const MAX_VISUAL_ITEMS = 9;

export async function createVisualPlan(
  projectId: number,
  input: { productSurface?: string; items: VisualPlanItem[]; rationale?: string },
): Promise<VisualPlan | null> {
  if (!(await dbReady())) return null;
  // enforce the max-9 default before anything generates
  const items = input.items.slice(0, MAX_VISUAL_ITEMS);
  const res = await tryQuery<VisualPlan>(
    `INSERT INTO visual_plans (project_id, product_surface, items, max_items, rationale)
     VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING ${PLAN_SELECT}`,
    [projectId, input.productSurface ?? null, JSON.stringify(items), MAX_VISUAL_ITEMS, input.rationale ?? null],
  );
  const plan = res?.rows[0] ?? null;
  if (plan) await recordEvent("visualplan.created", { projectId, count: items.length });
  return plan;
}

export async function getLatestVisualPlan(projectId: number): Promise<VisualPlan | null> {
  if (!(await dbReady())) return null;
  const res = await tryQuery<VisualPlan>(
    `SELECT ${PLAN_SELECT} FROM visual_plans WHERE project_id = $1 ORDER BY id DESC LIMIT 1`,
    [projectId],
  );
  return res?.rows[0] ?? null;
}

// ---- palette confirmation gate --------------------------------------------

/** Mark the 3-color identity confirmed — the gate before heavy generation. */
export async function confirmPalette(projectId: number): Promise<boolean> {
  if (!(await dbReady())) return false;
  const res = await tryQuery(
    `UPDATE session_projects SET palette_confirmed_at = now(), updated_at = now()
     WHERE id = $1 AND palette_confirmed_at IS NULL`,
    [projectId],
  );
  if (res) await recordEvent("palette.confirmed", { projectId });
  return res !== null;
}

// ---- unified read (same truth for user vault AND admin dossier) ------------

export type ProjectWorkspace = {
  brandDNA: BrandDNA | null;
  assets: Asset[];
  stackDecisions: StackDecision[];
  visualPlan: VisualPlan | null;
};

/** Everything attached to a project — one call for the vault and the dossier. */
export async function getProjectWorkspace(projectId: number): Promise<ProjectWorkspace> {
  const [brandDNA, assets, stackDecisions, visualPlan] = await Promise.all([
    getBrandDNA(projectId),
    listAssets(projectId),
    listStackDecisions(projectId),
    getLatestVisualPlan(projectId),
  ]);
  return { brandDNA, assets, stackDecisions, visualPlan };
}
