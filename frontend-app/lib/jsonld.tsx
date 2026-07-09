// lib/jsonld.ts
// Typed JSON-LD builders (structured data) so Google understands the content
// and can show rich results. All values come from typed objects (never user
// input), so the controlled dangerouslySetInnerHTML render is XSS-safe.
//
// Schemas: CreativeWork/SoftwareSourceCode per project room, BreadcrumbList
// for navigation, CollectionPage for the /projects index. Person + WebSite
// live in the root layout.

import type { Project } from "@/content/projects";
import { absoluteUrl, siteUrl } from "./seo";
import { resolveMediaUrl } from "./media/resolve";

const PERSON = {
  "@type": "Person",
  name: "Juan Pablo Amorosi",
  url: siteUrl(),
} as const;

/** One project room → CreativeWork (with code + keywords from the stack). */
export function projectJsonLd(p: Project): Record<string, unknown> {
  const image = resolveMediaUrl(p.assets.heroImage) ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.title,
    alternateName: p.labTitle,
    description: p.oneLiner,
    url: absoluteUrl(`/projects/${p.slug}`),
    ...(image ? { image: absoluteUrl(image) } : {}),
    author: PERSON,
    creator: PERSON,
    keywords: p.stack.join(", "),
    genre: p.category,
    ...(p.links?.github ? { codeRepository: p.links.github } : {}),
    ...(p.links?.website || p.links?.demo
      ? { sameAs: [p.links.website, p.links.demo].filter(Boolean) }
      : {}),
  };
}

export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function collectionJsonLd(projects: Project[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Project Rooms — Amorosi Labs",
    url: absoluteUrl("/projects"),
    author: PERSON,
    hasPart: projects.map((p) => ({
      "@type": "CreativeWork",
      name: p.title,
      url: absoluteUrl(`/projects/${p.slug}`),
    })),
  };
}

/** Controlled renderer — data is typed, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
