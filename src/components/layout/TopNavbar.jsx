import { useLocation } from 'react-router-dom'
import { findNavPageTitle } from '../../config/navigation'
import { useLayout } from './LayoutContext'

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export default function TopNavbar() {
  const { pathname } = useLocation()
  const pageTitle = findNavPageTitle(pathname)
  const { sidebarOpen, sidebarCollapsed, toggleSidebar } = useLayout()
  const isSidebarVisible = sidebarOpen || !sidebarCollapsed

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:h-16 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={toggleSidebar}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-100"
        aria-label={isSidebarVisible ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isSidebarVisible}
      >
        <MenuIcon />
      </button>

      <h1 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em] text-neutral-900 sm:text-sm sm:tracking-[0.15em]">
        {pageTitle}
      </h1>
    </header>
  )
}
