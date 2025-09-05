"use client"

import React from "react"
import { useDesktopStore } from "../store"
import { Window } from "./Window"
import { Dock } from "./Dock"
import { ConditionalBackground3D } from "../../three-react/src/ConditionalBackground3D"
import ScrollWatermark from "./ScrollWatermark"
import ScrollWatermarkSimple from "./ScrollWatermarkSimple"

export interface DesktopProps {
  children?: React.ReactNode
  className?: string
}

export function Desktop({ children, className = "" }: DesktopProps) {
  const { windows } = useDesktopStore()

  return (
    <div className={`min-h-screen bg-dark-bg relative ${className}`}>
      <h1 className="sr-only">Desktop Environment jpamorosi.os</h1>
      
      {/* 3D Background - Fixed positioning to avoid layout issues */}
      <div className="fixed inset-0 z-0">
        <ConditionalBackground3D 
          density={1500}
          color="#00f2ff"
          speed={0.05}
        />
      </div>

      {/* Desktop Content - Proper z-index layering */}
      <div className="relative z-10">
        {/* Main Content Area */}
        <main>
          {children}
        </main>

        {/* Window Management Layer - Desktop only on md+ screens */}
        <div className="hidden md:block fixed inset-0 pointer-events-none z-30">
          {windows.map((window) => (
            <div key={window.id} className="pointer-events-auto">
              <Window window={window} />
            </div>
          ))}
        </div>

        {/* Mobile App Container - Show on screens < md */}
        <div className="md:hidden">
          {windows.length > 0 && (
            <Window
              key={windows[windows.length - 1].id}
              window={windows[windows.length - 1]}
            />
          )}
        </div>

        {/* Dock */}
        <Dock />
        
        {/* ScrollWatermark - Floating scroll indicator */}
        <ScrollWatermark 
          delay={2000}      // Aparece a los 2 segundos (+0.5seg retraso)
          hideAfter={4500}  // Se oculta a los 4.5 segundos (+0.5seg duración)
        />
        
      </div>
    </div>
  )
}