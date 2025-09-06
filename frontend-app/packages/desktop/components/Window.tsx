"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useDesktopStore } from "../store"
import { useMediaQuery } from "../../../hooks/use-media-query"
import type { WindowInstance } from "../types"

// Import app components
import { AboutApp } from "../apps/AboutApp"
import { SkillsApp } from "../apps/SkillsApp"
import { TimelineApp } from "../apps/TimelineApp"
import { ProjectsApp } from "../apps/ProjectsApp"
import { ContactApp } from "../apps/ContactApp"

// App component mapping
const AppComponents = {
  about: AboutApp,
  skills: SkillsApp,
  timeline: TimelineApp,
  projects: ProjectsApp,
  contact: ContactApp,
} as const

export interface WindowProps {
  window: WindowInstance
}

export function Window({ window }: WindowProps) {
  const { focusWindow, closeWindow, updateWindow } = useDesktopStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 })
  
  // Mobile detection - Only disable on true mobile, not tablets
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1200px) and (min-width: 769px)')

  // Handle click to focus
  const handleFocus = () => {
    focusWindow(window.id)
  }

  // Handle dragging - disabled only on true mobile, enabled on tablets
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.window-header')) {
      // Enable dragging on desktop AND tablets (disable only on mobile)
      if (!isMobile) {
        setIsDragging(true)
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          windowX: window.position.x,
          windowY: window.position.y
        }
      }
      handleFocus()
    }
  }

  // Handle touch dragging for tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.window-header')) {
      // Enable touch dragging on tablets only (not mobile, not desktop)
      if (isTablet) {
        setIsDragging(true)
        const touch = e.touches[0]
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          windowX: window.position.x,
          windowY: window.position.y
        }
        // No preventDefault aquí - se maneja en el useEffect
      }
      handleFocus()
    }
  }

  // Handle resize - disabled on mobile
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return // Disable resize on mobile
    
    e.stopPropagation()
    setIsResizing(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      windowX: window.size.width,
      windowY: window.size.height
    }
  }

  // Mouse and touch move handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        
        // Calculate new position with viewport constraints
        const newX = dragStartRef.current.windowX + deltaX
        const newY = dragStartRef.current.windowY + deltaY
        
        // Get viewport dimensions
        const viewportWidth = globalThis.window?.innerWidth || 1024
        const viewportHeight = globalThis.window?.innerHeight || 768
        
        // Constrain window position to viewport
        const constrainedX = Math.max(0, Math.min(newX, viewportWidth - window.size.width))
        const constrainedY = Math.max(0, Math.min(newY, viewportHeight - window.size.height))
        
        updateWindow(window.id, {
          position: {
            x: constrainedX,
            y: constrainedY
          }
        })
      } else if (isResizing) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        
        updateWindow(window.id, {
          size: {
            width: Math.max(224, dragStartRef.current.windowX + deltaX), // 280 * 0.8 = 224
            height: Math.max(144, dragStartRef.current.windowY + deltaY) // 180 * 0.8 = 144
          }
        })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && isTablet) {
        e.preventDefault() // Prevent scrolling
        const touch = e.touches[0]
        const deltaX = touch.clientX - dragStartRef.current.x
        const deltaY = touch.clientY - dragStartRef.current.y
        
        // Calculate new position with viewport constraints
        const newX = dragStartRef.current.windowX + deltaX
        const newY = dragStartRef.current.windowY + deltaY
        
        // Get viewport dimensions
        const viewportWidth = globalThis.window?.innerWidth || 1024
        const viewportHeight = globalThis.window?.innerHeight || 768
        
        // Constrain window position to viewport
        const constrainedX = Math.max(0, Math.min(newX, viewportWidth - window.size.width))
        const constrainedY = Math.max(0, Math.min(newY, viewportHeight - window.size.height))
        
        updateWindow(window.id, {
          position: {
            x: constrainedX,
            y: constrainedY
          }
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, isResizing, window.id, updateWindow, isTablet])

  if (window.isMinimized) {
    return null
  }

  // Animation variants based on device type
  const mobileAnimations = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' }
  }
  
  const desktopAnimations = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  }

  return (
    <motion.div
      ref={windowRef}
      initial={isMobile ? mobileAnimations.initial : desktopAnimations.initial}
      animate={isMobile ? mobileAnimations.animate : desktopAnimations.animate}
      exit={isMobile ? mobileAnimations.exit : desktopAnimations.exit}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        shadow-2xl flex flex-col
        ${isMobile 
          ? 'fixed inset-0 z-50 bg-dark-bg/90 backdrop-blur-lg' 
          : 'glass-card absolute rounded-lg min-w-[224px] min-h-[144px] transition-all duration-300 ease-out'
        }
        ${isDragging ? 'cursor-grabbing !transition-none' : 'cursor-default'}
        ${isResizing ? 'cursor-nw-resize !transition-none' : ''}
        focus-within:ring-2 focus-within:ring-accent-cyan/50
      `}
      style={isMobile ? { zIndex: window.zIndex } : {
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex
      }}
      onMouseDown={handleFocus}
      onTouchStart={handleTouchStart}
    >
      {/* Window Header */}
      <div 
        className="window-header flex items-center justify-between p-3 border-b border-accent-cyan/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{window.app.icon}</span>
          <h2 className="font-mono text-sm text-primary-text font-medium">
            {window.app.title}
          </h2>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Hide minimize button on mobile */}
          {!isMobile && (
            <button 
              onClick={() => updateWindow(window.id, { isMinimized: true })}
              className="w-6 h-6 rounded-full bg-accent-purple/20 hover:bg-accent-purple/40 transition-colors focus:ring-2 focus:ring-accent-purple/50 text-xs"
              aria-label="Minimize window"
            >
              –
            </button>
          )}
          <button 
            onClick={() => closeWindow(window.id)}
            className="w-6 h-6 rounded-full bg-accent-magenta/20 hover:bg-accent-magenta/40 transition-colors focus:ring-2 focus:ring-accent-magenta/50 text-xs"
            aria-label="Close window"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className={`flex-1 ${isMobile ? 'overflow-y-auto px-6 py-4' : 'overflow-y-auto p-4'}`}>
        {(() => {
          const AppComponent = AppComponents[window.app.id as keyof typeof AppComponents]
          return AppComponent ? <AppComponent app={window.app} /> : (
            <div className="p-4 text-primary-text">
              <h3>App not found</h3>
              <p>Component for {window.app.id} is not implemented yet.</p>
            </div>
          )
        })()}
      </div>

      {/* Resize Handle - Desktop only */}
      <div 
        className="hidden md:block absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-50 hover:opacity-100"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-accent-cyan/50" />
      </div>
    </motion.div>
  )
}