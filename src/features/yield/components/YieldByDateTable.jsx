import { Fragment, useEffect, useMemo, useState } from 'react'
import { deleteProductionEntry, updateProductionEntry } from '../../../api/production'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
  tableClassName,
  tableNumericClassName,
  tableRowClassName,
  tdClassName,
  thClassName,
} from '../../../components/ui/formStyles'
import { formatDisplayDate } from '../../../utils/dateUtils'
import { normalizeHeatKey } from '../../../utils/heatYieldUtils'
import { parseQuantityExpression } from '../../../utils/parseQuantityExpression'

const COLUMN_COUNT = 7

const compactInputClassName = `${inputClassName} !py-1.5 !text-sm`

function formatWeight(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function heatRowKey(productionDate, heatNumber) {
  return `${productionDate}|${normalizeHeatKey(heatNumber)}`
}

function heatExpandKey(productionDate, heat) {
  return `${productionDate}|${heatStableKey(heat)}`
}

function heatStableKey(heat) {
  const entries = heat.entries ?? []
  if (entries.length) {
    return entries.map((entry) => entry.id).join('-')
  }
  return normalizeHeatKey(heat.heatNumber)
}

const iconButtonClassName =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function YieldByDateTable({
  days = [],
  loading = false,
  emptyTitle = 'No production in this period',
  emptyDescription = 'Add production entries with heat numbers to see furnace yield.',
  onProductionUpdated,
}) {
  const [expandedDates, setExpandedDates] = useState(() => new Set())
  const [expandedHeats, setExpandedHeats] = useState(() => new Set())
  const [editingHeatKey, setEditingHeatKey] = useState(null)
  const [heatDraft, setHeatDraft] = useState('')
  const [savingHeatKey, setSavingHeatKey] = useState(null)
  const [savingEntryId, setSavingEntryId] = useState(null)
  const [deletingEntryId, setDeletingEntryId] = useState(null)
  const [rowError, setRowError] = useState(null)
  const [quantityDrafts, setQuantityDrafts] = useState(() => ({}))

  const periodKey = useMemo(
    () => days.map((day) => day.productionDate).sort().join('\0'),
    [days],
  )

  useEffect(() => {
    setExpandedDates(new Set())
    setExpandedHeats(new Set())
    setEditingHeatKey(null)
    setHeatDraft('')
    setQuantityDrafts({})
    setRowError(null)
  }, [periodKey])

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

  function toggleHeatExpanded(key) {
    setExpandedHeats((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function startHeatEdit(productionDate, heat) {
    const key = heatRowKey(productionDate, heat.heatNumber)
    setEditingHeatKey(key)
    setHeatDraft(heat.heatNumber)
    setRowError(null)
  }

  function cancelHeatEdit() {
    setEditingHeatKey(null)
    setHeatDraft('')
    setRowError(null)
  }

  async function saveHeatNumber(productionDate, heat) {
    const key = heatRowKey(productionDate, heat.heatNumber)
    const trimmed = heatDraft.trim()
    if (!trimmed) {
      setRowError('Heat number is required.')
      return
    }
    if (trimmed === heat.heatNumber) {
      cancelHeatEdit()
      return
    }

    const entries = heat.entries ?? []
    if (!entries.length) {
      setRowError('No production entries to update.')
      return
    }

    setSavingHeatKey(key)
    setRowError(null)
    try {
      await Promise.all(
        entries.map((entry) => updateProductionEntry(entry.id, { heatNumber: trimmed })),
      )
      setEditingHeatKey(null)
      setHeatDraft('')
      await onProductionUpdated?.()
    } catch (err) {
      setRowError(err.message || 'Unable to update heat number.')
    } finally {
      setSavingHeatKey(null)
    }
  }

  function getQuantityDraft(entry) {
    if (quantityDrafts[entry.id] !== undefined) {
      return quantityDrafts[entry.id]
    }
    return String(entry.quantity)
  }

  function setQuantityDraft(entryId, value) {
    setQuantityDrafts((current) => ({ ...current, [entryId]: value }))
  }

  async function saveEntryQuantity(entry) {
    const raw = getQuantityDraft(entry)
    const parsed = parseQuantityExpression(raw)
    const qty = parsed ?? Number(raw)

    if (!Number.isFinite(qty) || qty <= 0) {
      setRowError('Quantity must be greater than zero.')
      return
    }
    if (qty === entry.quantity) {
      setQuantityDrafts((current) => {
        const next = { ...current }
        delete next[entry.id]
        return next
      })
      return
    }

    setSavingEntryId(entry.id)
    setRowError(null)
    try {
      await updateProductionEntry(entry.id, { quantity: qty })
      setQuantityDrafts((current) => {
        const next = { ...current }
        delete next[entry.id]
        return next
      })
      await onProductionUpdated?.()
    } catch (err) {
      setRowError(err.message || 'Unable to update quantity.')
    } finally {
      setSavingEntryId(null)
    }
  }

  function isEntryQuantityDirty(entry) {
    const raw = getQuantityDraft(entry)
    const parsed = parseQuantityExpression(raw)
    const qty = parsed ?? Number(raw)
    if (!Number.isFinite(qty)) {
      return raw.trim() !== String(entry.quantity)
    }
    return qty !== entry.quantity
  }

  function normalizeQuantityDraft(entry) {
    const parsed = parseQuantityExpression(getQuantityDraft(entry))
    if (parsed != null) {
      setQuantityDraft(entry.id, String(parsed))
    }
  }

  async function handleDeleteEntry(entry) {
    if (!window.confirm(`Delete production entry for ${entry.partName}?`)) {
      return
    }

    setDeletingEntryId(entry.id)
    setRowError(null)
    try {
      await deleteProductionEntry(entry.id)
      setQuantityDrafts((current) => {
        const next = { ...current }
        delete next[entry.id]
        return next
      })
      await onProductionUpdated?.()
    } catch (err) {
      setRowError(err.message || 'Unable to delete production entry.')
    } finally {
      setDeletingEntryId(null)
    }
  }

  return (
    <div className="overflow-auto">
      <table className={tableClassName}>
        <thead>
          <tr>
            <th className={`${thClassName} w-10`} aria-label="Expand" />
            <th className={thClassName}>Date</th>
            <th className={`${thClassName} text-right`} title="Heat count on date; total qty per heat when expanded">
              Heats / Qty
            </th>
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
              const isDateExpanded = expandedDates.has(day.productionDate)
              return (
                <Fragment key={day.productionDate}>
                  <tr className={tableRowClassName}>
                    <td className={tdClassName}>
                      <button
                        type="button"
                        onClick={() => toggleDateExpanded(day.productionDate)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100"
                        aria-expanded={isDateExpanded}
                        aria-label={`${isDateExpanded ? 'Collapse' : 'Expand'} ${formatDisplayDate(day.productionDate)}`}
                      >
                        <ChevronIcon expanded={isDateExpanded} />
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
                  {isDateExpanded
                    ? day.heats.map((heat) => {
                        const heatEditKey = heatRowKey(day.productionDate, heat.heatNumber)
                        const heatExpandId = heatExpandKey(day.productionDate, heat)
                        const isHeatExpanded = expandedHeats.has(heatExpandId)
                        const isEditingHeat = editingHeatKey === heatEditKey
                        const isSavingHeat = savingHeatKey === heatEditKey
                        const entries = heat.entries ?? []

                        return (
                          <Fragment key={`${day.productionDate}-${heatStableKey(heat)}`}>
                            <tr className="bg-neutral-50/80">
                              <td className={tdClassName}>
                                {entries.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleHeatExpanded(heatExpandId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100"
                                    aria-expanded={isHeatExpanded}
                                    aria-label={`${isHeatExpanded ? 'Collapse' : 'Expand'} entries for heat ${heat.heatNumber}`}
                                  >
                                    <ChevronIcon expanded={isHeatExpanded} />
                                  </button>
                                ) : null}
                              </td>
                              <td className={tdClassName}>
                                <div className="flex flex-wrap items-center gap-2 pl-4">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                    Heat
                                  </span>
                                  {isEditingHeat ? (
                                    <>
                                      <input
                                        type="text"
                                        value={heatDraft}
                                        onChange={(event) => setHeatDraft(event.target.value)}
                                        className={`${compactInputClassName} max-w-[140px]`}
                                        aria-label="Heat number"
                                        disabled={isSavingHeat}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => saveHeatNumber(day.productionDate, heat)}
                                        disabled={isSavingHeat}
                                        className={`${buttonPrimaryClassName} inline-flex !px-2.5 !py-1 !text-xs items-center gap-1`}
                                      >
                                        {isSavingHeat ? (
                                          'Saving…'
                                        ) : (
                                          <>
                                            <SaveIcon />
                                            Save
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelHeatEdit}
                                        disabled={isSavingHeat}
                                        className={`${buttonSecondaryClassName} !px-2.5 !py-1 !text-xs`}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                                        {heat.heatNumber}
                                      </span>
                                      {onProductionUpdated ? (
                                        <button
                                          type="button"
                                          onClick={() => startHeatEdit(day.productionDate, heat)}
                                          className={`${iconButtonClassName} text-[#2d6a6a] hover:bg-[#2d6a6a]/10`}
                                          aria-label={`Edit heat ${heat.heatNumber}`}
                                        >
                                          <PencilIcon />
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                {rowError && (isEditingHeat || isSavingHeat) ? (
                                  <p className="mt-1 pl-4 text-xs text-red-600">{rowError}</p>
                                ) : null}
                              </td>
                              <td className={tableNumericClassName}>
                                {heat.totalQuantity ?? '—'}
                              </td>
                              <td className={`${tableNumericClassName} text-[#2d6a6a]`}>
                                {formatWeight(heat.pouredKg)}
                              </td>
                              <td className={tableNumericClassName}>
                                {formatWeight(heat.metalCharged)}
                              </td>
                              <td className={tableNumericClassName}>
                                {formatPercent(heat.yieldPercent)}%
                              </td>
                              <td className={tableNumericClassName}>{heat.entryCount}</td>
                            </tr>
                            {isHeatExpanded
                              ? entries.map((entry) => {
                                  const isSavingQty = savingEntryId === entry.id
                                  const isDeleting = deletingEntryId === entry.id
                                  const isQtyDirty = isEntryQuantityDirty(entry)
                                  return (
                                    <tr
                                      key={entry.id}
                                      className="bg-neutral-50/50"
                                    >
                                      <td className={tdClassName}>
                                        {onProductionUpdated ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEntry(entry)}
                                            disabled={isDeleting || isSavingQty}
                                            className={`${iconButtonClassName} text-red-600 hover:bg-red-50`}
                                            aria-label={`Delete ${entry.partName}`}
                                          >
                                            <TrashIcon />
                                          </button>
                                        ) : null}
                                      </td>
                                      <td className={`${tdClassName} pl-10 text-sm text-neutral-700`}>
                                        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                                          Part
                                        </span>
                                        <span className="ml-2">{entry.partName}</span>
                                      </td>
                                      <td className={tableNumericClassName}>
                                        {onProductionUpdated ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              autoComplete="off"
                                              value={getQuantityDraft(entry)}
                                              onChange={(event) =>
                                                setQuantityDraft(entry.id, event.target.value)
                                              }
                                              onBlur={() => normalizeQuantityDraft(entry)}
                                              onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                  event.preventDefault()
                                                  void saveEntryQuantity(entry)
                                                }
                                              }}
                                              disabled={isSavingQty || isDeleting}
                                              className={`${compactInputClassName} w-20 text-right tabular-nums`}
                                              aria-label={`Quantity for ${entry.partName}`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => saveEntryQuantity(entry)}
                                              disabled={
                                                isSavingQty || isDeleting || !isQtyDirty
                                              }
                                              className={`${iconButtonClassName} text-[#2d6a6a] hover:bg-[#2d6a6a]/10`}
                                              aria-label={`Save quantity for ${entry.partName}`}
                                              title="Save"
                                            >
                                              <SaveIcon />
                                            </button>
                                          </div>
                                        ) : (
                                          entry.quantity
                                        )}
                                      </td>
                                      <td className={`${tableNumericClassName} text-[#2d6a6a]`}>
                                        {formatWeight(entry.pouredWeight)}
                                      </td>
                                      <td className={tableNumericClassName}>—</td>
                                      <td className={tableNumericClassName}>—</td>
                                      <td className={tableNumericClassName}>—</td>
                                    </tr>
                                  )
                                })
                              : null}
                          </Fragment>
                        )
                      })
                    : null}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>
      {rowError && !editingHeatKey && !savingHeatKey ? (
        <p className="mt-2 px-4 text-xs text-red-600">{rowError}</p>
      ) : null}
    </div>
  )
}
