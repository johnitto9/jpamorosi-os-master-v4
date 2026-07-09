// components/ui/tech-badge.tsx
// Stack chips with REAL brand marks (simple-icons, rendered server-side —
// zero client JS). Labels without a brand (concepts like "RAG", "Payments")
// get a matching lucide glyph, and anything unknown falls back to a generic
// package mark — EVERY chip carries an icon, admin-entered stacks never break.

import * as si from "simple-icons";
import {
  ArrowLeftRight,
  Binary,
  Bot,
  Boxes,
  Brain,
  Cloud,
  CreditCard,
  Database,
  FileSearch,
  Landmark,
  LineChart,
  ListOrdered,
  Network,
  ScanText,
  Server,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Split,
  Store,
  Wrench,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type SimpleIcon = { path: string; hex: string; title: string };

// Explicit map: portfolio stack label -> simple-icons export. Explicit beats
// slug-guessing: labels are human ("Next.js", "WhatsApp API"), not slugs.
const ICONS: Record<string, SimpleIcon | undefined> = {
  "next.js": si.siNextdotjs,
  react: si.siReact,
  "react native": si.siReact,
  typescript: si.siTypescript,
  javascript: si.siJavascript,
  python: si.siPython,
  fastapi: si.siFastapi,
  fastify: si.siFastify,
  "node.js": si.siNodedotjs,
  node: si.siNodedotjs,
  postgresql: si.siPostgresql,
  postgres: si.siPostgresql,
  redis: si.siRedis,
  docker: si.siDocker,
  prisma: si.siPrisma,
  "drizzle orm": si.siDrizzle,
  drizzle: si.siDrizzle,
  whatsapp: si.siWhatsapp,
  "whatsapp api": si.siWhatsapp,
  "whatsapp/baileys": si.siWhatsapp,
  vercel: si.siVercel,
  cloudflare: si.siCloudflare,
  "cloudflare r2": si.siCloudflare,
  strapi: si.siStrapi,
  graphql: si.siGraphql,
  "mercado pago": si.siMercadopago,
  mercadopago: si.siMercadopago,
  resend: si.siResend,
  minio: si.siMinio,
  capacitor: si.siCapacitor,
  "capacitor/pwa": si.siCapacitor,
  openrouter: si.siOpenrouter,
  tailwind: si.siTailwindcss,
  tailwindcss: si.siTailwindcss,
  "tailwind css": si.siTailwindcss,
  supabase: si.siSupabase,
  firebase: si.siFirebase,
  linux: si.siLinux,
  git: si.siGit,
  github: si.siGithub,
  gsap: si.siGreensock,
  greensock: si.siGreensock,
  pyside6: si.siQt,
  qt: si.siQt,
  nvidia: si.siNvidia,
  "nvidia 3090": si.siNvidia,
  huggingface: si.siHuggingface,
  langchain: si.siLangchain,
  kubernetes: si.siKubernetes,
  stripe: si.siStripe,
};

// Concept labels (no brand exists) -> lucide glyph. Covers every non-brand
// label currently used across the project stacks; extend freely.
const CONCEPT_ICONS: Record<string, LucideIcon> = {
  "ai agents": Bot,
  "multi-agent systems": Network,
  "ai orchestration": Workflow,
  "intent router": Split,
  "llm strategy": Brain,
  "prompt optimization": Sparkles,
  rag: FileSearch,
  "semantic analysis": ScanText,
  "vector databases": Database,
  chromadb: Database,
  etl: ArrowLeftRight,
  mlops: Server,
  "4-bit quantization": Binary,
  backtesting: LineChart,
  "risk management": ShieldAlert,
  fintech: Landmark,
  commerce: ShoppingCart,
  marketplace: Store,
  ecommerce: Store,
  "e-commerce": Store,
  payments: CreditCard,
  admin: Settings,
  "developer tools": Wrench,
  bullmq: ListOrdered,
  "microsoft azure": Cloud,
  azure: Cloud,
  runpod: Cloud,
};

// Keyword heuristics — the LAST net before the generic mark, so admin-edited
// labels like "Multi-model Orchestration" or "Evaluation Loops" still land on
// something meaningful. Ordered: first match wins.
const KEYWORD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/orchestrat/i, Workflow],
  [/memory|canon|context/i, Brain],
  [/eval|loop/i, Workflow],
  [/agent/i, Bot],
  [/rag|retrieval/i, FileSearch],
  [/vector|database|db\b/i, Database],
  [/router|routing/i, Split],
  [/prompt/i, Sparkles],
  [/quantiz/i, Binary],
  [/payment|checkout/i, CreditCard],
  [/commerce|marketplace|store/i, Store],
  [/risk/i, ShieldAlert],
  [/backtest|analytic|chart/i, LineChart],
  [/queue|jobs?\b/i, ListOrdered],
  [/pipeline|etl/i, ArrowLeftRight],
  [/cloud|serverless/i, Cloud],
  [/admin|settings/i, Settings],
  [/semantic|nlp/i, ScanText],
  [/network|multi-?agent/i, Network],
  [/mlops|infra|server/i, Server],
];

/** Label segments: "OpenRouter / BYOK" -> ["openrouter / byok","openrouter","byok"]. */
function segments(label: string): string[] {
  const k = label.trim().toLowerCase();
  return [k, ...k.split(/[/(),+·|]/).map((s) => s.trim()).filter(Boolean)];
}

function iconFor(label: string): SimpleIcon | undefined {
  // exact, then per-segment, then "label contains a known brand" substring
  for (const s of segments(label)) if (ICONS[s]) return ICONS[s];
  const k = label.trim().toLowerCase();
  for (const [key, icon] of Object.entries(ICONS)) {
    if (icon && key.length >= 4 && k.includes(key)) return icon;
  }
  return undefined;
}

function conceptIconFor(label: string): LucideIcon | undefined {
  for (const s of segments(label)) if (CONCEPT_ICONS[s]) return CONCEPT_ICONS[s];
  for (const [re, icon] of KEYWORD_ICONS) if (re.test(label)) return icon;
  return undefined;
}

export function TechBadge({ label }: { label: string }) {
  const icon = iconFor(label);
  // brand mark > concept glyph > generic package mark — never an empty dot
  const Concept = icon ? undefined : (conceptIconFor(label) ?? Boxes);
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/25">
      {icon ? (
        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
          <path d={icon.path} fill={`#${icon.hex}`} />
        </svg>
      ) : Concept ? (
        <Concept size={14} aria-hidden className="text-cyan-300/80" />
      ) : null}
      {label}
    </span>
  );
}

export function TechStack({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <TechBadge key={s} label={s} />
      ))}
    </div>
  );
}
