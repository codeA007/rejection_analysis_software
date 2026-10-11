import { useEffect, useRef, useState } from 'react'
import { fetchFurnaceSettings, updateFurnaceSettings } from '../../../api/settings'
import {
  createRejectionType,
  deleteRejectionType,
  fetchRejectionTypes,
  reorderRejectionTypes,
  updateRejectionType,
} from '../../../api/rejectionTypes'
import { DEFAULT_FURNACE_CHARGE_KG } from '../../../constants/foundry'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
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

export default function SettingsPage() {
  const [types, setTypes] = useState([])
  const [newTypeName, setNewTypeName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [furnaceChargeKg, setFurnaceChargeKg] = useState(String(DEFAULT_FURNACE_CHARGE_KG))
  const [furnaceSaving, setFurnaceSaving] = useState(false)
  const { runGuarded } = useSubmitGuard()
  const isReorderingRef = useRef(false)

  async function loadTypes() {
    const data = await fetchRejectionTypes({ includeInactive: true })
    setTypes(data)
  }

  useEffect(() => {
    loadTypes().catch((err) => setError(err.message || 'Unable to load rejection types.'))
    fetchFurnaceSettings()
      .then((data) => setFurnaceChargeKg(String(data.furnaceChargeKg)))
      .catch(() => {})
  }, [])

  async function handleSaveFurnace(event) {
    event.preventDefault()

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setFurnaceSaving(true)

      try {
        const result = await updateFurnaceSettings({ furnaceChargeKg: Number(furnaceChargeKg) })
        setFurnaceChargeKg(String(result.furnaceChargeKg))
        setMessage('Furnace settings saved.')
      } catch (err) {
        setError(err.message || 'Unable to save furnace settings.')
      } finally {
        setFurnaceSaving(false)
      }
    })
  }

  async function handleAddType(event) {
    event.preventDefault()

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)

      try {
        await createRejectionType({ typeName: newTypeName })
        setNewTypeName('')
        setMessage('Rejection type added.')
        await loadTypes()
      } catch (err) {
        setError(err.message || 'Unable to add rejection type.')
      } finally {
        setIsSaving(false)
      }
    })
  }

  function startEditing(type) {
    setEditingId(type.id)
    setEditingName(type.typeName)
    setError('')
    setMessage('')
  }

  async function saveEditing() {
    if (!editingId) return

    await runGuarded(async () => {
      setError('')
      setMessage('')
      setIsSaving(true)

      try {
        await updateRejectionType({ id: editingId, typeName: editingName })
        setEditingId(null)
        setEditingName('')
        setMessage('Rejection type updated.')
        await loadTypes()
      } catch (err) {
        setError(err.message || 'Unable to update rejection type.')
      } finally {
        setIsSaving(false)
      }
    })
  }

  async function toggleActive(type) {
    setError('')
    setMessage('')

    try {
      await updateRejectionType({ id: type.id, isActive: !type.isActive })
      setMessage(type.isActive ? 'Rejection type deactivated.' : 'Rejection type activated.')
      await loadTypes()
    } catch (err) {
      setError(err.message || 'Unable to update rejection type.')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this rejection type?')) return
    setError('')
    setMessage('')

    try {
      await deleteRejectionType(id)
      setMessage('Rejection type deleted.')
      await loadTypes()
    } catch (err) {
      setError(err.message || 'Unable to delete rejection type.')
    }
  }

  async function moveType(id, direction) {
    if (isReorderingRef.current) return

    const index = types.findIndex((type) => type.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= types.length) return

    const reordered = [...types]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setError('')
    setMessage('')
    isReorderingRef.current = true

    try {
      const updated = await reorderRejectionTypes(reordered.map((type) => type.id))
      setTypes(updated)
    } catch (err) {
      setError(err.message || 'Unable to reorder rejection types.')
    } finally {
      isReorderingRef.current = false
    }
  }

  return (
    <div className={pageClassName}>
      <div className={cardClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">Furnace</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Metal charged per furnace heat. Used on the Yield tab and Production heat summary.
        </p>

        <form onSubmit={handleSaveFurnace} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 sm:max-w-xs">
            <label className={labelClassName} htmlFor="furnace-charge-kg">
              Metal charged per heat (kg)
            </label>
            <input
              id="furnace-charge-kg"
              type="number"
              min="0"
              step="any"
              value={furnaceChargeKg}
              onChange={(event) => setFurnaceChargeKg(event.target.value)}
              className={inputClassName}
              required
            />
          </div>
          <button type="submit" disabled={furnaceSaving} className={buttonPrimaryClassName}>
            {furnaceSaving ? 'Saving...' : 'Save Furnace Settings'}
          </button>
        </form>
      </div>

      <div className={cardClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">Rejection Types</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Default types match the Monthly Rejection Analysis Excel template. You can add or edit types below.
        </p>

        <form onSubmit={handleAddType} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className={labelClassName}>New Type</label>
            <input
              type="text"
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              className={inputClassName}
              placeholder="e.g. Porosity"
            />
          </div>
          <button type="submit" disabled={isSaving} className={`${buttonPrimaryClassName} self-end`}>
            Add Type
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      </div>

      <div className={cardClassName}>
        <div className="overflow-x-auto">
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>Order</th>
                <th className={thClassName}>Type Name</th>
                <th className={thClassName}>Status</th>
                <th className={thClassName}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${tdClassName} text-neutral-500`}>
                    No rejection types yet. Add your first type above.
                  </td>
                </tr>
              ) : (
                types.map((type, index) => (
                  <tr key={type.id}>
                    <td className={tdClassName}>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveType(type.id, -1)}
                          className="rounded border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={index === types.length - 1}
                          onClick={() => moveType(type.id, 1)}
                          className="rounded border border-neutral-200 px-2 py-1 text-xs disabled:opacity-40"
                        >
                          Down
                        </button>
                      </div>
                    </td>
                    <td className={tdClassName}>
                      {editingId === type.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className={inputClassName}
                        />
                      ) : (
                        type.typeName
                      )}
                    </td>
                    <td className={tdClassName}>
                      <span
                        className={[
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          type.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-neutral-100 text-neutral-500',
                        ].join(' ')}
                      >
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={tdClassName}>
                      <div className="flex flex-wrap gap-2">
                        {editingId === type.id ? (
                          <>
                            <button type="button" onClick={saveEditing} className={buttonPrimaryClassName}>
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null)
                                setEditingName('')
                              }}
                              className={buttonSecondaryClassName}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(type)}
                              className={buttonSecondaryClassName}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(type)}
                              className={buttonSecondaryClassName}
                            >
                              {type.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(type.id)}
                              className="rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
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
