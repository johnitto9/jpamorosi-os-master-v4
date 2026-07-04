// app/api/admin/projects/[slug]/route.ts
//   GET    -> single project
//   PUT    -> update project (partial patch)
//   DELETE -> delete project
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { getProjectRepository } from "@/lib/projects/repository";
import { updateProjectSchema } from "@/lib/projects/validators";
import {
  ReadOnlyRepositoryError,
  ProjectNotFoundError,
} from "@/lib/projects/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  const { slug } = await params;
  const repo = getProjectRepository();
  const project = await repo.getProject(slug);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(request: Request, { params }: Ctx) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  const { slug } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = updateProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getProjectRepository();
  try {
    const updated = await repo.updateProject(slug, parsed.data);
    return NextResponse.json({ project: updated });
  } catch (e) {
    if (e instanceof ReadOnlyRepositoryError) {
      return NextResponse.json({ error: "read_only", message: e.message }, { status: 409 });
    }
    if (e instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: "not_found", message: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  const { slug } = await params;
  const repo = getProjectRepository();
  try {
    await repo.deleteProject(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ReadOnlyRepositoryError) {
      return NextResponse.json({ error: "read_only", message: e.message }, { status: 409 });
    }
    if (e instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: "not_found", message: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
