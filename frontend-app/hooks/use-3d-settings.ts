"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMediaQuery } from "./use-media-query"

interface Use3DSettings {
  shouldUse3D: boolean
  renderer: "react" | "vue"
  sceneProps: {
    density: number
    color: string
    speed: number
    autoRotate: boolean
  }
  isLoading: boolean
  reason?: string
}

export function use3DSettings(): Use3DSettings {
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  
  // Media queries for auto-detection
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const prefersReducedData = useMediaQuery("(prefers-reduced-data: reduce)")
  const isMobile = useMediaQuery("(max-width: 767px)")
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)")
  
  // URL parameters
  const no3d = searchParams?.get("no3d") === "true"
  const rendererParam = searchParams?.get("renderer") as "react" | "vue" | null
  const densityParam = searchParams?.get("density")
  const speedParam = searchParams?.get("speed")
  const colorParam = searchParams?.get("color")

  useEffect(() => {
    // Simulate loading time to avoid hydration mismatch
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const settings = useMemo(() => {
    let shouldUse3D = true
    let reason: string | undefined

    // Check conditions that disable 3D
    if (no3d) {
      shouldUse3D = false
      reason = "Disabled by ?no3d=true flag"
    } else if (prefersReducedMotion) {
      shouldUse3D = false
      reason = "Disabled due to prefers-reduced-motion"
    } else if (prefersReducedData) {
      shouldUse3D = false
      reason = "Disabled due to prefers-reduced-data"
    }

    // Renderer selection
    const renderer: "react" | "vue" = rendererParam === "vue" ? "vue" : "react"

    // Responsive scene configuration
    let baseConfig = {
      density: 1500,
      color: "#00f2ff",
      speed: 0.05,
      autoRotate: true
    }

    // Apply responsive adjustments
    if (isMobile) {
      baseConfig = {
        ...baseConfig,
        density: 800,
        speed: 0.02,
        autoRotate: false
      }
    } else if (isTablet) {
      baseConfig = {
        ...baseConfig,
        density: 1200,
        speed: 0.03
      }
    }

    // Override with URL parameters
    const sceneProps = {
      density: densityParam ? parseInt(densityParam, 10) : baseConfig.density,
      color: colorParam || baseConfig.color,
      speed: speedParam ? parseFloat(speedParam) : baseConfig.speed,
      autoRotate: baseConfig.autoRotate
    }

    // Validate and clamp values
    sceneProps.density = Math.max(100, Math.min(3000, sceneProps.density))
    sceneProps.speed = Math.max(0.001, Math.min(0.2, sceneProps.speed))

    return {
      shouldUse3D,
      renderer,
      sceneProps,
      reason
    }
  }, [
    no3d,
    prefersReducedMotion,
    prefersReducedData,
    isMobile,
    isTablet,
    rendererParam,
    densityParam,
    speedParam,
    colorParam
  ])

  return {
    ...settings,
    isLoading
  }
}