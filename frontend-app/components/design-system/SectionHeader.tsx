// components/design-system/SectionHeader.tsx
// Path: components/design-system/SectionHeader.tsx
// Inputs: eyebrow, title, description, accent, className.
// Outputs: a consistent section heading block for the home page.
// State: none.
// Data source: none.
// Failure mode: renders title only if eyebrow/description omitted.

import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  accent = "#00f2ff",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p
          className="mb-2 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          {/* accent rule fading out — gives every section a branded signature */}
          <span
            aria-hidden
            className="h-px w-10 shrink-0"
            style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
          />
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default SectionHeader;
