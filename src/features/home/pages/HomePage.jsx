import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardSummary } from '../../../api/analysis'
import StatCard from '../../../components/ui/StatCard'
import { pageClassName } from '../../../components/ui/formStyles'
import AppLogo from '../../../components/branding/AppLogo'
import { APP_NAME } from '../../../constants/app'
import {
  formatDisplayDate,
  formatDisplayMonth,
  getLocalTodayDate,
  getMonthBounds,
  isoDateToMonthKey,
} from '../../../utils/dateUtils'

function formatMetric(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function ProductionIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
    </svg>
  )
}

function RejectionIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  )
}

function RateIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-6" />
    </svg>
  )
}

function PartsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4M20 12H4M20 17H4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const quickActions = [
  {
    to: '/production',
    title: 'Add Production',
    description: 'Record cast parts and heat numbers',
    accent: 'from-[#2d6a6a]/10 to-[#2d6a6a]/5 text-[#2d6a6a]',
  },
  {
    to: '/rejections',
    title: 'Log Rejection',
    description: 'Track rejected quantity by reason',
    accent: 'from-amber-100/80 to-amber-50 text-amber-800',
  },
  {
    to: '/monthly',
    title: 'Monthly Analysis',
    description: 'Review trends and export Excel',
    accent: 'from-sky-100/80 to-sky-50 text-sky-800',
  },
  {
    to: '/parts',
    title: 'Manage Parts',
    description: 'Update catalog and weights',
    accent: 'from-violet-100/80 to-violet-50 text-violet-800',
  },
]

export default function HomePage() {
  const today = getLocalTodayDate()
  const monthRange = getMonthBounds(today)
  const monthLabel = formatDisplayMonth(isoDateToMonthKey(today))
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    fetchDashboardSummary({ from: monthRange.start, to: monthRange.end })
      .then(setSummary)
      .catch((err) => setError(err.message || 'Unable to load dashboard summary.'))
      .finally(() => setIsLoading(false))
  }, [monthRange.start, monthRange.end])

  const hasActivity =
    summary &&
    (summary.totalProduction > 0 || summary.totalRejections > 0 || summary.partCount > 0)

  return (
    <div className={pageClassName}>
      <section className="shrink-0 rounded-2xl border border-[#2d6a6a]/10 bg-gradient-to-br from-[#2d6a6a]/5 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AppLogo size="xl" showWordmark subtitle={APP_NAME} />
          <div className="sm:text-right">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {monthLabel}
            </h2>
            <p className="mt-2 text-sm text-neutral-500 sm:text-base">
              {formatDisplayDate(monthRange.start)} – {formatDisplayDate(monthRange.end)}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Production Qty"
          value={isLoading ? '…' : formatMetric(summary?.totalProduction ?? 0)}
          hint="Total cast this month"
          tone="teal"
          icon={<ProductionIcon />}
        />
        <StatCard
          label="Rejected Qty"
          value={isLoading ? '…' : formatMetric(summary?.totalRejections ?? 0)}
          hint="Total rejected this month"
          tone="amber"
          icon={<RejectionIcon />}
        />
        <StatCard
          label="Rejection Rate"
          value={isLoading ? '…' : `${formatMetric(summary?.rejectionRate ?? 0)}%`}
          hint="Rejections vs production"
          tone="rose"
          icon={<RateIcon />}
        />
        <StatCard
          label="Active Parts"
          value={isLoading ? '…' : formatMetric(summary?.partCount ?? 0)}
          hint="Parts with activity this month"
          tone="violet"
          icon={<PartsIcon />}
        />
      </section>

      <section className="grid shrink-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Month Highlights</h3>
              <p className="mt-1 text-sm text-neutral-500">Key signals from current production data</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Poured Weight
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">
                {isLoading ? '…' : formatMetric(summary?.totalPouredWeight ?? 0)}
                <span className="ml-1 text-sm font-semibold text-neutral-400">kg</span>
              </p>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Top Rejection Type
              </p>
              {isLoading ? (
                <p className="mt-2 text-sm text-neutral-500">Loading…</p>
              ) : summary?.topRejectionType ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {summary.topRejectionType.rejectionTypeName}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatMetric(summary.topRejectionType.totalQuantity)} units rejected
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">No rejections logged yet</p>
              )}
            </div>
          </div>

          {!isLoading && !hasActivity ? (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-4 py-5 text-sm text-neutral-500">
              No production activity recorded for this month yet. Start by adding production entries.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-neutral-500">Jump straight into daily workflows</p>

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div
                    className={`inline-flex rounded-lg bg-gradient-to-br px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${action.accent}`}
                  >
                    Action
                  </div>
                  <p className="mt-2 font-semibold text-neutral-900">{action.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{action.description}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-[#2d6a6a] group-hover:text-white">
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>

          <Link
            to="/settings"
            className="mt-4 inline-flex text-sm font-semibold text-[#2d6a6a] transition-colors hover:text-[#255959]"
          >
            Manage rejection types →
          </Link>
        </div>
      </section>
    </div>
  )
}
