// app/api/status/route.ts — capability flags (which optional integrations are
// live). Booleans only — never values, never key fragments.
import { NextResponse } from "next/server";
import { env, isEmailConfigured, isR2Configured, getStorageDriver } from "@/lib/env";
import { isDbConfigured } from "@/lib/db/pool";
import { ensureSchema, checkVectorAvailable } from "@/lib/db/bootstrap";
import { isLlmConfigured } from "@/lib/agent/llm";
import { webSearchEnabled, mockupsEnabled } from "@/lib/agent/tools-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Best-effort bootstrap, but never silently: a swallowed failure here hid a
  // total DB outage for hours on 2026-07-09 (backend off the compose default
  // network — every capability degraded gracefully while status smiled).
  if (isDbConfigured()) {
    await ensureSchema().catch((err) =>
      console.warn("[status] ensureSchema failed:", (err as Error).message.slice(0, 200)),
    );
  }
  return NextResponse.json({
    ok: true,
    service: "amorosi-portfolio",
    capabilities: {
      database: isDbConfigured(),
      pgvector: isDbConfigured() ? await checkVectorAvailable() : false,
      llm: isLlmConfigured(),
      llmModel: isLlmConfigured() ? (process.env.OPENROUTER_MODEL || "z-ai/glm-5.2") : null,
      email: isEmailConfigured(),
      storageR2: isR2Configured(),
      storageDriver: getStorageDriver(),
      webSearch: webSearchEnabled(),
      mockups: mockupsEnabled(),
      internalApi: !!(env.INTERNAL_API_TOKEN || env.SERVICE_API_TOKEN),
    },
  });
}
