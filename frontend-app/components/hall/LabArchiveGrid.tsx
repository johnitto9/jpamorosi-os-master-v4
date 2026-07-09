// components/hall/LabArchiveGrid.tsx
// Path: components/hall/LabArchiveGrid.tsx
// Inputs: none (reads archive projects).
// Outputs: compact holographic trophy cards — same image-dominant aesthetic as
//          the Hall/Featured cards (missing hero -> branded particle panel).
// State: none.
// Data source: content/projects.ts getArchive().
// Failure mode: section hidden if no archive projects.

import type { Project } from "@/content/projects";
import { getPublicArchiveProjects } from "@/lib/projects/public-projects";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { HallOfFameCard } from "@/components/hall/HallOfFameCard";
import { CardCarousel } from "@/components/ui/card-carousel";

export function LabArchiveGrid({
  projects,
  header,
  enterLabel,
}: {
  projects?: Project[];
  header?: { eyebrow: string; title: string; description: string };
  /** i18n: translated card CTA */
  enterLabel?: string;
}) {
  const items = projects ?? getPublicArchiveProjects();
  if (items.length === 0) return null;

  return (
    <section id="lab-archive" className="relative flex min-h-screen w-full scroll-mt-20 items-center overflow-hidden py-14 md:py-16">
      {/* micro-universe: "cold storage shelf" — violet ambient + faint vertical
          shelf lines, edges faded so it blends into the neighbouring scenes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 80% 0%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(45% 45% at 10% 100%, rgba(139,92,246,0.07) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)",
          backgroundSize: "96px 100%",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 72%)",
        }}
      />
      {/* dark edge-fade strips removed — they drew seam lines over the aurora
          (only the Hall of Fame keeps its dark-room background) */}

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <SectionHeader
          className="mx-auto text-center [&>p]:justify-center"
          eyebrow={header?.eyebrow ?? "Lab Fragments"}
          title={header?.title ?? "Experiments, prototypes and useful obsessions."}
          description={
            header?.description ??
            "Prototypes, tools and research fragments. Evidence, not headline acts."
          }
          accent="#8b5cf6"
        />

        {/* same image-dominant holographic cards as Hall/Featured, riding the
            same infinite Embla ring — compact format preserved */}
        <div className="mx-auto mt-8 w-full">
          <CardCarousel
            ariaLabel="Lab archive carousel"
            accent="#8b5cf6"
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

export default LabArchiveGrid;
