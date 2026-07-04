// components/projects/ProjectRoom.tsx
// Inputs: project. Outputs: the full first-pass project room (shared template
// for every tier). Composes hero, proof, architecture, evidence, founder note,
// and closing CTAs. Server component, static-safe.

import Link from "next/link";
import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { localizeCapabilities } from "@/lib/i18n/translate";
import { ProjectHero } from "@/components/projects/ProjectHero";
import { ProjectProofCards } from "@/components/projects/ProjectProofCards";
import { ProjectMediaShowcase } from "@/components/projects/ProjectMediaShowcase";
import { ProjectLinksBlock } from "@/components/projects/ProjectLinksBlock";
import { ProjectArchitecturePreview } from "@/components/projects/ProjectArchitecturePreview";
import { EvidenceWall } from "@/components/projects/EvidenceWall";
import { FounderNotes } from "@/components/projects/FounderNotes";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { SectionTransition } from "@/components/ui/section-transition";
import { HolographicCard } from "@/components/ui/holographic-card";

export async function ProjectRoom({
  project,
  related = [],
}: {
  project: Project;
  related?: Project[];
}) {
  const { lang, r } = await getDict();
  // "What this proves" = capabilities whose evidence includes this project —
  // localized so the chips follow the visitor like everything else.
  const provenCapabilities = (await localizeCapabilities(lang))
    .filter((c) => c.projects.includes(project.slug))
    .map((c) => c.capability);

  return (
    <article className="min-h-full w-full">
      <ProjectHero project={project} />
      <SectionTransition>
        <ProjectProofCards project={project} />
      </SectionTransition>

      {/* media wall: loop video + screenshots (hidden when the project has none) */}
      <SectionTransition>
        <ProjectMediaShowcase project={project} />
      </SectionTransition>

      {provenCapabilities.length > 0 ? (
        <SectionTransition>
        <section className="mx-auto max-w-5xl px-6 py-12">
          <SectionHeader
            eyebrow={r.provesEyebrow}
            title={r.provesTitle}
            accent={project.theme.accent}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {provenCapabilities.map((c) => (
              <span
                key={c}
                className="rounded-full border px-3 py-1.5 text-sm text-white/80"
                style={{ borderColor: `${project.theme.accent}55` }}
              >
                {c}
              </span>
            ))}
          </div>
        </section>
        </SectionTransition>
      ) : null}

      <SectionTransition>
        <ProjectArchitecturePreview project={project} />
      </SectionTransition>
      <SectionTransition>
        <EvidenceWall project={project} />
      </SectionTransition>
      <SectionTransition>
        <FounderNotes project={project} />
      </SectionTransition>

      {/* distribution links: website / demo / stores / source */}
      <SectionTransition>
        <ProjectLinksBlock project={project} />
      </SectionTransition>

      {related.length > 0 ? (
        <SectionTransition>
        <section className="mx-auto max-w-5xl px-6 py-12">
          <SectionHeader eyebrow={r.relatedEyebrow} title={r.relatedTitle} accent={project.theme.accent} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <HolographicCard key={r.slug} intensity="subtle" restTilt={6} className="h-full">
                <Link
                  href={`/projects/${r.slug}`}
                  className="group block h-full rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: r.theme.accent }}>
                      {r.category}
                    </span>
                    <span className="text-white/40 transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-white">{r.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/60">{r.oneLiner}</p>
                </Link>
              </HolographicCard>
            ))}
          </div>
        </section>
        </SectionTransition>
      ) : null}

      {/* Closing CTAs */}
      <SectionTransition>
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-8">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-semibold text-white">{r.exploreMore}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/#hall-of-fame"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {r.backHall}
            </Link>
            <Link
              href="/projects"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {r.allRooms}
            </Link>
            <Link
              href="/os"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-purple-400/60 hover:text-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {r.openOs}
            </Link>
          </div>
        </div>
      </section>
      </SectionTransition>
    </article>
  );
}

export default ProjectRoom;
