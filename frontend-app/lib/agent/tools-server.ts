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
// Under the routes' maxDuration=90. Wide 2K renders (16:9 reference/home) can
// take 60–85s; a 60s ceiling was aborting them and surfacing as "No salió".
const IMAGE_TIMEOUT_MS = 85_000;

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

// Aspect ratios Seedream 4.5 accepts (OpenRouter images API). Callers pass one
// per context (logo 1:1, web home/screens 16:9, mobile 9:16, storyboard 16:9…).
export type MockupAspect =
  | "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "auto";
// NB: Seedream 4.5 rejects "1K" (min ~3.69M px) — 2K is the floor.
export type MockupOpts = { aspectRatio?: MockupAspect; resolution?: "2K" | "4K" };

// Per-PROJECT generation ceilings by asset role (Fase 3). The guided flow
// (branding wizard + map/home/screens/mockups) counts GENERATED assets in the
// DB against these — regenerations included. Uploads are free. The old
// 3-per-session cap stays only for the chat's free-form generate_mockup.
export const ASSET_ROLE_CAPS: Record<string, number> = {
  logo: 2,        // 1 + one redo
  reference: 3,   // representative image + redos / chat mockups on a project
  storyboard: 2,
  map: 2,
  home: 4,        // the home's images (plan estimates ≤4)
  screen: 9,      // hard product limit (VisualPlan max-9)
  mockup: 6,      // device mockups derived from screens/home
};

// ---- palette → named colors --------------------------------------------------
// Image models honor NAMED colors far better than raw hex — passing "#10b981"
// drifts back to their trained noir-cyber bias, which is exactly why chosen
// palettes weren't reaching the output. We name each swatch (with hex kept for
// precision) so the prompt can say "use exactly emerald green (#10b981)…".
const NAMED_COLORS: Array<[string, [number, number, number]]> = [
  ["black", [0, 0, 0]], ["white", [255, 255, 255]], ["gray", [128, 128, 128]],
  ["red", [220, 38, 38]], ["orange", [249, 115, 22]], ["amber", [245, 158, 11]],
  ["yellow", [234, 179, 8]], ["green", [22, 163, 74]], ["emerald green", [16, 185, 129]],
  ["teal", [20, 184, 166]], ["cyan", [0, 229, 255]], ["sky blue", [56, 189, 248]],
  ["blue", [37, 99, 235]], ["indigo", [99, 102, 241]], ["violet", [139, 92, 246]],
  ["purple", [168, 85, 247]], ["magenta", [217, 70, 239]], ["pink", [236, 72, 153]],
  ["brown", [120, 72, 40]], ["navy", [12, 24, 64]],
];

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length < 6) return null;
  h = h.slice(0, 6);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearestName([r, g, b]: [number, number, number]): string {
  let best = NAMED_COLORS[0][0];
  let bestD = Infinity;
  for (const [name, [nr, ng, nb]] of NAMED_COLORS) {
    const d = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/** "emerald green (#10b981), violet (#8b5cf6), white (#ffffff)" — named colors
 *  image models actually honor, each with its hex for precision. Empty -> "". */
export function describePalette(hexes: string[]): string {
  return hexes
    .map((h) => {
      const rgb = hexToRgb(h);
      return rgb ? `${nearestName(rgb)} (${h})` : null;
    })
    .filter((s): s is string => !!s)
    .join(", ");
}

/** Core Seedream 4.5 call — raw prompt in, PNG persisted under the session's
 *  media dir, public /api/media URL out. No caps here: each caller enforces
 *  its own (session cap for chat mockups, per-project role caps for the flow).
 *  Uses OpenRouter's dedicated images endpoint (b64_json response). */
export async function generateImageToSession(
  sessionId: string,
  prompt: string,
  opts?: MockupOpts & { filePrefix?: string },
): Promise<{ url: string } | null> {
  if (!mockupsEnabled() || !prompt.trim()) return null;
  await recordEvent("ai.tool.called", { tool: "generate_mockup" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    // Dedicated images endpoint — NOT /chat/completions. Seedream 4.5 returns
    // { data: [{ b64_json }] } (raw base64, no data: prefix). See OpenRouter docs.
    const res = await fetch("https://openrouter.ai/api/v1/images", {
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
        prompt: prompt.slice(0, 900),
        aspect_ratio: opts?.aspectRatio ?? "auto",
        resolution: opts?.resolution ?? "2K",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`openrouter images ${res.status}`);
    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = data.data?.[0];
    // primary: base64; fallback: a data: URL if a provider returns one
    const b64 =
      first?.b64_json ??
      first?.url?.match(/^data:image\/[a-z]+;base64,(.+)$/)?.[1];
    if (!b64) throw new Error("no image in response");

    const dir = await sessionMockupDir(sessionId);
    const name = `${opts?.filePrefix ?? "mockup-"}${Date.now()}.png`;
    await fs.writeFile(path.join(dir, name), Buffer.from(b64, "base64"));

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

/** Render a visual with Seedream 4.5 from the CHAT (free-form generate_mockup
 *  tool). Session-capped; the guided flow uses generateImageToSession with
 *  per-project role caps instead. Returns a public /api/media URL or null. */
export async function runGenerateMockup(
  sessionId: string,
  description: string,
  opts?: MockupOpts,
): Promise<{ url: string } | { error: "limit" } | null> {
  if (!mockupsEnabled() || !description.trim()) return null;
  if ((await countSessionMockups(sessionId)) >= MOCKUPS_PER_SESSION) {
    return { error: "limit" };
  }
  return generateImageToSession(
    sessionId,
    `Clean, modern product mockup for a portfolio conversation. Dark noir-cyber aesthetic with cyan/violet accents. ${description.slice(0, 600)}`,
    { ...opts, filePrefix: "mockup-" },
  );
}
