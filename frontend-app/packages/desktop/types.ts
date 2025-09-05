export interface WindowApp {
  id: string
  title: string
  icon: string
  content: Record<string, any>
  defaultSize?: { width: number; height: number }
  defaultPosition?: { x: number; y: number }
  minSize?: { width: number; height: number }
}

export interface WindowInstance {
  id: string
  app: WindowApp
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  isMinimized: boolean
}

export interface DesktopState {
  windows: WindowInstance[]
  nextZIndex: number
  openWindow: (app: WindowApp) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  updateWindow: (id: string, updates: Partial<WindowInstance>) => void
  minimizeWindow: (id: string) => void
}
