"use client";

// components/ui/dithering-shader.tsx
// Contained WebGL2 ordered-dither gradient, usable as an ambient background layer
// inside a card/section. SSR-safe, fills parent via CSS, DPR-capped for perf,
// and falls back to a CSS gradient when WebGL2 is unavailable or reduced-motion.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const VERT = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;

const FRAG = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec2 uRes; uniform float uTime; uniform vec3 uColor;
const float bayer[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  float w = 0.5+0.5*sin(uv.x*3.0+uTime*0.25)+0.35*sin(uv.y*4.0-uTime*0.18);
  float v = smoothstep(0.25,1.25,w)*(1.0-uv.y*0.35);
  int idx = (int(gl_FragCoord.x)%4)*4 + int(gl_FragCoord.y)%4;
  float t = bayer[idx]/16.0;
  float d = step(t, v*0.75);
  fragColor = vec4(uColor*v, d*v*0.55);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function DitheringShader({
  className,
  style,
  color = "#00f2ff",
  speed = 1,
}: {
  className?: string;
  style?: CSSProperties;
  color?: string;
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFailed(true);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uColor = gl.getUniformLocation(prog, "uColor");
    gl.uniform3fv(uColor, hexToRgb(color));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf = 0;
    const resize = () => {
      const dpr = 1; // cap for perf
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const start = performance.now();
    const loop = () => {
      gl.uniform1f(uTime, ((performance.now() - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color, speed]);

  if (failed) {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", className)}
        style={{
          background: `radial-gradient(120% 100% at 30% 20%, ${color}22 0%, transparent 60%)`,
          ...style,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={style}
    />
  );
}

export default DitheringShader;
