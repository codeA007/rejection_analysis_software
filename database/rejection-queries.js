import { lookupPart } from './part-queries.js'
import { getPartProductionQuantityInMonth, partHasProductionInMonth } from './production-queries.js'
import { getDb } from './connection.js'

function getMonthBoundsFromDate(isoDate) {
  const [year, month] = isoDate.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const pad = (value) => String(value).padStart(2, '0')
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
}

function getPartRejectionQuantityInMonth(partId, isoDate) {
  const db = getDb()
  const { start, end } = getMonthBoundsFromDate(isoDate)
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS total
       FROM rejections
       WHERE part_id = ?
         AND rejection_date >= ?
         AND rejection_date <= ?`,
    )
    .get(partId, start, end)

  return row?.total ?? 0
}

function mapRejectionRow(row) {
  return {
    id: row.id,
    partId: row.partId,
    partName: row.partName,
    rejectionTypeId: row.rejectionTypeId,
    rejectionTypeName: row.rejectionTypeName,
    quantity: row.quantity,
    rejectionDate: row.rejectionDate,
    heatNumber: row.heatNumber,
    notes: row.notes,
    createdAt: row.createdAt,
  }
}

const SELECT_REJECTIONS = `
  SELECT
    r.id,
    r.part_id AS partId,
    p.part_name AS partName,
    r.rejection_type_id AS rejectionTypeId,
    rt.type_name AS rejectionTypeName,
    r.quantity,
    r.rejection_date AS rejectionDate,
    r.heat_number AS heatNumber,
    r.notes,
    r.created_at AS createdAt
  FROM rejections r
  JOIN parts p ON p.id = r.part_id
  JOIN rejection_types rt ON rt.id = r.rejection_type_id
`

export function listRejections({ from, to } = {}) {
  const db = getDb()
  const conditions = []
  const params = []

  if (from) {
    conditions.push('r.rejection_date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('r.rejection_date <= ?')
    params.push(to)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db
    .prepare(
      `${SELECT_REJECTIONS}
       ${where}
       ORDER BY r.rejection_date DESC, r.id DESC`,
    )
    .all(...params)
    .map(mapRejectionRow)
}

export function getTotalRejectedWeight({ from, to } = {}) {
  const db = getDb()
  const conditions = ['p.weight IS NOT NULL']
  const params = []

  if (from) {
    conditions.push('r.rejection_date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('r.rejection_date <= ?')
    params.push(to)
  }

  const row = db
    .prepare(
      `SELECT COALESCE(SUM(r.quantity * p.weight), 0) AS total
       FROM rejections r
       JOIN parts p ON p.id = r.part_id
       WHERE ${conditions.join(' AND ')}`,
    )
    .get(...params)

  return row?.total ?? 0
}

export function createRejection({
  partName,
  rejectionTypeId,
  quantity,
  rejectionDate,
  heatNumber,
  notes,
}) {
  const db = getDb()
  const qty = Number(quantity)
  const typeId = Number(rejectionTypeId)
  const date = rejectionDate?.trim()
  const heat = heatNumber?.trim() || null
  const noteText = notes?.trim() || null

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero.')
  }
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new Error('Rejection type is required.')
  }
  if (!date) {
    throw new Error('Rejection date is required.')
  }

  const normalizedPartName = partName?.trim()
  if (!normalizedPartName) {
    throw new Error('Part name is required.')
  }

  const rejectionType = db
    .prepare('SELECT id, is_active AS isActive FROM rejection_types WHERE id = ?')
    .get(typeId)

  if (!rejectionType) {
    throw new Error('Rejection type not found.')
  }
  if (!rejectionType.isActive) {
    throw new Error('Selected rejection type is inactive.')
  }

  const part = lookupPart(normalizedPartName)
  if (!part) {
    throw new Error('Part not found. Select a part that was produced in the selected month.')
  }

  if (!partHasProductionInMonth(part.id, date)) {
    throw new Error(
      `No production recorded for "${part.partName}" in this month. Log production first.`,
    )
  }

  const productionQty = getPartProductionQuantityInMonth(part.id, date)
  const existingRejectionQty = getPartRejectionQuantityInMonth(part.id, date)
  const remainingQty = productionQty - existingRejectionQty

  if (existingRejectionQty + qty > productionQty) {
    throw new Error(
      `Rejection quantity exceeds production for "${part.partName}" in this month. Production: ${productionQty}, already rejected: ${existingRejectionQty}, remaining: ${Math.max(remainingQty, 0)}.`,
    )
  }

  const result = db
    .prepare(
      `INSERT INTO rejections (part_id, rejection_type_id, quantity, rejection_date, heat_number, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(part.id, typeId, qty, date, heat, noteText)

  return mapRejectionRow(
    db
      .prepare(`${SELECT_REJECTIONS} WHERE r.id = ?`)
      .get(result.lastInsertRowid),
  )
}

export function deleteRejection(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM rejections WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Rejection entry not found.')
  }
  return { deleted: true }
}
