"use client";

import { create } from 'zustand';

interface AvatarState {
  isLoading: boolean;
  progress: number;
  isLoaded: boolean;
  error: string | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setLoaded: (loaded: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  isLoading: true,
  progress: 0,
  isLoaded: false,
  error: null,
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  setProgress: (progress: number) => set({ 
    progress: Math.min(100, Math.max(0, progress)) 
  }),
  
  setLoaded: (loaded: boolean) => {
    if (loaded) {
      set({ 
        isLoaded: true, 
        isLoading: false, 
        progress: 100,
        error: null 
      });
      
      // Emitir evento personalizado cuando está completamente cargado
      const avatarLoadedEvent = new CustomEvent('avatarFullyLoaded', {
        detail: { 
          timestamp: Date.now(),
          message: 'Avatar 3D completamente cargado, visible y listo',
          store: get()
        }
      });
      window.dispatchEvent(avatarLoadedEvent);
      console.log('🎯 Evento avatarFullyLoaded emitido desde store');
    } else {
      set({ isLoaded: loaded });
    }
  },
  
  setError: (error: string | null) => set({ 
    error, 
    isLoading: false,
    isLoaded: false 
  }),
  
  reset: () => set({ 
    isLoading: true, 
    progress: 0, 
    isLoaded: false, 
    error: null 
  })
}));