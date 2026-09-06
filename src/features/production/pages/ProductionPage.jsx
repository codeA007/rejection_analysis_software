import { useEffect, useRef, useState } from 'react'
import { fetchParts } from '../../../api/parts'
import {
  createProductionEntry,
  deleteProductionEntry,
  fetchProductionEntries,
} from '../../../api/production'
import PartNameCombobox from '../../../components/ui/PartNameCombobox'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  cardClassName,
  inputClassName,
  labelClassName,
  pageMainPanelClassName,
  pageSidebarClassName,
  pageSplitClassName,
  tableClassName,
  tdClassName,
  thClassName,
  tableRowClassName,
  tableNumericClassName,
  tableFooterBarClassName,
} from '../../../components/ui/formStyles'
import { formatDisplayDate, formatDisplayMonth, getLocalTodayDate, isoDateToMonthKey } from '../../../utils/dateUtils'
import {
  getHeatMonthPrefix,
  getSuggestedHeatNumberForMonth,
  heatNumberMatchesMonth,
  incrementHeatNumber,
} from '../../../utils/heatNumberUtils'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'

export default function ProductionPage() {
  const [parts, setParts] = useState([])
  const [entries, setEntries] = useState([])
  const [partName, setPartName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [heatNumber, setHeatNumber] = useState('')
  const [productionDate, setProductionDate] = useState(getLocalTodayDate())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  const formRef = useRef(null)
  const partInputRef = useRef(null)
  const quantityInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const { runGuarded } = useSubmitGuard()

  async function loadData() {
    const [partsData, entriesData] = await Promise.all([fetchParts(), fetchProductionEntries()])
    setParts(partsData)
    setEntries(entriesData)
    return entriesData
  }

  function syncHeatNumber(entriesData) {
    setHeatNumber((current) => {
      if (heatNumberMatchesMonth(current, productionDate)) return current
      return getSuggestedHeatNumberForMonth(productionDate, entriesData)
    })
  }

  useEffect(() => {
    loadData()
      .then((entriesData) => {
        setHeatNumber(getSuggestedHeatNumberForMonth(productionDate, entriesData))
        setHasLoaded(true)
        window.requestAnimationFrame(() => dateInputRef.current?.focus())
      })
      .catch((err) => setError(err.message || 'Unable to load production data.'))
  }, [])

  useEffect(() => {
    if (!hasLoaded) return
    syncHeatNumber(entries)
  }, [productionDate, hasLoaded, entries])

  function handleChangeHeatNumber() {
    setHeatNumber((current) => incrementHeatNumber(current, productionDate))
  }

  function focusQuantity() {
    window.requestAnimationFrame(() => quantityInputRef.current?.focus())
  }

  async function handleSubmit(event) {
    event.preventDefault()

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)

      try {
        await createProductionEntry({
          partName,
          quantity,
          heatNumber,
          productionDate,
        })
        setPartName('')
        setQuantity('')
        setMessage('Production entry saved.')
        const entriesData = await loadData()
        syncHeatNumber(entriesData)
        window.requestAnimationFrame(() => partInputRef.current?.focus())
      } catch (err) {
        setError(err.message || 'Unable to save production entry.')
      } finally {
        setIsSaving(false)
      }
    })
  }

  function handleFormKeyDown(event) {
    const target = event.target
    const isTextInput =
      target instanceof HTMLInputElement &&
      (target.type === 'text' || target.type === 'number' || target.type === 'date')

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      formRef.current?.requestSubmit()
      return
    }

    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      handleChangeHeatNumber()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setQuantity('')
      focusQuantity()
      return
    }

    if (event.key === 'Enter' && isTextInput && target.type === 'text') {
      event.preventDefault()
      return
    }

    if (event.key === 'Enter' && isTextInput && target.type === 'number') {
      event.preventDefault()
      formRef.current?.requestSubmit()
      return
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this production entry?')) return
    setError('')
    setMessage('')

    try {
      await deleteProductionEntry(id)
      setMessage('Production entry deleted.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to delete production entry.')
    }
  }

  const monthPrefix = getHeatMonthPrefix(productionDate)
  const selectedMonthKey = isoDateToMonthKey(productionDate)
  const selectedMonthLabel = formatDisplayMonth(selectedMonthKey)
  const monthEntries = entries.filter(
    (entry) => isoDateToMonthKey(entry.productionDate) === selectedMonthKey,
  )

  const totalPouredWeight = monthEntries.reduce((sum, entry) => {
    if (entry.pouredWeight === null || entry.pouredWeight === undefined) return sum
    return sum + entry.pouredWeight
  }, 0)

  const hasPouredWeights = monthEntries.some(
    (entry) => entry.pouredWeight !== null && entry.pouredWeight !== undefined,
  )

  function formatWeight(value) {
    if (value === null || value === undefined) return '—'
    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <div className={pageSplitClassName}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className={pageSidebarClassName}
      >
        <h2 className="text-lg font-semibold text-neutral-900">Add Production</h2>
        <p className="mt-1 text-sm text-neutral-500">Record cast parts with heat number.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className={labelClassName} htmlFor="production-date">
              Production Date
            </label>
            <input
              ref={dateInputRef}
              id="production-date"
              type="date"
              value={productionDate}
              onChange={(event) => setProductionDate(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>Heat Number</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={heatNumber}
                onChange={(event) => setHeatNumber(event.target.value)}
                className={inputClassName}
                placeholder={`e.g. ${monthPrefix}-01`}
                aria-label="Heat number"
              />
              <button
                type="button"
                onClick={handleChangeHeatNumber}
                accessKey="n"
                className={`${buttonSecondaryClassName} shrink-0 whitespace-nowrap`}
              >
                Next heat
              </button>
            </div>
          </div>

          <div>
            <label className={labelClassName}>Part Name</label>
            <PartNameCombobox
              parts={parts}
              value={partName}
              onChange={setPartName}
              inputRef={partInputRef}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="production-quantity">
              Quantity
            </label>
            <input
              ref={quantityInputRef}
              id="production-quantity"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClassName}
              placeholder="Enter quantity"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

        <button type="submit" disabled={isSaving} className={`${buttonPrimaryClassName} mt-6 w-full`}>
          {isSaving ? 'Saving...' : 'Save Production'}
        </button>
      </form>

      <div className={pageMainPanelClassName}>
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Recent Production</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'} in {selectedMonthLabel}
            </p>
          </div>
          {monthEntries.length > 0 && hasPouredWeights ? (
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Total poured
              </p>
              <p className="text-lg font-bold tabular-nums text-[#2d6a6a]">
                {formatWeight(totalPouredWeight)}{' '}
                <span className="text-sm font-semibold text-neutral-500">kg</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 sm:px-6">
          <table className={tableClassName}>
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229_229_229)]">
              <tr>
                <th className={thClassName}>Date</th>
                <th className={thClassName}>Part</th>
                <th className={`${thClassName} text-right`}>Qty</th>
                <th className={`${thClassName} text-right`}>Poured (kg)</th>
                <th className={thClassName}>Heat #</th>
                <th className={`${thClassName} w-20`} />
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-neutral-700">
                      No production entries for {selectedMonthLabel}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Entries saved for this month will appear here with poured weight totals.
                    </p>
                  </td>
                </tr>
              ) : (
                monthEntries.map((entry) => (
                  <tr key={entry.id} className={tableRowClassName}>
                    <td className={`${tdClassName} whitespace-nowrap text-neutral-600`}>
                      {formatDisplayDate(entry.productionDate)}
                    </td>
                    <td className={`${tdClassName} max-w-[12rem] truncate font-medium text-neutral-900 sm:max-w-none sm:whitespace-normal`}>
                      {entry.partName}
                    </td>
                    <td className={tableNumericClassName}>{entry.quantity}</td>
                    <td className={`${tableNumericClassName} font-medium text-[#2d6a6a]`}>
                      {formatWeight(entry.pouredWeight)}
                    </td>
                    <td className={`${tdClassName} whitespace-nowrap`}>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        {entry.heatNumber}
                      </span>
                    </td>
                    <td className={tdClassName}>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {monthEntries.length > 0 && hasPouredWeights ? (
          <div className={tableFooterBarClassName}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Total poured weight
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Across {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'} in{' '}
                  {selectedMonthLabel}
                </p>
              </div>
              <div className="rounded-xl border border-[#2d6a6a]/20 bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-2xl font-bold tabular-nums leading-none text-[#2d6a6a]">
                  {formatWeight(totalPouredWeight)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">kg</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
