// Security headers
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob:",
      "connect-src 'self' blob: data: https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ')
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  productionBrowserSourceMaps: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  },

  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Temporarily disabled for build testing
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Compression
  compress: true,

  // PWA-related redirects and rewrites
  async redirects() {
    return [
      // Redirect phantom manifest routes 
      {
        source: '/manifest.webmanifest/route/:path*',
        destination: '/manifest.webmanifest',
        permanent: true,
      },
      {
        source: '/site.webmanifest',
        destination: '/manifest.webmanifest',
        permanent: true,
      }
    ];
  },

  // Exclude phantom routes from build
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        '**/manifest.webmanifest/route*',
      ],
    },
  },


  // Static optimization
  trailingSlash: false,
  poweredByHeader: false
}

module.exports = nextConfig