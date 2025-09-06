"use client";
import { create } from "zustand"
import type { DesktopState, WindowApp, WindowInstance } from "./types"

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: [],
  nextZIndex: 10000, // MÁS ALTO que el avatar (9999) para estar por encima

  openWindow: (app: WindowApp) => {
    const { windows, nextZIndex } = get()

    // Mobile detection: check if screen is mobile-sized (max-width: 768px)
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches

    // Check if window is already open
    const existingWindow = windows.find((w) => w.app.id === app.id)
    if (existingWindow) {
      get().focusWindow(existingWindow.id)
      return
    }

    // Responsive configuration
    const getResponsiveConfig = () => {
      if (typeof window === 'undefined') return { sizeMultiplier: 1, posOffset: 30 };
      
      const isTablet = window.matchMedia('(max-width: 1200px) and (min-width: 769px)').matches;
      const isSmallTablet = window.matchMedia('(max-width: 1024px) and (min-width: 769px)').matches;
      
      const sizeMultiplier = isSmallTablet ? 0.85 : isTablet ? 0.92 : 1;
      const posOffset = isTablet ? 20 : 30;
      
      return { sizeMultiplier, posOffset };
    };

    const { sizeMultiplier, posOffset } = getResponsiveConfig();

    // Calculate responsive position and size
    const basePosition = app.defaultPosition || { x: 100 + windows.length * posOffset, y: 100 + windows.length * posOffset };
    const baseSize = app.defaultSize || { width: 600, height: 400 };

    const newWindow: WindowInstance = {
      id: `${app.id}-${Date.now()}`,
      app,
      position: {
        x: Math.round(basePosition.x * (sizeMultiplier > 0.9 ? 1 : 0.9)), // Slight position adjustment for smaller screens
        y: Math.round(basePosition.y * (sizeMultiplier > 0.9 ? 1 : 0.9))
      },
      size: {
        width: Math.round(baseSize.width * sizeMultiplier),
        height: Math.round(baseSize.height * sizeMultiplier)
      },
      zIndex: nextZIndex,
      isMinimized: false,
    }

    // Mobile behavior: clear all existing windows first to ensure single window
    const updatedWindows = isMobile ? [newWindow] : [...windows, newWindow]

    set({
      windows: updatedWindows,
      nextZIndex: nextZIndex + 1,
    })
  },

  closeWindow: (id: string) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    }))
  },

  focusWindow: (id: string) => {
    const { windows, nextZIndex } = get()
    const window = windows.find((w) => w.id === id)
    if (!window) return

    set({
      windows: windows.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)),
      nextZIndex: nextZIndex + 1,
    })
  },

  updateWindow: (id: string, updates: Partial<WindowInstance>) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  },

  minimizeWindow: (id: string) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
    }))
  },
}))
