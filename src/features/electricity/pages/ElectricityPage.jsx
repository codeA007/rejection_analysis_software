import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createElectricityReading,
  deleteElectricityReading,
  fetchElectricityReadings,
  updateElectricityReading,
} from '../../../api/electricity'
import { fetchFurnaceSettings, updateElectricitySettings } from '../../../api/settings'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  cardClassName,
  inputClassName,
  labelClassName,
  pageClassName,
} from '../../../components/ui/formStyles'
import { formatDisplayDate, getLocalTodayDate } from '../../../utils/dateUtils'

function formatMetric(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const ELECTRICITY_TABS = [
  { id: 'log', label: 'Log reading' },
  { id: 'summary', label: 'Summary & history' },
]

function ElectricitySummaryStrip({ loading, summary }) {
  const items = [
    {
      label: 'Total heats',
      value: loading ? '…' : summary?.totalHeatsTillNow ?? 0,
      sub: loading ? null : `${summary?.heatCountStart ?? 0} start + ${summary?.logCount ?? 0} logs`,
      valueClass: 'text-violet-800',
    },
    {
      label: 'Logs',
      value: loading ? '…' : summary?.logCount ?? 0,
      valueClass: 'text-neutral-900',
    },
    {
      label: 'Total kWh',
      value: loading ? '…' : formatMetric(summary?.totalConsumptionKwh ?? 0),
      valueClass: 'text-amber-800',
    },
    {
      label: 'Latest kWh/ton',
      value: loading ? '…' : formatMetric(summary?.latestKwhPerTon ?? 0),
      valueClass: 'text-[#2d6a6a]',
    },
    {
      label: 'Avg kWh/ton',
      value: loading
        ? '…'
        : summary?.averageKwhPerTon != null
          ? formatMetric(summary.averageKwhPerTon)
          : '—',
      valueClass: 'text-rose-800',
    },
  ]

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {item.label}
            </dt>
            <dd className={`mt-0.5 text-lg font-bold leading-tight tabular-nums ${item.valueClass}`}>
              {item.value}
            </dd>
            {item.sub ? (
              <dd className="mt-0.5 truncate text-[11px] text-neutral-500">{item.sub}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  )
}

function BaselineForNextLog({
  baseline,
  meterStartConfigured,
  loading,
  isSaving,
  onSaveStart,
  onSaveReading,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!editing && baseline?.meterKwh != null) {
      setDraft(String(baseline.meterKwh))
    }
  }, [baseline?.meterKwh, baseline?.source, baseline?.readingId, editing])

  if (!meterStartConfigured || baseline?.meterKwh == null) {
    return null
  }

  const formattedBaseline = formatMetric(baseline.meterKwh)
  const hasLogs = baseline.source === 'reading'
  const showEditor = !hasLogs || editing

  function beginEdit() {
    setDraft(String(baseline.meterKwh))
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(String(baseline.meterKwh))
    setEditing(false)
  }

  async function handleSave(event) {
    event.preventDefault()
    const value = Number(draft)
    if (!Number.isFinite(value) || value <= 0) return

    try {
      if (hasLogs) {
        await onSaveReading(baseline.readingId, value)
        setEditing(false)
      } else {
        await onSaveStart(value)
      }
    } catch {
      // Parent surfaces errors
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">Baseline for next log</p>
          {hasLogs ? (
            <>
              <p className="mt-1 text-sm text-neutral-600">
                Next log must be above{' '}
                <span className="font-medium tabular-nums text-neutral-900">{formattedBaseline} kWh</span>.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Editing corrects the latest cumulative meter and recalculates that log&apos;s kWh used
                and kWh/ton.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-neutral-600">
              First log subtracts start reading{' '}
              <span className="font-medium tabular-nums text-neutral-900">{formattedBaseline} kWh</span>.
            </p>
          )}
        </div>

        {!showEditor && hasLogs ? (
          <button
            type="button"
            onClick={beginEdit}
            disabled={loading || isSaving}
            className={`${buttonSecondaryClassName} shrink-0`}
          >
            Edit
          </button>
        ) : null}
      </div>

      {showEditor ? (
        <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className={labelClassName} htmlFor="electricity-baseline-meter">
              {hasLogs ? 'Cumulative meter (kWh)' : 'Meter start (kWh)'}
            </label>
            <input
              id="electricity-baseline-meter"
              type="number"
              min="0"
              step="any"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={inputClassName}
              disabled={loading || isSaving}
              required
            />
          </div>
          <div className="flex gap-2">
            {hasLogs ? (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className={buttonSecondaryClassName}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={loading || isSaving}
              className={buttonPrimaryClassName}
            >
              {isSaving ? 'Saving…' : 'Save baseline'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function HistoryMetric({ label, value, emphasis = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p
        className={[
          'mt-0.5 truncate text-sm tabular-nums',
          emphasis ? 'font-semibold text-[#2d6a6a]' : 'font-medium text-neutral-900',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}

export default function ElectricityPage() {
  const [readings, setReadings] = useState([])
  const [summary, setSummary] = useState(null)
  const [meterStartKwh, setMeterStartKwh] = useState(null)
  const [furnaceChargeKg, setFurnaceChargeKg] = useState(350)
  const [readingDate, setReadingDate] = useState(getLocalTodayDate())
  const [meterReading, setMeterReading] = useState('')
  const [heatCount, setHeatCount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('log')
  const [baseline, setBaseline] = useState(null)
  const [isSavingBaseline, setIsSavingBaseline] = useState(false)
  const { runGuarded } = useSubmitGuard()

  async function loadData() {
    const [electricityData, furnaceData] = await Promise.all([
      fetchElectricityReadings(),
      fetchFurnaceSettings().catch(() => ({ furnaceChargeKg: 350 })),
    ])
    setReadings(electricityData.readings)
    setSummary(electricityData.summary)
    setBaseline(electricityData.baseline ?? null)
    setMeterStartKwh(electricityData.meterStartKwh)
    setFurnaceChargeKg(furnaceData.furnaceChargeKg)
  }

  async function handleSaveBaselineStart(meterKwh) {
    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSavingBaseline(true)
      try {
        await updateElectricitySettings({ meterStartKwh: meterKwh })
        setMessage('Meter start baseline updated.')
        await loadData()
      } catch (err) {
        setError(err.message || 'Unable to update meter start.')
      } finally {
        setIsSavingBaseline(false)
      }
    })
  }

  async function handleSaveBaselineReading(readingId, meterKwh) {
    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSavingBaseline(true)
      try {
        const updated = await updateElectricityReading(readingId, { meterReading: meterKwh })
        setMessage(
          `Baseline updated to ${formatMetric(updated.meterReading)} kWh (${formatMetric(updated.consumptionKwh)} kWh used on that log).`,
        )
        await loadData()
      } catch (err) {
        setError(err.message || 'Unable to update baseline meter.')
      } finally {
        setIsSavingBaseline(false)
      }
    })
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    loadData()
      .catch((err) => setError(err.message || 'Unable to load electricity data.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)
      try {
        const created = await createElectricityReading({
          readingDate,
          meterReading: Number(meterReading),
          heatCount: Number(heatCount),
          notes,
        })
        setMeterReading('')
        setHeatCount('')
        setNotes('')
        setMessage(
          `Logged ${formatMetric(created.consumptionKwh)} kWh (${formatMetric(created.kwhPerTon)} kWh/ton).`,
        )
        await loadData()
      } catch (err) {
        setError(err.message || 'Unable to save electricity reading.')
      } finally {
        setIsSaving(false)
      }
    })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this electricity log?')) return
    setError('')
    setMessage('')
    try {
      await deleteElectricityReading(id)
      setMessage('Electricity log deleted.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to delete electricity log.')
    }
  }

  return (
    <div className={pageClassName}>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Melting electricity</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Log cumulative meter readings and number of heats. Metal charged = heats ×{' '}
          {formatMetric(furnaceChargeKg)} kg; tons = metal ÷ 1000. kWh used = new reading −
          previous; efficiency = kWh ÷ tons.
        </p>
      </div>

      {meterStartKwh === null ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set the meter start reading in{' '}
          <Link to="/settings" className="font-semibold text-[#2d6a6a] hover:text-[#255959]">
            Settings
          </Link>{' '}
          before adding logs.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <nav
        className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100/60 p-1"
        role="tablist"
        aria-label="Electricity sections"
      >
        {ELECTRICITY_TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                selected
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'log' ? (
      <div className={cardClassName}>
        <h3 className="text-base font-semibold text-neutral-900">Add reading</h3>
        <BaselineForNextLog
          baseline={baseline}
          meterStartConfigured={meterStartKwh !== null}
          loading={loading}
          isSaving={isSavingBaseline}
          onSaveStart={handleSaveBaselineStart}
          onSaveReading={handleSaveBaselineReading}
        />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="electricity-date">
              Date
            </label>
            <input
              id="electricity-date"
              type="date"
              value={readingDate}
              onChange={(event) => setReadingDate(event.target.value)}
              className={inputClassName}
              required
              disabled={meterStartKwh === null || isSaving}
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="electricity-meter">
              Cumulative meter (kWh)
            </label>
            <input
              id="electricity-meter"
              type="number"
              min="0"
              step="any"
              value={meterReading}
              onChange={(event) => setMeterReading(event.target.value)}
              className={inputClassName}
              required
              disabled={meterStartKwh === null || isSaving}
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="electricity-heats">
              Number of heats
            </label>
            <input
              id="electricity-heats"
              type="number"
              min="1"
              step="1"
              value={heatCount}
              onChange={(event) => setHeatCount(event.target.value)}
              className={inputClassName}
              required
              disabled={meterStartKwh === null || isSaving}
            />
            {heatCount.trim() && Number(heatCount) > 0 ? (
              <>
                <p className="mt-1 text-xs text-neutral-500">
                  Metal charged:{' '}
                  {formatMetric(Number(heatCount) * furnaceChargeKg)} kg (
                  {formatMetric((Number(heatCount) * furnaceChargeKg) / 1000)} tons)
                </p>
                <p className="mt-0.5 text-xs font-medium text-neutral-700">
                  Total heats after save:{' '}
                  {(summary?.totalHeatsTillNow ?? 0) + Number(heatCount)}
                </p>
              </>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="electricity-notes">
              Notes (optional)
            </label>
            <input
              id="electricity-notes"
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClassName}
              disabled={meterStartKwh === null || isSaving}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={meterStartKwh === null || isSaving}
              className={buttonPrimaryClassName}
            >
              {isSaving ? 'Saving…' : 'Save reading'}
            </button>
          </div>
        </form>
      </div>
      ) : (
      <>
      <ElectricitySummaryStrip loading={loading} summary={summary} />

      <div className={cardClassName}>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">History</h3>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading…' : `${readings.length} log${readings.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-neutral-500">Loading history…</p>
        ) : readings.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">No electricity logs yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {readings.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 transition-colors hover:bg-neutral-50 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-neutral-900">
                      {formatDisplayDate(row.readingDate)}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Meter{' '}
                      <span className="font-medium tabular-nums text-neutral-800">
                        {formatMetric(row.meterReading)} kWh
                      </span>
                      <span className="text-neutral-400"> · </span>
                      <span className="text-neutral-500">
                        from {formatMetric(row.previousMeterReading)} kWh
                      </span>
                    </p>
                    {row.notes ? (
                      <p className="mt-2 text-sm text-neutral-600">{row.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-start gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold leading-none tabular-nums text-[#2d6a6a]">
                        {formatMetric(row.kwhPerTon)}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        kWh per ton
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-200/80 pt-4 sm:grid-cols-3 lg:grid-cols-5">
                  <HistoryMetric label="kWh used" value={formatMetric(row.consumptionKwh)} />
                  <HistoryMetric label="Heats this period" value={row.heatCount ?? '—'} />
                  <HistoryMetric
                    label="Total heats"
                    value={row.cumulativeHeatTotal ?? '—'}
                    emphasis
                  />
                  <HistoryMetric label="Tons melted" value={formatMetric(row.tonsMelted)} />
                  <HistoryMetric
                    label="Metal charged"
                    value={
                      row.metalChargedKg != null ? `${formatMetric(row.metalChargedKg)} kg` : '—'
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </>
      )}
    </div>
  )
}
