// components/projects/ProjectProofCards.tsx
// Inputs: project. Outputs: proof statement + INTERACTIVE flip highlights
// (click -> 3D flip -> punchline + CTA + confetti) + brand-mark tech stack.
// Backs are built deterministically from the project's real links — every
// claim flips into a way to VERIFY it (evidence before epic).

import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import type { RoomDict } from "@/lib/i18n/dictionaries";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { FlipCard, type FlipBack } from "@/components/ui/flip-card";
import { HolographicCard } from "@/components/ui/holographic-card";
import { TechStack } from "@/components/ui/tech-badge";

/** One verifiable back per available link, cycled across the highlight cards. */
function buildBacks(project: Project, r: RoomDict): FlipBack[] {
  const links = project.links ?? {};
  const backs: FlipBack[] = [];
  if (links.website)
    backs.push({ title: r.flipTryLive, cta: { label: r.flipOpenSite, href: links.website } });
  if (links.playstore)
    backs.push({ title: r.flipStore, cta: { label: r.flipGetPlay, href: links.playstore } });
  if (links.demo)
    backs.push({ title: r.flipSee, cta: { label: r.flipOpenDemo, href: links.demo } });
  if (links.github)
    backs.push({ title: r.flipCode, cta: { label: r.flipGithub, href: links.github } });
  backs.push({
    title: r.flipFriction,
    cta: { label: r.flipTalk, href: "/#contact" },
  });
  return backs;
}

export async function ProjectProofCards({ project }: { project: Project }) {
  const { theme } = project;
  const { r } = await getDict();
  const backs = buildBacks(project, r);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader eyebrow={r.proofEyebrow} title={r.proofTitle} accent={theme.accent} />

      {project.proof ? (
        <p
          className="mt-6 border-l-2 pl-4 text-lg italic leading-relaxed text-white/75"
          style={{ borderColor: theme.accent }}
        >
          {project.proof}
        </p>
      ) : null}

      {project.highlights.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {project.highlights.slice(0, 4).map((h, i) => (
            // best of both worlds: the holographic rest-tilt (irregular 3D
            // rectangle + sheen on hover) WRAPS the flip interaction
            <HolographicCard key={h} intensity="subtle" restTilt={5} className="h-full">
              <FlipCard
                accent={theme.accent}
                glow={theme.glow}
                secondary={theme.secondary}
                back={backs[i % backs.length]}
                front={
                  <div className="flex h-full gap-3 p-5">
                    <span className="mt-0.5 text-lg" style={{ color: theme.accent }}>
                      ▹
                    </span>
                    <p className="text-sm leading-relaxed text-white/80">{h}</p>
                  </div>
                }
              />
            </HolographicCard>
          ))}
        </div>
      ) : null}

      {project.stack.length > 0 ? (
        <div className="mt-10">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            {r.stack}
          </p>
          <TechStack items={project.stack} />
        </div>
      ) : null}
    </section>
  );
}

export default ProjectProofCards;
