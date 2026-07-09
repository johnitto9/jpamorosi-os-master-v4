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
import { anySearchProviderEnabled, search } from "@/lib/search/router";
import { rateLimitShared } from "@/lib/rate-limit";
import { isLlmConfigured } from "./llm";

const MOCKUPS_PER_SESSION = 3;

// ---- global image-generation guardrails (anti-abuse) ---------------------------
// Enforced INSIDE generateImageToSession — the single choke point every
// Seedream call goes through (chat mockups, branding wizard, map/home/screens).
// The per-project ASSET_ROLE_CAPS bound each surface, but a visitor could mint
// unlimited projects; these are the hard per-VISITOR (session) ceilings:
//   total  — lifetime generated images per session, across everything
//   minute — Seedream burst control (each render costs real money + ~60s)
//   day    — daily budget per session
export const SESSION_IMAGE_TOTAL_CAP = 20;
const IMAGES_PER_MINUTE = 2;
const IMAGES_PER_DAY = 12;

/** Denied generation: `limit` = permanent cap hit, `rate` = try again later. */
export type GenerationDenied = { error: "limit" | "rate"; retryAfterSec?: number };
// Under the routes' maxDuration=90. Wide 2K renders (16:9 reference/home) can
// take 60–85s; a 60s ceiling was aborting them and surfacing as "No salió".
const IMAGE_TIMEOUT_MS = 85_000;

export function webSearchEnabled(): boolean {
  return anySearchProviderEnabled();
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
  try {
    const report = await search({
      query,
      limit: Math.min(num, 10),
      intent: num > 4 ? "broad-discovery" : "general-web-search",
    });
    return report.results.map((r) => ({
      title: r.title,
      snippet: r.snippet,
      link: r.url,
    }));
  } catch (err) {
    await recordEvent("ai.tool.failed", {
      tool: "web_search",
      error: (err as Error).message.slice(0, 200),
    });
    return null;
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

/** ALL generated images of a session (chat `mockup-*` + wizard `asset-*`),
 *  excluding visitor uploads — the basis for the global session cap. */
async function countSessionGeneratedImages(sessionId: string): Promise<number> {
  try {
    const dir = await sessionMockupDir(sessionId);
    return (await fs.readdir(dir)).filter(
      (f) => f.startsWith("mockup-") || f.startsWith("asset-"),
    ).length;
  } catch {
    return 0;
  }
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
// NB: Seed enforces a min derived size of 3,686,400 px. "2K" only clears it for
// 1:1; non-square aspects need "4K" (handled by sizedRequest below).
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

/** Build the { aspect_ratio, resolution } part of a Seedream request so the
 *  DERIVED image size always clears the provider's minimum (3,686,400 px =
 *  2560×1440). Seed's "2K" preset only clears it for a SQUARE (1:1 = 2048² =
 *  4.19M); ANY non-square at "2K" comes out below the floor and the API 400s
 *  ("The parameter `size`… must be at least 3686400 pixels"). So for non-square
 *  aspects we request "4K" — which both clears the floor and gives the hero
 *  quality the representative/storyboard/home images want. Verified live:
 *  16:9 & 9:16 @ 2K → 400, @ 4K → 200; 1:1 @ 2K → 200. */
function sizedRequest(
  aspectRatio: MockupAspect | undefined,
  resolution: "2K" | "4K" | undefined,
): { aspect_ratio: MockupAspect; resolution: "2K" | "4K" } {
  const aspect = aspectRatio ?? "auto";
  const requested = resolution ?? "2K";
  // Only a true square is safe at 2K; everything else (incl. "auto") needs 4K.
  return { aspect_ratio: aspect, resolution: aspect === "1:1" ? requested : "4K" };
}

/** Core Seedream 4.5 call — raw prompt in, PNG persisted under the session's
 *  media dir, public /api/media URL out. No caps here: each caller enforces
 *  its own (session cap for chat mockups, per-project role caps for the flow).
 *  Uses OpenRouter's dedicated images endpoint (b64_json response). */
export async function generateImageToSession(
  sessionId: string,
  prompt: string,
  opts?: MockupOpts & { filePrefix?: string },
): Promise<{ url: string } | GenerationDenied | null> {
  if (!mockupsEnabled() || !prompt.trim()) return null;

  // guardrails BEFORE spending: hard session ceiling, then burst/day budgets
  if ((await countSessionGeneratedImages(sessionId)) >= SESSION_IMAGE_TOTAL_CAP) {
    await recordEvent("ai.tool.failed", { tool: "generate_mockup", error: "session_total_cap" });
    return { error: "limit" };
  }
  const minute = await rateLimitShared(`imggen:m:${sessionId}`, IMAGES_PER_MINUTE, 60_000);
  const day = minute.ok
    ? await rateLimitShared(`imggen:d:${sessionId}`, IMAGES_PER_DAY, 24 * 60 * 60_000)
    : minute;
  if (!minute.ok || !day.ok) {
    const deny = !minute.ok ? minute : day;
    await recordEvent("ai.tool.failed", { tool: "generate_mockup", error: "rate_limited" });
    return { error: "rate", retryAfterSec: deny.retryAfterSec };
  }

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
        ...sizedRequest(opts?.aspectRatio, opts?.resolution),
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
): Promise<{ url: string } | GenerationDenied | null> {
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
