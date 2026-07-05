// lib/agent/orchestrator.ts
// -----------------------------------------------------------------------------
// The agent's single brain ("Mente Única" — Delibot orchestrator pattern).
// One entry point produces every reply; nothing else talks to the LLM or the
// client. Pipeline:
//
//   1. guardInput            (deterministic, refusals short-circuit)
//   2. persist user turn     (memory; degrades silently without DB)
//   3. LLM path              (only if OPENROUTER_API_KEY): compact grounded
//                            context + qualification state + history ->
//                            strict-JSON reply -> zod validate -> whitelisted
//                            tools only -> enforceResponse
//   4. deterministic path    (buildResponse) on ANY LLM failure — the pact:
//                            the visitor NEVER sees an error or silence.
//   5. lead merge            (regex signals ∪ LLM lead patch) + persist reply.
//
// The LLM can only shape text and pick tools from the registry. It cannot
// invent URLs (guardrails filter), touch admin, or exceed response limits.
// -----------------------------------------------------------------------------

import { z } from "zod";
import type {
  AssistantRequestMessage,
  AssistantResponse,
  AssistantIntent,
  AssistantAction,
  AssistantCard,
  DecisionProposal,
} from "@/lib/assistant/types";
import { guardInput, enforceResponse } from "@/lib/assistant/guardrails";
import { buildResponse } from "@/lib/assistant/response-builder";
import { buildContext } from "@/lib/assistant/context-builder";
import { callTool, TOOL_NAMES } from "@/lib/assistant/tool-registry";
import { chatCompletion, isLlmConfigured, llmModel, type LlmMessage } from "./llm";
import { loadHistory, saveTurn, touchSession, writeMemory } from "./memory";
import {
  extractLeadSignals,
  getLead,
  upsertLead,
  updateLeadStage,
  leadPatchSchema,
  type LeadPatch,
} from "./leads";
import { computeStage, scoreLead, personaBlock, stageBlock } from "./playbooks";
import {
  listSessionProjects,
  updateSessionProject,
  projectPatchSchema,
  type SessionProject,
} from "./projects";
import { addAsset, addStackDecision, confirmPalette, upsertBrandDNA } from "./project-workspace";
import {
  serverToolNames,
  runWebSearch,
  runGenerateMockup,
  webSearchEnabled,
  mockupsEnabled,
} from "./tools-server";
import { logAiCall } from "./ai-log";
import { recordEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/email/service";
import { env } from "@/lib/env";

/** Deep link into the admin dossier — every milestone email carries it. */
const dossierUrl = (sessionId: string) =>
  `${env.NEXT_PUBLIC_SITE_URL}/admin/sessions/${sessionId}`;

// ---- LLM output contract (validated, never trusted) -------------------------

const llmReplySchema = z.object({
  message: z.string().min(1).max(1200),
  intent: z.string().optional(),
  tools: z
    .array(
      z.object({
        name: z.string(),
        arg: z.union([z.string(), z.array(z.string())]).optional(),
      }),
    )
    .max(4)
    .optional(),
  lead: leadPatchSchema.optional(),
});

// propose_decisions tool arg (Fase 2d) — decision cards the client renders.
// Hard product limits: ≤4 decisions per card, 2-4 options each, short strings.
const proposeDecisionsArgSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          question: z.string().min(1).max(160),
          options: z
            .array(
              z.object({
                label: z.string().min(1).max(60),
                detail: z.string().max(120).optional(),
              }),
            )
            .min(2)
            .max(4),
        }),
      )
      .min(1)
      .max(4),
  })
  .strict();

// brand-foundation tool arg (validated, never trusted) — feeds upsertBrandDNA
const brandDnaArgSchema = z
  .object({
    personality: z.string().max(200).optional(),
    tone: z.string().max(200).optional(),
    keywords: z.array(z.string().max(40)).max(12).optional(),
    doList: z.array(z.string().max(80)).max(8).optional(),
    dontList: z.array(z.string().max(80)).max(8).optional(),
    visualDirection: z.string().max(400).optional(),
  })
  .strict();

const KNOWN_INTENTS: AssistantIntent[] = [
  "hiring", "project_discovery", "specific_project", "capability", "cv",
  "contact", "about", "architecture", "comparison", "os", "refusal", "unknown",
];

function normalizeIntent(raw?: string): AssistantIntent {
  return (KNOWN_INTENTS as string[]).includes(raw ?? "") ? (raw as AssistantIntent) : "unknown";
}

// ---- Prompt ------------------------------------------------------------------

function systemPrompt(
  leadState: LeadPatch | null,
  turnCount: number,
  page?: string,
  lang?: string,
  activeProjects: SessionProject[] = [],
  universe: SessionProject[] = [],
): string {
  const ctx = buildContext();
  const projects = ctx.projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    tier: p.tier,
    category: p.category,
    oneLiner: p.oneLiner,
    proof: p.proof,
    stack: p.stack.slice(0, 6),
  }));
  const known = leadState
    ? Object.entries(leadState).filter(([, v]) => v).map(([k]) => k)
    : [];
  const stage = computeStage(leadState, turnCount);
  const score = scoreLead(leadState);

  return [
    `You are the Amorosi Labs guide — the on-site sales agent of ${ctx.profile.name} (${ctx.profile.role}).`,
    `Your mission: understand what the visitor needs, sell Juan's work with shipped evidence, and qualify the lead conversationally.`,
    ``,
    personaBlock(),
    ``,
    stageBlock(stage, score),
    ``,
    `HARD RULES:`,
    `- Answer ONLY from the site facts below. Never invent projects, metrics or links.`,
    `- Keep replies short (2-4 sentences), warm, concrete, in the visitor's language.`,
    `- You may call tools ONLY from this whitelist: ${[...TOOL_NAMES, ...serverToolNames(), "update_project", "confirm_palette", "set_brand_dna", "propose_decisions"].join(", ")}.`,
    webSearchEnabled()
      ? `- web_search(arg: query): research the visitor's company/product when they name it — use sparingly, once per conversation.`
      : ``,
    mockupsEnabled()
      ? `- generate_mockup(arg: visual description): render a quick visual mock of THEIR idea when it helps them see it real (max 3 per visitor).`
      : ``,
    activeProjects.length > 0
      ? `ACTIVE PRE-PROJECT${activeProjects.length > 1 ? "S" : ""} (the ORBIT — everything revolves around ${activeProjects.length > 1 ? "them" : "it"}): ${JSON.stringify(activeProjects.map((pr) => ({ id: pr.id, name: pr.name, kind: pr.kind, concept: pr.concept, stack: pr.stack, palette: pr.palette, phase: pr.phase })))}.
- Ground every reply in this project: refine its concept, decide its stack, shape its identity, and steer toward a meeting/contact with Juan to build it.
- MANDATORY: whenever the visitor confirms or requests ANY change to stack, name, concept or palette, your "tools" array MUST include (same reply, no exceptions): {"name":"update_project","arg":"{\\"id\\":${activeProjects[0].id},\\"stack\\":[...full updated array...]}"} — arg is a JSON STRING, only changed fields plus id, stack always the COMPLETE resulting list.
- generate_mockup must reflect this project's name/concept/palette.
- BRAND FOUNDATION: once the 3-color identity is agreed with the visitor, call {"name":"confirm_palette"} ONCE (this unlocks heavier visual generation). When you capture the brand's personality/tone/keywords, persist them with {"name":"set_brand_dna","arg":"{\\"personality\\":\\"...\\",\\"tone\\":\\"...\\",\\"keywords\\":[\\"...\\"]}"} (arg is a JSON STRING).${
          activeProjects[0]?.phase === "decisions"
            ? `\n- DECISIONS PHASE: the project is resolving its open decisions. When the visitor raises a doubt (or you spot one worth settling), call {"name":"propose_decisions","arg":"{\\"items\\":[{\\"id\\":\\"stack\\",\\"question\\":\\"...\\",\\"options\\":[{\\"label\\":\\"...\\",\\"detail\\":\\"...\\"}]}]}"} (arg is a JSON STRING) — max 4 decisions, 2-4 options each, plain language for non-devs, NO tech jargon in labels. The visitor picks on a card; picks persist automatically. Keep the message short: the card does the talking.`
            : ``
        }`
      : ``,
    universe.length > 0
      ? `SESSION UNIVERSE — everything this visitor is building this session (across ALL tabs): ${JSON.stringify(universe.map((pr) => ({ name: pr.name, kind: pr.kind, phase: pr.phase })))}. You are the thread that connects it all (the "hilbanador"): reference these projects by NAME when relevant, notice their progress ("I saw you started X — want to push it forward?"), connect ideas across them, and always steer toward Juan building them. You KNOW this whole universe even when the visitor switches tabs.`
      : ``,
    `PROJECT CO-CREATION: when the visitor describes their own project, act as a pre-project architect — progressively estimate the MINIMAL viable stack and keep it captured in lead.notes (e.g. "stack: Next.js + Postgres + WhatsApp API"). Once the idea is clear, offer a short marketing-style pitch of the pre-project${mockupsEnabled() ? " and a generate_mockup visual to make it tangible" : ""} — then move to contact.`,
    `- If the message contains [visitor shared an image: ...] you cannot see the pixels: acknowledge it warmly, ask what it shows / what matters in it, and treat it as project context.`,
    `- Useful extra tool: open_github (Juan's code). Prefer buttons/actions over pasting raw links.`,
    `- Lead qualification is a conversation, not a form: at most ONE gentle question per reply. Never re-ask what is already known. Known so far: ${known.length ? known.join(", ") : "nothing"}.`,
    `- If the visitor shares contact info, company, budget or a project need, capture it in "lead".`,
    `- If asked for a CV, use tool open_or_generate_cv. To contact, open_contact.`,
    page ? `- The visitor is currently on page: ${page.slice(0, 120)} — use it as context (e.g. on a project room, lead with that project).` : ``,
    lang ? `- The visitor's UI language is "${lang}". DEFAULT to that language for every reply, button label and question — switch only if they clearly write in another one.` : ``,
    ``,
    `SITE FACTS (ground truth): ${JSON.stringify({ profile: { name: ctx.profile.name, role: ctx.profile.role, tagline: ctx.profile.tagline }, projects, capabilities: ctx.capabilities })}`,
    ``,
    `OUTPUT: strict JSON only, shape:`,
    `{"message": string, "intent": one of ${JSON.stringify(KNOWN_INTENTS)}, "tools": [{"name": string, "arg"?: string|string[]}], "lead"?: {"name"?,"email"?,"phone"?,"company"?,"budget"?,"need"?,"notes"?}}`,
  ].join("\n");
}

// ---- LLM path ----------------------------------------------------------------

/** One timed, logged completion; returns validated JSON or null. */
async function completeAndParse(
  sessionId: string,
  messages: LlmMessage[],
): Promise<z.infer<typeof llmReplySchema> | null> {
  const t0 = Date.now();
  const raw = await chatCompletion(messages);
  if (!raw) {
    await logAiCall({ sessionId, model: llmModel(), ok: false, latencyMs: Date.now() - t0, error: "no_response" });
    return null;
  }
  try {
    // tolerate models that wrap JSON in code fences
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = llmReplySchema.parse(JSON.parse(jsonText));
    await logAiCall({ sessionId, model: llmModel(), ok: true, latencyMs: Date.now() - t0 });
    return parsed;
  } catch (err) {
    await logAiCall({
      sessionId,
      model: llmModel(),
      ok: false,
      latencyMs: Date.now() - t0,
      error: `bad_output: ${(err as Error).message}`,
    });
    console.error("[agent] LLM output rejected (falling back):", (err as Error).message);
    return null;
  }
}

const argToString = (arg?: string | string[]): string =>
  Array.isArray(arg) ? arg.join(" ") : (arg ?? "");

async function tryLlmResponse(
  sessionId: string,
  text: string,
  history: AssistantRequestMessage[],
  leadState: LeadPatch | null,
  page?: string,
  lang?: string,
  activeProjects: SessionProject[] = [],
  universe: SessionProject[] = [],
): Promise<{ response: AssistantResponse; lead?: z.infer<typeof leadPatchSchema> } | null> {
  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt(leadState, history.length, page, lang, activeProjects, universe) },
    ...history.map((h) => ({ role: h.role, content: h.content }) as LlmMessage),
    { role: "user", content: text },
  ];

  let parsed = await completeAndParse(sessionId, messages);
  if (!parsed) return null;

  // SERVER TOOLS — tool-first, single round, no loops:
  // web_search feeds ONE follow-up completion; generate_mockup attaches an
  // image card. Both degrade to "continue without the tool" on any failure.
  const askedSearch = (parsed.tools ?? []).find((t) => t.name === "web_search");
  if (askedSearch && webSearchEnabled()) {
    const found = await runWebSearch(argToString(askedSearch.arg));
    if (found) {
      const followup = await completeAndParse(sessionId, [
        ...messages,
        { role: "assistant", content: JSON.stringify(parsed) },
        {
          role: "user",
          content: `[web_search results — ground your reply on these, do not call web_search again]\n${found}`,
        },
      ]);
      if (followup) parsed = followup;
    }
  }

  // update_project: persist the orbit's decisions (JSON-string arg, validated)
  for (const t of parsed.tools ?? []) {
    if (t.name !== "update_project") continue;
    try {
      const raw = JSON.parse(argToString(t.arg));
      const { id, ...rest } = raw ?? {};
      const patch = projectPatchSchema.parse(rest);
      if (typeof id === "number" && (await updateSessionProject(sessionId, id, patch))) {
        await recordEvent("ai.tool.called", { tool: "update_project", id });
      }
    } catch (err) {
      await recordEvent("ai.tool.failed", {
        tool: "update_project",
        error: (err as Error).message.slice(0, 120),
      });
    }
  }

  // brand-foundation tools: persist palette confirmation + Brand DNA to the
  // shared workspace (T04). Only when a project is active; JSON-string arg.
  const brandProjectId = activeProjects[0]?.id;
  if (typeof brandProjectId === "number") {
    for (const t of parsed.tools ?? []) {
      if (t.name === "confirm_palette") {
        if (await confirmPalette(brandProjectId)) {
          await recordEvent("ai.tool.called", { tool: "confirm_palette", id: brandProjectId });
        }
      } else if (t.name === "set_brand_dna") {
        try {
          const patch = brandDnaArgSchema.parse(JSON.parse(argToString(t.arg)));
          if (await upsertBrandDNA(brandProjectId, patch)) {
            await recordEvent("ai.tool.called", { tool: "set_brand_dna", id: brandProjectId });
          }
        } catch (err) {
          await recordEvent("ai.tool.failed", {
            tool: "set_brand_dna",
            error: (err as Error).message.slice(0, 120),
          });
        }
      }
    }
  }

  // propose_decisions (Fase 2d): validated decision cards ride the reply; the
  // client renders them and persists picks via /api/assistant/decisions.
  let decisionsCard: AssistantCard | null = null;
  const askedDecisions = (parsed.tools ?? []).find((t) => t.name === "propose_decisions");
  if (askedDecisions && typeof brandProjectId === "number") {
    try {
      const arg = proposeDecisionsArgSchema.parse(JSON.parse(argToString(askedDecisions.arg)));
      // zod's inferred output widens to all-optional here; parse() guarantees the
      // required shape at runtime, so narrow to DecisionProposal[] explicitly.
      decisionsCard = { type: "decisions", items: arg.items as DecisionProposal[] };
      await recordEvent("ai.tool.called", { tool: "propose_decisions", id: brandProjectId });
    } catch (err) {
      await recordEvent("ai.tool.failed", {
        tool: "propose_decisions",
        error: (err as Error).message.slice(0, 120),
      });
    }
  }

  let mockupCard: AssistantCard | null = null;
  const askedMockup = (parsed.tools ?? []).find((t) => t.name === "generate_mockup");
  if (askedMockup && mockupsEnabled()) {
    const brief = argToString(askedMockup.arg);
    const mock = await runGenerateMockup(sessionId, brief);
    if (mock && "url" in mock) {
      mockupCard = { type: "image", src: mock.url, alt: "Generated concept mockup" };
      // persist as a first-class ASSET, not only a chat message (spec 13) — so
      // it lands in the vault + admin dossier and can seed later generations.
      const mockProjectId = activeProjects[0]?.id;
      if (typeof mockProjectId === "number") {
        await addAsset(mockProjectId, {
          role: "reference",
          source: "generated",
          url: mock.url,
          promptSummary: brief.slice(0, 300),
        });
      }
      // branding milestone: the visitor is investing in the identity
      await recordEvent("mockup.generated", { sessionId, project: activeProjects[0]?.name });
      void notifyAdmin("mockup_generated", {
        sessionId,
        project: activeProjects[0]?.name,
        description: brief.slice(0, 300),
        imageUrl: `${env.NEXT_PUBLIC_SITE_URL}${mock.url}`,
        adminUrl: dossierUrl(sessionId),
      });
    }
  }

  // Map remaining tool calls through the whitelisted CLIENT registry
  // (server tools and unknown names are no-ops there).
  let actions: AssistantAction[] = [];
  let cards: AssistantCard[] = [];
  for (const t of parsed.tools ?? []) {
    const res = callTool(t.name, t.arg);
    actions = [...actions, ...res.actions];
    cards = [...cards, ...res.cards];
  }
  if (mockupCard) cards = [mockupCard, ...cards];
  if (decisionsCard) cards = [decisionsCard, ...cards];

  const response = enforceResponse({
    message: parsed.message,
    intent: normalizeIntent(parsed.intent),
    actions,
    cards,
    safety: { source: "site_content", confidence: "medium" },
  });
  return { response, lead: parsed.lead };
}

// ---- Public entry point --------------------------------------------------------

export async function runAgent(input: {
  sessionId: string;
  message: string;
  /** client-provided fallback history (used only when the DB has none) */
  clientHistory: AssistantRequestMessage[];
  /** current path the visitor is on (visit context for the brain) */
  page?: string;
  /** session-scoped /api/media image urls the visitor shared (pre-validated) */
  attachments?: string[];
  /** loginless identity legs (device id + ip hash) persisted into meta */
  identity?: {
    deviceId?: string;
    ipHash?: string;
    campaign?: string;
    country?: string;
    device?: string;
  };
  /** conversation tab (0-4) within the session */
  thread?: number;
  /** visitor's UI language (al_lang) — reply default */
  lang?: string;
  /** pre-project ids pinned to this chat tab (session-scoped) */
  projectIds?: number[];
}): Promise<AssistantResponse> {
  const { sessionId, message, clientHistory, page, attachments = [], identity, thread = 0, lang, projectIds = [] } = input;

  // 1. deterministic guard — refusals never reach the LLM or memory
  const guard = guardInput(message);
  if (!guard.ok) {
    return enforceResponse((guard as { response: AssistantResponse }).response);
  }
  let text = (guard as { cleaned: string }).cleaned;
  if (attachments.length > 0) {
    text += attachments.map((a) => `\n[visitor shared an image: ${a}]`).join("");
  }

  // 2. memory: register session + visit context + identity legs
  await touchSession(sessionId, {
    ...(page ? { lastPage: page } : {}),
    ...(identity?.deviceId ? { deviceId: identity.deviceId } : {}),
    ...(identity?.ipHash ? { ipHash: identity.ipHash } : {}),
    ...(identity?.campaign ? { campaign: identity.campaign } : {}),
    ...(identity?.country ? { country: identity.country } : {}),
    ...(lang ? { lang } : {}),
  });
  const dbHistory = await loadHistory(sessionId, thread);
  const history = dbHistory.length > 0 ? dbHistory : clientHistory;
  if (history.length === 0) {
    await recordEvent("session.started", { sessionId, page });
    // the admin hears about every new conversation, in real time — with every
    // identity signal already on the table (rebound sessions carry their lead)
    const knownLead = await getLead(sessionId);
    void notifyAdmin("session_started", {
      sessionId,
      page,
      firstMessage: text.slice(0, 400),
      lang,
      country: identity?.country,
      device: identity?.device,
      campaign: identity?.campaign,
      returningLead: knownLead?.name || knownLead?.email || undefined,
      adminUrl: dossierUrl(sessionId),
    });
  }
  await saveTurn(sessionId, "user", text, undefined, thread);
  await recordEvent("session.message.created", { sessionId, role: "user" });

  // deterministic lead signals work with or without the LLM
  const signals = extractLeadSignals(text);
  const priorLead = await getLead(sessionId);

  // the ORBIT: pre-projects pinned to this tab (all session projects if the
  // tab pinned none but some exist — the agent should still know the universe)
  const allProjects = await listSessionProjects(sessionId);
  const activeProjects =
    projectIds.length > 0
      ? allProjects.filter((pr) => projectIds.includes(Number(pr.id)))
      : allProjects.slice(0, 3);

  // Deterministic safety net (tool-first, don't trust the model): when ONE
  // project is pinned and the message names known techs, merge them into its
  // stack ourselves — stack capture works even if the LLM skips the tool.
  if (activeProjects.length === 1) {
    const KNOWN_TECH = [
      "Next.js", "React Native", "React", "Node.js", "Python", "FastAPI",
      "Fastify", "PostgreSQL", "Postgres", "Redis", "Docker", "Prisma",
      "WhatsApp", "Mercado Pago", "Tailwind", "Supabase", "Firebase",
      "Stripe", "MongoDB", "TypeScript", "Flutter", "Cloudflare",
    ];
    const found = KNOWN_TECH.filter((k) =>
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
    ).map((k) => (k === "Postgres" ? "PostgreSQL" : k));
    const priorStack = activeProjects[0].stack;
    const merged = [...new Set([...priorStack, ...found])];
    if (merged.length > priorStack.length) {
      const updated = await updateSessionProject(sessionId, activeProjects[0].id, {
        stack: merged.slice(0, 20),
      });
      if (updated) {
        activeProjects[0] = updated;
        // also capture each NEW tech as a structured StackDecision (spec 12) —
        // the array on the project stays the quick view; decisions are the log
        for (const tech of found.filter((f) => !priorStack.includes(f))) {
          await addStackDecision(activeProjects[0].id, {
            category: "stack",
            option: tech,
            source: "inferred",
          });
        }
      }
    }
  }

  // 3. LLM path with 4. deterministic no-silence fallback
  let response: AssistantResponse | null = null;
  let leadPatch = signals;
  if (isLlmConfigured()) {
    const llm = await tryLlmResponse(sessionId, text, history, priorLead, page, lang, activeProjects, allProjects);
    if (llm) {
      response = llm.response;
      leadPatch = { ...signals, ...(llm.lead ?? {}) };
    }
  }
  if (!response) {
    response = buildResponse({ message: text, history });
  }

  // 5. persist lead + sales stage/score (code-computed) + assistant turn
  const patchHasData = Object.values(leadPatch).some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
  await upsertLead(sessionId, leadPatch);
  const finalLead = await getLead(sessionId);
  if (finalLead) {
    const priorStage = computeStage(priorLead, history.length);
    const stage = computeStage(finalLead, history.length + 1);
    const score = scoreLead(finalLead);
    await updateLeadStage(sessionId, stage, score);
    if (patchHasData) {
      await recordEvent(priorLead ? "lead.updated" : "lead.created", { sessionId, stage, score });
      await recordEvent("lead.scored", { sessionId, score, stage });
      // efficient long-term memory: one compact fact per turn that learned something
      void writeMemory(
        `Lead update (${Object.keys(leadPatch).join(", ")}): ${JSON.stringify(leadPatch)}`,
        "lead-fact",
        sessionId,
      );
    }
    // contact info just landed -> the admin hears about it immediately
    const newContact =
      (leadPatch.email && !priorLead?.email) || (leadPatch.phone && !priorLead?.phone);
    if (newContact) {
      await notifyAdmin("lead_received", {
        ...finalLead,
        stage,
        score,
        sessionId,
        adminUrl: dossierUrl(sessionId),
      });
    }
    // the moment a lead becomes CLOSE-ready, the admin gets an actionable ping
    if (stage === "close" && priorStage !== "close") {
      void notifyAdmin("admin_alert", {
        title: `Lead listo para cerrar${finalLead.name ? `: ${finalLead.name}` : ""} (score ${score})`,
        detail: `${finalLead.company ?? "—"} · ${finalLead.email ?? finalLead.phone ?? "sin contacto"} · need: ${finalLead.need ?? "—"}. Dossier: ${dossierUrl(sessionId)}`,
      });
    }
  }
  await saveTurn(sessionId, "assistant", response.message, response.intent, thread);
  await recordEvent("ai.response.generated", {
    sessionId,
    intent: response.intent,
    via: isLlmConfigured() ? "llm_or_fallback" : "deterministic",
  });

  return response;
}
