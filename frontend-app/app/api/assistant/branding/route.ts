// app/api/assistant/branding/route.ts
// The Branding tab's multistep (Fase 2c): each step persists ONE visual asset
// for the pinned pre-project — logo (1:1), representative image (16:9) or
// storyboard (16:9) — either UPLOADED (a /api/media URL the visitor already
// pushed through /api/assistant/upload) or GENERATED (Seedream 4.5, grounded
// in the project's name/kind/concept/palette + the visitor's brief).
//
//   POST { projectId, role: "logo"|"reference"|"storyboard", brief?, uploadUrl? }
//     -> { ok, asset }   |  409 { error: "limit" }  |  502 { error: "generation_failed" }
//
// Session-cookie scoped + ownership-checked like /api/assistant/workspace.
// Generation counts against ASSET_ROLE_CAPS per project (uploads are free).
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimited } from "@/lib/rate-limit";
import { listSessionProjects, updateSessionProject } from "@/lib/agent/projects";
import { addAsset, countGeneratedAssets } from "@/lib/agent/project-workspace";
import {
  ASSET_ROLE_CAPS,
  describePalette,
  generateImageToSession,
  mockupsEnabled,
  type MockupAspect,
} from "@/lib/agent/tools-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // Seedream 2K can take ~60s

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sid(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_sid=([^;]+)/)?.[1];
  return m && UUID_RE.test(m) ? m : null;
}

const bodySchema = z.object({
  projectId: z.number().int().positive(),
  role: z.enum(["logo", "reference", "storyboard"]),
  brief: z.string().max(400).optional(),
  uploadUrl: z.string().max(300).optional(),
});

const ASPECT: Record<string, MockupAspect> = {
  logo: "1:1",
  reference: "16:9",
  storyboard: "16:9",
};

/** Role-specific Seedream prompt, grounded in the project's foundations. */
function brandingPrompt(
  role: string,
  p: { name: string; kind: string; concept: string | null; palette: string[] },
  brief?: string,
): string {
  const named = describePalette(p.palette);
  const ground = `Project: "${p.name}" (${p.kind}). ${p.concept ? `Concept: ${p.concept.slice(0, 300)}. ` : ""}${named ? `Use EXACTLY these brand colors and let them dominate the design: ${named}.` : "Brand colors: cyan and violet on dark."}`;
  const ask =
    role === "logo"
      ? `Minimal iconic logo design, flat vector style, centered on a clean dark background, memorable single mark, no lettering unless essential.`
      : role === "reference"
        ? `Hero-quality representative brand image that captures the product's world and mood. Modern, premium, editorial lighting.`
        : `Storyboard collage: one cohesive frame with 4-6 mini-panels summarizing the product journey end to end. Consistent style across panels.`;
  return `${ask} ${ground}${brief?.trim() ? ` Direction from the owner: ${brief.trim()}` : ""}`;
}

export async function POST(request: Request) {
  const sessionId = sid(request);
  if (!sessionId) return NextResponse.json({ error: "no_session" }, { status: 401 });

  // per-IP burst guard (each generation is ~60s of paid compute)
  const limited = await rateLimited(request, "assistant-imggen", 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { projectId, role, brief, uploadUrl } = parsed.data;

  // ownership: only this session's projects
  const own = await listSessionProjects(sessionId);
  const project = own.find((p) => p.id === projectId);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ---- upload path: register an already-uploaded session image as the asset
  if (uploadUrl) {
    if (!uploadUrl.startsWith(`/api/media/sessions/${sessionId}/`)) {
      return NextResponse.json({ error: "bad_upload_url" }, { status: 400 });
    }
    const asset = await addAsset(projectId, {
      role,
      source: "upload",
      url: uploadUrl,
      promptSummary: brief?.slice(0, 300),
    });
    if (!asset) return NextResponse.json({ error: "persist_failed" }, { status: 500 });
    if (role === "logo") {
      await updateSessionProject(sessionId, projectId, { logoUrl: uploadUrl });
    }
    return NextResponse.json({ ok: true, asset });
  }

  // ---- generation path (Seedream, per-project role cap)
  if (!mockupsEnabled()) {
    return NextResponse.json({ error: "generation_disabled" }, { status: 503 });
  }
  const cap = ASSET_ROLE_CAPS[role] ?? 2;
  if ((await countGeneratedAssets(projectId, role)) >= cap) {
    return NextResponse.json({ error: "limit", cap }, { status: 409 });
  }

  const prompt = brandingPrompt(role, project, brief);
  const image = await generateImageToSession(sessionId, prompt, {
    aspectRatio: ASPECT[role],
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
  });
  if (!asset) return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  if (role === "logo") {
    await updateSessionProject(sessionId, projectId, { logoUrl: image.url });
  }
  return NextResponse.json({ ok: true, asset });
}
