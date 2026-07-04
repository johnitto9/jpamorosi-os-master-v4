// app/api/internal/memory/search/route.ts — GET ?q=...&sessionId=... —
// keyword search over memory items (pgvector similarity is the future seam;
// same endpoint, same shape — see docs/pgvector-memory.md).
import { NextResponse } from "next/server";
import { guardInternal } from "@/lib/auth/internal";
import { searchMemory } from "@/lib/agent/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = guardInternal(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  if (!q.trim()) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, items: await searchMemory(q, 8, sessionId) });
}
