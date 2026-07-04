// components/ui/tech-badge.tsx
// Stack chips with REAL brand marks (simple-icons, rendered server-side —
// zero client JS). Unknown techs fall back to a clean text chip, so admin-
// entered stacks never break. Brand color tints the mark, glass chip keeps
// the room aesthetic consistent.

import * as si from "simple-icons";

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
  chromadb: undefined,
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
  openrouter: undefined,
  bullmq: undefined,
  tailwind: si.siTailwindcss,
  tailwindcss: si.siTailwindcss,
  supabase: si.siSupabase,
  firebase: si.siFirebase,
  linux: si.siLinux,
  git: si.siGit,
  github: si.siGithub,
};

function iconFor(label: string): SimpleIcon | undefined {
  return ICONS[label.trim().toLowerCase()];
}

export function TechBadge({ label }: { label: string }) {
  const icon = iconFor(label);
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/25">
      {icon ? (
        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
          <path d={icon.path} fill={`#${icon.hex}`} />
        </svg>
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/40" />
      )}
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
