import { notFound } from "next/navigation";
import { getLivePublicProjectBySlug } from "@/lib/projects/public-projects";
import { ProjectRoom } from "@/components/projects/ProjectRoom";
import { SceneSetter } from "@/components/visual/SceneController";

export const dynamic = "force-dynamic";

export default async function PreviewRoom({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getLivePublicProjectBySlug(slug);
  if (!project) notFound();

  const palette = [
    project.theme.accent,
    project.theme.secondary,
    "#00f2ff",
    "#8b5cf6",
  ];

  return (
    <main className="w-full">
      <SceneSetter palette={palette} />
      <ProjectRoom project={project} />
    </main>
  );
}
