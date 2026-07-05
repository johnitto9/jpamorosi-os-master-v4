"use client";

// components/assistant/InlineCanon.tsx
// The visitor's canon (palette + generated assets) rendered INSIDE the chat
// panel — a compact, collapsible rail above the composer. Replaces the old
// floating AssetVault (which sat at z-[115], BEHIND the z-[121] chat panel, so
// it read as "buried behind the home"). Same source (/api/assistant/workspace),
// refreshes on the `al-workspace-refresh` event the flow boards already emit.
//   scope="branding" -> only logo / reference / storyboard
//   scope="project"  -> every generated asset (branding + map + home + screens)

import { useCallback, useEffect, useRef, useState } from "react";

type Asset = { id: number; role: string; url: string | null };

export function InlineCanon({
  projectId,
  scope = "project",
}: {
  projectId?: number;
  scope?: "project" | "branding";
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [palette, setPalette] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const idRef = useRef<number | undefined>(projectId);
  idRef.current = projectId;

  const load = useCallback(async (pid: number) => {
    try {
      const [w, p] = await Promise.all([
        fetch(`/api/assistant/workspace?projectId=${pid}`).then((r) => r.json()),
        fetch(`/api/assistant/projects`).then((r) => r.json()),
      ]);
      setAssets(((w?.workspace?.assets ?? []) as Asset[]).filter((a) => a.url));
      const proj = ((p?.projects ?? []) as Array<{ id: number; palette: string[] }>).find(
        (x) => x.id === pid,
      );
      setPalette(proj?.palette ?? []);
    } catch {
      /* offline / no db — rail just stays hidden */
    }
  }, []);

  useEffect(() => {
    if (typeof projectId !== "number") {
      setAssets([]);
      setPalette([]);
      return;
    }
    void load(projectId);
    const onRefresh = () => {
      if (typeof idRef.current === "number") void load(idRef.current);
    };
    window.addEventListener("al-workspace-refresh", onRefresh);
    return () => window.removeEventListener("al-workspace-refresh", onRefresh);
  }, [projectId, load]);

  const shown =
    scope === "branding"
      ? assets.filter((a) => ["logo", "reference", "storyboard"].includes(a.role))
      : assets;

  if (typeof projectId !== "number" || (shown.length === 0 && palette.length === 0)) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/25 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-1.5 flex w-full items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80"
      >
        <span>◆ Canon</span>
        {shown.length > 0 && <span className="text-white/30">· {shown.length}</span>}
        <span className="ml-auto text-white/30">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="chat-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
          {palette.length > 0 && (
            <div className="flex shrink-0 items-center gap-1 pr-1.5">
              {palette.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  title={c}
                  className="h-5 w-5 rounded-md border border-white/10"
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
          {shown.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setLightbox(a.url)}
              title={a.role}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url as string}
                alt={a.role}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-0.5 text-center text-[7px] uppercase tracking-wider text-white/70">
                {a.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Asset preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[82vh] w-auto rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default InlineCanon;
