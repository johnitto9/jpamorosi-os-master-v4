// components/hall/HallOfFameCard.tsx
// Path: components/hall/HallOfFameCard.tsx
// Inputs: project, `large` (hero carousel) or compact (featured grid) layout.
// Outputs: an image-dominant holographic trophy card — the hero visual fills
//          the card, minimal aero text floats over a glass veil, and the whole
//          card tilts in 3D with iridescent sheen (profile-picture effect).
// State: none here (HolographicCard owns the pointer interaction client-side).
// Data source: content/projects.ts (Project) via lib/media/resolve.ts.
// Failure mode: missing hero -> branded particle-wave visual panel.

import Link from "next/link";
import type { Project } from "@/content/projects";
import { HolographicCard } from "@/components/ui/holographic-card";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { SmartImage } from "@/components/design-system/SmartImage";
import { ParticleWaveField } from "@/components/ui/particle-wave-field";
import { DitheringShader } from "@/components/ui/dithering-shader";
import { resolveMediaUrl } from "@/lib/media/resolve";
import { cn } from "@/lib/utils";

type WaveVariant = "cyan" | "emerald" | "violet" | "gold" | "mixed";

// Map a project accent hex to a particle-wave variant (restrained palette).
function waveVariant(accent: string): WaveVariant {
  const a = accent.toLowerCase();
  if (a.startsWith("#f0a") || a.startsWith("#ff8") || a.startsWith("#ffd")) return "gold";
  if (a.startsWith("#00e") || a.startsWith("#00ff8")) return "emerald";
  if (a.startsWith("#8b5") || a.startsWith("#ff0") || a.startsWith("#6366")) return "violet";
  return "cyan";
}

export function HallOfFameCard({
  project,
  large = false,
  enterLabel = "Enter →",
}: {
  project: Project;
  large?: boolean;
  /** i18n: translated CTA (defaults to English) */
  enterLabel?: string;
}) {
  const { theme } = project;
  const href = `/projects/${project.slug}`;
  const hero = resolveMediaUrl(project.assets.heroImage);
  const logo = resolveMediaUrl(project.assets.logo);

  return (
    <HolographicCard
      restTilt={large ? 10 : 7}
      intensity={large ? "medium" : "subtle"}
      className="h-full w-full"
    >
      <div
        className={cn(
          "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/50",
          large ? "aspect-[4/5] sm:aspect-[16/13]" : "aspect-[4/5]",
        )}
      >
        {/* full-bleed visual — the image IS the card */}
        <div className="absolute inset-0">
          {hero ? (
            <SmartImage
              src={hero}
              alt={`${project.title} — ${project.oneLiner}`}
              accent={theme.accent}
              glow={theme.glow}
              label={project.title}
              className="h-full w-full"
              sizes={large ? "(max-width: 768px) 90vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
            />
          ) : (
            // Branded particle-wave visual panel (the Hall-of-Fame guide look)
            <div className="relative h-full w-full overflow-hidden bg-black/40">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(90% 80% at 50% 40%, ${theme.glow} 0%, transparent 70%)`,
                }}
              />
              {/* LumenScript gets an extra dithered-gold depth layer (1 place) */}
              {project.slug === "lumenscript" && (
                <DitheringShader color={theme.accent} speed={0.6} className="opacity-40" />
              )}
              <ParticleWaveField
                variant={waveVariant(theme.accent)}
                density={large ? "high" : "medium"}
                className="opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                <span
                  className="font-mono text-sm font-semibold uppercase tracking-[0.4em] sm:text-base"
                  style={{ color: theme.accent }}
                >
                  {project.title}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* readability scrim: image stays dominant, text stays legible */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 26%, transparent 48%, rgba(3,4,8,0.82) 100%)",
          }}
        />
        {/* brand glow rising from the bottom edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-60 transition-opacity duration-500 group-hover:opacity-90"
          style={{
            background: `radial-gradient(80% 90% at 50% 100%, ${theme.glow} 0%, transparent 70%)`,
          }}
        />

        {/* top row: logo chip + status, floating over the image */}
        <div className="relative flex items-start justify-between p-4">
          <div
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-black/70"
            style={{ boxShadow: `0 0 24px ${theme.glow}` }}
          >
            {logo ? (
              // fill the whole chip (zoom-crop; logo assets often carry padding)
              <SmartImage
                src={logo}
                alt={`${project.title} logo`}
                className="h-full w-full"
                sizes="40px"
                fit="cover"
              />
            ) : (
              <span
                className="font-mono text-sm font-bold"
                style={{ color: theme.accent }}
              >
                {project.title.charAt(0)}
              </span>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* bottom aero panel: few words, glass, efficient */}
        <div className="relative mt-auto p-4 sm:p-5">
          <div className="rounded-xl border border-white/10 bg-black/70 p-4">
            <span
              // block+truncate: translated categories ("AI EN PRODUCCIÓN ·
              // MEDIOS LOCALES") wrapped to two spaced-out lines on phones and
              // pushed the chips/CTA out of the aspect-locked card.
              className="block truncate font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em]"
              style={{ color: theme.accent }}
            >
              {project.category}
            </span>
            <h3
              className={cn(
                "mt-1 font-bold text-white",
                large ? "text-xl sm:text-2xl" : "text-lg",
              )}
            >
              {project.title}
            </h3>
            <p
              className={cn(
                "mt-1 leading-snug text-white/70",
                // large: DB one-liners grew post-refactor; unclamped they
                // overflow the aspect-locked card on narrow phones.
                large ? "line-clamp-3 text-sm sm:line-clamp-none" : "line-clamp-2 text-xs sm:text-sm",
              )}
            >
              {project.oneLiner}
            </p>

            {/* phones: STACK chips and CTA — side-by-side the shrink-0 CTA
                (long localized labels) squeezed the chips into one tall
                column that overflowed the card bottom. */}
            <div className="mt-3 flex flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              {/* min-h reserves TWO chip rows on compact cards so siblings in a
                  carousel keep equal heights whether their labels wrap or not
                  (short-label stacks used to collapse to one row → shorter card).
                  content-end keeps a single row anchored to the bottom. */}
              <div
                className={cn(
                  "flex flex-wrap gap-1.5",
                  !large && "min-h-[46px] content-end",
                )}
              >
                {/* compact cards cap at 3 chips — a 4th with long labels wraps
                    to a THIRD row and breaks the group's shared height; the
                    min-h above (not chip count) is what equalizes short stacks */}
                {project.stack.slice(0, large ? 4 : 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-white/60"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-sm"
                style={{ borderColor: theme.accent, color: theme.accent }}
                aria-label={`Enter the ${project.title} project room`}
              >
                {enterLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HolographicCard>
  );
}

export default HallOfFameCard;
