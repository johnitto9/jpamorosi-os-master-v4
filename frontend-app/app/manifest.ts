import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'jpamorosi.os - Interactive CV',
    short_name: 'jpamorosi.os',
    description: 'An interactive CV in desktop OS format: projects, AI, hardware, and contact.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0f',
    theme_color: '#0b0b0f',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/android-chrome-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/android-chrome-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/apple-touch-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml'
      }
    ],
    categories: ['portfolio', 'personal', 'cv'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false
  }
}