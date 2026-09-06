import { getDb } from '../database/connection.js'
import { createProductionEntry } from '../database/production-queries.js'
import { createRejection } from '../database/rejection-queries.js'
import { findOrCreatePart } from '../database/part-queries.js'
import { ensureDefaultRejectionTypes } from '../database/seed-rejection-types.js'

const DEMO_MONTH = '2026-09'

const demoParts = [
  { partName: 'DIST PIECE 400', weight: 0.6 },
  { partName: 'CYLINDER HEAD', weight: 2.5 },
  { partName: 'PUMP BODY', weight: 1.8 },
  { partName: 'U 600 WMOC', weight: 3.2 },
]

const demoProduction = [
  { partName: 'DIST PIECE 400', heatNumber: 'SEP-01', quantity: 100, productionDate: '2026-09-05' },
  { partName: 'DIST PIECE 400', heatNumber: 'SEP-02', quantity: 50, productionDate: '2026-09-12' },
  { partName: 'CYLINDER HEAD', heatNumber: 'SEP-03', quantity: 80, productionDate: '2026-09-08' },
  { partName: 'PUMP BODY', heatNumber: 'SEP-04', quantity: 60, productionDate: '2026-09-15' },
  { partName: 'U 600 WMOC', heatNumber: 'SEP-05', quantity: 25, productionDate: '2026-09-20' },
]

const demoRejections = [
  { partName: 'DIST PIECE 400', heatNumber: 'SEP-01', typeName: 'COLD', quantity: 3, rejectionDate: '2026-09-05' },
  { partName: 'DIST PIECE 400', heatNumber: 'SEP-01', typeName: 'SLAG', quantity: 2, rejectionDate: '2026-09-06' },
  { partName: 'DIST PIECE 400', heatNumber: '', typeName: 'CRACK', quantity: 4, rejectionDate: '2026-09-10' },
  { partName: 'CYLINDER HEAD', heatNumber: 'SEP-03', typeName: 'BLOW HOLE', quantity: 5, rejectionDate: '2026-09-09' },
  { partName: 'CYLINDER HEAD', heatNumber: 'SEP-03', typeName: 'SHRIKAGE', quantity: 3, rejectionDate: '2026-09-09' },
  { partName: 'PUMP BODY', heatNumber: 'SEP-04', typeName: 'SAND DROP', quantity: 2, rejectionDate: '2026-09-16' },
  { partName: 'U 600 WMOC', heatNumber: '', typeName: 'MIS MATCH', quantity: 1, rejectionDate: '2026-09-21' },
]

function clearDemoMonth(db) {
  db.prepare(
    `DELETE FROM rejections
     WHERE rejection_date >= ? AND rejection_date < ?`,
  ).run(`${DEMO_MONTH}-01`, '2026-10-01')

  db.prepare(
    `DELETE FROM production_entries
     WHERE production_date >= ? AND production_date < ?`,
  ).run(`${DEMO_MONTH}-01`, '2026-10-01')
}

function seedDemoMonth() {
  const db = getDb()
  ensureDefaultRejectionTypes()
  clearDemoMonth(db)

  const typeIdByName = new Map(
    db.prepare('SELECT id, type_name AS typeName FROM rejection_types').all().map((row) => [row.typeName, row.id]),
  )

  for (const part of demoParts) {
    const created = findOrCreatePart(part.partName)
    if (part.weight !== null && part.weight !== undefined) {
      db.prepare('UPDATE parts SET weight = ? WHERE id = ?').run(part.weight, created.id)
    }
  }

  for (const entry of demoProduction) {
    createProductionEntry(entry)
  }

  for (const rejection of demoRejections) {
    const typeId = typeIdByName.get(rejection.typeName)
    if (!typeId) {
      throw new Error(`Missing rejection type: ${rejection.typeName}`)
    }
    createRejection({
      partName: rejection.partName,
      rejectionTypeId: typeId,
      quantity: rejection.quantity,
      rejectionDate: rejection.rejectionDate,
      heatNumber: rejection.heatNumber || undefined,
    })
  }

  console.log(`Seeded demo data for ${DEMO_MONTH}.`)
  console.log(`  Production entries: ${demoProduction.length}`)
  console.log(`  Rejection entries: ${demoRejections.length}`)
}

seedDemoMonth()
