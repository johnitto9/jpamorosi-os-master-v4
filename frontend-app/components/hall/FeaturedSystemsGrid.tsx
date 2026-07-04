// components/hall/FeaturedSystemsGrid.tsx
// Path: components/hall/FeaturedSystemsGrid.tsx
// Inputs: none (reads featured projects).
// Outputs: compact holographic trophy cards (same profile-picture 3D effect as
//          the Hall flagships — image-dominant, minimal aero text overlay).
// State: none.
// Data source: content/projects.ts getFeatured().
// Failure mode: section hidden if no featured projects.

import type { Project } from "@/content/projects";
import { getPublicFeaturedProjects } from "@/lib/projects/public-projects";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { HallOfFameCard } from "@/components/hall/HallOfFameCard";
import { CardCarousel } from "@/components/ui/card-carousel";

export function FeaturedSystemsGrid({
  projects,
  header,
  enterLabel,
}: {
  projects?: Project[];
  header?: { eyebrow: string; title: string; description: string };
  /** i18n: translated card CTA */
  enterLabel?: string;
}) {
  const items = projects ?? getPublicFeaturedProjects();
  if (items.length === 0) return null;

  return (
    <section id="featured" className="relative scroll-mt-20 overflow-hidden py-16">
      {/* micro-universe: "systems blueprint" — cool blue ambient + faint grid,
          edges faded so it blends into the neighbouring scenes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 20% 0%, rgba(0,112,243,0.12) 0%, transparent 60%), radial-gradient(50% 45% at 90% 100%, rgba(0,112,243,0.08) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,112,243,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,112,243,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 75%)",
        }}
      />
      {/* NOTE: the dark edge-fade strips were removed — over the live aurora
          they painted visible seam "lines" between sections. Only the Hall of
          Fame keeps its dark-room treatment; everything else sits directly on
          the global background like the hero. */}

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow={header?.eyebrow ?? "Featured Systems"}
          title={header?.title ?? "Systems that support the thesis"}
          description={
            header?.description ??
            "Substantial work reinforcing the story without competing with the flagship rooms."
          }
          accent="#0070f3"
        />

        {/* infinite Embla ring (like the Hall room) — cards keep their own
            compact format; 1/2/3 per view responsive */}
        <div className="mt-8">
          <CardCarousel
            ariaLabel="Featured systems carousel"
            accent="#0070f3"
            items={items.map((p) => ({ id: p.id, title: p.title }))}
            slides={items.map((p) => (
              <HallOfFameCard key={p.id} project={p} enterLabel={enterLabel} />
            ))}
          />
        </div>
      </div>
    </section>
  );
}

export default FeaturedSystemsGrid;
