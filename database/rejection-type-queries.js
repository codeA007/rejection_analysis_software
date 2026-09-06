import { getDb } from './connection.js'

function normalizeTypeName(typeName) {
  const trimmed = typeName?.trim()
  if (!trimmed) {
    throw new Error('Rejection type name is required.')
  }
  return trimmed
}

function mapRejectionType(row) {
  return {
    id: row.id,
    typeName: row.typeName,
    isActive: Boolean(row.isActive),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

export function listRejectionTypes({ includeInactive = false } = {}) {
  const db = getDb()
  const where = includeInactive ? '' : 'WHERE is_active = 1'
  return db
    .prepare(
      `SELECT
         id,
         type_name AS typeName,
         is_active AS isActive,
         sort_order AS sortOrder,
         created_at AS createdAt
       FROM rejection_types
       ${where}
       ORDER BY sort_order ASC, type_name COLLATE NOCASE ASC`,
    )
    .all()
    .map(mapRejectionType)
}

export function createRejectionType({ typeName }) {
  const db = getDb()
  const normalized = normalizeTypeName(typeName)
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM rejection_types').get()
  const sortOrder = maxOrder.maxOrder + 1

  try {
    const result = db
      .prepare('INSERT INTO rejection_types (type_name, sort_order) VALUES (?, ?)')
      .run(normalized, sortOrder)

    return mapRejectionType(
      db
        .prepare(
          `SELECT id, type_name AS typeName, is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt
           FROM rejection_types WHERE id = ?`,
        )
        .get(result.lastInsertRowid),
    )
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      throw new Error('A rejection type with this name already exists.')
    }
    throw error
  }
}

export function updateRejectionType(id, { typeName, isActive, sortOrder }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM rejection_types WHERE id = ?').get(id)
  if (!existing) {
    throw new Error('Rejection type not found.')
  }

  const updates = []
  const params = []

  if (typeName !== undefined) {
    updates.push('type_name = ?')
    params.push(normalizeTypeName(typeName))
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?')
    params.push(isActive ? 1 : 0)
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?')
    params.push(Number(sortOrder))
  }

  if (updates.length === 0) {
    throw new Error('No fields to update.')
  }

  try {
    db.prepare(`UPDATE rejection_types SET ${updates.join(', ')} WHERE id = ?`).run(...params, id)
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      throw new Error('A rejection type with this name already exists.')
    }
    throw error
  }

  return mapRejectionType(
    db
      .prepare(
        `SELECT id, type_name AS typeName, is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt
         FROM rejection_types WHERE id = ?`,
      )
      .get(id),
  )
}

export function deleteRejectionType(id) {
  const db = getDb()
  const inUse = db.prepare('SELECT 1 FROM rejections WHERE rejection_type_id = ? LIMIT 1').get(id)
  if (inUse) {
    throw new Error('Cannot delete a rejection type that is used in rejection records. Deactivate it instead.')
  }

  const result = db.prepare('DELETE FROM rejection_types WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Rejection type not found.')
  }
  return { deleted: true }
}

export function reorderRejectionTypes(orderedIds) {
  const db = getDb()
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('Ordered IDs are required.')
  }

  const update = db.prepare('UPDATE rejection_types SET sort_order = ? WHERE id = ?')
  const reorder = db.transaction((ids) => {
    ids.forEach((id, index) => {
      update.run(index, id)
    })
  })

  reorder(orderedIds)
  return listRejectionTypes({ includeInactive: true })
}
