// lib/agent/llm.ts
// -----------------------------------------------------------------------------
// OpenRouter chat client (server-only, plain fetch — no SDK dependency).
//
//   OPENROUTER_API_KEY   enables the LLM brain; absent -> caller must fall
//                        back to the deterministic assistant (no-silence).
//   OPENROUTER_MODEL     default "z-ai/glm-5.2" (1M-ctx reasoning model).
//
// The client is deliberately dumb: it sends messages, returns raw text or
// null on ANY failure (timeout, non-200, network). All parsing/validation of
// the model output happens in the orchestrator — never trust raw LLM text.
// -----------------------------------------------------------------------------

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 25_000;

export function isLlmConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export function llmModel(): string {
  return process.env.OPENROUTER_MODEL || "z-ai/glm-5.2";
}

// One structured, PII-free outcome line per anomaly (never the prompt, never
// the key, never conversation content). Greppable: `docker logs | grep outcome=`
function logOutcome(outcome: string, extra = ""): void {
  console.warn(`[agent:llm] outcome=${outcome}${extra ? " " + extra : ""}`);
}

async function completeOnce(
  messages: LlmMessage[],
  maxTokens: number,
  timeoutMs: number,
): Promise<{ text: string | null; outcome: string; finish?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter attribution headers (optional, good citizenship)
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://jpamorosi.dev",
        "X-Title": "Amorosi Labs Assistant",
      },
      body: JSON.stringify({
        model: llmModel(),
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
        // ask for strict JSON; the orchestrator still validates defensively
        response_format: { type: "json_object" },
        // GLM-5.2 spends a variable (often huge) reasoning budget: measured
        // 13.3s default vs 5.2s effort:low for the SAME trivial prompt from
        // the prod container (2026-07-09). Long tour prompts blew past the
        // 25s timeout and every one fell back deterministically. Low effort
        // keeps tool/JSON quality but stays far inside the timeout.
        reasoning: { effort: "low" },
      }),
    });
    if (!res.ok) {
      logOutcome(`http_${res.status}`, `body=${(await res.text()).slice(0, 160).replace(/\s+/g, " ")}`);
      return { text: null, outcome: `http_${res.status}` };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
    };
    const choice = data.choices?.[0];
    const text = choice?.message?.content;
    const finish = choice?.finish_reason;
    if (typeof text === "string" && text.trim()) {
      // A length-cut reply is almost always mid-JSON ("Unterminated string",
      // prod 2026-07-09 20:31) → unparseable downstream → deterministic
      // fallback. Surface it as a retryable outcome instead of "success".
      if (finish === "length") {
        logOutcome("finish_length_truncated", `max_tokens=${maxTokens}`);
        return { text: null, outcome: "finish_length_truncated", finish };
      }
      return { text, outcome: "success", finish };
    }
    // GLM reasoning edge (verified in prod smoke): HTTP 200, finish=length,
    // content=null — the reasoning budget ate the whole completion.
    const outcome =
      finish === "length" ? "finish_length_content_null" : text == null ? "content_null" : "empty_content";
    logOutcome(outcome, `finish=${finish ?? "?"} max_tokens=${maxTokens}`);
    return { text: null, outcome, finish };
  } catch (err) {
    const msg = (err as Error).name === "AbortError" ? "timeout" : "network";
    logOutcome(msg, `detail=${(err as Error).message.slice(0, 120)}`);
    return { text: null, outcome: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletion(
  messages: LlmMessage[],
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  if (!isLlmConfigured()) return null;

  const maxTokens = opts.maxTokens ?? 700;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const first = await completeOnce(messages, maxTokens, timeoutMs);
  if (first.text !== null) return first.text;

  // ONE bounded retry only for the reasoning-ate-the-budget case: same call,
  // double the completion budget (capped). No loops, no retry on other errors.
  if (first.outcome === "finish_length_content_null" || first.outcome === "finish_length_truncated") {
    // cap must never SHRINK the budget: translation batches call with 2200
    // and min(4400, 1600) retried with LESS than the original → guaranteed
    // second truncation (prod: retry_length_failed on ja/ko/hi warmup).
    const retry = await completeOnce(messages, Math.min(maxTokens * 2, 4096), timeoutMs);
    logOutcome(retry.text ? "retry_length_recovered" : "retry_length_failed");
    return retry.text;
  }
  return null;
}
