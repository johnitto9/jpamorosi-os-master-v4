// components/projects/FounderNotes.tsx
// Inputs: project. Outputs: a short founder-note panel. Uses aiSummary as a
// stand-in when no dedicated note exists yet (placeholder-friendly).
// State: none. Data: Project.aiSummary.

import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { FlipCard } from "@/components/ui/flip-card";
import { HolographicCard } from "@/components/ui/holographic-card";

export async function FounderNotes({ project }: { project: Project }) {
  const { theme } = project;
  const { r } = await getDict();
  const note =
    project.aiSummary ||
    "Founder note coming soon — the story behind why this was built, the hard trade-offs, and what it proves.";
  const links = project.links ?? {};

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader eyebrow={r.founderEyebrow} title={r.founderTitle} accent={theme.accent} />
      <div className="mt-6">
        <HolographicCard intensity="subtle" restTilt={4}>
        <FlipCard
          accent={theme.accent}
          glow={theme.glow}
          secondary={theme.secondary}
          back={{
            title: r.flipStory,
            cta: links.website
              ? { label: r.flipSeeLive, href: links.website }
              : { label: r.flipTalk, href: "/#contact" },
          }}
          front={
            <p className="p-6 text-base italic leading-relaxed text-white/75">
              “{note}”
            </p>
          }
        />
        </HolographicCard>
      </div>
    </section>
  );
}

export default FounderNotes;
