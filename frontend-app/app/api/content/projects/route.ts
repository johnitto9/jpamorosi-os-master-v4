// app/api/content/projects/route.ts
// PUBLIC, read-only. Returns only PUBLISHED projects.
// No auth. No mutation. Safe for a future Vercel frontend to consume from a
// remote backend (this is the endpoint the remote-api repository reads).
import { NextResponse } from "next/server";
import { getProjectRepository } from "@/lib/projects/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = getProjectRepository();
    const all = await repo.listProjects();
    const projects = all
      .filter((p) => p.published)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json(
      { error: "content_unavailable", message: (e as Error).message },
      { status: 502 },
    );
  }
}
