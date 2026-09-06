import { useLayout } from './LayoutContext'
import { NavLink } from 'react-router-dom'
import { APP_NAME, APP_VERSION } from '../../constants/app'
import { NAV_ITEMS } from '../../config/navigation'

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function SidebarNavItem({ label, path, icon: Icon }) {
  const { closeSidebar } = useLayout()

  return (
    <NavLink
      to={path}
      end={path === '/'}
      onClick={closeSidebar}
      className={({ isActive }) =>
        [
          'relative flex items-center gap-3 px-6 py-4 text-xs font-medium uppercase tracking-widest transition-colors',
          isActive
            ? 'bg-neutral-100 font-semibold text-neutral-900'
            : 'text-neutral-700 hover:bg-neutral-50',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5 shrink-0 stroke-current" />
          <span>{label}</span>
          {isActive && (
            <span className="absolute right-0 top-0 h-full w-1 bg-[#2d6a6a]" aria-hidden="true" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, closeSidebar, collapseSidebar } = useLayout()

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 max-w-[85vw] flex-col border-r border-neutral-200 bg-white transition-all duration-200 ease-out',
          'lg:static lg:z-auto lg:max-w-none lg:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full max-lg:pointer-events-none',
          sidebarCollapsed
            ? 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:translate-x-0 lg:pointer-events-none'
            : 'lg:w-64 lg:translate-x-0',
        ].join(' ')}
        aria-label="Sidebar navigation"
      >
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 py-6">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-neutral-900">{APP_NAME}</h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              {APP_VERSION}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              closeSidebar()
              collapseSidebar()
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </button>
        </header>

        <nav className="flex flex-1 flex-col overflow-y-auto py-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.id} {...item} />
          ))}
        </nav>
      </aside>
    </>
  )
}
