# syntax=docker/dockerfile:1
# =============================================================================
# Amorosi Labs - production Dockerfile (Next.js standalone, multi-stage)
# Build context: ./frontend-app
# =============================================================================

# ---- deps: install with pnpm (frozen lockfile) ------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: compile the Next standalone output ----------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Runtime smoke-test image: skip redundant type/lint check (still enforced by
# local `pnpm build` and Vercel). See next.config.js / docs/DOCKER_READINESS.md.
ENV DOCKER_BUILD=1
RUN pnpm build

# ---- runner: minimal runtime image -----------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ffmpeg for admin hero-video transcode/optimization (F2). Small on alpine.
RUN apk add --no-cache ffmpeg

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server + static assets + public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Durable data dir for local-json storage (mount a volume here in production)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs
EXPOSE 3000

# server.js is emitted by Next standalone output
CMD ["node", "server.js"]
