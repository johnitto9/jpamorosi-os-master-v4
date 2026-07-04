"use client";

// components/visual/SceneController.tsx
// Drives the site-wide aurora palette from the section currently in view.
// - SceneController: observes section ids and sets the palette as each becomes
//   active (same center-band heuristic as the chapter rail). The Hall reads its
//   live per-project palette from the store so returning to it restores brand.
// - SceneSetter: one-shot palette for pages without sections (project rooms).

import { useEffect } from "react";
import { useSceneStore } from "@/store/sceneStore";

export type Scene = { id: string; palette: string[] };

export function SceneController({ scenes }: { scenes: Scene[] }) {
  useEffect(() => {
    const map = new Map(scenes.map((s) => [s.id, s.palette] as const));
    const els = scenes
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.id;
          const store = useSceneStore.getState();
          if (id === "hall-of-fame") {
            store.setPalette(store.hallPalette ?? map.get(id) ?? store.palette);
          } else {
            store.setPalette(map.get(id) ?? store.palette);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [scenes]);

  return null;
}

export function SceneSetter({ palette }: { palette: string[] }) {
  const setPalette = useSceneStore((s) => s.setPalette);
  const reset = useSceneStore((s) => s.reset);
  useEffect(() => {
    setPalette(palette);
    return () => reset();
  }, [palette, setPalette, reset]);
  return null;
}

export default SceneController;
