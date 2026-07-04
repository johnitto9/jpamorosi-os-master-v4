import Link from "next/link";
import {
  getLivePublicHallOfFameProjects,
  getLivePublicFeaturedProjects,
  getLivePublicArchiveProjects,
} from "@/lib/projects/public-projects";
import { HallOfFameGrid } from "@/components/hall/HallOfFameGrid";
import { FeaturedSystemsGrid } from "@/components/hall/FeaturedSystemsGrid";
import { LabArchiveGrid } from "@/components/hall/LabArchiveGrid";
import { SceneSetter } from "@/components/visual/SceneController";

export const dynamic = "force-dynamic";

export default async function PreviewProjects() {
  const [hall, featured, archive] = await Promise.all([
    getLivePublicHallOfFameProjects(),
    getLivePublicFeaturedProjects(),
    getLivePublicArchiveProjects(),
  ]);

  return (
    <main className="w-full">
      <SceneSetter palette={["#1E67C6", "#8b5cf6", "#00f2ff", "#00e0a4"]} />
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <h1 className="text-3xl font-bold text-white">Project Rooms (live preview)</h1>
        <p className="mt-2 text-sm text-white/60">
          Reflecting local-json edits.{" "}
          <Link href="/admin" className="underline hover:text-white">
            Edit in admin
          </Link>
          . Rooms open at <code>/preview/projects/[slug]</code>.
        </p>
      </div>
      <HallOfFameGrid projects={hall} />
      <FeaturedSystemsGrid projects={featured} />
      <LabArchiveGrid projects={archive} />
    </main>
  );
}
