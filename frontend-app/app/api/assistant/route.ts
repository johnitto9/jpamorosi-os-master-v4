// app/api/assistant/route.ts
// Public assistant endpoint. All replies come from lib/agent/orchestrator.ts
// (single output path): LLM-powered when OPENROUTER_API_KEY is set, otherwise
// the deterministic content-grounded assistant — never silent, never erroring
// at the visitor. Conversation memory + lead state persist in Postgres when
// DATABASE_URL is configured (docker backend); on Vercel it runs memory-lite.
//
// Session: an anonymous uuid cookie (httpOnly) keys memory + lead per visitor.
import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { runAgent } from "@/lib/agent/orchestrator";
import { findSessionByDevice } from "@/lib/agent/memory";
import { ASSISTANT_LIMITS, type AssistantRequestMessage } from "@/lib/assistant/types";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "al_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readSessionId(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value && UUID_RE.test(value) ? value : null;
}

export async function POST(request: Request) {
  // Cost guard: this public endpoint can hit the LLM/tools. Use Upstash in prod.
  const limited = await rateLimited(request, "assistant", 20, 10 * 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  const rawHistory = (body as { history?: unknown })?.history;
  const rawPage = (body as { page?: unknown })?.page;
  const rawAttachments = (body as { attachments?: unknown })?.attachments;
  const clientHistory: AssistantRequestMessage[] = Array.isArray(rawHistory)
    ? (rawHistory as AssistantRequestMessage[]).slice(-ASSISTANT_LIMITS.maxHistory)
    : [];
  // only accept internal paths as visit context
  const page =
    typeof rawPage === "string" && rawPage.startsWith("/") ? rawPage.slice(0, 200) : undefined;

  const rawProjects = (body as { projectIds?: unknown })?.projectIds;
  const projectIds = Array.isArray(rawProjects)
    ? (rawProjects as unknown[]).filter((n): n is number => typeof n === "number").slice(0, 3)
    : [];
  const rawLang = (body as { lang?: unknown })?.lang;
  const lang = typeof rawLang === "string" && /^[a-z]{2}$/.test(rawLang) ? rawLang : undefined;
  const rawThread = (body as { thread?: unknown })?.thread;
  const thread =
    typeof rawThread === "number" && Number.isInteger(rawThread) && rawThread >= 0 && rawThread <= 4
      ? rawThread
      : 0;
  const rawDevice = (body as { deviceId?: unknown })?.deviceId;
  const deviceId =
    typeof rawDevice === "string" && UUID_RE.test(rawDevice) ? rawDevice : null;

  // identity tripod: cookie (leg 1) -> device rebind (leg 2) -> fresh session.
  // IP hash (leg 3) is stored as a soft signal in meta, never used as a key.
  const existing = readSessionId(request);
  const rebound = !existing && deviceId ? await findSessionByDevice(deviceId) : null;
  const sessionId = existing ?? rebound ?? randomUUID();
  const campaign = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)al_campaign=([^;]+)/)?.[1];
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : undefined;
  // soft geo signal (Vercel/Cloudflare edge headers; absent locally)
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    undefined;
  // how this session was keyed — feeds the admin report, never trusted as auth
  const device = existing ? "returning cookie" : rebound ? "device rebind" : "new visitor";

  // attachments: ONLY images this very session uploaded via /api/assistant/upload
  const attachments = Array.isArray(rawAttachments)
    ? (rawAttachments as unknown[])
        .filter(
          (a): a is string =>
            typeof a === "string" && a.startsWith(`/api/media/sessions/${sessionId}/`),
        )
        .slice(0, 3)
    : [];

  // runAgent guards input and is contractually non-silent.
  const response = await runAgent({
    sessionId,
    message: typeof message === "string" ? message : "",
    clientHistory,
    page,
    attachments,
    identity: {
      deviceId: deviceId ?? undefined,
      ipHash,
      campaign: campaign ? decodeURIComponent(campaign).slice(0, 80) : undefined,
      country: country?.slice(0, 2).toUpperCase(),
      device,
    },
    thread,
    lang,
    projectIds,
  });

  // Observability (server logs only; no PII in the log line).
  console.log(
    `[assistant] intent=${response.intent} actions=${response.actions.length} session=${sessionId.slice(0, 8)}`,
  );

  const res = NextResponse.json(response);
  if (!existing) {
    // (re)issue the cookie — also when the device leg recovered the session
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }
  return res;
}
