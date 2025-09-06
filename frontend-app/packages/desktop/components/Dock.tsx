"use client"

import { motion } from "framer-motion"
import { useDesktopStore } from "../store"
import type { WindowApp } from "../types"

// Import app content
import aboutContent from "../../../content/about.json"
import skillsContent from "../../../content/skills.json"
import timelineContent from "../../../content/timeline.json"
import projectsContent from "../../../content/projects.json"
import contactContent from "../../../content/contact.json"

// App definitions with responsive positioning and sizing
const getResponsiveWindowConfig = () => {
  if (typeof window === 'undefined') return {}; // SSR safety
  
  const isTablet = window.matchMedia('(max-width: 1200px) and (min-width: 769px)').matches;
  const isSmallTablet = window.matchMedia('(max-width: 1024px) and (min-width: 769px)').matches;
  
  // Responsive sizing multiplier
  const sizeMultiplier = isSmallTablet ? 0.85 : isTablet ? 0.92 : 1;
  
  // Position offset for responsive layouts  
  const posOffset = isTablet ? 20 : 30;
  
  return { sizeMultiplier, posOffset };
};

const apps: WindowApp[] = [
  {
    ...aboutContent,
    defaultPosition: { x: 100, y: 100 },
    defaultSize: { width: 560, height: 400 }
  },
  {
    ...skillsContent,
    defaultPosition: { x: 150, y: 150 }, 
    defaultSize: { width: 560, height: 400 }
  },
  {
    ...timelineContent,
    defaultPosition: { x: 200, y: 200 },
    defaultSize: { width: 640, height: 480 }
  },
  {
    ...projectsContent,
    // Nueva posición: segunda columna, arriba a la derecha 
    defaultPosition: { x: 450, y: 120 },
    defaultSize: { width: 720, height: 520 }
  },
  {
    ...contactContent,
    // Nueva posición: segunda columna, un poco más abajo que projects
    defaultPosition: { x: 500, y: 170 },
    defaultSize: { width: 600, height: 480 }
  }
]

interface DockProps {
  className?: string
}

export function Dock({ className }: DockProps) {
  const { openWindow, windows } = useDesktopStore()

  const handleAppClick = (app: WindowApp) => {
    openWindow(app)
  }

  const isAppOpen = (appId: string) => {
    return windows.some(window => window.app.id === appId && !window.isMinimized)
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
      className={`
        fixed z-[100] ${className || ""}
        md:bottom-6 md:left-0 md:right-0 md:flex md:justify-center
        max-md:bottom-0 max-md:left-0 max-md:right-0
      `}
    >
      <div className="
        glass-card shadow-2xl
        md:px-4 md:py-3 md:rounded-2xl
        max-md:px-2 max-md:py-4 max-md:rounded-t-2xl max-md:rounded-b-none
      ">
        <div className="
          flex items-center justify-center
          md:gap-3
          max-md:justify-around max-md:gap-1
        ">
          {apps.map((app, index) => (
            <DockButton
              key={app.id}
              app={app}
              isOpen={isAppOpen(app.id)}
              onClick={() => handleAppClick(app)}
              index={index}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

interface DockButtonProps {
  app: WindowApp
  isOpen: boolean
  onClick: () => void
  index: number
}

function DockButton({ app, isOpen, onClick, index }: DockButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay: 0.1 * index, 
        duration: 0.3, 
        type: "spring", 
        stiffness: 200 
      }}
      whileHover={{ 
        scale: 1.2,
        y: -8,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      onClick={onClick}
      className={`
        relative rounded-xl transition-all duration-200
        flex items-center justify-center
        focus-ring group
        md:w-12 md:h-12 md:text-2xl
        max-md:w-14 max-md:h-14 max-md:text-xl max-md:rounded-2xl
        ${isOpen 
          ? 'bg-accent-cyan/30 shadow-lg shadow-accent-cyan/25' 
          : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
        }
      `}
      aria-label={`Open ${app.title}`}
    >
      {/* App Icon */}
      <span className="relative z-10">{app.icon}</span>
      
      {/* Active indicator */}
      {isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent-cyan rounded-full"
        />
      )}
      
      {/* Hover tooltip - Desktop only */}
      <div className="hidden md:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                      px-2 py-1 bg-dark-bg/90 text-primary-text text-xs rounded
                      opacity-0 pointer-events-none transition-opacity duration-200
                      whitespace-nowrap group-hover:opacity-100">
        {app.title}
      </div>
    </motion.button>
  )
}