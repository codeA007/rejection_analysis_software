import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const LayoutContext = createContext(null)
const DESKTOP_SIDEBAR_BREAKPOINT = 1024

export function LayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const collapseSidebar = useCallback(() => {
    setSidebarCollapsed(true)
  }, [])

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < DESKTOP_SIDEBAR_BREAKPOINT) {
      setSidebarOpen((current) => !current)
      return
    }
    setSidebarCollapsed((current) => !current)
  }, [])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= DESKTOP_SIDEBAR_BREAKPOINT) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const isMobile = window.innerWidth < DESKTOP_SIDEBAR_BREAKPOINT
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [sidebarOpen])

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        sidebarCollapsed,
        closeSidebar,
        collapseSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}
