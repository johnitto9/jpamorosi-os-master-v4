import { MetadataRoute } from 'next'
import { getPublicProjects } from '@/lib/projects/public-projects'

// Static-safe: derives URLs from the static project seed.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.jpamorosi.dev'
  const lastModified = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/projects`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/cv`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/os`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const projectRoutes: MetadataRoute.Sitemap = getPublicProjects().map((p) => ({
    url: `${baseUrl}/projects/${p.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: p.tier === 'hall_of_fame' ? 0.8 : 0.6,
  }))

  return [...staticRoutes, ...projectRoutes]
}
