import Link from "next/link";
import {
  getLivePublicHallOfFameProjects,
  getLivePublicFeaturedProjects,
  getLivePublicArchiveProjects,
} from "@/lib/projects/public-projects";
import { HallHero } from "@/components/hall/HallHero";
import { HallOfFameGrid } from "@/components/hall/HallOfFameGrid";
import { FeaturedSystemsGrid } from "@/components/hall/FeaturedSystemsGrid";
import { LabArchiveGrid } from "@/components/hall/LabArchiveGrid";
import { SceneSetter } from "@/components/visual/SceneController";

// LIVE: read repository (local-json) at request time.
export const dynamic = "force-dynamic";

export default async function PreviewHome() {
  const [hall, featured, archive] = await Promise.all([
    getLivePublicHallOfFameProjects(),
    getLivePublicFeaturedProjects(),
    getLivePublicArchiveProjects(),
  ]);

  return (
    <main className="w-full">
      <SceneSetter palette={["#00e0a4", "#1E67C6", "#8b5cf6", "#00f2ff"]} />
      <HallHero />
      <HallOfFameGrid projects={hall} />
      <FeaturedSystemsGrid projects={featured} />
      <LabArchiveGrid projects={archive} />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-4 text-center text-xs text-white/40">
        Live preview of local-json content ·{" "}
        <Link href="/admin" className="underline hover:text-white">
          edit in admin
        </Link>
      </div>
    </main>
  );
}
