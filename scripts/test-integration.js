import { getDb } from '../database/connection.js'
import { getDashboardSummary, getMonthlyAnalysis } from '../database/analysis-queries.js'
import {
  getElectricityMeterStartKwh,
  getFurnaceChargeKg,
  setElectricityHeatCountStart,
  setElectricityMeterStartKwh,
  setFurnaceChargeKg,
} from '../database/app-settings-queries.js'
import {
  createElectricityReading,
  deleteElectricityReading,
  getElectricityBaseline,
  getElectricitySummary,
  listElectricityReadings,
  updateElectricityReading,
} from '../database/electricity-queries.js'
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

    console.log('\n[Electricity]')
    getDb().prepare('DELETE FROM electricity_readings').run()
    setElectricityMeterStartKwh(1000)
    setElectricityHeatCountStart(195)
    assert(getElectricityMeterStartKwh() === 1000, 'stores electricity meter start reading')
    assert(getElectricityBaseline().source === 'start', 'baseline uses meter start when no logs')
    assert(getElectricityBaseline().meterKwh === 1000, 'baseline meter matches start with no logs')
    assert(
      getElectricitySummary().latestMeterReading === 1000,
      'summary latest meter matches baseline start',
    )

    const electricityLogOne = createElectricityReading({
      readingDate: '2099-01-01',
      meterReading: 1100,
      heatCount: 6,
    })
    assert(electricityLogOne.consumptionKwh === 100, 'first log uses start reading as baseline')
    assert(electricityLogOne.tonsMelted === 2.1, 'tons derived from heats times furnace charge')
    assert(electricityLogOne.kwhPerTon === 47.62, 'kWh per ton uses computed tons')
    assert(electricityLogOne.metalChargedKg === 6 * getFurnaceChargeKg(), 'metal kg from heat count')
    assert(electricityLogOne.cumulativeHeatTotal === 201, 'cumulative heats after first log')
    assert(getElectricitySummary().totalHeatsTillNow === 201, 'total heats till now after first log')

    const electricityLogTwo = createElectricityReading({
      readingDate: '2099-01-15',
      meterReading: 1250,
      heatCount: 4,
    })
    assert(electricityLogTwo.consumptionKwh === 150, 'second log subtracts previous meter reading')
    assert(electricityLogTwo.tonsMelted === 1.4, 'tons derived on second log')
    assert(electricityLogTwo.kwhPerTon === 107.14, 'kWh per ton on second log')
    assert(electricityLogTwo.cumulativeHeatTotal === 205, 'cumulative heats after second log')
    assert(getElectricitySummary().totalHeatsTillNow === 205, 'total heats till now after second log')
    const chronological = [...listElectricityReadings()].sort((a, b) =>
      a.readingDate.localeCompare(b.readingDate),
    )
    assert(chronological[0]?.cumulativeHeatTotal === 201, 'first chronological log cumulative heats')
    assert(chronological[1]?.cumulativeHeatTotal === 205, 'second chronological log cumulative heats')

    let decreasingMeterError = null
    try {
      createElectricityReading({
        readingDate: '2099-01-20',
        meterReading: 1200,
        heatCount: 1,
      })
    } catch (error) {
      decreasingMeterError = error
    }
    assert(decreasingMeterError !== null, 'rejects decreasing cumulative meter reading')

    const baselineWithLogs = getElectricityBaseline()
    assert(baselineWithLogs.source === 'reading', 'baseline uses latest log when logs exist')
    assert(baselineWithLogs.readingId === electricityLogTwo.id, 'baseline id is max meter log')
    assert(baselineWithLogs.meterKwh === 1250, 'baseline meter is max cumulative reading')
    assert(
      getElectricitySummary().latestMeterReading === 1250,
      'summary latest meter matches max-meter baseline',
    )

    const patchedLogTwo = updateElectricityReading(electricityLogTwo.id, { meterReading: 1300 })
    assert(patchedLogTwo.consumptionKwh === 200, 'patch recalculates consumption from previous')
    assert(patchedLogTwo.kwhPerTon === 142.86, 'patch recalculates kWh per ton')
    assert(getElectricityBaseline().meterKwh === 1300, 'baseline updates after patch')

    const electricityLogThree = createElectricityReading({
      readingDate: '2099-01-25',
      meterReading: 1400,
      heatCount: 2,
    })
    assert(electricityLogThree.consumptionKwh === 100, 'new log uses patched baseline')

    let patchWrongLogError = null
    try {
      updateElectricityReading(electricityLogOne.id, { meterReading: 1150 })
    } catch (error) {
      patchWrongLogError = error
    }
    assert(patchWrongLogError !== null, 'rejects patch on non-baseline log')

    let patchTooLowError = null
    try {
      updateElectricityReading(electricityLogThree.id, { meterReading: 1200 })
    } catch (error) {
      patchTooLowError = error
    }
    assert(patchTooLowError !== null, 'rejects baseline patch below other logs')

    deleteElectricityReading(electricityLogThree.id)
    deleteElectricityReading(electricityLogTwo.id)
    deleteElectricityReading(electricityLogOne.id)

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
      'electricity_readings',
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
