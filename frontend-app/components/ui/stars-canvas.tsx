"use client";

// components/ui/stars-canvas.tsx
// Drei starfield for the aurora hero. Client-only (imported via dynamic ssr:false
// from aurora-background) so @react-three/fiber never runs during SSR.

import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";

export function StarsCanvas() {
  return (
    <Canvas gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
      <Stars radius={50} count={2200} factor={4} saturation={0} fade speed={1.4} />
    </Canvas>
  );
}

export default StarsCanvas;
