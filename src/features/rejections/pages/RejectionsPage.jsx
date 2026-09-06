import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchParts } from '../../../api/parts'
import { fetchProductionEntries } from '../../../api/production'
import { createRejection, deleteRejection, fetchRejections } from '../../../api/rejections'
import { fetchRejectionTypes } from '../../../api/rejectionTypes'
import PartNameCombobox from '../../../components/ui/PartNameCombobox'
import RejectionTypeCombobox from '../../../components/ui/RejectionTypeCombobox'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import {
  buttonPrimaryClassName,
  inputClassName,
  labelClassName,
  pageMainPanelClassName,
  pageSidebarClassName,
  pageSplitClassName,
  tableClassName,
  tdClassName,
  thClassName,
  tableFooterBarClassName,
  tableNumericClassName,
} from '../../../components/ui/formStyles'
import {
  formatDisplayMonth,
  getLocalMonthKey,
  getMonthBounds,
  isoDateToMonthKey,
  monthKeyToFirstDay,
} from '../../../utils/dateUtils'

function rejectionRate(productionQty, rejectionQty) {
  if (!productionQty) return 0
  return Math.round((rejectionQty / productionQty) * 10000) / 100
}

function formatRejectionRate(productionQty, rejectionQty) {
  if (!productionQty) return '—'
  return `${rejectionRate(productionQty, rejectionQty)}%`
}

export default function RejectionsPage() {
  const [parts, setParts] = useState([])
  const [rejectionTypes, setRejectionTypes] = useState([])
  const [entries, setEntries] = useState([])
  const [productionEntries, setProductionEntries] = useState([])
  const [partName, setPartName] = useState('')
  const [selectedPartId, setSelectedPartId] = useState(null)
  const [rejectionTypeId, setRejectionTypeId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [heatNumber, setHeatNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [rejectionMonth, setRejectionMonth] = useState(getLocalMonthKey())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { runGuarded } = useSubmitGuard()

  async function loadData() {
    const [partsData, typesData, entriesData] = await Promise.all([
      fetchParts(),
      fetchRejectionTypes(),
      fetchRejections(),
    ])
    setParts(partsData)
    setRejectionTypes(typesData)
    setEntries(entriesData)
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message || 'Unable to load rejection data.'))
  }, [])

  useEffect(() => {
    const monthRange = getMonthBounds(monthKeyToFirstDay(rejectionMonth))
    fetchProductionEntries({ from: monthRange.start, to: monthRange.end })
      .then(setProductionEntries)
      .catch(() => setProductionEntries([]))
  }, [rejectionMonth])

  async function handleSubmit(event) {
    event.preventDefault()

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)

      try {
        await createRejection({
          partName,
          rejectionTypeId: Number(rejectionTypeId),
          quantity,
          rejectionDate: monthKeyToFirstDay(rejectionMonth),
          heatNumber,
          notes,
        })
        setPartName('')
        setSelectedPartId(null)
        setRejectionTypeId('')
        setQuantity('')
        setHeatNumber('')
        setNotes('')
        setMessage('Rejection entry saved.')
        await loadData()
      } catch (err) {
        setError(err.message || 'Unable to save rejection entry.')
      } finally {
        setIsSaving(false)
      }
    })
  }

  function handleFormKeyDown(event) {
    const target = event.target
    const isTextInput =
      target instanceof HTMLInputElement &&
      (target.type === 'text' || target.type === 'number')

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.requestSubmit()
      return
    }

    if (event.key === 'Enter' && isTextInput && target.type === 'text') {
      event.preventDefault()
      return
    }

    if (event.key === 'Enter' && isTextInput && target.type === 'number') {
      event.preventDefault()
      event.currentTarget.requestSubmit()
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this rejection entry?')) return
    setError('')
    setMessage('')

    try {
      await deleteRejection(id)
      setMessage('Rejection entry deleted.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to delete rejection entry.')
    }
  }

  const selectedMonthLabel = formatDisplayMonth(rejectionMonth)
  const monthEntries = entries.filter(
    (entry) => isoDateToMonthKey(entry.rejectionDate) === rejectionMonth,
  )

  const producedPartIds = useMemo(
    () => new Set(productionEntries.map((entry) => entry.partId)),
    [productionEntries],
  )

  const eligibleParts = useMemo(
    () => parts.filter((part) => producedPartIds.has(part.id)),
    [parts, producedPartIds],
  )

  const selectedPartIsEligible =
    selectedPartId !== null && producedPartIds.has(selectedPartId)

  function handlePartNameChange(value, part) {
    setPartName(value)
    setSelectedPartId(part?.id ?? null)
    setQuantity('')
  }

  const productionQtyByPartId = useMemo(() => {
    const totals = new Map()
    for (const entry of productionEntries) {
      totals.set(entry.partId, (totals.get(entry.partId) ?? 0) + entry.quantity)
    }
    return totals
  }, [productionEntries])

  const rejectionQtyByPartId = useMemo(() => {
    const totals = new Map()
    for (const entry of monthEntries) {
      totals.set(entry.partId, (totals.get(entry.partId) ?? 0) + entry.quantity)
    }
    return totals
  }, [monthEntries])

  const selectedProductionQty = selectedPartId
    ? productionQtyByPartId.get(selectedPartId) ?? 0
    : 0
  const selectedRejectedQty = selectedPartId ? rejectionQtyByPartId.get(selectedPartId) ?? 0 : 0
  const selectedRemainingQty = Math.max(selectedProductionQty - selectedRejectedQty, 0)
  const requestedQty = Number(quantity)
  const hasValidQuantity = Number.isFinite(requestedQty) && requestedQty > 0
  const quantityExceedsRemaining = hasValidQuantity && requestedQty > selectedRemainingQty

  const totalProductionQty = useMemo(
    () => productionEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [productionEntries],
  )

  const totalRejectionQty = useMemo(
    () => monthEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [monthEntries],
  )

  return (
    <div className={pageSplitClassName}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className={pageSidebarClassName}
      >
        <h2 className="text-lg font-semibold text-neutral-900">Log Rejection</h2>
        <p className="mt-1 text-sm text-neutral-500">Record rejected parts with reason.</p>

        {rejectionTypes.length === 0 ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No rejection types configured.{' '}
            <Link to="/settings" className="font-semibold underline">
              Add types in Settings
            </Link>
            .
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className={labelClassName}>Rejection Month</label>
            <input
              type="month"
              value={rejectionMonth}
              onChange={(event) => {
                setRejectionMonth(event.target.value)
                setPartName('')
                setSelectedPartId(null)
                setError('')
              }}
              className={inputClassName}
            />
          </div>

          {eligibleParts.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No production recorded for {selectedMonthLabel}. Log production for a part before
              adding rejections.
            </div>
          ) : null}

          <div>
            <label className={labelClassName}>Part Name</label>
            <PartNameCombobox
              parts={eligibleParts}
              value={partName}
              onChange={handlePartNameChange}
              disabled={eligibleParts.length === 0}
            />
            {eligibleParts.length > 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Only parts with production in {selectedMonthLabel} are shown.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClassName}>Rejection Reason</label>
            <RejectionTypeCombobox
              rejectionTypes={rejectionTypes}
              value={rejectionTypeId}
              onChange={setRejectionTypeId}
              disabled={rejectionTypes.length === 0}
            />
          </div>

          <div>
            <label className={labelClassName}>Quantity</label>
            <input
              type="number"
              min="0"
              step="any"
              max={selectedPartIsEligible ? selectedRemainingQty : undefined}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClassName}
              placeholder="Enter quantity"
              disabled={!selectedPartIsEligible || selectedRemainingQty <= 0}
            />
            {selectedPartIsEligible ? (
              <p className="mt-1 text-xs text-neutral-500">
                Production: {selectedProductionQty} · Rejected: {selectedRejectedQty} · Remaining:{' '}
                {selectedRemainingQty}
              </p>
            ) : null}
            {quantityExceedsRemaining ? (
              <p className="mt-1 text-xs text-red-600">
                Quantity cannot exceed remaining production ({selectedRemainingQty}) for this part.
              </p>
            ) : null}
            {selectedPartIsEligible && selectedRemainingQty <= 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                All produced quantity for this part has already been rejected this month.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClassName}>Heat Number (optional)</label>
            <input
              type="text"
              value={heatNumber}
              onChange={(event) => setHeatNumber(event.target.value)}
              className={inputClassName}
              placeholder="e.g. JULY-22"
            />
          </div>

          <div>
            <label className={labelClassName}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClassName}
              rows={3}
              placeholder="Additional details"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={
            isSaving ||
            rejectionTypes.length === 0 ||
            eligibleParts.length === 0 ||
            !selectedPartIsEligible ||
            !hasValidQuantity ||
            quantityExceedsRemaining ||
            selectedRemainingQty <= 0
          }
          className={`${buttonPrimaryClassName} mt-6 w-full`}
        >
          {isSaving ? 'Saving...' : 'Save Rejection'}
        </button>
      </form>

      <div className={pageMainPanelClassName}>
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Rejections</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'} in {selectedMonthLabel}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-x-auto px-4 sm:px-6">
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>Month</th>
                <th className={thClassName}>Part</th>
                <th className={thClassName}>Reason</th>
                <th className={`${thClassName} text-right`}>Qty</th>
                <th className={`${thClassName} text-right`}>REJ %</th>
                <th className={thClassName}>Heat #</th>
                <th className={thClassName} />
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${tdClassName} text-neutral-500`}>
                    No rejection entries for {selectedMonthLabel}.
                  </td>
                </tr>
              ) : (
                monthEntries.map((entry) => {
                  const partProductionQty = productionQtyByPartId.get(entry.partId) ?? 0
                  const partRejectionQty = rejectionQtyByPartId.get(entry.partId) ?? 0

                  return (
                    <tr key={entry.id}>
                      <td className={tdClassName}>
                        {formatDisplayMonth(isoDateToMonthKey(entry.rejectionDate))}
                      </td>
                      <td className={tdClassName}>{entry.partName}</td>
                      <td className={tdClassName}>{entry.rejectionTypeName}</td>
                      <td className={tableNumericClassName}>{entry.quantity}</td>
                      <td className={`${tableNumericClassName} font-medium text-[#2d6a6a]`}>
                        {formatRejectionRate(partProductionQty, partRejectionQty)}
                      </td>
                      <td className={tdClassName}>{entry.heatNumber || '—'}</td>
                      <td className={tdClassName}>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {monthEntries.length > 0 ? (
          <div className={tableFooterBarClassName}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Total rejection rate
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {totalRejectionQty.toLocaleString('en-IN')} rejected of{' '}
                  {totalProductionQty.toLocaleString('en-IN')} produced in {selectedMonthLabel}
                </p>
              </div>
              <div className="rounded-xl border border-[#2d6a6a]/20 bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-2xl font-bold tabular-nums leading-none text-[#2d6a6a]">
                  {formatRejectionRate(totalProductionQty, totalRejectionQty)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Overall REJ %
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
