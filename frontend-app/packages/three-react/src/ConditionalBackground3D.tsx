"use client"

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMediaQuery } from '../../../hooks/use-media-query'
import { FallbackBackground } from './FallbackBackground'

// Lazy import for code splitting - Using enhanced version with Avatar support
const Background3DWithAvatar = React.lazy(() => import('./Background3DWithAvatar'))

export interface ConditionalBackground3DProps {
  density?: number
  color?: string
  speed?: number
}

export function ConditionalBackground3D({
  density = 1500,
  color = "#00f2ff", 
  speed = 0.05
}: ConditionalBackground3DProps) {
  const searchParams = useSearchParams()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  
  // Check URL flags and user preferences
  const no3d = searchParams?.get('no3d') === 'true'
  const shouldDisable3D = no3d || prefersReducedMotion
  
  // Parse URL parameters for 3D settings
  const urlDensity = searchParams?.get('density')
  const parsedDensity = urlDensity ? parseInt(urlDensity, 10) : density
  
  if (shouldDisable3D) {
    return <FallbackBackground />
  }

  return (
    <Suspense fallback={<FallbackBackground />}>
      <Background3DWithAvatar 
        density={parsedDensity}
        color={color}
        speed={speed}
      />
    </Suspense>
  )
}

export default ConditionalBackground3D