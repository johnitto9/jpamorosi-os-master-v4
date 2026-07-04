// components/projects/ProjectHero.tsx
// Inputs: project.
// Outputs: CLEAN branded room hero — brand glow + particle motif + giant
//          watermark, logo (always complete: object-contain), title,
//          one-liner, role chips, premium link buttons/badges, and the hero
//          image floating as a holographic card (same visual as the Hall
//          card). Only the busy full-bleed COVER PHOTO was removed.
// State: none (server component; particles/holo are client children).
// Failure: missing logo -> monogram; missing heroImage -> text-only layout.

import Link from "next/link";
import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { SmartImage } from "@/components/design-system/SmartImage";
import { HolographicCard } from "@/components/ui/holographic-card";
import { ParticleWaveField } from "@/components/ui/particle-wave-field";
import { GooglePlayBadge, AppStoreBadge, LinkPill } from "@/components/ui/store-badges";
import { resolveMediaUrl } from "@/lib/media/resolve";

export async function ProjectHero({ project }: { project: Project }) {
  const { r: rd } = await getDict();
  const { theme } = project;
  const hero = resolveMediaUrl(project.assets.heroImage);
  const logo = resolveMediaUrl(project.assets.logo);
  const links = project.links ?? {};

  return (
    <header className="relative overflow-hidden border-b border-white/10">
      {/* branded scene background — project tones only, no busy photo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at 15% 0%, ${theme.glow} 0%, transparent 60%), radial-gradient(60% 60% at 100% 20%, ${theme.glow} 0%, transparent 65%)`,
        }}
      />
      {/* brand particle motif, feathered to the bottom (guide look) */}
      <ParticleWaveField variant="mixed" density="medium" mask="bottom" className="opacity-60" />
      {/* giant faint title watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 select-none text-center font-mono text-[16vw] font-bold uppercase leading-none tracking-tighter opacity-[0.05]"
        style={{ color: theme.accent }}
      >
        {project.title}
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-20">
        <Link
          href="/#hall-of-fame"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          ← Hall of Fame
        </Link>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,380px)]">
          <div>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/50 backdrop-blur-sm"
                style={{ boxShadow: `0 0 32px ${theme.glow}` }}
              >
                {logo ? (
                  // fill the WHOLE tile (zooming in if the asset has padding)
                  <SmartImage
                    src={logo}
                    alt={`${project.title} logo`}
                    className="h-full w-full"
                    sizes="64px"
                    fit="cover"
                  />
                ) : (
                  <span className="font-mono text-xl font-bold" style={{ color: theme.accent }}>
                    {project.title.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-mono text-xs uppercase tracking-[0.25em]"
                  style={{ color: theme.accent }}
                >
                  {project.category}
                </span>
                <StatusBadge status={project.status} />
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              {project.title}
            </h1>
            {project.labTitle && project.labTitle !== project.title ? (
              <p className="mt-1 text-base text-white/50">{project.labTitle}</p>
            ) : null}

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              {project.oneLiner}
            </p>

            {project.role.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {project.role.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70"
                  >
                    {r}
                  </span>
                ))}
              </div>
            ) : null}

            {(links.demo || links.website || links.playstore || links.appstore || links.github) && (
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {links.demo && (
                  <LinkPill href={links.demo} label={rd.linkDemo} kind="demo" accent={theme.accent} primary />
                )}
                {links.website && (
                  <LinkPill
                    href={links.website}
                    label={rd.linkWebsite}
                    kind="website"
                    accent={theme.accent}
                    primary={!links.demo}
                  />
                )}
                {links.playstore && <GooglePlayBadge href={links.playstore} />}
                {links.appstore && <AppStoreBadge href={links.appstore} />}
                {links.github && (
                  <LinkPill href={links.github} label="Source" kind="github" accent={theme.accent} />
                )}
              </div>
            )}
          </div>

          {/* the room's trophy shot: hero image as a floating holographic card
              (same visual language as the Hall of Fame card) */}
          {hero ? (
            <HolographicCard restTilt={12} className="hidden lg:block">
              <div
                className="relative overflow-hidden rounded-2xl border border-white/10"
                style={{ boxShadow: `0 30px 90px -30px ${theme.glow}` }}
              >
                <SmartImage
                  src={hero}
                  alt={`${project.title} — hero`}
                  accent={theme.accent}
                  glow={theme.glow}
                  className="aspect-[4/3] w-full"
                  sizes="380px"
                  priority
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 55%, rgba(3,4,8,0.65) 100%)",
                  }}
                />
                <span
                  className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/70"
                  aria-hidden
                >
                  {project.labTitle || project.title}
                </span>
              </div>
            </HolographicCard>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default ProjectHero;
