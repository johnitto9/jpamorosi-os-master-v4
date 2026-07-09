import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicProjectsAuto,
  getPublicProjectBySlugAuto,
} from "@/lib/projects/public-projects";
import { ProjectRoom } from "@/components/projects/ProjectRoom";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { SceneSetter } from "@/components/visual/SceneController";
import { ScrollStage } from "@/components/ui/scroll-stage";
import { getLang } from "@/lib/i18n/server";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { localizeProjects } from "@/lib/i18n/translate";

// SAME content source as the home (auto: live repo in Docker/dev, static seed
// on Vercel). The rooms used to read ONLY the compiled seed, so admin-uploaded
// screenshots/videos showed in the Hall but never inside their own room.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlugAuto(slug);
  if (!project) return { title: "Project not found — Amorosi Labs" };
  return {
    title: `${project.title} — Amorosi Labs`,
    description: project.oneLiner,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.title} — Amorosi Labs`,
      description: project.oneLiner,
      url: `/projects/${project.slug}`,
      images: project.assets.heroImage ? [{ url: project.assets.heroImage }] : undefined,
    },
  };
}

export default async function ProjectRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const canonical = await getPublicProjectBySlugAuto(slug);
  if (!canonical) notFound();

  // Related: same tier first, then others; exclude self; max 2.
  const all = await getPublicProjectsAuto();
  const others = all.filter((p) => p.slug !== canonical.slug);
  const relatedCanonical = [
    ...others.filter((p) => p.tier === canonical.tier),
    ...others.filter((p) => p.tier !== canonical.tier),
  ].slice(0, 2);

  // the room speaks the visitor's language: content through the LLM cache
  const lang = await getLang();
  const [[project], related] = await Promise.all([
    localizeProjects([canonical], lang),
    localizeProjects(relatedCanonical, lang),
  ]);

  // Project's brand palette drives the site-wide aurora on the room page —
  // ONLY the project's own tones (no home cyan/violet bleed-through): the
  // room is that project's world.
  const palette = [
    project.theme.accent,
    project.theme.secondary,
    project.theme.accent,
    project.theme.secondary,
  ];

  return (
    <ScrollStage className="no-scrollbar h-full w-full scroll-smooth overflow-y-auto overflow-x-hidden text-primary-text antialiased">
      <SceneSetter palette={palette} />
      <LanguageSwitch />
      <ProjectRoom project={project} related={related} />
      <AssistantWidget />
    </ScrollStage>
  );
}
