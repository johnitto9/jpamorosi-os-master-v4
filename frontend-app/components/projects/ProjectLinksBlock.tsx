// components/projects/ProjectLinksBlock.tsx
// Inputs: project. Outputs: the room's closing DISTRIBUTION BAND — a store-
// grade banner ("app in your pocket" energy) when Play/App Store links exist,
// plus premium pills for website/demo/source. Hidden without links.

import type { Project } from "@/content/projects";
import { getDict } from "@/lib/i18n/server";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { SmartImage } from "@/components/design-system/SmartImage";
import {
  GooglePlayBadge,
  AppStoreBadge,
  LinkPill,
} from "@/components/ui/store-badges";
import { resolveMediaUrl } from "@/lib/media/resolve";

export async function ProjectLinksBlock({ project }: { project: Project }) {
  const { r } = await getDict();
  const links = project.links ?? {};
  const hasStore = !!(links.playstore || links.appstore);
  const hasSocial = !!(links.instagram || links.facebook);
  const hasAny = hasStore || hasSocial || !!(links.website || links.demo || links.github);
  if (!hasAny) return null;

  const { accent, glow } = project.theme;
  const logo = resolveMediaUrl(project.assets.logo);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <SectionHeader eyebrow={r.getEyebrow} title={r.getTitle} accent={accent} />

      {/* store band — the "available on" moment, store-listing energy */}
      {hasStore && (
        <div
          className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8"
          style={{
            background: `radial-gradient(90% 140% at 0% 0%, ${glow} 0%, rgba(5,6,11,0.9) 65%)`,
          }}
        >
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/60"
              style={{ boxShadow: `0 0 32px ${glow}` }}
            >
              {logo ? (
                <SmartImage src={logo} alt={`${project.title} icon`} className="h-full w-full" sizes="64px" fit="cover" />
              ) : (
                <span className="font-mono text-2xl font-bold" style={{ color: accent }}>
                  {project.title.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-white">{project.title} — in your pocket</p>
              <p className="mt-1 text-sm text-white/60">
                {project.oneLiner}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {links.playstore && <GooglePlayBadge href={links.playstore} />}
              {links.appstore && <AppStoreBadge href={links.appstore} />}
            </div>
          </div>
        </div>
      )}

      {/* web / demo / source pills */}
      {(links.website || links.demo || links.github || hasSocial) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {links.website && (
            <LinkPill href={links.website} label={r.linkWebsite} kind="website" accent={accent} primary />
          )}
          {links.demo && (
            <LinkPill href={links.demo} label={r.linkDemo} kind="demo" accent={accent} primary={!links.website} />
          )}
          {links.github && (
            <LinkPill href={links.github} label={r.linkSource} kind="github" accent={accent} />
          )}
          {/* social presence — brand names need no translation */}
          {links.instagram && (
            <LinkPill href={links.instagram} label="Instagram" kind="instagram" accent={accent} />
          )}
          {links.facebook && (
            <LinkPill href={links.facebook} label="Facebook" kind="facebook" accent={accent} />
          )}
        </div>
      )}
    </section>
  );
}

export default ProjectLinksBlock;
