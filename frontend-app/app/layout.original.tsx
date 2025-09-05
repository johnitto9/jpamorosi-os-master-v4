import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Juan Pablo Amorosi - Interactive CV | jpamorosi.os',
  description: 'Interactive CV built as a desktop operating system. Full-stack developer specializing in React, Next.js, and modern web technologies. Explore my skills, experience, and projects in an immersive OS interface.',
  keywords: 'Juan Pablo Amorosi, Full Stack Developer, React Developer, Next.js, Interactive CV, Portfolio, Web Development, JavaScript, TypeScript, Frontend, Backend',
  authors: [{ name: 'Juan Pablo Amorosi', url: 'https://jpamorosi.com' }],
  creator: 'Juan Pablo Amorosi',
  publisher: 'Juan Pablo Amorosi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://jpamorosi.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://jpamorosi.com',
    title: 'Juan Pablo Amorosi - Interactive CV | jpamorosi.os',
    description: 'Interactive CV built as a desktop operating system. Full-stack developer specializing in React, Next.js, and modern web technologies.',
    siteName: 'jpamorosi.os',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Juan Pablo Amorosi - Interactive CV Desktop Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Juan Pablo Amorosi - Interactive CV | jpamorosi.os',
    description: 'Interactive CV built as a desktop operating system. Explore my skills and projects in an immersive interface.',
    images: ['/og-image.png'],
    creator: '@jpamorosi',
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
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code-here',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  category: 'portfolio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
