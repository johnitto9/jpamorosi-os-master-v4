// app/api/projects/[slug]/route.ts — public read API: one published project.
import { NextResponse } from "next/server";
import { getPublicProjectBySlugAuto } from "@/lib/projects/public-projects";
import { recordEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const project = await getPublicProjectBySlugAuto(slug);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await recordEvent("project.viewed", { slug, via: "api" });
  return NextResponse.json({ ok: true, project });
}
