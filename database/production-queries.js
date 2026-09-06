import { findOrCreatePart, resolvePartWeight } from './part-queries.js'
import { getDb } from './connection.js'

function mapProductionRow(row, db) {
  const quantity = row.quantity
  const partWeight =
    row.partWeight ?? resolvePartWeight(db, row.partId, row.partName)
  const pouredWeight =
    partWeight !== null && partWeight !== undefined ? quantity * partWeight : null

  return {
    id: row.id,
    partId: row.partId,
    partName: row.partName,
    quantity,
    partWeight,
    pouredWeight,
    heatNumber: row.heatNumber,
    productionDate: row.productionDate,
    createdAt: row.createdAt,
  }
}

const SELECT_PRODUCTION = `
  SELECT
    pe.id,
    pe.part_id AS partId,
    p.part_name AS partName,
    p.weight AS partWeight,
    pe.quantity,
    pe.heat_number AS heatNumber,
    pe.production_date AS productionDate,
    pe.created_at AS createdAt
  FROM production_entries pe
  JOIN parts p ON p.id = pe.part_id
`

export function listProductionEntries({ from, to } = {}) {
  const db = getDb()
  const conditions = []
  const params = []

  if (from) {
    conditions.push('pe.production_date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('pe.production_date <= ?')
    params.push(to)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db
    .prepare(
      `${SELECT_PRODUCTION}
       ${where}
       ORDER BY pe.production_date DESC, pe.id DESC`,
    )
    .all(...params)
    .map((row) => mapProductionRow(row, db))
}

export function getTotalPouredWeight({ from, to } = {}) {
  return listProductionEntries({ from, to }).reduce((sum, entry) => {
    if (entry.pouredWeight === null || entry.pouredWeight === undefined) return sum
    return sum + entry.pouredWeight
  }, 0)
}

export function createProductionEntry({ partName, quantity, heatNumber, productionDate }) {
  const db = getDb()
  const qty = Number(quantity)
  const heat = heatNumber?.trim()
  const date = productionDate?.trim()

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero.')
  }
  if (!heat) {
    throw new Error('Heat number is required.')
  }
  if (!date) {
    throw new Error('Production date is required.')
  }

  const part = findOrCreatePart(partName)

  const result = db
    .prepare(
      `INSERT INTO production_entries (part_id, quantity, heat_number, production_date)
       VALUES (?, ?, ?, ?)`,
    )
    .run(part.id, qty, heat, date)

  return mapProductionRow(
    db
      .prepare(`${SELECT_PRODUCTION} WHERE pe.id = ?`)
      .get(result.lastInsertRowid),
    db,
  )
}

function getMonthBoundsFromDate(isoDate) {
  const [year, month] = isoDate.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const pad = (value) => String(value).padStart(2, '0')
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
}

export function getPartProductionQuantityInMonth(partId, isoDate) {
  const db = getDb()
  const { start, end } = getMonthBoundsFromDate(isoDate)
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS total
       FROM production_entries
       WHERE part_id = ?
         AND production_date >= ?
         AND production_date <= ?`,
    )
    .get(partId, start, end)

  return row?.total ?? 0
}

export function partHasProductionInMonth(partId, isoDate) {
  return getPartProductionQuantityInMonth(partId, isoDate) > 0
}

export function deleteProductionEntry(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM production_entries WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Production entry not found.')
  }
  return { deleted: true }
}
