"use client";

// store/sceneStore.ts
// Global "scene" palette that the site-wide aurora background cycles through.
// The active section (and, inside the Hall, the selected project's brand color)
// drives which palette is shown, so the whole page shares one living background
// that shifts color per scene instead of a static cyberpunk grid.

import { create } from "zustand";

export const DEFAULT_SCENE_PALETTE = ["#00e0a4", "#1E67C6", "#8b5cf6", "#00f2ff"];

interface SceneState {
  /** Palette currently displayed by the aurora background. */
  palette: string[];
  /** Palette for the Hall of Fame (follows the selected project); preserved so
   *  scrolling back into the Hall restores the right brand colors. */
  hallPalette: string[] | null;
  setPalette: (palette: string[]) => void;
  setHallPalette: (palette: string[]) => void;
  reset: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  palette: DEFAULT_SCENE_PALETTE,
  hallPalette: null,
  setPalette: (palette) =>
    set({ palette: palette && palette.length ? palette : DEFAULT_SCENE_PALETTE }),
  setHallPalette: (palette) =>
    set({ hallPalette: palette && palette.length ? palette : null }),
  reset: () => set({ palette: DEFAULT_SCENE_PALETTE, hallPalette: null }),
}));
