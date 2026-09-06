import { useRef, useState } from 'react'
import { importParts, previewPartImport } from '../../../api/parts'
import { parsePartExcelFile } from '../../../utils/parsePartExcel'
import { buttonPrimaryClassName, buttonSecondaryClassName } from '../../../components/ui/formStyles'

function SkippedRowsList({ rows }) {
  if (!rows?.length) return null

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-xs font-semibold text-amber-900">
        Skipped rows ({rows.length}) — no weight
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-950">
        {rows.map((entry) => (
          <li key={`${entry.row}-${entry.reason}`}>
            Row {entry.row}: {entry.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InvalidRowsList({ rows }) {
  if (!rows?.length) return null

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="mb-2 text-xs font-semibold text-red-900">
        Invalid rows ({rows.length}) — import cancelled
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-950">
        {rows.map((entry) => (
          <li key={`${entry.row}-${entry.reason}`}>
            Row {entry.row}: {entry.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UpdatePreviewTable({ updates }) {
  if (!updates?.length) return null

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-800">
        Existing parts to update ({updates.length})
      </p>
      <div className="max-h-48 overflow-auto">
        <table className="w-full text-left text-xs text-neutral-800">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="py-1 pr-2 font-semibold">PART NO</th>
              <th className="py-1 pr-2 font-semibold">Current weight</th>
              <th className="py-1 pr-2 font-semibold">New weight</th>
              <th className="py-1 font-semibold">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((entry) => (
              <tr key={entry.partNo} className="border-b border-neutral-100">
                <td className="py-1 pr-2 font-medium">{entry.partNo}</td>
                <td className="py-1 pr-2">{entry.existing.weight ?? '—'}</td>
                <td className="py-1 pr-2 font-medium text-[#2d6a6a]">{entry.incoming.weight}</td>
                <td className="py-1">{entry.incoming.vendorName || entry.existing.vendorName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PartExcelImport({ onImported, onError, onMessage }) {
  const fileInputRef = useRef(null)
  const isImportingRef = useRef(false)
  const [isImporting, setIsImporting] = useState(false)
  const [invalidRows, setInvalidRows] = useState([])
  const [skippedRows, setSkippedRows] = useState([])
  const [pendingImport, setPendingImport] = useState(null)

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function clearPendingImport() {
    setPendingImport(null)
    resetFileInput()
  }

  async function runImport(rows) {
    onError?.('')
    onMessage?.('')

    try {
      const result = await importParts(rows)
      setInvalidRows(result.invalidRows ?? [])

      const parts = [
        `${result.inserted} inserted`,
        result.updated ? `${result.updated} updated` : null,
        result.skippedCount ? `${result.skippedCount} skipped (no weight)` : null,
      ].filter(Boolean)

      onMessage?.(`Import complete: ${parts.join(', ')}.`)
      onImported?.()
    } catch (importError) {
      onError?.(importError.message || 'Unable to import parts.')
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    onError?.('')
    onMessage?.('')
    setInvalidRows([])
    setSkippedRows([])
    setPendingImport(null)
    setIsImporting(true)

    try {
      const parsedRows = await parsePartExcelFile(file)
      const preview = await previewPartImport(parsedRows)

      if (preview.invalidRows?.length) {
        setInvalidRows(preview.invalidRows)
        throw new Error(
          'Import cancelled. Fix all invalid rows listed below and upload the Excel file again.',
        )
      }

      if (preview.validCount === 0) {
        setInvalidRows(preview.invalidRows ?? [])
        setSkippedRows(preview.skippedRows ?? [])
        throw new Error(
          preview.skippedCount > 0
            ? 'No rows with weight found in the Excel file.'
            : 'No valid rows found in the Excel file.',
        )
      }

      setSkippedRows(preview.skippedRows ?? [])

      setPendingImport({
        rows: parsedRows,
        preview,
      })
    } catch (fileError) {
      onError?.(fileError.message || 'Unable to read the Excel file.')
      resetFileInput()
    } finally {
      setIsImporting(false)
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport || isImportingRef.current) return

    isImportingRef.current = true
    setIsImporting(true)

    try {
      await runImport(pendingImport.rows)
      clearPendingImport()
    } finally {
      isImportingRef.current = false
      setIsImporting(false)
    }
  }

  function handleCancelImport() {
    onMessage?.('Import cancelled.')
    clearPendingImport()
  }

  const pendingPreview = pendingImport?.preview

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="mb-1 text-sm font-semibold text-neutral-800">Import from Excel</p>
      <p className="mb-3 text-xs text-neutral-500">
        Required columns: PART NO, WEIGHT. Optional: PART DESCRIPTION, VENDOR NAME. Rows without
        weight are skipped.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
        className={buttonPrimaryClassName}
      >
        {isImporting && !pendingImport ? 'Reading file...' : 'Choose Excel file'}
      </button>

      <InvalidRowsList rows={invalidRows} />
      <SkippedRowsList rows={skippedRows} />

      {pendingPreview ? (
        <div className="mt-3 space-y-3">
          {pendingPreview.skippedCount > 0 ? (
            <p className="text-xs text-amber-700">
              {pendingPreview.skippedCount} row{pendingPreview.skippedCount === 1 ? '' : 's'} will be
              skipped (no weight).
            </p>
          ) : null}

          {pendingPreview.newCount > 0 ? (
            <p className="text-xs text-neutral-600">
              {pendingPreview.newCount} new part{pendingPreview.newCount === 1 ? '' : 's'} will be added.
            </p>
          ) : null}

          <UpdatePreviewTable updates={pendingPreview.updates} />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isImporting}
              onClick={handleConfirmImport}
              className={buttonPrimaryClassName}
            >
              {isImporting ? 'Importing...' : 'Confirm import'}
            </button>
            <button
              type="button"
              disabled={isImporting}
              onClick={handleCancelImport}
              className={buttonSecondaryClassName}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
