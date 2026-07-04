// components/visual/LabSceneBackground.tsx
// A lightweight, CSS-only "AI lab / systems museum" background.
// No 3D, no dependencies, no client JS — safe & static (Vercel-friendly).
// Respects prefers-reduced-motion (animations disabled via globals.css).
//
// (three/@react-three/fiber ARE installed and used by /os; we deliberately keep
// the PUBLIC background dependency-free and static — see docs/DOCKER_READINESS.)

const NODES = [
  { top: "18%", left: "12%", size: 6, color: "#00f2ff", delay: "0s" },
  { top: "30%", left: "82%", size: 5, color: "#8b5cf6", delay: "1.5s" },
  { top: "62%", left: "22%", size: 4, color: "#00e0a4", delay: "3s" },
  { top: "72%", left: "70%", size: 6, color: "#f0a500", delay: "2s" },
  { top: "45%", left: "50%", size: 4, color: "#4f7cff", delay: "4s" },
];

export function LabSceneBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    >
      {/* ambient glows */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 15% 5%, rgba(0,242,255,0.10) 0%, transparent 60%)," +
            "radial-gradient(40% 40% at 90% 10%, rgba(139,92,246,0.10) 0%, transparent 60%)," +
            "radial-gradient(50% 45% at 50% 100%, rgba(0,224,164,0.07) 0%, transparent 65%)",
        }}
      />
      {/* holographic grid */}
      <div className="lab-grid absolute inset-0" />

      {/* CRT scan stripes with glitch flicker */}
      <div
        className="lab-glitch absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,242,255,0.035) 0px, rgba(0,242,255,0.035) 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* floating nodes */}
      {NODES.map((n, i) => (
        <span
          key={i}
          className="lab-node absolute rounded-full"
          style={{
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            background: n.color,
            boxShadow: `0 0 12px ${n.color}`,
            animationDelay: n.delay,
            opacity: 0.6,
          }}
        />
      ))}

    </div>
  );
}

export default LabSceneBackground;
