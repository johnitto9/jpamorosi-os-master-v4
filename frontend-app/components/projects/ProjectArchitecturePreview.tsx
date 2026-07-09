// components/projects/ProjectArchitecturePreview.tsx
// Inputs: project. Outputs: the "How it's wired" blueprint — nodes become
// icon tiles on a faint grid (keyword -> lucide icon, deterministic), the
// flow becomes a numbered pipeline with brand-lit connectors. Still pure
// HTML/CSS (no React Flow, per playbook 08); returns null without data.

import type { LucideIcon } from "lucide-react";
import {
  Store, LayoutGrid, Package, CreditCard, MonitorSmartphone, Server,
  Database, Cog, Bot, Sparkles, Brain, MessageSquare, Globe, Layers,
  ArrowLeftRight, Filter, FileJson, Table,
  FileText, Search, Truck, Users, Cpu,
} from "lucide-react";
import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { SectionHeader } from "@/components/design-system/SectionHeader";

// keyword -> icon (first match wins); Layers is the neutral fallback
const NODE_ICONS: Array<[RegExp, LucideIcon]> = [
  [/store|shop|front/i, Store],
  [/catalog|listing|grid/i, LayoutGrid],
  [/order|pick|stock/i, Package],
  [/pay|checkout|billing|settle/i, CreditCard],
  [/console|admin|panel|dashboard/i, MonitorSmartphone],
  [/api|backend|gateway|server/i, Server],
  [/db|database|postgres|storage/i, Database],
  [/etl|transform|normaliz/i, ArrowLeftRight],
  [/filter|quality|dedup|clean/i, Filter],
  [/jsonl?|export|builder/i, FileJson],
  [/dataset|training|fine-?tun/i, Table],
  [/raw|ingest|source|market data/i, Database],
  [/worker|queue|job|cron/i, Cog],
  [/bot|whatsapp|agent/i, Bot],
  [/ai|llm|model|inference/i, Sparkles],
  [/memory|context|canon/i, Brain],
  [/chat|message|conversation/i, MessageSquare],
  [/web|site|cdn|edge/i, Globe],
  [/content|editorial|article|cms/i, FileText],
  [/search|rank|index/i, Search],
  [/delivery|logistic|shipping/i, Truck],
  [/user|merchant|customer/i, Users],
  [/engine|core|orchestr/i, Cpu],
];

function iconFor(label: string): LucideIcon {
  return NODE_ICONS.find(([re]) => re.test(label))?.[1] ?? Layers;
}

export async function ProjectArchitecturePreview({ project }: { project: Project }) {
  const { r } = await getDict();
  const arch = project.architecture;
  if (!arch || (arch.nodes.length === 0 && arch.flow.length === 0)) return null;
  const { theme } = project;

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader eyebrow={r.archEyebrow} title={r.archTitle} accent={theme.accent} />

      {arch.nodes.length > 0 ? (
        <div
          className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 p-6"
          style={{
            backgroundImage: `linear-gradient(${theme.accent}0d 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}0d 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {arch.nodes.map((n) => {
              const Icon = iconFor(n);
              return (
                <div
                  key={n}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border bg-black/40 px-3 py-4 text-center backdrop-blur-sm transition-transform hover:-translate-y-1"
                  style={{ borderColor: `${theme.accent}44`, boxShadow: `0 0 30px -18px ${theme.glow}` }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"
                    style={{ color: theme.accent }}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="text-xs font-medium leading-snug text-white/85">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {arch.flow.length > 0 ? (
        <div className="mt-8">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            Flow
          </p>
          <ol className="flex flex-wrap items-center gap-y-4">
            {arch.flow.map((step, i) => (
              <li key={step} className="flex items-center">
                <span
                  className="flex items-center gap-2 rounded-full border bg-black/50 py-1.5 pl-2 pr-3.5 text-sm text-white/85"
                  style={{ borderColor: `${theme.accent}44` }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold text-black"
                    style={{ background: theme.accent }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < arch.flow.length - 1 ? (
                  <span
                    aria-hidden
                    className="mx-2 h-px w-6 sm:w-9"
                    style={{
                      background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}22)`,
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

export default ProjectArchitecturePreview;
