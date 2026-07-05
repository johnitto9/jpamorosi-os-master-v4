"use client";

// components/admin/InterludePanel.tsx
// Admin editor for the home interlude card images. Four fields (drag&drop or
// click), each auto-saves to /api/admin/interludes on change (upload already
// went through /api/admin/upload → R2/local). The home reads these via
// resolveMediaUrl with a static fallback.

import { useState } from "react";
import { MediaDropzone } from "./MediaDropzone";

const FIELDS = [
  { key: "before1", label: "BEFORE THE SYSTEMS — card 1 (shop)" },
  { key: "before2", label: "BEFORE THE SYSTEMS — card 2 (workshop)" },
  { key: "proof1", label: "YOU'RE INSIDE THE PROOF" },
  { key: "living1", label: "THE LIVING LAYER" },
] as const;

export function InterludePanel({ initial }: { initial: Record<string, string> }) {
  const [vals, setVals] = useState<Record<string, string>>(initial ?? {});
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, url: string) {
    setVals((v) => ({ ...v, [key]: url }));
    setError(null);
    try {
      const res = await fetch("/api/admin/interludes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: url }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(key);
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500);
    } catch {
      setError(key);
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <MediaDropzone
            label={f.label}
            kind="image"
            value={vals[f.key] ?? ""}
            onChange={(url) => void save(f.key, url)}
            hint="PNG/JPG/WebP · sube a R2 si está configurado, si no local"
          />
          {saved === f.key && <p className="mt-1 text-[11px] text-emerald-300">Guardado ✓</p>}
          {error === f.key && <p className="mt-1 text-[11px] text-red-300">No se pudo guardar</p>}
        </div>
      ))}
    </div>
  );
}

export default InterludePanel;
