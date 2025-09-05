"use client"

import React, { Suspense, lazy } from "react"
import { use3DSettings } from "../../../hooks/use-3d-settings"

// Lazy load Background3D to reduce initial bundle
const Background3D = lazy(() => 
  import("./Background3D").then(module => ({ 
    default: module.Background3D 
  }))
)

// Import fallback directly (no lazy loading needed for simple component)
import { BackgroundFallback } from "./Background3D"

interface BackgroundProviderProps {
  className?: string
}

// Loading component for 3D
function Background3DLoading() {
  return <BackgroundFallback className="animate-pulse" />
}

export function BackgroundProvider({ className }: BackgroundProviderProps) {
  const { shouldUse3D, renderer, sceneProps, isLoading, reason } = use3DSettings()

  // Show loading state initially
  if (isLoading) {
    return <BackgroundFallback className={className} />
  }

  // Show fallback if 3D is disabled
  if (!shouldUse3D) {
    if (process.env.NODE_ENV === 'development' && reason) {
      console.log(`[Background3D] ${reason}`)
    }
    return <BackgroundFallback className={className} />
  }

  // For Vue renderer (future implementation)
  if (renderer === "vue") {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Background3D] Vue renderer selected (fallback to React for now)')
    }
    // TODO: Implement Vue/TresJS Web Component
    // For now, fallback to React implementation
  }

  // Render React Three Fiber version with Suspense
  return (
    <Suspense fallback={<Background3DLoading />}>
      <Background3D 
        {...sceneProps}
        className={className}
        fallback={<BackgroundFallback />}
      />
    </Suspense>
  )
}

// Export hook for external use
export { use3DSettings }