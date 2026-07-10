// next.config.js

// Security headers
const mediaCdnOrigin = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE || 'https://media.jpamorosi.dev';

// The proxied /admin & /preview HTML loads its CSS/JS/fonts from the backend's
// own origin (assetPrefix, see below) — CSP with bare 'self' blocked them all
// and the admin rendered as bare 90s HTML. Only set on deployments that proxy
// (Vercel); empty locally → CSP unchanged.
const backendCspOrigin = (process.env.BACKEND_PUBLIC_ORIGIN || '').replace(/\/+$/, '');

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
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://static.cloudflareinsights.com ${backendCspOrigin}`.trim(),
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${backendCspOrigin}`.trim(),
      `font-src 'self' https://fonts.gstatic.com data: ${backendCspOrigin}`.trim(),
      "img-src 'self' data: blob: https:",
      `media-src 'self' data: blob: ${mediaCdnOrigin}`,
      // 🔑 FIX: permitimos llamadas a Formspree y mantenemos Vercel
      `connect-src 'self' blob: data: https://formspree.io https://va.vercel-scripts.com https://vitals.vercel-insights.com https://cloudflareinsights.com https://*.cloudflareinsights.com ${backendCspOrigin}`.trim(),
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
const researchSecurityHeaders = securityHeaders.map((header) => {
  if (header.key === 'X-Frame-Options') return { ...header, value: 'SAMEORIGIN' };
  if (header.key === 'Content-Security-Policy') {
    return { ...header, value: header.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") };
  }
  return header;
});

const backendOrigin = (process.env.BACKEND_PUBLIC_ORIGIN || '').replace(/\/+$/, '');

// Backend (Docker) builds only: absolute asset origin, so /admin & /preview
// HTML proxied through Vercel loads CSS/JS/fonts from the build that actually
// produced them. Vercel's static layer 404s foreign hashed chunks BEFORE any
// rewrite can run (x-matched-path: /_next/static/not-found.txt), so relative
// asset URLs can never work for cross-deployment proxying.
const backendAssetPrefix = (process.env.BACKEND_ASSET_PREFIX || '').replace(/\/+$/, '');

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
    };
  },

  // Produce a self-contained server bundle in `.next/standalone` for a minimal
  // Docker image. This only changes build OUTPUT; `next dev` is unaffected and
  // Vercel ignores it (uses its own output). Safe to enable. See
  // docs/DOCKER_READINESS.md for the rationale.
  output: 'standalone',

  // Baked at build time in the Docker image only (see Dockerfile ARG); unset
  // everywhere else → relative URLs exactly as before.
  ...(backendAssetPrefix ? { assetPrefix: backendAssetPrefix } : {}),

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
        source: '/((?!research/hrm-amorosi(?:/|$)).*)',
        headers: securityHeaders
      },
      {
        source: '/research/hrm-amorosi/:path*',
        headers: researchSecurityHeaders
      },
      // With an absolute assetPrefix, fonts/scripts load cross-origin from the
      // proxied admin at www.* — public hashed assets, so a wildcard is safe
      // and required (browsers block cross-origin font loads without it).
      ...(backendAssetPrefix
        ? [{
            source: '/_next/static/(.*)',
            headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }]
          }]
        : [])
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
