import { getDb } from '../database/connection.js'
import { getDashboardSummary, getMonthlyAnalysis } from '../database/analysis-queries.js'
import { importParts, previewPartImport } from '../database/part-import-queries.js'
import { createPart, deletePart, listParts, updatePart } from '../database/part-queries.js'
import {
  createProductionEntry,
  deleteProductionEntry,
  listProductionEntries,
} from '../database/production-queries.js'
import {
  createRejection,
  deleteRejection,
  listRejections,
} from '../database/rejection-queries.js'
import {
  createRejectionType,
} from '../database/rejection-type-queries.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) {
    failed += 1
    console.error(`  FAIL: ${message}`)
    return false
  }
  passed += 1
  console.log(`  ok: ${message}`)
  return true
}

function runTests() {
  const db = getDb()
  db.exec('BEGIN')

  try {
    console.log('\n[Rejection types]')
    const typeA = createRejectionType({ typeName: `TEST-CRACK-${Date.now()}` })
    assert(typeA.id > 0, 'creates rejection type')

    console.log('\n[Parts]')
    const unique = `TEST-PART-${Date.now()}`
    const part = createPart({
      partName: unique,
      partNo: `T-${Date.now()}`,
      description: 'Integration test part',
      weight: 12.5,
      vendorName: 'Test Vendor',
    })
    assert(part.id > 0, 'creates part with weight')

    const updated = updatePart(part.id, {
      partName: unique,
      partNo: part.partNo,
      description: 'Updated description',
      weight: 13,
      vendorName: 'Test Vendor',
    })
    assert(updated.weight === 13, 'updates part weight')

    let duplicateError = null
    try {
      createPart({ partName: unique, partNo: 'OTHER-1', weight: 1 })
    } catch (error) {
      duplicateError = error
    }
    assert(duplicateError !== null, 'rejects duplicate part name')

    console.log('\n[Part import]')
    const preview = previewPartImport([
      { rowNumber: 2, partNo: `IMP-${Date.now()}-1`, description: 'Import A', weight: 5, vendorName: 'V1' },
      { rowNumber: 3, partNo: `IMP-${Date.now()}-2`, description: 'Import B', weight: '', vendorName: 'V2' },
      { rowNumber: 4, partNo: `IMP-${Date.now()}-3`, description: 'Import C', weight: 7, vendorName: 'V3' },
    ])
    assert(preview.validCount === 2, 'imports only rows with weight')
    assert(preview.skippedCount === 1, 'skips rows without weight')

    const importResult = importParts([
      { rowNumber: 2, partNo: preview.newRows[0].partNo, description: 'Import A', weight: 5, vendorName: 'V1' },
      { rowNumber: 3, partNo: `SKIP-${Date.now()}`, description: 'Import B', weight: '', vendorName: 'V2' },
      { rowNumber: 4, partNo: preview.newRows[1].partNo, description: 'Import C', weight: 7, vendorName: 'V3' },
    ])
    assert(importResult.inserted === 2, 'inserts weighted import rows')

    console.log('\n[Production]')
    const production = createProductionEntry({
      partName: unique,
      quantity: 10,
      heatNumber: 'SEP-99',
      productionDate: '2026-09-06',
    })
    assert(production.id > 0, 'creates production entry')
    assert(production.pouredWeight === 130, 'calculates poured weight from part catalog')

    const productionList = listProductionEntries({ from: '2026-09-01', to: '2026-09-30' })
    assert(productionList.some((entry) => entry.id === production.id), 'lists production by date range')

    console.log('\n[Rejections]')
    let rejectionWithoutProductionError = null
    try {
      createRejection({
        partName: `NO-PROD-${Date.now()}`,
        rejectionTypeId: typeA.id,
        quantity: 1,
        rejectionDate: '2026-09-01',
        heatNumber: '',
        notes: '',
      })
    } catch (error) {
      rejectionWithoutProductionError = error
    }
    assert(
      rejectionWithoutProductionError !== null,
      'blocks rejection when part has no production in month',
    )

    const rejection = createRejection({
      partName: unique,
      rejectionTypeId: typeA.id,
      quantity: 2,
      rejectionDate: '2026-09-01',
      heatNumber: 'SEP-99',
      notes: 'Test rejection',
    })
    assert(rejection.id > 0, 'creates rejection entry')

    let excessRejectionError = null
    try {
      createRejection({
        partName: unique,
        rejectionTypeId: typeA.id,
        quantity: 9,
        rejectionDate: '2026-09-01',
        heatNumber: 'SEP-99',
        notes: 'Too many rejections',
      })
    } catch (error) {
      excessRejectionError = error
    }
    assert(
      excessRejectionError !== null,
      'blocks rejection quantity above monthly production for a part',
    )

    const rejectionList = listRejections({ from: '2026-09-01', to: '2026-09-30' })
    assert(rejectionList.some((entry) => entry.id === rejection.id), 'lists rejections by date range')

    console.log('\n[Analysis]')
    const analysis = getMonthlyAnalysis({ from: '2026-09-01', to: '2026-09-30' })
    assert(analysis.totalProduction >= 10, 'analysis totals production quantity')
    assert(analysis.totalRejections >= 2, 'analysis totals rejection quantity')

    const dashboard = getDashboardSummary({ from: '2026-09-01', to: '2026-09-30' })
    assert(dashboard.partCount >= 1, 'dashboard counts active parts')

    console.log('\n[Referential integrity]')
    let deletePartError = null
    try {
      deletePart(part.id)
    } catch (error) {
      deletePartError = error
    }
    assert(deletePartError !== null, 'blocks deleting part used in production/rejections')

    deleteRejection(rejection.id)
    deleteProductionEntry(production.id)
    deletePart(part.id)
    assert(!listParts().some((item) => item.id === part.id), 'deletes part after unlinking records')

    console.log('\n[Schema checks]')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name)
    for (const table of ['parts', 'production_entries', 'rejections', 'rejection_types', 'schema_migrations']) {
      assert(tables.includes(table), `table exists: ${table}`)
    }

    const partColumns = db.prepare('PRAGMA table_info(parts)').all().map((row) => row.name)
    for (const column of ['part_no', 'part_name', 'description', 'weight', 'vendor_name']) {
      assert(partColumns.includes(column), `parts column exists: ${column}`)
    }

    const orphanProduction = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM production_entries pe
         LEFT JOIN parts p ON p.id = pe.part_id
         WHERE p.id IS NULL`,
      )
      .get().count
    assert(orphanProduction === 0, 'no orphan production entries')

    const orphanRejections = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM rejections r
         LEFT JOIN parts p ON p.id = r.part_id
         WHERE p.id IS NULL`,
      )
      .get().count
    assert(orphanRejections === 0, 'no orphan rejection entries')
  } finally {
    db.exec('ROLLBACK')
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    process.exitCode = 1
  }
}

runTests()
