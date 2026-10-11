import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHeatYieldReport } from '../../../api/yield'
import StatCard from '../../../components/ui/StatCard'
import YieldByDateTable from '../components/YieldByDateTable'
import {
  cardClassName,
  inputClassName,
  labelClassName,
  pageClassName,
} from '../../../components/ui/formStyles'
import {
  formatDisplayMonth,
  getLocalTodayDate,
  getMonthBounds,
  isoDateToMonthKey,
  monthKeyToFirstDay,
} from '../../../utils/dateUtils'

function formatWeight(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function YieldPage() {
  const today = getLocalTodayDate()
  const [yieldMonth, setYieldMonth] = useState(isoDateToMonthKey(today))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthRange = getMonthBounds(monthKeyToFirstDay(yieldMonth))
  const monthLabel = formatDisplayMonth(yieldMonth)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchHeatYieldReport({ from: monthRange.start, to: monthRange.end })
      .then(setReport)
      .catch((err) => setError(err.message || 'Unable to load yield report.'))
      .finally(() => setLoading(false))
  }, [monthRange.start, monthRange.end])

  const chargeKg = report?.chargeKg ?? 350
  const summary = report?.summary
  const days = report?.days ?? []

  return (
    <div className={pageClassName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Furnace Yield</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Yield = poured weight ÷ {formatWeight(chargeKg)} kg metal per heat.{' '}
            <Link to="/settings" className="font-semibold text-[#2d6a6a] hover:text-[#255959]">
              Change charge in Settings
            </Link>
          </p>
        </div>
        <div className="w-full sm:max-w-[220px]">
          <label className={labelClassName} htmlFor="yield-month">
            Month
          </label>
          <input
            id="yield-month"
            type="month"
            value={yieldMonth}
            onChange={(event) => setYieldMonth(event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Furnace heats"
          value={loading ? '…' : summary?.heatCount ?? 0}
          hint={`Distinct heats in ${monthLabel}`}
          tone="violet"
        />
        <StatCard
          label="Metal charged"
          value={loading ? '…' : `${formatWeight(summary?.totalMetalCharged ?? 0)} kg`}
          hint={`${summary?.heatCount ?? 0} × ${formatWeight(chargeKg)} kg`}
          tone="amber"
        />
        <StatCard
          label="Total poured"
          value={loading ? '…' : `${formatWeight(summary?.totalPoured ?? 0)} kg`}
          hint="Sum of poured weight from production"
          tone="teal"
        />
        <StatCard
          label="Overall yield"
          value={loading ? '…' : `${formatPercent(summary?.overallYield ?? 0)}%`}
          hint="Total poured ÷ total metal charged"
          tone="rose"
        />
      </section>

      {!loading && summary?.missingWeightEntryCount > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary.missingWeightEntryCount} production{' '}
          {summary.missingWeightEntryCount === 1 ? 'entry' : 'entries'} in this period{' '}
          {summary.missingWeightEntryCount === 1 ? 'has' : 'have'} no part weight and{' '}
          {summary.missingWeightEntryCount === 1 ? 'is' : 'are'} excluded from yield.
        </div>
      ) : null}

      <div className={`${cardClassName} !p-0`}>
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-neutral-900">Yield by date</h3>
          <p className="mt-0.5 text-sm text-neutral-500">
            {monthLabel} — expand a date to see yield per heat
          </p>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <YieldByDateTable
            days={days}
            loading={loading}
            emptyTitle={`No production for ${monthLabel}`}
          />
        </div>
      </div>
    </div>
  )
}
