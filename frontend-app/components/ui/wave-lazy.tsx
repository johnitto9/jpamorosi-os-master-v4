"use client";

// Client-only, crash-safe loader for the R3F Wave.
// - @react-three/fiber (v8) can't be evaluated during SSR → import with ssr:false.
// - An error boundary contains any client WebGL/R3F failure so it can never take
//   down the whole page; it falls back to a static gradient halo.

import dynamic from "next/dynamic";
import React from "react";
import { cn } from "@/lib/utils";

type WaveProps = {
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  tiles?: number;
  intensity?: number;
};

const WaveInner = dynamic(() => import("./wave").then((m) => m.Wave), {
  ssr: false,
});

class Boundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

export function Wave(props: WaveProps) {
  const fallback = (
    <div
      aria-hidden
      className={cn("pointer-events-none", props.className)}
      style={{
        background:
          "radial-gradient(closest-side, rgba(0,242,255,0.16), rgba(139,92,246,0.12) 55%, transparent 78%)",
        ...props.style,
      }}
    />
  );
  return (
    <Boundary fallback={fallback}>
      <WaveInner {...props} />
    </Boundary>
  );
}

export default Wave;
