// app/api/projects/route.ts — public read API: published projects, grouped by
// tier. Consumes the same auto source (static seed / live repo) as the pages.
import { NextResponse } from "next/server";
import { getPublicGroupedAuto } from "@/lib/projects/public-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { hall, featured, archive } = await getPublicGroupedAuto();
  return NextResponse.json({ ok: true, hall, featured, archive });
}
