const toneStyles = {
  teal: {
    card: 'border-[#2d6a6a]/15 bg-gradient-to-br from-[#2d6a6a]/8 to-white',
    icon: 'bg-[#2d6a6a]/10 text-[#2d6a6a]',
    value: 'text-[#2d6a6a]',
  },
  amber: {
    card: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-800',
  },
  rose: {
    card: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white',
    icon: 'bg-rose-100 text-rose-700',
    value: 'text-rose-800',
  },
  violet: {
    card: 'border-violet-200/80 bg-gradient-to-br from-violet-50 to-white',
    icon: 'bg-violet-100 text-violet-700',
    value: 'text-violet-800',
  },
}

export default function StatCard({ label, value, hint, tone = 'teal', icon }) {
  const styles = toneStyles[tone] ?? toneStyles.teal

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {label}
          </p>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${styles.value}`}>
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs leading-relaxed text-neutral-500">{hint}</p> : null}
        </div>
        {icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
