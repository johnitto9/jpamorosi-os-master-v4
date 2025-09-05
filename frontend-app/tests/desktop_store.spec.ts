import { describe, it, expect, beforeEach } from 'vitest'
import { useDesktopStore } from '../packages/desktop/store'
import type { WindowApp } from '../packages/desktop/types'

// Mock window app for testing
const mockApp: WindowApp = {
  id: 'test-app',
  title: 'Test App',
  icon: '🧪',
  content: {
    message: 'Test content'
  },
  defaultSize: { width: 600, height: 400 },
  defaultPosition: { x: 100, y: 100 }
}

const anotherMockApp: WindowApp = {
  id: 'another-app',
  title: 'Another App', 
  icon: '📱',
  content: {
    data: 'Another test content'
  },
  defaultSize: { width: 800, height: 500 },
  defaultPosition: { x: 200, y: 200 }
}

describe('Desktop Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDesktopStore.setState({
      windows: [],
      nextZIndex: 1000
    })
  })

  describe('openWindow', () => {
    it('should open a new window with correct properties', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      
      const state = useDesktopStore.getState()
      expect(state.windows).toHaveLength(1)
      
      const window = state.windows[0]
      expect(window.app).toEqual(mockApp)
      expect(window.position).toEqual(mockApp.defaultPosition)
      expect(window.size).toEqual(mockApp.defaultSize)
      expect(window.zIndex).toBe(1000)
      expect(window.isMinimized).toBe(false)
      expect(window.id).toMatch(new RegExp(`^${mockApp.id}-\\d+$`))
    })

    it('should increment nextZIndex when opening a window', () => {
      const store = useDesktopStore.getState()
      const initialZIndex = store.nextZIndex
      
      store.openWindow(mockApp)
      
      const newState = useDesktopStore.getState()
      expect(newState.nextZIndex).toBe(initialZIndex + 1)
    })

    it('should use default position if not provided', () => {
      const appWithoutPosition: WindowApp = {
        ...mockApp,
        defaultPosition: undefined
      }
      
      const store = useDesktopStore.getState()
      store.openWindow(appWithoutPosition)
      
      const window = useDesktopStore.getState().windows[0]
      // Should use calculated position based on window count
      expect(window.position).toEqual({ x: 100, y: 100 })
    })

    it('should use default size if not provided', () => {
      const appWithoutSize: WindowApp = {
        ...mockApp,
        defaultSize: undefined
      }
      
      const store = useDesktopStore.getState()
      store.openWindow(appWithoutSize)
      
      const window = useDesktopStore.getState().windows[0]
      expect(window.size).toEqual({ width: 600, height: 400 })
    })

    it('should not open duplicate windows for same app', () => {
      const store = useDesktopStore.getState()
      
      // Open the same app twice
      store.openWindow(mockApp)
      expect(useDesktopStore.getState().windows).toHaveLength(1)
      
      store.openWindow(mockApp)
      expect(useDesktopStore.getState().windows).toHaveLength(1)
      
      // Should still be only one window
      const windows = useDesktopStore.getState().windows
      expect(windows).toHaveLength(1)
      expect(windows[0].app.id).toBe(mockApp.id)
    })

    it('should focus existing window when trying to open duplicate', () => {
      const store = useDesktopStore.getState()
      
      // Open window first time
      store.openWindow(mockApp)
      const initialWindow = useDesktopStore.getState().windows[0]
      const initialZIndex = initialWindow.zIndex
      
      // Try to open same app again
      store.openWindow(mockApp) 
      
      const focusedWindow = useDesktopStore.getState().windows[0]
      expect(focusedWindow.zIndex).toBeGreaterThan(initialZIndex)
    })

    it('should offset position for multiple windows when no defaultPosition', () => {
      const appWithoutPosition: WindowApp = {
        ...anotherMockApp,
        defaultPosition: undefined
      }
      
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp) // First window at (100, 100)
      store.openWindow(appWithoutPosition) // Should be offset
      
      const windows = useDesktopStore.getState().windows
      expect(windows).toHaveLength(2)
      
      // Second window should be offset by 30px * windows.length before it
      expect(windows[1].position).toEqual({ x: 130, y: 130 })
    })
  })

  describe('closeWindow', () => {
    it('should remove window from store', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      
      store.closeWindow(windowId)
      
      expect(useDesktopStore.getState().windows).toHaveLength(0)
    })

    it('should not affect other windows', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      store.openWindow(anotherMockApp)
      
      const windowId = useDesktopStore.getState().windows[0].id
      store.closeWindow(windowId)
      
      const remainingWindows = useDesktopStore.getState().windows
      expect(remainingWindows).toHaveLength(1)
      expect(remainingWindows[0].app.id).toBe('another-app')
    })

    it('should handle closing non-existent window gracefully', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const initialCount = useDesktopStore.getState().windows.length
      
      store.closeWindow('non-existent-id')
      
      expect(useDesktopStore.getState().windows).toHaveLength(initialCount)
    })
  })

  describe('focusWindow', () => {
    it('should increase zIndex and unminimize window', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      const initialZIndex = useDesktopStore.getState().windows[0].zIndex
      
      // Minimize window first
      store.minimizeWindow(windowId)
      expect(useDesktopStore.getState().windows[0].isMinimized).toBe(true)
      
      // Focus window
      store.focusWindow(windowId)
      
      const focusedWindow = useDesktopStore.getState().windows[0]
      expect(focusedWindow.zIndex).toBeGreaterThan(initialZIndex)
      expect(focusedWindow.isMinimized).toBe(false)
    })

    it('should increment nextZIndex', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      const initialNextZIndex = useDesktopStore.getState().nextZIndex
      
      store.focusWindow(windowId)
      
      expect(useDesktopStore.getState().nextZIndex).toBe(initialNextZIndex + 1)
    })

    it('should handle focusing non-existent window', () => {
      const store = useDesktopStore.getState()
      const initialNextZIndex = store.nextZIndex
      
      store.focusWindow('non-existent-id')
      
      // Should not change nextZIndex
      expect(useDesktopStore.getState().nextZIndex).toBe(initialNextZIndex)
    })
  })

  describe('updateWindow', () => {
    it('should update window properties', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      
      const updates = {
        position: { x: 300, y: 300 },
        size: { width: 800, height: 600 }
      }
      
      store.updateWindow(windowId, updates)
      
      const updatedWindow = useDesktopStore.getState().windows[0]
      expect(updatedWindow.position).toEqual(updates.position)
      expect(updatedWindow.size).toEqual(updates.size)
    })

    it('should only update provided properties', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      const originalWindow = useDesktopStore.getState().windows[0]
      
      store.updateWindow(windowId, { position: { x: 500, y: 500 } })
      
      const updatedWindow = useDesktopStore.getState().windows[0]
      expect(updatedWindow.position).toEqual({ x: 500, y: 500 })
      expect(updatedWindow.size).toEqual(originalWindow.size) // Should remain unchanged
      expect(updatedWindow.zIndex).toBe(originalWindow.zIndex) // Should remain unchanged
    })

    it('should handle updating non-existent window', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const originalState = useDesktopStore.getState()
      
      store.updateWindow('non-existent-id', { position: { x: 999, y: 999 } })
      
      // State should remain unchanged
      expect(useDesktopStore.getState()).toEqual(originalState)
    })
  })

  describe('minimizeWindow', () => {
    it('should set isMinimized to true', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      const windowId = useDesktopStore.getState().windows[0].id
      
      expect(useDesktopStore.getState().windows[0].isMinimized).toBe(false)
      
      store.minimizeWindow(windowId)
      
      expect(useDesktopStore.getState().windows[0].isMinimized).toBe(true)
    })

    it('should handle minimizing non-existent window', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp) 
      const originalState = useDesktopStore.getState()
      
      store.minimizeWindow('non-existent-id')
      
      // State should remain unchanged
      expect(useDesktopStore.getState()).toEqual(originalState)
    })
  })

  describe('zIndex management', () => {
    it('should assign higher zIndex to later windows', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      store.openWindow(anotherMockApp)
      
      const windows = useDesktopStore.getState().windows
      expect(windows[1].zIndex).toBeGreaterThan(windows[0].zIndex)
    })

    it('should maintain focus order correctly', () => {
      const store = useDesktopStore.getState()
      
      store.openWindow(mockApp)
      store.openWindow(anotherMockApp)
      
      const firstWindowId = useDesktopStore.getState().windows[0].id
      const secondWindowId = useDesktopStore.getState().windows[1].id
      
      // Focus first window again (should bring to front)
      store.focusWindow(firstWindowId)
      
      const windows = useDesktopStore.getState().windows
      const firstWindow = windows.find(w => w.id === firstWindowId)
      const secondWindow = windows.find(w => w.id === secondWindowId)
      
      expect(firstWindow!.zIndex).toBeGreaterThan(secondWindow!.zIndex)
    })
  })
})