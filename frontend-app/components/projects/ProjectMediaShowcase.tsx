// components/projects/ProjectMediaShowcase.tsx
// Inputs: project. Outputs: the room's cinematic loop video (assets.heroVideo),
// resolved through the media resolver (Cloudflare-ready). Screenshots live in
// EvidenceWall (holographic gallery) — this block is video-only to avoid
// duplicating media. Renders nothing when the project has no video.

import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { BackgroundVideoPanel } from "@/components/visual/BackgroundVideoPanel";
import { resolveMediaUrl, resolveVideoUrl } from "@/lib/media/resolve";

export async function ProjectMediaShowcase({ project }: { project: Project }) {
  const { r } = await getDict();
  const video = resolveVideoUrl(project.assets.heroVideo);
  const poster = resolveMediaUrl(project.assets.heroVideoPoster);
  if (!video) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader
        eyebrow={r.motionEyebrow}
        title={r.motionTitle}
        accent={project.theme.accent}
      />
      <div
        className="relative mt-6 overflow-hidden rounded-2xl border border-white/10"
        style={{ boxShadow: `0 30px 80px -30px ${project.theme.glow}` }}
      >
        <BackgroundVideoPanel
          mp4={video}
          poster={poster}
          className="aspect-video w-full"
        />
        {/* brand frame glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: `inset 0 0 0 1px ${project.theme.accent}33` }}
        />
      </div>
    </section>
  );
}

export default ProjectMediaShowcase;
