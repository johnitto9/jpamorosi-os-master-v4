"use client";

import { useDesktopStore } from "../packages/desktop/store";
import { Window } from "../packages/desktop/components/Window";
import { Dock } from "../packages/desktop/components/Dock";
import Desktop from "../components/Desktop";
import { RealTimeClock } from "../components/RealTimeClock";
import { AvatarLoader } from "../components/AvatarLoader";
import { AvatarVisibilityVerifier } from "../components/AvatarVisibilityVerifier";
import { useAvatarStore } from "../store/avatarStore";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

export default function ClientApp() {
  const [mounted, setMounted] = useState(false);
  const { windows } = useDesktopStore();
  const { isLoading, progress, isLoaded } = useAvatarStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse font-mono">Iniciando jpamorosi.os...</div>
      </div>
    );
  }

  return (
    <>
      {/* Avatar Loader */}
      <AnimatePresence>
        {isLoading && !isLoaded && (
          <AvatarLoader progress={progress} isVisible={true} />
        )}
      </AnimatePresence>

      {/* Avatar Visibility Verifier - DESACTIVADO temporalmente para debugging */}
      {/* <AvatarVisibilityVerifier 
        debug={true}
        checkInterval={100}
        maxChecks={100}
      /> */}

      {/* Desktop es el orquestador principal del fondo y la UI */}
      <Desktop>
        {/* ÁREA DE SCROLL INVISIBLE - solo para generar scroll */}
        <main className="flex-1 relative">
          {/* Contenido invisible que genera scroll */}
          <div style={{ height: '100vh' }} />
        </main>
      </Desktop>

      {/* Top Bar - FIXED position para que no se mueva con el scroll */}
      <header className="fixed top-0 left-0 right-0 z-[101] flex items-center justify-between px-4 py-2 bg-black/20 backdrop-blur-sm border-b border-cyan-400/20" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-mono text-sm text-white">jpamorosi.os</span>
        </div>
        <div className="text-xs text-gray-300 font-mono">
          <RealTimeClock />
        </div>
      </header>

      {/* LAYOUT ORIGINAL MOBILE + MODIFICACIONES DESKTOP */}
      <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-[50] md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Mobile: Layout original con flexbox centrado - ajustado para evitar solapamiento */}
        <div className="text-center mobile-title-safe">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl pointer-events-auto select-text">
              <span className="text-cyan-400">jp</span>
              <span className="text-purple-400">amorosi</span>
              <span className="text-pink-400">.os</span>
            </h1>
            <p className="text-gray-300 font-mono drop-shadow-lg pointer-events-auto select-text">Personal Operating System • Interactive CV</p>
            <p className="text-gray-400 opacity-70 text-sm mt-2 drop-shadow-lg pointer-events-auto select-text">
              Click on the dock icons below to open applications
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 p-6 rounded-lg inline-block shadow-2xl mt-32 pointer-events-auto z-[45]">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3 select-text">Welcome to jpamorosi.os</h2>
            <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed select-text">
              This is an interactive CV built as a desktop environment. Click the dock icons to 
              open different applications with my professional information.
            </p>
          </div>
        </div>
      </div>

      {/* DESKTOP: Layout modificado */}
      <div className="hidden md:block">
        {/* Título Desktop */}
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 pointer-events-none z-[50]">
          <div className="text-center transform scale-75">
            <div className="mb-12">
              <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-2xl pointer-events-auto select-text">
                <span className="text-cyan-400">jp</span>
                <span className="text-purple-400">amorosi</span>
                <span className="text-pink-400">.os</span>
              </h1>
              <p className="text-gray-300 font-mono drop-shadow-lg pointer-events-auto select-text">Personal Operating System • Interactive CV</p>
              <p className="text-gray-400 opacity-70 text-sm mt-2 drop-shadow-lg pointer-events-auto select-text">
                Click on the dock icons below to open applications
              </p>
            </div>
          </div>
        </div>

        {/* Welcome Card Desktop */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[50]">
          <div className="text-center transform scale-90">
            <div className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 p-5 rounded-lg inline-block shadow-2xl pointer-events-auto z-[45]">
              <h2 className="text-base font-semibold text-cyan-400 mb-3 select-text">Welcome to jpamorosi.os</h2>
              <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed select-text">
                This is an interactive CV built as a desktop environment. Click the dock icons to 
                open different applications with my professional information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Functional Dock */}
      <Dock />

      {/* Windows portal */}
      {mounted && createPortal(
        <div 
          className="fixed inset-0 pointer-events-none z-[102]"
        >
          {windows.map((window) => (
            <div key={window.id} className="pointer-events-auto">
              <Window window={window} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}