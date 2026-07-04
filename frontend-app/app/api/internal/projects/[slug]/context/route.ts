// app/api/internal/projects/[slug]/context/route.ts — GET: compact project
// context for other services' agents (published projects only).
import { NextResponse } from "next/server";
import { guardInternal } from "@/lib/auth/internal";
import { getPublicProjectBySlugAuto } from "@/lib/projects/public-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  const { slug } = await params;
  const p = await getPublicProjectBySlugAuto(slug);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    context: {
      slug: p.slug,
      title: p.title,
      tier: p.tier,
      status: p.status,
      category: p.category,
      oneLiner: p.oneLiner,
      proof: p.proof,
      stack: p.stack,
      highlights: p.highlights,
      links: p.links ?? {},
      aiSummary: p.aiSummary,
    },
  });
}
