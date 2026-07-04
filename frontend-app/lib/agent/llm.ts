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

export async function chatCompletion(
  messages: LlmMessage[],
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  if (!isLlmConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter attribution headers (optional, good citizenship)
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://jpamorosi.com",
        "X-Title": "Amorosi Labs Assistant",
      },
      body: JSON.stringify({
        model: llmModel(),
        messages,
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 700,
        // ask for strict JSON; the orchestrator still validates defensively
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error(`[agent:llm] openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text : null;
  } catch (err) {
    console.error("[agent:llm] request failed:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
