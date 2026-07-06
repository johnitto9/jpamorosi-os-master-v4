"use client";

// components/admin/MediaDropzone.tsx
// Plug-and-play media fields for the project editor (BBN-editor style):
// - MediaDropzone: single image/video — drag & drop or click to upload, live
//   preview with an uploading veil, remove on hover, plus a small manual path
//   input for power users (existing /imgs/... assets still paste fine).
// - MultiImageDrop: screenshots — drop several files, thumbs with remove.
// Uploads go to POST /api/admin/upload → { url } served by /api/media.

import { useCallback, useRef, useState } from "react";

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Upload failed (${res.status})`);
  return data.url as string;
}

function DropShell({
  active,
  disabled,
  children,
  onDrop,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onDrop: (files: FileList) => void;
  onClick: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
      }}
      className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all ${
        over
          ? "border-cyan-400/80 bg-cyan-400/10"
          : active
            ? "border-white/15 bg-black/30"
            : "border-white/15 bg-white/[0.02] hover:border-cyan-400/40 hover:bg-white/[0.04]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

function UploadIdle({ hint }: { hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg text-cyan-300">
        ⇪
      </span>
      <p className="text-xs font-medium text-white/70">
        Drop a file or <span className="text-cyan-300">browse</span>
      </p>
      <p className="text-[10px] text-white/35">{hint}</p>
    </div>
  );
}

function Veil({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <span className="animate-pulse text-xs font-medium text-cyan-300">{text}</span>
    </div>
  );
}

export function MediaDropzone({
  label,
  kind,
  value,
  onChange,
  hint,
}: {
  label: string;
  kind: "image" | "video";
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        onChange(await uploadFile(file));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const accept = kind === "video" ? "video/mp4,video/webm" : "image/*";
  const defaultHint =
    kind === "video" ? "mp4 / webm — up to 250 MB" : "png / jpg / webp / avif — heavy files optimize to WebP";

  return (
    <div>
      <span className="block text-xs uppercase tracking-wider text-white/50">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && handle(e.target.files)}
      />
      <div className="mt-1.5">
        <DropShell
          active={!!value}
          disabled={busy}
          onDrop={handle}
          onClick={() => inputRef.current?.click()}
        >
          {busy && <Veil text={kind === "video" ? "Uploading video…" : "Uploading…"} />}
          {value ? (
            <div className="group/zone relative">
              {kind === "video" ? (
                <video src={value} muted loop playsInline className="h-36 w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt={label} className="h-36 w-full object-cover" />
              )}
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="absolute right-2 top-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-xs text-red-300 opacity-0 transition-opacity hover:bg-red-500/20 group-hover/zone:opacity-100"
              >
                ✕
              </button>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] text-white/60">
                {value}
              </span>
            </div>
          ) : (
            <UploadIdle hint={hint ?? defaultHint} />
          )}
        </DropShell>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      <input
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-white/60 outline-none focus:border-cyan-400/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste a path (/imgs/avif/…)"
        aria-label={`${label} path`}
      />
    </div>
  );
}

export function MultiImageDrop({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0); // pending upload count
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (files: FileList) => {
      const list = Array.from(files);
      setBusy(list.length);
      setError(null);
      const done: string[] = [];
      for (const file of list) {
        try {
          done.push(await uploadFile(file));
        } catch (e) {
          setError((e as Error).message);
        }
        setBusy((b) => b - 1);
      }
      if (done.length > 0) onChange([...values, ...done]);
    },
    [onChange, values],
  );

  return (
    <div>
      <span className="block text-xs uppercase tracking-wider text-white/50">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handle(e.target.files)}
      />
      {values.length > 0 && (
        <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {values.map((src, i) => (
            <div key={`${src}-${i}`} className="group/shot relative overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Screenshot ${i + 1}`} className="h-20 w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove screenshot ${i + 1}`}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-red-300 opacity-0 transition-opacity hover:bg-red-500/20 group-hover/shot:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1.5">
        <DropShell
          active={false}
          disabled={busy > 0}
          onDrop={handle}
          onClick={() => inputRef.current?.click()}
        >
          {busy > 0 && <Veil text={`Uploading ${busy}…`} />}
          <div className="flex items-center justify-center gap-2 px-4 py-4">
            <span className="text-cyan-300">⇪</span>
            <p className="text-xs text-white/60">
              Drop screenshots (several at once) or <span className="text-cyan-300">browse</span>
            </p>
          </div>
        </DropShell>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
