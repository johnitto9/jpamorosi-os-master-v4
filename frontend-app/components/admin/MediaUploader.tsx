"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type HeroVideo = { mp4?: string; poster?: string; updatedAt?: string } | null;

export function MediaUploader({ current }: { current: HeroVideo }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setMsg("Uploading & transcoding (this can take a moment)…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("Done — hero video optimized to 720p.");
        setFile(null);
        router.refresh();
      } else {
        setErr(data?.message || data?.error || "Upload failed.");
        setMsg(null);
      }
    } catch {
      setErr("Network error.");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove the hero video?")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/media", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {current?.mp4 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Current hero video</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={current.mp4}
            poster={current.poster}
            controls
            muted
            className="aspect-video w-full max-w-md rounded-lg border border-white/10"
          />
          <button
            onClick={remove}
            disabled={busy}
            className="mt-3 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/50">No hero video set — the Hall of Fame uses its gradient/particle backdrop.</p>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Upload / replace</p>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
        />
        <p className="mt-2 text-[11px] text-white/40">
          Any resolution/format — the server transcodes to web-optimized 720p MP4 (no audio) + poster with ffmpeg. Max 250&nbsp;MB.
        </p>
        <button
          onClick={upload}
          disabled={!file || busy}
          className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/80 disabled:opacity-40"
        >
          {busy ? "Working…" : "Upload & optimize"}
        </button>
        {msg && <p className="mt-3 text-sm text-cyan-300">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      </div>
    </div>
  );
}

export default MediaUploader;
