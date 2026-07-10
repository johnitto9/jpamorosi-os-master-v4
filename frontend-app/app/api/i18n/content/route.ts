// app/api/i18n/content/route.ts
// GET ?lang=xx -> localized content map for env-less runtimes (Vercel SSR).
// The Vercel deployment has no DB and no LLM, so lib/i18n/translate.ts calls
// this endpoint (proxied same-origin in prod, or directly via
// BACKEND_PUBLIC_ORIGIN) and merges the result over its English floor.
// Everything is derived from THIS runtime's own project store + translation
// cache — the caller sends only a language, never text, so there is no
// LLM-abuse surface. Unknown lang or any failure -> empty map (EN floor).
import { NextResponse } from "next/server";
import { getPublicGroupedAuto } from "@/lib/projects/public-projects";
import {
  localizeProjects,
  localizeCapabilities,
  projectFields,
  type Fields,
} from "@/lib/i18n/translate";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") ?? "";
  if (!(lang in LANGS) || lang === "en") {
    return NextResponse.json({ entries: {} });
  }
  const grouped = await getPublicGroupedAuto();
  const all = [...grouped.hall, ...grouped.featured, ...grouped.archive];
  const [projects, caps] = await Promise.all([
    localizeProjects(all, lang as Lang),
    localizeCapabilities(lang as Lang),
  ]);
  const entries: Record<string, Fields> = {
    capabilities: { names: caps.map((c) => c.capability) },
  };
  for (const p of projects) entries[`project:${p.slug}`] = projectFields(p);
  // Partial-warmup detection: entries still on the EN floor mean the LLM is
  // translating in the background. Caching a partial response pinned a mixed
  // page (hall in Spanish, featured/archive in English) for 5 minutes — the
  // exact prod symptom. Incomplete → never cache; the next request re-asks.
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const complete = projects.every((p) => p.oneLiner !== bySlug.get(p.slug)?.oneLiner);
  return NextResponse.json(
    { entries, complete },
    {
      headers: {
        "Cache-Control": complete
          ? "public, s-maxage=300, stale-while-revalidate=600"
          : "no-store",
      },
    },
  );
}
