// app/api/assistant/generate/route.ts
// Consolidated generation for the guided flow (Fase 3). ONE image per request —
// the client loops with a progress theater and every image persists as it
// lands (incremental, a timeout can't lose finished work).
//
//   POST { projectId, target: "map" }                       -> the architecture/flow map
//   POST { projectId, target: "home" }                      -> next planned home image
//                                                              (creates the VisualPlan on first call)
//   POST { projectId, target: "screen", brief }             -> one product screen (≤9 total)
//   POST { projectId, target: "mockup", parentAssetId, device: "mobile"|"web" }
//
// Session-scoped + ownership-checked. Per-project ASSET_ROLE_CAPS replace the
// old 3-per-session ceiling. Phase transitions: first generation moves a
// consolidated project to "generating"; completing the home plan moves it to
// "ready" (freer conversation).
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimited } from "@/lib/rate-limit";
import { listSessionProjects, setProjectPhase } from "@/lib/agent/projects";
import {
  addAsset,
  countGeneratedAssets,
  createVisualPlan,
  getLatestVisualPlan,
  listAssets,
  listStackDecisions,
  type VisualPlanItem,
} from "@/lib/agent/project-workspace";
import {
  ASSET_ROLE_CAPS,
  describePalette,
  generateImageToSession,
  mockupsEnabled,
  type MockupAspect,
} from "@/lib/agent/tools-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

const bodySchema = z.object({
  projectId: z.number().int().positive(),
  target: z.enum(["map", "home", "screen", "mockup"]),
  brief: z.string().max(400).optional(),
  parentAssetId: z.number().int().positive().optional(),
  device: z.enum(["mobile", "web"]).optional(),
});

type ProjectLite = { name: string; kind: string; concept: string | null; palette: string[] };

const styleGround = (p: ProjectLite, decisions: string[]) => {
  const named = describePalette(p.palette);
  return `Project: "${p.name}" (${p.kind}). ${p.concept ? `Concept: ${p.concept.slice(0, 280)}. ` : ""}${named ? `Use EXACTLY these brand colors and let them dominate: ${named}.` : "Brand colors: cyan and violet on dark."}${decisions.length ? ` Key decisions: ${decisions.slice(0, 6).join("; ")}.` : ""}`;
};

/** Deterministic home plan (≤ home cap) — hero first, then the two sections
 *  that best fit the project kind. The LLM refines nothing here: predictable,
 *  fast, and still grounded in the visitor's own foundations. */
function defaultHomePlan(p: ProjectLite): VisualPlanItem[] {
  const sections: Record<string, string[]> = {
    ecommerce: ["featured products grid with prices and add-to-cart", "checkout and trust section (payments, shipping, reviews)"],
    app: ["core feature walkthrough section with device frames", "social proof and download call-to-action section"],
    agent: ["live conversation/agent demo section", "integrations and automation capabilities section"],
    saas: ["dashboard feature highlights section", "pricing tiers and call-to-action section"],
    brand: ["brand story and values section", "portfolio/gallery highlights section"],
    web: ["services or features overview section", "testimonials and contact call-to-action section"],
  };
  const [s1, s2] = sections[p.kind] ?? sections.web;
  return [
    { role: "home", screenPurpose: "hero", description: `Landing hero section: brand name, tagline, primary call to action, hero visual` },
    { role: "home", screenPurpose: "section", description: s1 },
    { role: "home", screenPurpose: "section", description: s2 },
  ];
}

export async function POST(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ error: "no_session" }, { status: 401 });
  if (!mockupsEnabled()) {
    return NextResponse.json({ error: "generation_disabled" }, { status: 503 });
  }

  // per-IP burst guard (shared window with the branding tab — one budget
  // for all image-generation endpoints)
  const limited = await rateLimited(request, "assistant-imggen", 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { projectId, target, brief, parentAssetId, device } = parsed.data;

  const own = await listSessionProjects(sessionId);
  const project = own.find((p) => p.id === projectId);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const decisions = (await listStackDecisions(projectId)).map(
    (d) => `${d.category}: ${d.option}`,
  );
  const ground = styleGround(project, decisions);

  let role: string = target;
  let prompt = "";
  let aspect: MockupAspect = "16:9";
  let parentIds: number[] | undefined;
  let planned: number | null = null;

  if (target === "map") {
    prompt = `Clean product/system map infographic: the modules, user flows and integrations of the product laid out as a connected diagram. Dark noir-cyber canvas, glowing nodes in the brand colors, readable labels. ${ground}${brief?.trim() ? ` Focus: ${brief.trim()}` : ""}`;
  } else if (target === "home") {
    // PLAN FIRST (reuses T05 VisualPlan, max-9 enforced there). First call
    // creates the plan; each call renders the NEXT unplanned-yet image.
    let plan = await getLatestVisualPlan(projectId);
    if (!plan || plan.items.length === 0) {
      plan = await createVisualPlan(projectId, {
        productSurface: "home",
        items: defaultHomePlan(project).slice(0, ASSET_ROLE_CAPS.home),
        rationale: "Guided-flow home plan (hero + 2 kind-specific sections)",
      });
    }
    const items = plan?.items ?? defaultHomePlan(project);
    planned = Math.min(items.length, ASSET_ROLE_CAPS.home);
    const done = await countGeneratedAssets(projectId, "home");
    if (done >= planned) {
      return NextResponse.json({ error: "plan_complete", planned, done }, { status: 409 });
    }
    const item = items[done];
    prompt = `High-fidelity website home ${item.screenPurpose === "hero" ? "hero" : "section"} design, full-width UI screenshot style: ${item.description}. Premium dark aesthetic in the brand colors, crisp typography. ${ground}`;
  } else if (target === "screen") {
    prompt = `High-fidelity product screen UI design: ${brief?.trim() || "a core screen of the product"}. Consistent design system in the brand colors, realistic content, UI screenshot style. ${ground}`;
  } else {
    // mockup: derived from an existing screen/home asset (prompt inheritance —
    // Seedream's images endpoint takes no input image, so we re-render the
    // parent's description inside a device frame)
    if (!parentAssetId || !device) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const parent = (await listAssets(projectId)).find((a) => a.id === parentAssetId);
    if (!parent) return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    aspect = device === "mobile" ? "9:16" : "16:9";
    parentIds = [parent.id];
    prompt = `${device === "mobile" ? "Smartphone in-hand mockup: the app screen displayed on a modern phone" : "Laptop/notebook mockup on a desk: the web page displayed on screen"}, photorealistic device, soft studio lighting, dark premium backdrop. The screen shows: ${parent.promptSummary ?? `the product's ${parent.role}`}. ${ground}`;
  }

  // per-project ceiling for this role (regenerations count; uploads don't)
  const cap = ASSET_ROLE_CAPS[role] ?? 2;
  const before = await countGeneratedAssets(projectId, role);
  if (before >= cap) {
    return NextResponse.json({ error: "limit", cap }, { status: 409 });
  }

  const image = await generateImageToSession(sessionId, prompt, {
    aspectRatio: aspect,
    resolution: "2K",
    filePrefix: `asset-${role}-`,
  });
  if (!image) return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  if ("error" in image) {
    // session-level guardrails (global image cap / burst budget)
    return image.error === "limit"
      ? NextResponse.json({ error: "limit", scope: "session_total" }, { status: 409 })
      : NextResponse.json(
          { error: "rate_limited", retryAfterSec: image.retryAfterSec },
          { status: 429, headers: { "retry-after": String(image.retryAfterSec ?? 60) } },
        );
  }

  const asset = await addAsset(projectId, {
    role,
    source: "generated",
    url: image.url,
    promptSummary: (brief?.trim() || prompt).slice(0, 300),
    parentIds,
  });
  if (!asset) return NextResponse.json({ error: "persist_failed" }, { status: 500 });

  // phase transitions: consolidated -> generating on the first render;
  // generating -> ready once the home plan is complete.
  let phase = project.phase;
  if (phase === "consolidated") {
    const moved = await setProjectPhase(sessionId, projectId, "generating");
    if (moved) phase = moved.phase;
  }
  const homeDone = await countGeneratedAssets(projectId, "home");
  if (planned !== null && homeDone >= planned && phase === "generating") {
    const moved = await setProjectPhase(sessionId, projectId, "ready");
    if (moved) phase = moved.phase;
  }

  return NextResponse.json({
    ok: true,
    asset,
    phase,
    ...(planned !== null ? { planned, done: homeDone } : {}),
  });
}
