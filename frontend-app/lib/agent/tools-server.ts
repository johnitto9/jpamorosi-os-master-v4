// lib/agent/tools-server.ts
// -----------------------------------------------------------------------------
// SERVER-SIDE agent tools (vs. lib/assistant/tool-registry.ts which maps to
// client actions/cards). Both are whitelists; the model can only name them.
//
//   web_search       env-gated by WEB_SEARCH_API_KEY (serper.dev). Lets the
//                    agent research a lead's company. Result feeds ONE
//                    follow-up completion (single tool round, no loops).
//   generate_mockup  env-gated by OPENROUTER_API_KEY. Seedream 4.5
//                    (OPENROUTER_IMAGE_MODEL) renders a quick visual mock;
//                    the PNG persists under the session on the media volume
//                    and reaches the visitor as an image card. Hard cap of
//                    3 per session (anti-abuse / cost control).
//
// Every call emits ai.tool.called / ai.tool.failed events. Failures return
// null — the orchestrator continues without the tool (no-silence).
// -----------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { ensureMediaDir } from "@/lib/media/store";
import { recordEvent } from "@/lib/events";
import { isLlmConfigured } from "./llm";

const MOCKUPS_PER_SESSION = 3;
const SEARCH_TIMEOUT_MS = 8_000;
const IMAGE_TIMEOUT_MS = 60_000;

export function webSearchEnabled(): boolean {
  return !!env.WEB_SEARCH_API_KEY;
}

export function mockupsEnabled(): boolean {
  return isLlmConfigured();
}

/** Names to advertise in the system prompt (only what's actually enabled). */
export function serverToolNames(): string[] {
  const names: string[] = [];
  if (webSearchEnabled()) names.push("web_search");
  if (mockupsEnabled()) names.push("generate_mockup");
  return names;
}

// ---- web_search (serper.dev) ---------------------------------------------------

export type SearchHit = { title?: string; snippet?: string; link?: string };

/** Structured serper results — the dragnet's raw catch (prospect ingestion). */
export async function runWebSearchRaw(
  query: string,
  num = 4,
): Promise<SearchHit[] | null> {
  if (!webSearchEnabled() || !query.trim()) return null;
  await recordEvent("ai.tool.called", { tool: "web_search" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": env.WEB_SEARCH_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query.slice(0, 200), num: Math.min(num, 10) }),
    });
    if (!res.ok) throw new Error(`serper ${res.status}`);
    const data = (await res.json()) as { organic?: SearchHit[] };
    return (data.organic ?? []).slice(0, num);
  } catch (err) {
    await recordEvent("ai.tool.failed", {
      tool: "web_search",
      error: (err as Error).message.slice(0, 200),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Formatted results — what feeds the agent's follow-up completion. */
export async function runWebSearch(query: string): Promise<string | null> {
  const hits = await runWebSearchRaw(query, 4);
  if (hits === null) return null;
  if (hits.length === 0) return "No relevant results found.";
  return hits
    .map((h, i) => `${i + 1}. ${h.title ?? ""} — ${h.snippet ?? ""} (${h.link ?? ""})`)
    .join("\n");
}

// ---- generate_mockup (Seedream 4.5 via OpenRouter images) ----------------------

async function sessionMockupDir(sessionId: string): Promise<string> {
  const root = await ensureMediaDir();
  const dir = path.join(root, "sessions", sessionId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function countSessionMockups(sessionId: string): Promise<number> {
  return (await listSessionMockups(sessionId)).length;
}

/** Public /api/media URLs of every mockup this session generated (dossier). */
export async function listSessionMockups(sessionId: string): Promise<string[]> {
  try {
    const dir = await sessionMockupDir(sessionId);
    return (await fs.readdir(dir))
      .filter((f) => f.startsWith("mockup-"))
      .sort()
      .map((f) => `/api/media/sessions/${sessionId}/${f}`);
  } catch {
    return [];
  }
}

/** Render a quick visual mock. Returns a public /api/media URL or null. */
export async function runGenerateMockup(
  sessionId: string,
  description: string,
): Promise<{ url: string } | { error: "limit" } | null> {
  if (!mockupsEnabled() || !description.trim()) return null;
  if ((await countSessionMockups(sessionId)) >= MOCKUPS_PER_SESSION) {
    return { error: "limit" };
  }
  await recordEvent("ai.tool.called", { tool: "generate_mockup" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.NEXT_PUBLIC_SITE_URL,
        "X-Title": "Amorosi Labs Assistant",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_IMAGE_MODEL,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: `Clean, modern product mockup for a portfolio conversation. Dark noir-cyber aesthetic with cyan/violet accents. ${description.slice(0, 600)}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openrouter images ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{
        message?: { images?: Array<{ image_url?: { url?: string } }> };
      }>;
    };
    const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const m = dataUrl?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!m) throw new Error("no image in response");

    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const dir = await sessionMockupDir(sessionId);
    const name = `mockup-${Date.now()}.${ext}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(m[2], "base64"));

    return { url: `/api/media/sessions/${sessionId}/${name}` };
  } catch (err) {
    await recordEvent("ai.tool.failed", {
      tool: "generate_mockup",
      error: (err as Error).message.slice(0, 200),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
