import { DEFAULT_REJECTION_TYPES } from './default-rejection-types.js'
import { getDb } from './connection.js'
import { listRejectionTypes } from './rejection-type-queries.js'

export function ensureDefaultRejectionTypes() {
  const db = getDb()
  const existing = db.prepare('SELECT type_name AS typeName FROM rejection_types').all()
  const existingNames = new Set(existing.map((row) => row.typeName.toLowerCase()))

  const insert = db.prepare(
    'INSERT INTO rejection_types (type_name, sort_order, is_active) VALUES (?, ?, 1)',
  )

  const seed = db.transaction(() => {
    let inserted = 0

    DEFAULT_REJECTION_TYPES.forEach((typeName, index) => {
      if (existingNames.has(typeName.toLowerCase())) return
      insert.run(typeName, index)
      existingNames.add(typeName.toLowerCase())
      inserted += 1
    })

    return inserted
  })

  const inserted = seed()
  return {
    inserted,
    types: listRejectionTypes({ includeInactive: true }),
  }
}
