// next.config.js

// Security headers
const mediaCdnOrigin = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE || 'https://media.jpamorosi.dev';

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
      `media-src 'self' data: blob: ${mediaCdnOrigin}`,
      // 🔑 FIX: permitimos llamadas a Formspree y mantenemos Vercel
      "connect-src 'self' blob: data: https://formspree.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      // (Opcional pero recomendado si alguna vez usás <form action="https://formspree.io/...">)
      "form-action 'self' https://formspree.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ')
  }
];

// The Docker builder sets DOCKER_BUILD=1. Inside the container the frozen pnpm
// install resolves framer-motion's `MotionStyle` types more strictly than the
// local/Vercel install, which trips type-check on pre-existing OS components.
// The Docker image is a RUNTIME smoke-test artifact — type safety is still fully
// gated by local `pnpm build` and by Vercel (where DOCKER_BUILD is unset, so
// strict checking stays ON). See docs/DOCKER_READINESS.md.
const isDockerBuild = process.env.DOCKER_BUILD === '1';

// PRODUCTION TOPOLOGY (2026-07-09): Vercel serves the static/public front;
// the DYNAMIC surface (assistant, sessions, media, admin, preview) lives in
// the Dokploy backend. When BACKEND_PUBLIC_ORIGIN is set (Vercel env, at
// BUILD time — rewrites are compiled), those paths are proxied same-origin:
//
//   browser → jpamorosi.dev/api/… → Vercel beforeFiles rewrite →
//   $BACKEND_PUBLIC_ORIGIN/api/… → amorosi-backend:3000
//
// beforeFiles is REQUIRED: this repo also contains the route handlers, and
// default (afterFiles) rewrites lose to local routes — the request would run
// on Vercel (env-less) and never reach the backend. Cookies (al_sid, admin)
// flow through untouched: same-origin for the browser, Set-Cookie forwarded.
// Local dev / Docker / Dokploy leave the var UNSET → zero rewrites → each
// runtime serves its own routes exactly as before.
const backendOrigin = (process.env.BACKEND_PUBLIC_ORIGIN || '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!backendOrigin) return { beforeFiles: [] };
    const to = (path) => `${backendOrigin}${path}`;
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: to('/api/:path*') },
        { source: '/admin', destination: to('/admin') },
        { source: '/admin/:path*', destination: to('/admin/:path*') },
        { source: '/preview', destination: to('/preview') },
        { source: '/preview/:path*', destination: to('/preview/:path*') },
      ],
      // Proxied /admin & /preview HTML references chunks from the BACKEND's
      // build (/_next/static/<backendBuildId>/…) which don't exist in the
      // Vercel deployment → 404 → unstyled admin with dead JS (magic-link form
      // never fired). afterFiles runs only when Vercel's own filesystem has no
      // match, so Vercel keeps serving its own assets and only the backend's
      // hashed chunks fall through to the proxy.
      afterFiles: [
        { source: '/_next/static/:path*', destination: to('/_next/static/:path*') },
      ],
    };
  },

  // Produce a self-contained server bundle in `.next/standalone` for a minimal
  // Docker image. This only changes build OUTPUT; `next dev` is unaffected and
  // Vercel ignores it (uses its own output). Safe to enable. See
  // docs/DOCKER_READINESS.md for the rationale.
  output: 'standalone',

  typescript: {
    // Strict everywhere except the Docker runtime image build.
    ignoreBuildErrors: isDockerBuild
  },
  eslint: {
    ignoreDuringBuilds: isDockerBuild
  },
  productionBrowserSourceMaps: false,

  // Strip console.* from production client bundles (legacy /os avatar debug
  // logs etc.) — errors/warnings stay visible for real diagnostics.
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] }
  },

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
    // optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.jpamorosi.dev',
        pathname: '/uploads/**'
      }
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365 // 1 year
  },

  // Compression
  compress: true,

  // Static optimization
  trailingSlash: false,
  poweredByHeader: false
};

module.exports = nextConfig;
