import './globals.css'
import type { Metadata, Viewport } from 'next'

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://www.jpamorosi.dev'),
  title: {
    default: 'jpamorosi.dev — Personal OS · Interactive CV',
    template: '%s | jpamorosi.dev'
  },
  description: 'An interactive CV in "desktop OS" format: projects, AI, hardware, and contact. Explore my experience as a Builder & AI Hacker.',
  keywords: [
    'Juan Pablo Amorosi',
    'jpamorosi',
    'portfolio',
    'interactive CV',
    'developer',
    'AI',
    'artificial intelligence',
    'projects',
    'next.js',
    'react',
    'three.js'
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
    siteName: 'jpamorosi.os',
    title: 'jpamorosi.os — Interactive CV',
    description: 'Explore my personal OS: projects, AI, hardware, and contact. A unique interactive CV.',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'jpamorosi.os - Personal Operating System',
        type: 'image/jpeg'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jpamorosi',
    creator: '@jpamorosi',
    title: 'jpamorosi.os — Interactive CV',
    description: 'My interactive desktop on the web. Explore my experience as a Builder & AI Hacker.',
    images: ['/og.jpg']
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
  manifest: '/site.webmanifest',
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
              jobTitle: 'Builder & AI Hacker',
              description: 'Developer specialized in AI, hardware, and innovative projects',
              knowsAbout: [
                'Artificial Intelligence',
                'Machine Learning',
                'Hardware Development',
                'Web Development',
                'React',
                'Next.js',
                'Three.js'
              ],
              sameAs: [
                'https://github.com/jpamorosi',
                'https://www.linkedin.com/in/jpamorosi'
              ],
              alumniOf: 'University',
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
              name: 'jpamorosi.dev',
              url: 'https://www.jpamorosi.dev/',
              description: 'Interactive CV and personal portfolio of Juan Pablo Amorosi',
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
        {/* WhatsApp and Social Media Optimization */}
        <meta property="og:image" content="https://www.jpamorosi.dev/og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:alt" content="jpamorosi.os - Personal Operating System" />
        <meta property="og:url" content="https://www.jpamorosi.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="jpamorosi.os — Interactive CV" />
        <meta property="og:description" content="Explore my personal OS: projects, AI, hardware, and contact. A unique interactive CV." />
        <meta property="og:site_name" content="jpamorosi.os" />
        <meta property="og:locale" content="en_US" />
        
        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        {/* Performance hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className="bg-dark-bg text-primary-text h-screen w-screen overflow-hidden">
        <div className="flex flex-col h-full w-full">
          {children}
        </div>
      </body>
    </html>
  )
}