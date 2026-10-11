import { Fragment, useEffect, useState } from 'react'
import {
  tableClassName,
  tableNumericClassName,
  tableRowClassName,
  tdClassName,
  thClassName,
} from '../../../components/ui/formStyles'
import { formatDisplayDate } from '../../../utils/dateUtils'

const COLUMN_COUNT = 7

function formatWeight(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`h-4 w-4 text-neutral-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function YieldByDateTable({
  days = [],
  loading = false,
  emptyTitle = 'No production in this period',
  emptyDescription = 'Add production entries with heat numbers to see furnace yield.',
}) {
  const [expandedDates, setExpandedDates] = useState(() => new Set())

  useEffect(() => {
    setExpandedDates(new Set())
  }, [days])

  function toggleDateExpanded(productionDate) {
    setExpandedDates((current) => {
      const next = new Set(current)
      if (next.has(productionDate)) {
        next.delete(productionDate)
      } else {
        next.add(productionDate)
      }
      return next
    })
  }

  return (
    <div className="overflow-auto">
      <table className={tableClassName}>
        <thead>
          <tr>
            <th className={`${thClassName} w-10`} aria-label="Expand" />
            <th className={thClassName}>Date</th>
            <th className={`${thClassName} text-right`}>Heats</th>
            <th className={`${thClassName} text-right`}>Poured (kg)</th>
            <th className={`${thClassName} text-right`}>Charge (kg)</th>
            <th className={`${thClassName} text-right`}>Yield %</th>
            <th className={`${thClassName} text-right`}>Entries</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center text-sm text-neutral-500">
                Loading yield data…
              </td>
            </tr>
          ) : days.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center">
                <p className="text-sm font-medium text-neutral-700">{emptyTitle}</p>
                <p className="mt-1 text-sm text-neutral-500">{emptyDescription}</p>
              </td>
            </tr>
          ) : (
            days.map((day) => {
              const isExpanded = expandedDates.has(day.productionDate)
              return (
                <Fragment key={day.productionDate}>
                  <tr className={tableRowClassName}>
                    <td className={tdClassName}>
                      <button
                        type="button"
                        onClick={() => toggleDateExpanded(day.productionDate)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${formatDisplayDate(day.productionDate)}`}
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    </td>
                    <td className={`${tdClassName} whitespace-nowrap font-medium text-neutral-900`}>
                      {formatDisplayDate(day.productionDate)}
                    </td>
                    <td className={tableNumericClassName}>{day.heatCount}</td>
                    <td className={`${tableNumericClassName} font-medium text-[#2d6a6a]`}>
                      {formatWeight(day.pouredKg)}
                    </td>
                    <td className={tableNumericClassName}>{formatWeight(day.metalCharged)}</td>
                    <td className={`${tableNumericClassName} font-semibold`}>
                      {formatPercent(day.yieldPercent)}%
                    </td>
                    <td className={tableNumericClassName}>{day.entryCount}</td>
                  </tr>
                  {isExpanded
                    ? day.heats.map((heat) => (
                        <tr
                          key={`${day.productionDate}-${heat.heatNumber}`}
                          className="bg-neutral-50/80"
                        >
                          <td className={tdClassName} />
                          <td className={tdClassName}>
                            <span className="pl-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                              Heat
                            </span>
                            <span className="ml-2 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                              {heat.heatNumber}
                            </span>
                          </td>
                          <td className={tableNumericClassName}>—</td>
                          <td className={`${tableNumericClassName} text-[#2d6a6a]`}>
                            {formatWeight(heat.pouredKg)}
                          </td>
                          <td className={tableNumericClassName}>{formatWeight(heat.metalCharged)}</td>
                          <td className={tableNumericClassName}>{formatPercent(heat.yieldPercent)}%</td>
                          <td className={tableNumericClassName}>{heat.entryCount}</td>
                        </tr>
                      ))
                    : null}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
