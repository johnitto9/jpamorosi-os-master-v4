// app/api/admin/projects/route.ts
//   GET  -> list all projects (admin)
//   POST -> create a project
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/guard";
import { getProjectRepository } from "@/lib/projects/repository";
import { createProjectSchema } from "@/lib/projects/validators";
import {
  ReadOnlyRepositoryError,
  ProjectConflictError,
} from "@/lib/projects/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  const repo = getProjectRepository();
  const projects = await repo.listProjects();
  return NextResponse.json({ driver: repo.driver, writable: repo.writable, projects });
}

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getProjectRepository();
  try {
    const created = await repo.createProject(parsed.data);
    return NextResponse.json({ project: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ReadOnlyRepositoryError) {
      return NextResponse.json({ error: "read_only", message: e.message }, { status: 409 });
    }
    if (e instanceof ProjectConflictError) {
      return NextResponse.json({ error: "conflict", message: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
