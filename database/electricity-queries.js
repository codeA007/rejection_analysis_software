import {
  getElectricityHeatCountStart,
  getElectricityMeterStartKwh,
  getFurnaceChargeKg,
} from './app-settings-queries.js'
import { getDb } from './connection.js'

function roundRate(value) {
  return Math.round(value * 100) / 100
}

function mapElectricityRow(row) {
  const heatCount = row.heatCount ?? null
  const furnaceChargeKg = getFurnaceChargeKg()
  const metalChargedKg =
    heatCount !== null && heatCount !== undefined && heatCount > 0
      ? roundRate(heatCount * furnaceChargeKg)
      : null

  return {
    id: row.id,
    readingDate: row.readingDate,
    meterReading: row.meterReading,
    previousMeterReading: row.previousMeterReading,
    consumptionKwh: row.consumptionKwh,
    tonsMelted: row.tonsMelted,
    kwhPerTon: row.kwhPerTon,
    heatCount,
    metalChargedKg,
    notes: row.notes,
    createdAt: row.createdAt,
  }
}

const SELECT_ELECTRICITY = `
  SELECT
    id,
    reading_date AS readingDate,
    meter_reading AS meterReading,
    previous_meter_reading AS previousMeterReading,
    consumption_kwh AS consumptionKwh,
    tons_melted AS tonsMelted,
    kwh_per_ton AS kwhPerTon,
    heat_count AS heatCount,
    notes,
    created_at AS createdAt
  FROM electricity_readings
`

function getLatestReadingByMeter() {
  const db = getDb()
  const row = db
    .prepare(`${SELECT_ELECTRICITY} ORDER BY meter_reading DESC, id DESC LIMIT 1`)
    .get()
  return row ? mapElectricityRow(row) : null
}

export function getElectricityBaseline() {
  const latest = getLatestReadingByMeter()
  if (latest) {
    return {
      meterKwh: latest.meterReading,
      source: 'reading',
      readingId: latest.id,
    }
  }

  const startKwh = getElectricityMeterStartKwh()
  return {
    meterKwh: startKwh,
    source: 'start',
    readingId: null,
  }
}

function attachCumulativeHeatTotals(readings) {
  const heatCountStart = getElectricityHeatCountStart()
  const chronological = [...readings].sort((a, b) => {
    const dateCompare = a.readingDate.localeCompare(b.readingDate)
    if (dateCompare !== 0) return dateCompare
    return a.id - b.id
  })

  const cumulativeById = new Map()
  let runningTotal = heatCountStart
  for (const row of chronological) {
    runningTotal += row.heatCount ?? 0
    cumulativeById.set(row.id, runningTotal)
  }

  return readings.map((row) => ({
    ...row,
    cumulativeHeatTotal: cumulativeById.get(row.id) ?? heatCountStart,
  }))
}

function sumHeatCounts(readings) {
  return readings.reduce((sum, row) => sum + (row.heatCount ?? 0), 0)
}

export function listElectricityReadings() {
  const db = getDb()
  const readings = db
    .prepare(`${SELECT_ELECTRICITY} ORDER BY reading_date DESC, id DESC`)
    .all()
    .map(mapElectricityRow)
  return attachCumulativeHeatTotals(readings)
}

export function getElectricitySummary() {
  const heatCountStart = getElectricityHeatCountStart()
  const readings = listElectricityReadings()
  const totalHeatsTillNow = heatCountStart + sumHeatCounts(readings)
  const baseline = getElectricityBaseline()

  if (!readings.length) {
    return {
      logCount: 0,
      totalConsumptionKwh: 0,
      averageKwhPerTon: null,
      latestKwhPerTon: null,
      latestMeterReading: baseline.meterKwh,
      heatCountStart,
      totalHeatsTillNow,
    }
  }

  const totalConsumptionKwh = roundRate(
    readings.reduce((sum, row) => sum + row.consumptionKwh, 0),
  )
  const kwhPerTonValues = readings.map((row) => row.kwhPerTon)
  const averageKwhPerTon = roundRate(
    kwhPerTonValues.reduce((sum, value) => sum + value, 0) / kwhPerTonValues.length,
  )

  return {
    logCount: readings.length,
    totalConsumptionKwh,
    averageKwhPerTon,
    latestKwhPerTon: readings[0].kwhPerTon,
    latestMeterReading: baseline.meterKwh,
    heatCountStart,
    totalHeatsTillNow,
  }
}

function tonsMeltedFromHeatCount(heatCount) {
  const furnaceChargeKg = getFurnaceChargeKg()
  return roundRate((heatCount * furnaceChargeKg) / 1000)
}

export function createElectricityReading({
  readingDate,
  meterReading,
  heatCount,
  notes,
}) {
  const startKwh = getElectricityMeterStartKwh()
  if (startKwh === null) {
    throw new Error('Set the electricity meter start reading in Settings before logging.')
  }

  const date = readingDate?.trim()
  const meter = Number(meterReading)
  const heats = Number(heatCount)

  if (!date) {
    throw new Error('Reading date is required.')
  }
  if (!Number.isFinite(meter) || meter <= 0) {
    throw new Error('Meter reading must be greater than zero.')
  }
  if (!Number.isInteger(heats) || heats <= 0) {
    throw new Error('Number of heats must be a whole number greater than zero.')
  }

  const tons = tonsMeltedFromHeatCount(heats)
  if (tons <= 0) {
    throw new Error('Tons melted must be greater than zero. Check furnace charge in Settings.')
  }

  const latest = getLatestReadingByMeter()
  const previousMeter = latest ? latest.meterReading : startKwh

  if (meter < previousMeter) {
    throw new Error(
      `Meter reading must be at least ${previousMeter} kWh (previous cumulative reading).`,
    )
  }

  const consumptionKwh = roundRate(meter - previousMeter)
  if (consumptionKwh <= 0) {
    throw new Error('Meter reading must be higher than the previous reading.')
  }

  const kwhPerTon = roundRate(consumptionKwh / tons)
  const normalizedNotes = notes?.trim() || null

  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO electricity_readings (
         reading_date,
         meter_reading,
         previous_meter_reading,
         consumption_kwh,
         tons_melted,
         kwh_per_ton,
         heat_count,
         notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      date,
      meter,
      previousMeter,
      consumptionKwh,
      tons,
      kwhPerTon,
      heats,
      normalizedNotes,
    )

  const createdId = result.lastInsertRowid
  const created = listElectricityReadings().find((row) => row.id === createdId)
  if (!created) {
    throw new Error('Failed to load electricity reading after save.')
  }
  return created
}

export function updateElectricityReading(id, { meterReading }) {
  const baseline = getElectricityBaseline()
  if (baseline.source !== 'reading' || baseline.readingId !== id) {
    throw new Error('Only the latest cumulative meter log can be corrected from the baseline editor.')
  }

  const meter = Number(meterReading)
  if (!Number.isFinite(meter) || meter <= 0) {
    throw new Error('Meter reading must be greater than zero.')
  }

  const db = getDb()
  const row = db.prepare(`${SELECT_ELECTRICITY} WHERE id = ?`).get(id)
  if (!row) {
    throw new Error('Electricity reading not found.')
  }

  const mapped = mapElectricityRow(row)
  if (meter <= mapped.previousMeterReading) {
    throw new Error(
      `Meter reading must be greater than ${mapped.previousMeterReading} kWh (previous cumulative reading for this log).`,
    )
  }

  const otherMax = db
    .prepare(
      `SELECT MAX(meter_reading) AS maxMeter FROM electricity_readings WHERE id != ?`,
    )
    .get(id)
  const maxOther = otherMax?.maxMeter ?? null
  if (maxOther !== null && meter <= maxOther) {
    throw new Error(
      `Meter reading must be greater than ${maxOther} kWh (highest reading on other logs).`,
    )
  }

  const consumptionKwh = roundRate(meter - mapped.previousMeterReading)
  if (consumptionKwh <= 0) {
    throw new Error('Meter reading must be higher than the previous reading.')
  }

  const tons = mapped.tonsMelted
  if (!tons || tons <= 0) {
    throw new Error('Cannot recalculate efficiency: invalid tons on this log.')
  }

  const kwhPerTon = roundRate(consumptionKwh / tons)

  db.prepare(
    `UPDATE electricity_readings
     SET meter_reading = ?, consumption_kwh = ?, kwh_per_ton = ?
     WHERE id = ?`,
  ).run(meter, consumptionKwh, kwhPerTon, id)

  const updated = listElectricityReadings().find((item) => item.id === id)
  if (!updated) {
    throw new Error('Failed to load electricity reading after update.')
  }
  return updated
}

export function deleteElectricityReading(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM electricity_readings WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Electricity reading not found.')
  }
  return { deleted: true }
}
