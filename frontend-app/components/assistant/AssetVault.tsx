"use client";

// components/assistant/AssetVault.tsx
// The visitor's Brand Foundation vault (T05, spec 13): a collapsible right-side
// panel showing the persisted workspace of their active pre-project — palette,
// Brand DNA, stack decisions and assets (compact thumbnails + lightbox). Reads
// the SAME source as the admin dossier via /api/assistant/workspace. Auto-opens
// when meaningful artifacts exist; the preference persists. Self-contained; the
// widget can point it at a project via the `al-workspace-focus` event.
// Desktop panel (lg+); mobile drawer is a follow-up (see PENDING).

import { useCallback, useEffect, useRef, useState } from "react";

type SessionProjectLite = {
  id: number;
  name: string;
  palette: string[];
  stack: string[];
  logoUrl: string | null;
};
type BrandDNA = {
  personality: string | null;
  tone: string | null;
  keywords: string[];
  visualDirection: string | null;
} | null;
type Asset = { id: number; role: string; url: string | null; promptSummary: string | null };
type StackDecision = { id: number; category: string; option: string; confirmedAt: string | null };
type Workspace = { brandDNA: BrandDNA; assets: Asset[]; stackDecisions: StackDecision[] } | null;

const OPEN_KEY = "al_vault_open";

export function AssetVault() {
  const [project, setProject] = useState<SessionProjectLite | null>(null);
  const [ws, setWs] = useState<Workspace>(null);
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<Asset | null>(null);
  const activeIdRef = useRef<number | null>(null); // avoids stale closure in listeners

  const loadWorkspace = useCallback(async (projectId: number) => {
    try {
      const res = await fetch(`/api/assistant/workspace?projectId=${projectId}`);
      const data = await res.json();
      setWs(data.workspace ?? null);
      // auto-open the first time real artifacts appear (respects a prior close)
      const hasArtifacts =
        !!data.workspace &&
        (data.workspace.assets?.length > 0 ||
          data.workspace.brandDNA ||
          data.workspace.stackDecisions?.length > 0);
      if (hasArtifacts && localStorage.getItem(OPEN_KEY) == null) setOpen(true);
    } catch {
      /* offline / no db — panel just stays quiet */
    }
  }, []);

  const pickProject = useCallback(
    async (preferId?: number) => {
      try {
        const res = await fetch("/api/assistant/projects");
        const data = await res.json();
        const list: SessionProjectLite[] = data.projects ?? [];
        if (list.length === 0) {
          setProject(null);
          activeIdRef.current = null;
          return;
        }
        const chosen = (preferId && list.find((p) => p.id === preferId)) || list[list.length - 1];
        setProject(chosen);
        activeIdRef.current = chosen.id;
        await loadWorkspace(chosen.id);
      } catch {
        /* ignore */
      }
    },
    [loadWorkspace],
  );

  useEffect(() => {
    void pickProject();
    const onFocus = (e: Event) => {
      const pid = (e as CustomEvent<{ projectId?: number }>).detail?.projectId;
      void pickProject(pid);
    };
    // the widget can steer the vault to a specific pinned project
    window.addEventListener("al-workspace-focus", onFocus);
    // and nudge it to refresh after it changes something (ref = no stale closure)
    const onRefresh = () => {
      if (activeIdRef.current) void loadWorkspace(activeIdRef.current);
    };
    window.addEventListener("al-workspace-refresh", onRefresh);
    return () => {
      window.removeEventListener("al-workspace-focus", onFocus);
      window.removeEventListener("al-workspace-refresh", onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  if (!project) return null;

  const assets = ws?.assets ?? [];
  const brand = ws?.brandDNA ?? null;
  const decisions = ws?.stackDecisions ?? [];

  return (
    <>
      {/* collapsed tab */}
      {!open && (
        <button
          type="button"
          onClick={toggle}
          className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-l-xl border border-r-0 border-cyan-400/30 bg-black/70 px-2 py-4 text-[11px] font-mono uppercase tracking-widest text-cyan-300 backdrop-blur transition-colors hover:bg-cyan-400/10 lg:block"
          style={{ writingMode: "vertical-rl" }}
          aria-label="Open project vault"
        >
          Vault{assets.length ? ` · ${assets.length}` : ""}
        </button>
      )}

      {/* expanded panel */}
      {open && (
        <aside className="fixed right-0 top-0 z-30 hidden h-full w-80 flex-col border-l border-white/10 bg-black/80 backdrop-blur-xl lg:flex">
          <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300">Vault</p>
              <p className="truncate text-sm font-semibold text-white">{project.name}</p>
            </div>
            <button type="button" onClick={toggle} aria-label="Collapse vault" className="rounded p-1 text-white/50 hover:text-white">✕</button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            {/* palette */}
            {project.palette.length > 0 && (
              <section>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">Palette</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.palette.map((c, i) => (
                    <span key={i} title={c} className="h-7 w-7 rounded-md border border-white/10" style={{ background: c }} />
                  ))}
                </div>
              </section>
            )}

            {/* brand dna */}
            {brand && (
              <section>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">Brand DNA</p>
                {(brand.personality || brand.tone) && (
                  <p className="text-[13px] text-white/75">{[brand.personality, brand.tone].filter(Boolean).join(" · ")}</p>
                )}
                {brand.keywords.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {brand.keywords.map((k) => (
                      <span key={k} className="rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-white/60">{k}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* stack */}
            {(project.stack.length > 0 || decisions.length > 0) && (
              <section>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-violet-300">Stack</p>
                <div className="flex flex-wrap gap-1">
                  {project.stack.map((s) => (
                    <span key={s} className="rounded border border-violet-400/30 px-1.5 py-0.5 text-[11px] text-violet-200">{s}</span>
                  ))}
                </div>
                {decisions.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-[12px] text-white/60">
                    {decisions.slice(0, 8).map((d) => (
                      <li key={d.id}><b className="text-white/40">{d.category}:</b> {d.option}{d.confirmedAt ? " ✓" : ""}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* assets */}
            {assets.length > 0 && (
              <section>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">Assets ({assets.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {assets.filter((a) => a.url).map((a) => (
                    <button key={a.id} type="button" onClick={() => setLightbox(a)} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10" title={`${a.role}${a.promptSummary ? " — " + a.promptSummary : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url as string} alt={a.role} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white/70">{a.role}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!brand && assets.length === 0 && decisions.length === 0 && project.palette.length === 0 && (
              <p className="text-[13px] text-white/40">Nothing here yet — shape this project with Orbe and it fills in: palette, brand DNA, stack and visuals.</p>
            )}
          </div>
        </aside>
      )}

      {/* lightbox */}
      {lightbox?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setLightbox(null)} role="dialog" aria-label="Asset preview">
          <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.role} className="max-h-[80vh] w-auto rounded-lg" />
            <div className="mt-2 flex items-center justify-between text-xs text-white/60">
              <span className="font-mono uppercase tracking-wider text-cyan-300">{lightbox.role}</span>
              <button type="button" onClick={() => setLightbox(null)} className="rounded border border-white/20 px-2 py-1 hover:text-white">Close</button>
            </div>
            {lightbox.promptSummary && <p className="mt-1 max-w-3xl text-xs text-white/50">{lightbox.promptSummary}</p>}
          </div>
        </div>
      )}
    </>
  );
}

export default AssetVault;
