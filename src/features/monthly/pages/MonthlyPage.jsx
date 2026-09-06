import { useEffect, useRef, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { fetchMonthlyAnalysis } from '../../../api/analysis'
import { fetchProductionEntries } from '../../../api/production'
import { fetchRejections } from '../../../api/rejections'
import { fetchRejectionTypes } from '../../../api/rejectionTypes'
import ChartCard from '../../../components/ui/ChartCard'
import StatCard from '../../../components/ui/StatCard'
import {
  buttonSecondaryClassName,
  cardClassName,
  inputClassName,
  pageClassName,
  tableClassName,
  tdClassName,
  thClassName,
} from '../../../components/ui/formStyles'
import {
  formatDisplayDate,
  formatMonthLabel,
  getLastMonthBounds,
  getLocalTodayDate,
  getMonthBounds,
  getMonthsAgoBounds,
  getYearBounds,
} from '../../../utils/dateUtils'
import { downloadMonthlyExcel } from '../../../utils/monthlyExcelExport'
import '../utils/registerCharts.js'

const presetButtonClassName =
  'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50'

export default function MonthlyPage() {
  const today = getLocalTodayDate()
  const defaultRange = getMonthBounds(today)
  const [dateFrom, setDateFrom] = useState(defaultRange.start)
  const [dateTo, setDateTo] = useState(defaultRange.end)
  const [analysis, setAnalysis] = useState(null)
  const [productionEntries, setProductionEntries] = useState([])
  const [rejectionEntries, setRejectionEntries] = useState([])
  const [rejectionTypes, setRejectionTypes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const isExportingRef = useRef(false)

  useEffect(() => {
    fetchRejectionTypes({ includeInactive: true })
      .then(setRejectionTypes)
      .catch(() => setRejectionTypes([]))
  }, [])

  useEffect(() => {
    if (!dateFrom || !dateTo) return

    setLoading(true)
    setError('')

    Promise.all([
      fetchMonthlyAnalysis({ from: dateFrom, to: dateTo }),
      fetchProductionEntries({ from: dateFrom, to: dateTo }),
      fetchRejections({ from: dateFrom, to: dateTo }),
    ])
      .then(([analysisData, productionData, rejectionData]) => {
        setAnalysis(analysisData)
        setProductionEntries(productionData)
        setRejectionEntries(rejectionData)
      })
      .catch((err) => setError(err.message || 'Unable to load monthly analysis.'))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const monthlyTrendData = {
    labels: analysis?.monthlyTrend.map((row) => formatMonthLabel(row.month)) ?? [],
    datasets: [
      {
        label: 'Rejection Rate %',
        data: analysis?.monthlyTrend.map((row) => row.rejectionRate) ?? [],
        borderColor: '#2d6a6a',
        backgroundColor: 'rgba(45, 106, 106, 0.15)',
        tension: 0.3,
      },
    ],
  }

  const byTypeData = {
    labels: analysis?.byType.map((row) => row.rejectionTypeName) ?? [],
    datasets: [
      {
        label: 'Rejected Qty',
        data: analysis?.byType.map((row) => row.totalQuantity) ?? [],
        backgroundColor: ['#2d6a6a', '#4f8f8f', '#7ab0b0', '#a8caca', '#d4e4e4', '#8b5e3c', '#b07d57'],
      },
    ],
  }

  const byPartData = {
    labels: analysis?.byPart.map((row) => row.partName) ?? [],
    datasets: [
      {
        label: 'Production',
        data: analysis?.byPart.map((row) => row.totalProduction) ?? [],
        backgroundColor: '#94a3b8',
      },
      {
        label: 'Rejections',
        data: analysis?.byPart.map((row) => row.totalRejections) ?? [],
        backgroundColor: '#2d6a6a',
      },
    ],
  }

  function formatWeight(value) {
    if (value === null || value === undefined) return '0'
    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const totalPouredWeight =
    analysis?.totalPouredWeight ??
    productionEntries.reduce((sum, entry) => sum + (entry.pouredWeight ?? 0), 0)

  function handleDownloadExcel() {
    if (!dateFrom || !dateTo || isExportingRef.current) return

    isExportingRef.current = true
    setExporting(true)
    try {
      downloadMonthlyExcel({
        from: dateFrom,
        to: dateTo,
        productionEntries,
        rejections: rejectionEntries,
        rejectionTypes,
      })
    } catch (err) {
      setError(err.message || 'Unable to export monthly Excel.')
    } finally {
      isExportingRef.current = false
      setExporting(false)
    }
  }

  return (
    <div className={pageClassName}>
      <div className={cardClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Monthly Analysis</h2>
            <p className="mt-1 text-sm text-neutral-500">Filter production and rejection data by date range.</p>
          </div>
          <button
            type="button"
            className={buttonSecondaryClassName}
            onClick={handleDownloadExcel}
            disabled={loading || exporting || (!productionEntries.length && !rejectionEntries.length)}
          >
            {exporting ? 'Preparing Excel...' : 'Download Excel'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClassName} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClassName} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={presetButtonClassName} onClick={() => {
            const range = getMonthBounds(today)
            setDateFrom(range.start)
            setDateTo(range.end)
          }}>
            This Month
          </button>
          <button type="button" className={presetButtonClassName} onClick={() => {
            const range = getLastMonthBounds(today)
            setDateFrom(range.start)
            setDateTo(range.end)
          }}>
            Last Month
          </button>
          <button type="button" className={presetButtonClassName} onClick={() => {
            const range = getMonthsAgoBounds(today, 3)
            setDateFrom(range.start)
            setDateTo(range.end)
          }}>
            Last 3 Months
          </button>
          <button type="button" className={presetButtonClassName} onClick={() => {
            const range = getMonthsAgoBounds(today, 6)
            setDateFrom(range.start)
            setDateTo(range.end)
          }}>
            Last 6 Months
          </button>
          <button type="button" className={presetButtonClassName} onClick={() => {
            const range = getYearBounds(today)
            setDateFrom(range.start)
            setDateTo(range.end)
          }}>
            This Year
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className={cardClassName}>Loading analysis...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <StatCard
              label="Total Poured"
              value={`${formatWeight(totalPouredWeight)} kg`}
              hint="Production weight in selected period"
            />
            <StatCard label="Production Qty" value={analysis?.totalProduction ?? 0} />
            <StatCard label="Rejected Qty" value={analysis?.totalRejections ?? 0} />
            <StatCard label="Rejection Rate" value={`${analysis?.rejectionRate ?? 0}%`} />
            <StatCard label="Parts Tracked" value={analysis?.byPart.length ?? 0} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Rejection Rate Trend" description="Monthly rejection percentage">
              <div className="h-72">
                <Line
                  data={monthlyTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } },
                  }}
                />
              </div>
            </ChartCard>

            <ChartCard title="Rejections by Type" description="Total rejected quantity by reason">
              <div className="h-72">
                {analysis?.byType.length ? (
                  <Doughnut
                    data={byTypeData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                ) : (
                  <p className="text-sm text-neutral-500">No rejection data in this range.</p>
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Production vs Rejections by Part" description="Compare output and losses per part">
            <div className="h-80">
              {analysis?.byPart.length ? (
                <Bar
                  data={byPartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              ) : (
                <p className="text-sm text-neutral-500">No part data in this range.</p>
              )}
            </div>
          </ChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={cardClassName}>
              <h3 className="text-sm font-semibold text-neutral-900">Production Entries</h3>
              <div className="mt-4 overflow-x-auto">
                <table className={tableClassName}>
                  <thead>
                    <tr>
                      <th className={thClassName}>Date</th>
                      <th className={thClassName}>Part</th>
                      <th className={thClassName}>Qty</th>
                      <th className={thClassName}>Poured (kg)</th>
                      <th className={thClassName}>Heat #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`${tdClassName} text-neutral-500`}>
                          No production entries in range.
                        </td>
                      </tr>
                    ) : (
                      productionEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className={tdClassName}>{formatDisplayDate(entry.productionDate)}</td>
                          <td className={tdClassName}>{entry.partName}</td>
                          <td className={tdClassName}>{entry.quantity}</td>
                          <td className={tdClassName}>{formatWeight(entry.pouredWeight)}</td>
                          <td className={tdClassName}>{entry.heatNumber}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={cardClassName}>
              <h3 className="text-sm font-semibold text-neutral-900">Rejection Entries</h3>
              <div className="mt-4 overflow-x-auto">
                <table className={tableClassName}>
                  <thead>
                    <tr>
                      <th className={thClassName}>Date</th>
                      <th className={thClassName}>Part</th>
                      <th className={thClassName}>Reason</th>
                      <th className={thClassName}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectionEntries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`${tdClassName} text-neutral-500`}>
                          No rejection entries in range.
                        </td>
                      </tr>
                    ) : (
                      rejectionEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className={tdClassName}>{formatDisplayDate(entry.rejectionDate)}</td>
                          <td className={tdClassName}>{entry.partName}</td>
                          <td className={tdClassName}>{entry.rejectionTypeName}</td>
                          <td className={tdClassName}>{entry.quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
