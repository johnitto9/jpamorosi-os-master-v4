"use client";
import { create } from 'zustand';

export const useScrollStore = create((set) => ({
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}));