/**
 * Seeds Oct 2026 dummy production (multiple dates/heats) and verifies
 * moving a heat between dates (same as yield table drag-and-drop).
 */
import { getDb } from '../database/connection.js'
import { createPart, listParts, updatePart } from '../database/part-queries.js'
import { createProductionEntry, updateProductionEntry } from '../database/production-queries.js'
import { getHeatYieldReport } from '../database/yield-queries.js'

const DEMO_FROM = '2099-10-01'
const DEMO_TO = '2099-10-31'
const DATE_A = '2099-10-10'
const DATE_B = '2099-10-11'
const HEAT_ON_A = 'DND-OCT-01'
const HEAT_TO_MOVE = 'DND-OCT-02'
const HEAT_STAYS_ON_B = 'DND-OCT-03'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
  console.log(`  ok: ${message}`)
}

function clearDemoRange() {
  const db = getDb()
  db.prepare(
    `DELETE FROM production_entries
     WHERE production_date >= ? AND production_date <= ?
       AND heat_number LIKE 'DND-OCT-%'`,
  ).run(DEMO_FROM, DEMO_TO)
}

function ensureDemoPart() {
  const name = 'DND TEST PART'
  const existing = listParts().find((part) => part.partName === name)
  if (existing) {
    if (existing.weight !== 2) {
      updatePart(existing.id, { partName: name, weight: 2 })
    }
    return
  }
  createPart({ partName: name, weight: 2 })
}

function seedDemo() {
  clearDemoRange()
  ensureDemoPart()

  const onA = createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 40,
    heatNumber: HEAT_ON_A,
    productionDate: DATE_A,
  })
  const toMove = createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 25,
    heatNumber: HEAT_TO_MOVE,
    productionDate: DATE_B,
  })
  createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 15,
    heatNumber: HEAT_STAYS_ON_B,
    productionDate: DATE_B,
  })

  return { onA, toMove }
}

function dayReport(report, productionDate) {
  return report.days.find((row) => row.productionDate === productionDate)
}

function heatOnDay(day, heatNumber) {
  return day?.heats?.find((row) => row.heatNumber === heatNumber)
}

function seedOctober2026Preview() {
  const from = '2026-10-01'
  const to = '2026-10-31'
  const dateA = '2026-10-10'
  const dateB = '2026-10-11'
  const db = getDb()
  db.prepare(
    `DELETE FROM production_entries
     WHERE production_date >= ? AND production_date <= ?
       AND heat_number LIKE 'DND-OCT-%'`,
  ).run(from, to)
  ensureDemoPart()
  createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 30,
    heatNumber: 'DND-OCT-01',
    productionDate: dateA,
  })
  createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 20,
    heatNumber: 'DND-OCT-02',
    productionDate: dateB,
  })
  createProductionEntry({
    partName: 'DND TEST PART',
    quantity: 12,
    heatNumber: 'DND-OCT-03',
    productionDate: dateB,
  })
  console.log('  ok: Oct 2026 preview rows (10th + 11th, DND-OCT-* heats)')
}

function main() {
  console.log('\n[Yield DnD demo] Seeding dummy data…')
  seedOctober2026Preview()
  const { toMove } = seedDemo()

  let report = getHeatYieldReport({ from: DEMO_FROM, to: DEMO_TO })
  const demoDays = report.days.filter(
    (row) => row.productionDate === DATE_A || row.productionDate === DATE_B,
  )
  assert(demoDays.length === 2, 'two demo production dates in range')
  const dayBBefore = dayReport(report, DATE_B)
  assert(dayBBefore?.heatCount === 2, `${DATE_B} has two heats before move`)
  assert(heatOnDay(dayBBefore, HEAT_TO_MOVE)?.entryCount === 1, 'heat to move exists on source date')

  console.log('\n[Yield DnD demo] Simulating drag: move heat to another date…')
  updateProductionEntry(toMove.id, { productionDate: DATE_A })

  report = getHeatYieldReport({ from: DEMO_FROM, to: DEMO_TO })
  const dayAAfter = dayReport(report, DATE_A)
  const dayBAfter = dayReport(report, DATE_B)

  assert(dayAAfter?.heatCount === 2, `${DATE_A} has two heats after move`)
  assert(heatOnDay(dayAAfter, HEAT_TO_MOVE)?.totalQuantity === 25, 'moved heat qty on target date')
  assert(dayBAfter?.heatCount === 1, `${DATE_B} has one heat after move`)
  assert(heatOnDay(dayBAfter, HEAT_STAYS_ON_B)?.totalQuantity === 15, 'other heat unchanged on source date')

  console.log('\n[Yield DnD demo] Summary')
  console.log(`  Oct 2026: http://localhost:5176/yield — expand 10 & 11 Oct, drag DND-OCT-02 or DND-OCT-03 between dates`)
  console.log(`  Oct 2099: same page — ${DATE_A} has 2 heats, ${DATE_B} has ${HEAT_STAYS_ON_B} (after automated move test)`)
  console.log('\nAll yield drag-and-drop checks passed.\n')
}

main()
