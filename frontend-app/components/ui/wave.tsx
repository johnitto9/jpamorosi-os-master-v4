"use client";

// components/ui/wave.tsx
// Glowing concentric-ripple wave (React Three Fiber shader), adapted from the
// provided reference. Palette tuned to cyan/blue/violet (no rainbow), additive
// blending for glow on dark, fills its parent, transparent background.
// Falls back to a static radial gradient under prefers-reduced-motion / no WebGL.

import { useMemo, useState, useEffect, type CSSProperties } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { cn } from "@/lib/utils";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // fullscreen quad
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  uniform vec2 pointer;
  uniform float tiles;
  uniform float intensity;
  varying vec2 vUv;

  // cyan → blue → violet palette (restrained, not rainbow)
  vec3 palette(float t) {
    vec3 a = vec3(0.10, 0.22, 0.40);
    vec3 b = vec3(0.20, 0.28, 0.45);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.55, 0.78, 0.98);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    // keep circular regardless of aspect
    uv.x *= resolution.x / max(resolution.y, 1.0);
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    uv = uv * tiles - pointer;
    float d = length(uv) * exp(-length(uv0));
    vec3 col = palette(length(uv0) + time * 0.35);
    d = sin(d * 8.0 + time) / 8.0;
    d = abs(d);
    d = pow(0.016 / d, 1.7);
    finalColor += col * d;

    finalColor *= intensity;
    float alpha = clamp(length(finalColor), 0.0, 1.0);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function WavePlane({
  speed,
  tiles,
  intensity,
}: {
  speed: number;
  tiles: number;
  intensity: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          resolution: { value: new THREE.Vector2(1, 1) },
          pointer: { value: new THREE.Vector2(0, 0) },
          tiles: { value: tiles },
          intensity: { value: intensity },
        },
      }),
    [tiles, intensity],
  );

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.time.value += delta * speed;
    u.resolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export function Wave({
  className,
  style,
  speed = 0.6,
  tiles = 1.4,
  intensity = 0.9,
}: {
  className?: string;
  style?: CSSProperties;
  speed?: number;
  tiles?: number;
  intensity?: number;
}) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (!ok) {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none", className)}
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,242,255,0.16), rgba(139,92,246,0.12) 55%, transparent 78%)",
          ...style,
        }}
      />
    );
  }

  return (
    <div aria-hidden className={cn("pointer-events-none", className)} style={style}>
      <Canvas
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <WavePlane speed={speed} tiles={tiles} intensity={intensity} />
      </Canvas>
    </div>
  );
}

export default Wave;
