// components/projects/EvidenceWall.tsx
// Inputs: project. Outputs: screenshot grid, or branded placeholder tiles when
// no screenshots exist yet (assets not generated in this phase).
// State: none. Data: Project.assets.screenshots.

import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { SmartImage } from "@/components/design-system/SmartImage";
import { HolographicCard } from "@/components/ui/holographic-card";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { CardCarousel } from "@/components/ui/card-carousel";
import { resolveMediaUrl } from "@/lib/media/resolve";

export async function EvidenceWall({ project }: { project: Project }) {
  const { r } = await getDict();
  const shots = project.assets.screenshots ?? [];
  const { theme } = project;
  // Placeholder tiles until real media lands (see docs/PROJECT_MEDIA_GUIDE.md).
  const tiles = shots.length > 0 ? shots : [undefined, undefined, undefined];

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader
        eyebrow={r.evidenceEyebrow}
        title={r.evidenceTitle}
        description={
          shots.length > 0
            ? undefined
            : r.evidenceEmpty
        }
        accent={theme.accent}
      />

      {/* same holo tiles, but riding the infinite Embla ring: unlimited
          screenshots (admin can add as many as it wants), 1/2/3 per view —
          layout and look untouched, only the rail moves */}
      {shots.length >= 3 ? (
        <div className="mt-6">
          <CardCarousel
            ariaLabel={`${project.title} evidence carousel`}
            accent={theme.accent}
            items={shots.map((src, i) => ({ id: `${src}-${i}`, title: `Screenshot ${i + 1}` }))}
            slides={shots.map((src, i) => (
              <HolographicCard key={`${src}-${i}`} intensity="subtle" restTilt={6}>
                <SmartImage
                  src={resolveMediaUrl(src)}
                  alt={`${project.title} screenshot ${i + 1}`}
                  accent={theme.accent}
                  glow={theme.glow}
                  className="aspect-video w-full rounded-xl border border-white/10"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </HolographicCard>
            ))}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((src, i) => (
            <HolographicCard
              key={src ?? `placeholder-${i}`}
              intensity="subtle"
              restTilt={6}
            >
              <SmartImage
                src={resolveMediaUrl(src)}
                alt={src ? `${project.title} screenshot ${i + 1}` : `${project.title} evidence placeholder`}
                accent={theme.accent}
                glow={theme.glow}
                label="Coming soon"
                className="aspect-video w-full rounded-xl border border-white/10"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </HolographicCard>
          ))}
        </div>
      )}
    </section>
  );
}

export default EvidenceWall;
