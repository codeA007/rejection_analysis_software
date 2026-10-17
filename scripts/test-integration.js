import { getDb } from '../database/connection.js'
import { getDashboardSummary, getMonthlyAnalysis } from '../database/analysis-queries.js'
import { getFurnaceChargeKg, setFurnaceChargeKg } from '../database/app-settings-queries.js'
import { getHeatYieldReport } from '../database/yield-queries.js'
import { parseQuantityExpression } from '../src/utils/parseQuantityExpression.js'
import { importParts, previewPartImport } from '../database/part-import-queries.js'
import { createPart, deletePart, listParts, updatePart } from '../database/part-queries.js'
import {
  createProductionEntry,
  deleteProductionEntry,
  listProductionEntries,
  updateProductionEntry,
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

    console.log('\n[Quantity expression]')
    assert(parseQuantityExpression('12') === 12, 'parses plain quantity')
    assert(parseQuantityExpression('6*2') === 12, 'parses multiplied quantity')
    assert(parseQuantityExpression('6 * 2') === 12, 'parses multiplied quantity with spaces')
    assert(parseQuantityExpression('2*3*4') === 24, 'parses chained multiplication')
    assert(parseQuantityExpression('6*0') === null, 'rejects zero product')
    assert(parseQuantityExpression('6+2') === null, 'rejects unsupported operators')

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
    assert(analysis.totalRejectedWeight >= 26, 'analysis totals rejected weight from part catalog')

    const dashboard = getDashboardSummary({ from: '2026-09-01', to: '2026-09-30' })
    assert(dashboard.partCount >= 1, 'dashboard counts active parts')

    console.log('\n[Yield]')
    assert(getFurnaceChargeKg() === 350, 'default furnace charge is 350 kg')

    const yldEntryOne = createProductionEntry({
      partName: unique,
      quantity: 10,
      heatNumber: 'YLD-01',
      productionDate: '2099-03-01',
    })
    const yldEntryTwo = createProductionEntry({
      partName: unique,
      quantity: 5,
      heatNumber: 'YLD-01',
      productionDate: '2099-03-01',
    })
    const yldEntryThree = createProductionEntry({
      partName: unique,
      quantity: 10,
      heatNumber: 'YLD-02',
      productionDate: '2099-03-03',
    })

    const yieldReport = getHeatYieldReport({ from: '2099-03-01', to: '2099-03-31' })
    assert(yieldReport.heats.length === 2, 'yield report groups distinct heats')
    const yieldHeatOne = yieldReport.heats.find((row) => row.heatNumber === 'YLD-01')
    assert(yieldHeatOne?.pouredKg === 195, 'yield sums poured kg for the same heat')
    assert(yieldHeatOne?.yieldPercent === 55.71, 'yield percent uses furnace charge per heat')
    assert(yieldReport.summary.totalPoured === 325, 'yield totals poured weight in period')
    assert(yieldReport.summary.overallYield === 46.43, 'overall yield uses heat count times charge kg')

    assert(yieldReport.days.length === 2, 'yield report groups production by date')
    const yieldDayOne = yieldReport.days.find((row) => row.productionDate === '2099-03-01')
    assert(yieldDayOne?.entryCount === 2, 'yield day clubs multiple entries on the same date')
    assert(yieldDayOne?.pouredKg === 195, 'yield day sums poured kg for the date')
    assert(yieldDayOne?.yieldPercent === 55.71, 'yield day percent uses heats on that date')
    assert(yieldDayOne?.heats.length === 1, 'yield day lists one heat for same heat on date')
    assert(yieldDayOne?.heats[0]?.entryCount === 2, 'yield heat child counts entries on date')
    assert(yieldDayOne?.heats[0]?.totalQuantity === 15, 'yield heat child sums quantity on date')
    assert(yieldDayOne?.heats[0]?.entries?.length === 2, 'yield heat child lists production entries')

    updateProductionEntry(yldEntryOne.id, { quantity: 20 })
    const yieldAfterQty = getHeatYieldReport({ from: '2099-03-01', to: '2099-03-31' })
    const dayAfterQty = yieldAfterQty.days.find((row) => row.productionDate === '2099-03-01')
    assert(dayAfterQty?.pouredKg === 325, 'yield recalculates after production quantity update')
    assert(dayAfterQty?.heats[0]?.totalQuantity === 25, 'yield heat total quantity updates after edit')

    updateProductionEntry(yldEntryOne.id, { heatNumber: 'YLD-01A' })
    updateProductionEntry(yldEntryTwo.id, { heatNumber: 'YLD-01A' })
    const yieldAfterHeat = getHeatYieldReport({ from: '2099-03-01', to: '2099-03-31' })
    const dayAfterHeat = yieldAfterHeat.days.find((row) => row.productionDate === '2099-03-01')
    assert(dayAfterHeat?.heats[0]?.heatNumber === 'YLD-01A', 'yield heat row reflects renamed heat number')
    assert(
      yieldAfterHeat.heats.some((row) => row.heatNumber === 'YLD-01A'),
      'yield period heat list includes renamed heat',
    )
    assert(
      !yieldAfterHeat.heats.some((row) => row.heatNumber === 'YLD-01'),
      'yield period heat list drops old heat name after rename',
    )

    updateProductionEntry(yldEntryOne.id, { productionDate: '2099-03-02' })
    updateProductionEntry(yldEntryTwo.id, { productionDate: '2099-03-02' })
    const yieldAfterDate = getHeatYieldReport({ from: '2099-03-01', to: '2099-03-31' })
    assert(
      !yieldAfterDate.days.some((row) => row.productionDate === '2099-03-01'),
      'yield day moves when all entries change production date',
    )
    const movedDay = yieldAfterDate.days.find((row) => row.productionDate === '2099-03-02')
    assert(movedDay?.entryCount === 2, 'yield groups entries on new production date')

    const yieldDayThree = yieldReport.days.find((row) => row.productionDate === '2099-03-03')
    assert(yieldDayThree?.yieldPercent === 37.14, 'yield day percent for single heat on date')

    updateProductionEntry(yldEntryThree.id, { productionDate: '2099-03-02' })
    const yieldAfterHeatMove = getHeatYieldReport({ from: '2099-03-01', to: '2099-03-31' })
    const dayAfterHeatMove = yieldAfterHeatMove.days.find((row) => row.productionDate === '2099-03-02')
    assert(
      dayAfterHeatMove?.heats.some((row) => row.heatNumber === 'YLD-02'),
      'yield day includes heat moved onto another date',
    )
    assert(
      !yieldAfterHeatMove.days.some((row) => row.productionDate === '2099-03-03'),
      'yield drops source date when last heat is moved away',
    )

    setFurnaceChargeKg(400)
    assert(getFurnaceChargeKg() === 400, 'updates furnace charge kg in settings')

    console.log('\n[Referential integrity]')
    let deletePartError = null
    try {
      deletePart(part.id)
    } catch (error) {
      deletePartError = error
    }
    assert(deletePartError !== null, 'blocks deleting part used in production/rejections')

    deleteRejection(rejection.id)
    for (const entry of listProductionEntries({ from: '2099-03-01', to: '2099-03-31' })) {
      if (entry.partId === part.id) {
        deleteProductionEntry(entry.id)
      }
    }
    deleteProductionEntry(production.id)
    deletePart(part.id)
    assert(!listParts().some((item) => item.id === part.id), 'deletes part after unlinking records')

    console.log('\n[Schema checks]')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name)
    for (const table of [
      'parts',
      'production_entries',
      'rejections',
      'rejection_types',
      'schema_migrations',
      'app_settings',
    ]) {
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
