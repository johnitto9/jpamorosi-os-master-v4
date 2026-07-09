// lib/seo.ts
// Shared SEO helpers (BuenPick-grade): canonical origin, absolute URLs and a
// pageMetadata() factory so every page declares title/description/OG/twitter
// without repeating boilerplate. Used by generateMetadata in dynamic pages.

import type { Metadata } from "next";

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jpamorosi.dev";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  if (!path) return siteUrl();
  if (path.startsWith("http")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Neutral OG (Amorosi Labs brand card, 1200x630). Pages with a hero image
 *  override it. */
export const OG_NEUTRAL_IMAGE = "/og.jpg";

export function pageMetadata({
  title,
  description,
  path,
  image = OG_NEUTRAL_IMAGE,
  type = "website",
  noindex = false,
}: {
  title: string;
  description: string;
  /** Absolute page path (e.g. "/projects/lumenscript") — canonical + og:url. */
  path: string;
  /** OG image override (hero of the page). Relative paths are absolutized. */
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const img = absoluteUrl(image);
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: "Amorosi Labs",
      images: [{ url: img, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [img],
    },
  };
}
