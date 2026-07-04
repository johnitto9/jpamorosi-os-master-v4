// components/design-system/StatusBadge.tsx
// Path: components/design-system/StatusBadge.tsx
// Inputs: status (ProjectStatus), className.
// Outputs: a small pill communicating lifecycle status with a status dot.
// State: none.
// Data source: ProjectStatus from content/projects.
// Failure mode: unknown status falls back to a neutral style.

import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/content/projects";

const STATUS_STYLES: Record<ProjectStatus, { dot: string; text: string; ring: string }> = {
  Live: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30" },
  Platformizing: { dot: "bg-cyan-400", text: "text-cyan-300", ring: "ring-cyan-400/30" },
  "R&D": { dot: "bg-violet-400", text: "text-violet-300", ring: "ring-violet-400/30" },
  Prototype: { dot: "bg-blue-400", text: "text-blue-300", ring: "ring-blue-400/30" },
  Paused: { dot: "bg-zinc-400", text: "text-zinc-300", ring: "ring-zinc-400/30" },
};

const FALLBACK = { dot: "bg-zinc-400", text: "text-zinc-300", ring: "ring-zinc-400/30" };

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const s = STATUS_STYLES[status] ?? FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "bg-black/40 text-xs font-medium ring-1",
        s.text,
        s.ring,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, status === "Live" && "lab-livedot")} />
      {status}
    </span>
  );
}

export default StatusBadge;
