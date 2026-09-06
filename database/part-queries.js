import { getDb } from './connection.js'

function normalizePartName(partName) {
  const trimmed = partName?.trim()
  if (!trimmed) {
    throw new Error('Part name is required.')
  }
  return trimmed
}

export function formatPartLabel(part) {
  if (part.partNo && part.description) {
    return `${part.partNo} — ${part.description}`
  }
  if (part.partNo && part.partName && part.partName !== part.partNo) {
    return `${part.partNo} — ${part.partName}`
  }
  if (part.partNo) {
    return part.partNo
  }
  return part.partName
}

function mapPartRow(row) {
  const part = {
    id: row.id,
    partNo: row.partNo ?? null,
    partName: row.partName,
    description: row.description ?? null,
    weight: row.weight ?? null,
    vendorName: row.vendorName ?? null,
    createdAt: row.createdAt,
  }
  return {
    ...part,
    displayLabel: formatPartLabel(part),
  }
}

const SELECT_PARTS = `
  SELECT
    id,
    part_no AS partNo,
    part_name AS partName,
    description,
    weight,
    vendor_name AS vendorName,
    created_at AS createdAt
  FROM parts
`

export function listParts() {
  const db = getDb()
  return db
    .prepare(
      `${SELECT_PARTS}
       ORDER BY COALESCE(part_no, part_name) COLLATE NOCASE ASC`,
    )
    .all()
    .map(mapPartRow)
}

export function getPartById(id) {
  const db = getDb()
  const row = db.prepare(`${SELECT_PARTS} WHERE id = ?`).get(id)
  return row ? mapPartRow(row) : null
}

function findPartByLookup(db, lookup) {
  const normalized = lookup?.trim()
  if (!normalized) return null

  const byPartNo = db.prepare(`${SELECT_PARTS} WHERE part_no = ? COLLATE NOCASE`).get(normalized)
  if (byPartNo) return byPartNo

  const exactName = db.prepare(`${SELECT_PARTS} WHERE part_name = ? COLLATE NOCASE`).get(normalized)
  const exactDesc = db.prepare(`${SELECT_PARTS} WHERE description = ? COLLATE NOCASE`).get(normalized)

  if (exactName?.weight != null) return exactName
  if (exactDesc?.weight != null) return exactDesc

  const likeTerm = `%${normalized}%`
  const fuzzy = db
    .prepare(
      `${SELECT_PARTS}
       WHERE part_name LIKE ? COLLATE NOCASE
          OR description LIKE ? COLLATE NOCASE
          OR ? LIKE part_name || '%' COLLATE NOCASE
          OR ? LIKE description || '%' COLLATE NOCASE
       ORDER BY
         CASE WHEN weight IS NOT NULL THEN 0 ELSE 1 END,
         CASE
           WHEN part_name = ? COLLATE NOCASE THEN 0
           WHEN description = ? COLLATE NOCASE THEN 1
           WHEN part_name LIKE ? COLLATE NOCASE THEN 2
           ELSE 3
         END,
         CASE WHEN part_no IS NOT NULL AND part_no != '' THEN 0 ELSE 1 END,
         part_name COLLATE NOCASE ASC
       LIMIT 1`,
    )
    .get(
      likeTerm,
      likeTerm,
      normalized,
      normalized,
      normalized,
      normalized,
      `${normalized}%`,
    )

  if (fuzzy) return fuzzy

  return exactName || exactDesc
}

export function resolvePartWeight(db, partId, partName) {
  const part = db.prepare(`${SELECT_PARTS} WHERE id = ?`).get(partId)
  if (!part) return null
  if (part.weight !== null && part.weight !== undefined) return part.weight

  const lookup = partName?.trim() || part.partName
  if (!lookup) return null

  const likeTerm = `%${lookup}%`
  const match = db
    .prepare(
      `SELECT weight
       FROM parts
       WHERE weight IS NOT NULL
         AND id != ?
         AND (
           part_name = ? COLLATE NOCASE
           OR description = ? COLLATE NOCASE
           OR part_name LIKE ? COLLATE NOCASE
           OR description LIKE ? COLLATE NOCASE
           OR ? LIKE part_name || '%' COLLATE NOCASE
           OR ? LIKE description || '%' COLLATE NOCASE
         )
       ORDER BY
         CASE WHEN weight IS NOT NULL THEN 0 ELSE 1 END,
         CASE
           WHEN part_name = ? COLLATE NOCASE THEN 0
           WHEN description = ? COLLATE NOCASE THEN 1
           WHEN part_name LIKE ? COLLATE NOCASE THEN 2
           ELSE 3
         END,
         CASE WHEN part_no IS NOT NULL AND part_no != '' THEN 0 ELSE 1 END
       LIMIT 1`,
    )
    .get(
      partId,
      lookup,
      lookup,
      likeTerm,
      likeTerm,
      lookup,
      lookup,
      lookup,
      lookup,
      `${lookup}%`,
    )

  return match?.weight ?? null
}

export function createPart({
  partName,
  partNo = null,
  description = null,
  weight = null,
  vendorName = null,
}) {
  const db = getDb()
  const normalizedName = normalizePartName(partName)
  const normalizedPartNo = partNo?.trim() || null
  const normalizedDescription = description?.trim() || null
  const normalizedVendor = vendorName?.trim() || null
  const parsedWeight =
    weight === null || weight === undefined || weight === '' ? null : Number(weight)

  if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
    throw new Error('Weight must be a valid non-negative number.')
  }

  if (normalizedPartNo) {
    const existingByNo = db.prepare('SELECT id FROM parts WHERE part_no = ?').get(normalizedPartNo)
    if (existingByNo) {
      throw new Error(`Part number "${normalizedPartNo}" already exists.`)
    }
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO parts (part_no, part_name, description, weight, vendor_name)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        normalizedPartNo,
        normalizedName,
        normalizedDescription,
        parsedWeight,
        normalizedVendor,
      )

    return mapPartRow(db.prepare(`${SELECT_PARTS} WHERE id = ?`).get(result.lastInsertRowid))
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      throw new Error('A part with this name already exists.')
    }
    throw error
  }
}

export function lookupPart(partName) {
  const db = getDb()
  const normalized = normalizePartName(partName)
  const existing = findPartByLookup(db, normalized)
  return existing ? mapPartRow(existing) : null
}

export function findOrCreatePart(partName) {
  const db = getDb()
  const normalized = normalizePartName(partName)
  const existing = findPartByLookup(db, normalized)

  if (existing) {
    return mapPartRow(existing)
  }

  const result = db.prepare('INSERT INTO parts (part_name) VALUES (?)').run(normalized)
  return mapPartRow(db.prepare(`${SELECT_PARTS} WHERE id = ?`).get(result.lastInsertRowid))
}

export function updatePart(
  id,
  { partName, partNo = null, description = null, weight = null, vendorName = null },
) {
  const db = getDb()
  const existing = getPartById(id)
  if (!existing) {
    throw new Error('Part not found.')
  }

  const normalizedName = normalizePartName(partName)
  const normalizedPartNo = partNo?.trim() || null
  const normalizedDescription = description?.trim() || null
  const normalizedVendor = vendorName?.trim() || null
  const parsedWeight =
    weight === null || weight === undefined || weight === '' ? null : Number(weight)

  if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
    throw new Error('Weight must be a valid non-negative number.')
  }

  if (normalizedPartNo) {
    const existingByNo = db
      .prepare('SELECT id FROM parts WHERE part_no = ? AND id != ?')
      .get(normalizedPartNo, id)
    if (existingByNo) {
      throw new Error(`Part number "${normalizedPartNo}" already exists.`)
    }
  }

  const existingByName = db
    .prepare('SELECT id FROM parts WHERE part_name = ? COLLATE NOCASE AND id != ?')
    .get(normalizedName, id)
  if (existingByName) {
    throw new Error('A part with this name already exists.')
  }

  try {
    db.prepare(
      `UPDATE parts
       SET part_no = ?, part_name = ?, description = ?, weight = ?, vendor_name = ?
       WHERE id = ?`,
    ).run(
      normalizedPartNo,
      normalizedName,
      normalizedDescription,
      parsedWeight,
      normalizedVendor,
      id,
    )

    return getPartById(id)
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      throw new Error('A part with this name or part number already exists.')
    }
    throw error
  }
}

export function deletePart(id) {
  const db = getDb()
  const inProduction = db.prepare('SELECT 1 FROM production_entries WHERE part_id = ? LIMIT 1').get(id)
  const inRejections = db.prepare('SELECT 1 FROM rejections WHERE part_id = ? LIMIT 1').get(id)

  if (inProduction || inRejections) {
    throw new Error('Cannot delete a part that is used in production or rejection records.')
  }

  const result = db.prepare('DELETE FROM parts WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Part not found.')
  }
  return { deleted: true }
}
