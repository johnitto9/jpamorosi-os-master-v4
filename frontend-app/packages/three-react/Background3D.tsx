"use client"

import React, { lazy, Suspense } from "react"

// Lazy loaded fallback for non-3D environments
const Background3DFallback = () => (
  <div className="absolute inset-0">
    <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/20 via-transparent to-accent-magenta/20" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.1),transparent_50%)]" />
  </div>
)

export interface Background3DProps {
  density?: number
  color?: string
  speed?: number
  fallback?: boolean
}

export function Background3D({ 
  density = 1500, 
  color = "#00f2ff", 
  speed = 0.05, 
  fallback = false 
}: Background3DProps) {
  
  // For now, always show fallback until 3D is implemented in Phase 2
  if (fallback || typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return <Background3DFallback />
  }

  return (
    <Suspense fallback={<Background3DFallback />}>
      <Background3DFallback />
    </Suspense>
  )
}

export default Background3D