import { useEffect, useMemo, useState } from 'react'
import { createPart, deletePart, fetchParts, updatePart } from '../../../api/parts'
import PartNameCombobox from '../../../components/ui/PartNameCombobox'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import PartExcelImport from '../components/PartExcelImport'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  cardClassName,
  inputClassName,
  labelClassName,
  pageClassName,
  tableClassName,
  tdClassName,
  thClassName,
} from '../../../components/ui/formStyles'

export default function PartsPage() {
  const [parts, setParts] = useState([])
  const [formMode, setFormMode] = useState('add')
  const [editingPartId, setEditingPartId] = useState(null)
  const [partName, setPartName] = useState('')
  const [partNo, setPartNo] = useState('')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { runGuarded } = useSubmitGuard()

  async function loadParts() {
    const data = await fetchParts()
    setParts(data)
  }

  useEffect(() => {
    loadParts().catch((err) => setError(err.message || 'Unable to load parts.'))
  }, [])

  function resetForm() {
    setEditingPartId(null)
    setPartName('')
    setPartNo('')
    setDescription('')
    setWeight('')
    setVendorName('')
  }

  function switchFormMode(mode) {
    setFormMode(mode)
    resetForm()
    setError('')
    setMessage('')
  }

  function startEditing(part) {
    setEditingPartId(part.id)
    setPartName(part.partName)
    setPartNo(part.partNo || '')
    setDescription(part.description || '')
    setWeight(part.weight ?? '')
    setVendorName(part.vendorName || '')
    setError('')
    setMessage('')
  }

  function handlePartNameChange(value, part) {
    if (formMode === 'edit') {
      if (part) {
        startEditing(part)
        return
      }

      setPartName(value)
      if (!value.trim()) {
        setEditingPartId(null)
        setPartNo('')
        setDescription('')
        setWeight('')
        setVendorName('')
      }
      return
    }

    setPartName(value)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formMode === 'edit' && !editingPartId) {
      setError('Select a part from the suggestions to edit.')
      return
    }

    if (!partName.trim()) {
      setError('Part name is required.')
      return
    }

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)

      const payload = {
        partName,
        partNo: partNo || null,
        description: description || null,
        weight: weight || null,
        vendorName: vendorName || null,
      }

      try {
        if (formMode === 'edit') {
          await updatePart(editingPartId, payload)
          setMessage('Part updated.')
        } else {
          await createPart(payload)
          setMessage('Part added.')
        }
        resetForm()
        await loadParts()
      } catch (err) {
        setError(err.message || (formMode === 'edit' ? 'Unable to update part.' : 'Unable to add part.'))
      } finally {
        setIsSaving(false)
      }
    })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this part?')) return
    setError('')
    setMessage('')

    try {
      await deletePart(id)
      if (editingPartId === id) resetForm()
      setMessage('Part deleted.')
      await loadParts()
    } catch (err) {
      setError(err.message || 'Unable to delete part.')
    }
  }

  const isEditMode = formMode === 'edit'

  const filteredParts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return parts

    return parts.filter((part) => {
      const haystack = [part.partNo, part.partName, part.description, part.vendorName, part.displayLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [parts, searchQuery])

  return (
    <div className={pageClassName}>
      <div className={`${cardClassName} grid gap-6 xl:grid-cols-2`}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEditMode ? 'Edit Part' : 'Add Part Manually'}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {isEditMode
              ? 'Search for a part, select it, then update the details below.'
              : 'Enter a part name directly, or add details like part number and weight.'}
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => switchFormMode('add')}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                formMode === 'add'
                  ? 'bg-[#2d6a6a] text-white'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              Add new part
            </button>
            <button
              type="button"
              onClick={() => switchFormMode('edit')}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                formMode === 'edit'
                  ? 'bg-[#2d6a6a] text-white'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              Edit part
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className={labelClassName}>Part Name</label>
              {isEditMode ? (
                <PartNameCombobox
                  parts={parts}
                  value={partName}
                  onChange={handlePartNameChange}
                  disabled={parts.length === 0}
                />
              ) : (
                <input
                  type="text"
                  value={partName}
                  onChange={(event) => setPartName(event.target.value)}
                  className={inputClassName}
                  placeholder="e.g. DIST PIECE 400"
                  required
                />
              )}
              {isEditMode && !editingPartId ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Type to search, then pick a part from the list to load its details.
                </p>
              ) : null}
            </div>

            <div>
              <label className={labelClassName}>Part No (optional)</label>
              <input
                type="text"
                value={partNo}
                onChange={(event) => setPartNo(event.target.value)}
                className={inputClassName}
                placeholder="e.g. 0455820000"
                disabled={isEditMode && !editingPartId}
              />
            </div>

            <div>
              <label className={labelClassName}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={inputClassName}
                placeholder="Part description"
                disabled={isEditMode && !editingPartId}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName}>Weight (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className={inputClassName}
                  placeholder="kg"
                  disabled={isEditMode && !editingPartId}
                />
              </div>

              <div>
                <label className={labelClassName}>Vendor Name (optional)</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                  className={inputClassName}
                  placeholder="Vendor"
                  disabled={isEditMode && !editingPartId}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving || (isEditMode && !editingPartId)}
              className={buttonPrimaryClassName}
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Part'}
            </button>
            {isEditMode && editingPartId ? (
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setError('')
                  setMessage('')
                }}
                className={buttonSecondaryClassName}
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>

        <PartExcelImport
          onImported={loadParts}
          onError={setError}
          onMessage={setMessage}
        />
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className={cardClassName}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Parts Catalog</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {searchQuery.trim()
                ? `${filteredParts.length} of ${parts.length} part(s)`
                : `${parts.length} part(s) in database`}
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label className={labelClassName} htmlFor="parts-search">
              Search parts
            </label>
            <input
              id="parts-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={inputClassName}
              placeholder="Part no, name, vendor..."
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>Part No</th>
                <th className={thClassName}>Part Name</th>
                <th className={thClassName}>Description</th>
                <th className={thClassName}>Weight</th>
                <th className={thClassName}>Vendor</th>
                <th className={thClassName} />
              </tr>
            </thead>
            <tbody>
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${tdClassName} text-neutral-500`}>
                    No parts yet. Add manually or import from Excel.
                  </td>
                </tr>
              ) : filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${tdClassName} text-neutral-500`}>
                    No parts match &ldquo;{searchQuery.trim()}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => (
                  <tr key={part.id}>
                    <td className={tdClassName}>{part.partNo || '—'}</td>
                    <td className={tdClassName}>{part.partName}</td>
                    <td className={tdClassName}>{part.description || '—'}</td>
                    <td className={tdClassName}>{part.weight ?? '—'}</td>
                    <td className={tdClassName}>{part.vendorName || '—'}</td>
                    <td className={tdClassName}>
                      <button
                        type="button"
                        onClick={() => handleDelete(part.id)}
                        className={`${buttonSecondaryClassName} !px-3 !py-2 text-xs text-red-600`}
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
      </div>
    </div>
  )
}
