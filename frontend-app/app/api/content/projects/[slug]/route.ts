// app/api/content/projects/[slug]/route.ts
// PUBLIC, read-only. Returns a single PUBLISHED project by slug (404 otherwise).
import { NextResponse } from "next/server";
import { getProjectRepository } from "@/lib/projects/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const repo = getProjectRepository();
    const project = await repo.getProject(slug);
    // Never expose unpublished projects through the public endpoint.
    if (!project || !project.published) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      { error: "content_unavailable", message: (e as Error).message },
      { status: 502 },
    );
  }
}
