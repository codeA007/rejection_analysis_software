import { useId } from 'react'

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
}

export function AppLogoMark({ className = '', size = 'md' }) {
  const dimension = sizeClasses[size] ?? sizeClasses.md
  const uid = useId().replace(/:/g, '')
  const logoGradientId = `frt-logo-gradient-${uid}`
  const glowGradientId = `frt-glow-gradient-${uid}`

  return (
    <svg
      className={`${dimension} shrink-0 ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Foundry Rejection Tracker"
    >
      <defs>
        <linearGradient id={logoGradientId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3d8a8a" />
          <stop offset="1" stopColor="#1f4f4f" />
        </linearGradient>
        <linearGradient id={glowGradientId} x1="32" y1="34" x2="32" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill={`url(#${logoGradientId})`} />
      {/* chimney */}
      <path d="M28 14h8v10h-8V14Z" fill="#d4e8e8" />
      <path d="M26 12h12v4H26v-4Z" fill="#e8f4f4" />
      {/* furnace body */}
      <path
        d="M16 24h32v22H16V24Z"
        fill="#e8f4f4"
      />
      <path d="M16 24h32v4H16v-4Z" fill="#c5dede" />
      {/* door opening */}
      <path
        d="M24 32h16v14H24V32Z"
        fill="#1f4f4f"
      />
      <path
        d="M26 34h12v10H26V34Z"
        fill={`url(#${glowGradientId})`}
        opacity="0.95"
      />
      {/* legs */}
      <path d="M18 46h6v6h-6v-6Z" fill="#c5dede" />
      <path d="M40 46h6v6h-6v-6Z" fill="#c5dede" />
      <path d="M14 52h36v2H14v-2Z" fill="#a8caca" />
    </svg>
  )
}

export default function AppLogo({
  size = 'md',
  showWordmark = false,
  subtitle,
  compactWordmark = false,
  className = '',
  wordmarkClassName = '',
}) {
  const titleClass = compactWordmark
    ? 'text-sm font-bold leading-tight tracking-tight'
    : 'text-base font-bold leading-tight tracking-tight sm:text-lg'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AppLogoMark size={size} />
      {showWordmark ? (
        <div className={`min-w-0 ${wordmarkClassName}`}>
          <p className={`${titleClass} text-neutral-900`}>Foundry Rejection</p>
          <p className={`${titleClass} text-[#2d6a6a]`}>Tracker</p>
          {subtitle ? (
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
