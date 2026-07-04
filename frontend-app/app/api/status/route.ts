// app/api/status/route.ts — capability flags (which optional integrations are
// live). Booleans only — never values, never key fragments.
import { NextResponse } from "next/server";
import { env, isEmailConfigured, isR2Configured, getStorageDriver } from "@/lib/env";
import { isDbConfigured } from "@/lib/db/pool";
import { ensureSchema, isVectorAvailable } from "@/lib/db/bootstrap";
import { isLlmConfigured } from "@/lib/agent/llm";
import { webSearchEnabled, mockupsEnabled } from "@/lib/agent/tools-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // vectorAvailable is set by the bootstrap; make sure it ran in this process
  if (isDbConfigured()) await ensureSchema().catch(() => undefined);
  return NextResponse.json({
    ok: true,
    service: "amorosi-portfolio",
    capabilities: {
      database: isDbConfigured(),
      pgvector: isVectorAvailable(),
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
