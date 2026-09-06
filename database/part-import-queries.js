import { parsePartNoFromExcel } from '../shared/part-code-utils.js'
import { getDb } from './connection.js'

function parseNumeric(value) {
  if (value === undefined || value === null || value === '') return NaN
  if (typeof value === 'number') return value
  return Number(String(value).replace(/,/g, '').trim())
}

function hasUsableWeight(value) {
  const weight = parseNumeric(value)
  return Number.isFinite(weight) && weight >= 0
}

function normalizeImportRow(row, rowNumber) {
  const partNo = parsePartNoFromExcel(row.partNo)
  const description = row.description?.trim() || ''
  const vendorName = row.vendorName?.trim() || null

  if (!partNo) {
    return { invalid: { row: rowNumber, reason: 'PART NO is required.' } }
  }

  if (!hasUsableWeight(row.weight)) {
    return { skipped: { row: rowNumber, reason: 'No weight — row skipped.' } }
  }

  const weight = parseNumeric(row.weight)

  const partName = description || partNo

  return {
    valid: {
      rowNumber,
      partNo,
      partName,
      description: description || null,
      weight,
      vendorName,
    },
  }
}

export function previewPartImport(rows) {
  const db = getDb()

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No rows to import.')
  }

  const validRows = []
  const invalidRows = []
  const skippedRows = []

  rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 1
    const result = normalizeImportRow(row, rowNumber)
    if (result.invalid) {
      invalidRows.push(result.invalid)
      return
    }
    if (result.skipped) {
      skippedRows.push(result.skipped)
      return
    }
    validRows.push(result.valid)
  })

  const partNoToRows = new Map()
  for (const row of validRows) {
    const key = row.partNo.toLowerCase()
    if (!partNoToRows.has(key)) {
      partNoToRows.set(key, [])
    }
    partNoToRows.get(key).push(row)
  }

  const dedupedValidRows = []
  for (const group of partNoToRows.values()) {
    if (group.length > 1) {
      for (const row of group) {
        invalidRows.push({
          row: row.rowNumber,
          reason: `Duplicate PART NO "${row.partNo}" in Excel.`,
        })
      }
      continue
    }
    dedupedValidRows.push(group[0])
  }

  const descriptionCounts = new Map()
  for (const row of dedupedValidRows) {
    if (!row.description) continue
    const key = row.description.toLowerCase()
    descriptionCounts.set(key, (descriptionCounts.get(key) ?? 0) + 1)
  }

  for (const row of dedupedValidRows) {
    if (row.description && (descriptionCounts.get(row.description.toLowerCase()) ?? 0) > 1) {
      row.partName = `${row.partNo} — ${row.description}`
      continue
    }
    row.partName = row.description || row.partNo
  }

  const existingByPartNo = new Map(
    db
      .prepare(
        `SELECT id, part_no AS partNo, part_name AS partName, description, weight, vendor_name AS vendorName
         FROM parts
         WHERE part_no IS NOT NULL AND part_no != ''`,
      )
      .all()
      .map((part) => [part.partNo.toLowerCase(), part]),
  )

  const newRows = []
  const updates = []

  for (const row of dedupedValidRows) {
    const existing = existingByPartNo.get(row.partNo.toLowerCase())
    if (existing) {
      updates.push({
        partNo: row.partNo,
        existing: {
          partName: existing.partName,
          description: existing.description,
          weight: existing.weight,
          vendorName: existing.vendorName,
        },
        incoming: {
          partName: row.partName,
          description: row.description,
          weight: row.weight,
          vendorName: row.vendorName,
        },
      })
      continue
    }
    newRows.push(row)
  }

  return {
    validCount: dedupedValidRows.length,
    newCount: newRows.length,
    updateCount: updates.length,
    skippedCount: skippedRows.length,
    newRows,
    updates,
    invalidRows,
    skippedRows,
  }
}

export function importParts(rows) {
  const db = getDb()
  const preview = previewPartImport(rows)

  if (preview.invalidRows.length > 0) {
    throw new Error(
      `Import cancelled: ${preview.invalidRows.length} invalid row(s). Fix all rows and try again.`,
    )
  }

  if (preview.validCount === 0) {
    throw new Error(
      preview.skippedCount > 0
        ? 'No rows with weight found in the Excel file.'
        : 'No valid rows to import.',
    )
  }

  const insert = db.prepare(
    `INSERT INTO parts (part_no, part_name, description, weight, vendor_name)
     VALUES (@partNo, @partName, @description, @weight, @vendorName)`,
  )

  const update = db.prepare(
    `UPDATE parts
     SET part_name = @partName,
         description = @description,
         weight = @weight,
         vendor_name = COALESCE(@vendorName, vendor_name)
     WHERE part_no = @partNo`,
  )

  const importTransaction = db.transaction((previewRows) => {
    let inserted = 0
    let updated = 0

    for (const row of previewRows.newRows) {
      insert.run(row)
      inserted += 1
    }

    for (const row of previewRows.updates) {
      update.run({
        partNo: row.partNo,
        partName: row.incoming.partName,
        description: row.incoming.description,
        weight: row.incoming.weight,
        vendorName: row.incoming.vendorName,
      })
      updated += 1
    }

    return { inserted, updated }
  })

  const result = importTransaction(preview)

  return {
    ...result,
    skippedCount: preview.skippedCount,
    invalidRows: [],
  }
}
