import type { Metadata } from "next";
import Link from "next/link";
import { HallOfFameGrid } from "@/components/hall/HallOfFameGrid";
import { FeaturedSystemsGrid } from "@/components/hall/FeaturedSystemsGrid";
import { LabArchiveGrid } from "@/components/hall/LabArchiveGrid";
import { SceneSetter } from "@/components/visual/SceneController";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { getPublicGroupedAuto } from "@/lib/projects/public-projects";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { JsonLd, collectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { getDict } from "@/lib/i18n/server";
import { localizeProjects } from "@/lib/i18n/translate";

export const metadata: Metadata = {
  title: "Project Rooms — Amorosi Labs",
  description:
    "Every Amorosi Labs system as a room: Hall of Fame flagships, featured systems, and the lab archive.",
  alternates: { canonical: "/projects" },
};

// SSR so live mode (Docker) reflects admin edits; reads seed on Vercel (safe).
export const dynamic = "force-dynamic";

export default async function ProjectsIndexPage() {
  const grouped = await getPublicGroupedAuto();
  const { lang, t, r } = await getDict();
  const [hall, featured, archive] = await Promise.all([
    localizeProjects(grouped.hall, lang),
    localizeProjects(grouped.featured, lang),
    localizeProjects(grouped.archive, lang),
  ]);
  return (
    <main className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden text-primary-text antialiased">
      {/* Base palette for the index — the Hall carousel below promotes the
          selected flagship's brand color on top of this when it mounts. */}
      <SceneSetter palette={["#1E67C6", "#8b5cf6", "#00f2ff", "#00e0a4"]} />
      <JsonLd data={collectionJsonLd([...hall, ...featured, ...archive])} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Amorosi Labs", path: "/" },
        { name: "Project Rooms", path: "/projects" },
      ])} />
      <LanguageSwitch initial={lang} />
      <div className="mx-auto max-w-6xl px-6 pt-16">
        <Link
          href="/"
          className="text-sm text-white/60 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {r.indexBack}
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          {r.indexTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-white/60">{r.indexDesc}</p>
      </div>

      <HallOfFameGrid
        projects={hall}
        header={{ eyebrow: t.hallEyebrow, title: t.hallTitle, description: t.hallDesc }}
        enterLabel={r.enter}
      />
      <FeaturedSystemsGrid
        projects={featured}
        header={{ eyebrow: t.featuredEyebrow, title: t.featuredTitle, description: t.featuredDesc }}
        enterLabel={r.enter}
      />
      <LabArchiveGrid
        projects={archive}
        header={{ eyebrow: t.archiveEyebrow, title: t.archiveTitle, description: t.archiveDesc }}
        enterLabel={r.enter}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        <Link
          href="/os"
          className="inline-flex rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-purple-400/60 hover:text-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {r.openOs}
        </Link>
      </div>
      <AssistantWidget />
    </main>
  );
}
