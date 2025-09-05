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

    const newWindow: WindowInstance = {
      id: `${app.id}-${Date.now()}`,
      app,
      position: app.defaultPosition || { x: 100 + windows.length * 30, y: 100 + windows.length * 30 },
      size: app.defaultSize || { width: 600, height: 400 },
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
