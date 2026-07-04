"use client";

// components/visual/AuroraLayer.tsx
// Thin client wrapper so the site-wide AuroraScene can be mounted from the
// server RootLayout (no client component imports allowed in a server module).
// The actual background lives here so it persists across route changes.

import { AuroraScene } from "@/components/visual/AuroraScene";

export function AuroraLayer() {
  return <AuroraScene />;
}

export default AuroraLayer;