import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AuroraLayer } from '@/components/visual/AuroraLayer'
import { CookieConsent } from '@/components/CookieConsent'
import { CampaignCatcher } from '@/components/CampaignCatcher'

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://www.jpamorosi.dev'),
  title: {
    default: 'Juan Pablo Amorosi — AI Product Engineer & Systems Architect',
    template: '%s | Amorosi Labs'
  },
  description:
    "Amorosi Labs is the Hall of Fame of Juan Pablo Amorosi's shipped systems: AI orchestration engines, production agent workflows, and live founder-built products.",
  keywords: [
    'Juan Pablo Amorosi',
    'jpamorosi',
    'Amorosi Labs',
    'AI Product Engineer',
    'AI Systems Architect',
    'multi-model orchestration',
    'AI agents',
    'production AI',
    'full-stack AI',
    'founder',
    'portfolio',
    'next.js'
  ],
  authors: [{ name: 'Juan Pablo Amorosi', url: 'https://www.jpamorosi.dev' }],
  creator: 'Juan Pablo Amorosi',
  publisher: 'Juan Pablo Amorosi',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Amorosi Labs',
    title: 'Juan Pablo Amorosi — AI Product Engineer & Systems Architect',
    description: 'The Hall of Fame of shipped AI systems: multi-model orchestration, production agent workflows, and live founder-built products.',
    images: [
      {
        url: '/imgs/avif/og.avif',
        width: 1200,
        height: 630,
        alt: 'Amorosi Labs — Juan Pablo Amorosi',
        type: 'image/avif'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jpamorosi',
    creator: '@jpamorosi',
    title: 'Juan Pablo Amorosi — AI Product Engineer & Systems Architect',
    description: 'Amorosi Labs: shipped AI systems — orchestration engines, production agents, and live founder-built products.',
    images: ['/imgs/avif/og.avif']
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.svg', sizes: '16x16', type: 'image/svg+xml' },
      { url: '/favicon-32x32.svg', sizes: '32x32', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' }
    ],
    other: [
      { rel: 'icon', url: '/android-chrome-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { rel: 'icon', url: '/android-chrome-512x512.svg', sizes: '512x512', type: 'image/svg+xml' }
    ]
  },
  // manifest se genera automáticamente desde app/manifest.ts
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || ''
  },
  category: 'portfolio'
}

// Viewport configuration (Next.js 15+)
export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b0b0f' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0f' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Juan Pablo Amorosi',
              url: 'https://www.jpamorosi.dev/',
              jobTitle: 'AI Product Engineer & Systems Architect',
              description:
                'AI Product Engineer and Systems Architect building AI-powered products that survive contact with reality: multi-model orchestration, production agent workflows, and live founder-built products.',
              knowsAbout: [
                'Artificial Intelligence',
                'Multi-model Orchestration',
                'AI Agents',
                'RAG',
                'Systems Architecture',
                'Full-Stack Engineering',
                'Next.js',
                'Python'
              ],
              sameAs: [
                'https://github.com/johnitto9'
              ],
              workLocation: {
                '@type': 'Place',
                name: 'Argentina'
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Amorosi Labs',
              url: 'https://www.jpamorosi.dev/',
              description: "Amorosi Labs — the Hall of Fame of Juan Pablo Amorosi's shipped AI systems and products.",
              author: {
                '@type': 'Person',
                name: 'Juan Pablo Amorosi'
              },
              inLanguage: 'en-US',
              copyrightYear: new Date().getFullYear(),
              genre: 'portfolio'
            })
          }}
        />
        {/* Open Graph / Twitter tags are emitted from the `metadata` export above
            (single source of truth) — no hardcoded, conflicting tags here. */}

        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        {/* Performance hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className="bg-[#05060b] text-primary-text h-screen w-screen overflow-hidden">
        {/* Site-wide living aurora background (one fixed cycling palette). */}
        <AuroraLayer />
        <div className="relative z-10 flex flex-col h-full w-full">
          {children}
        </div>
        {/* First-visit cookie consent (necessary vs assistant memory). */}
        <CookieConsent />
        <CampaignCatcher />
      </body>
    </html>
  )
}